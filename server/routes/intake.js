const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');
const { getIntakeScript, getFormFields, INTAKE_SCRIPTS, INTAKE_FORM_FIELDS } = require('../services/intakeData');

// ── Seed intake templates from hardcoded data on first startup ────────────────

async function seedIntakeTemplates() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) AS count FROM intake_templates');
    if (parseInt(rows[0].count, 10) > 0) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const areas = Object.keys(INTAKE_SCRIPTS);
      for (let ai = 0; ai < areas.length; ai++) {
        const pa   = areas[ai];
        const data = INTAKE_SCRIPTS[pa];
        const { rows: [tmpl] } = await client.query(
          `INSERT INTO intake_templates (practice_area, display_name, sort_order)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id`,
          [pa, data.practiceArea || pa, ai]
        );
        if (!tmpl) continue;
        let order = 0;
        await client.query(
          `INSERT INTO intake_scripts (template_id, script_order, script_type, script_text)
           VALUES ($1,$2,'intro',$3)`,
          [tmpl.id, order++, data.intro || '']
        );
        for (const sec of (data.sections || [])) {
          await client.query(
            `INSERT INTO intake_scripts (template_id, script_order, script_type, script_text)
             VALUES ($1,$2,'section_title',$3)`,
            [tmpl.id, order++, sec.title || '']
          );
          for (const qObj of (sec.questions || [])) {
            await client.query(
              `INSERT INTO intake_scripts (template_id, script_order, script_type, script_text)
               VALUES ($1,$2,'question',$3)`,
              [tmpl.id, order++, JSON.stringify(qObj)]
            );
          }
        }
        if (data.closing) {
          await client.query(
            `INSERT INTO intake_scripts (template_id, script_order, script_type, script_text)
             VALUES ($1,$2,'closing',$3)`,
            [tmpl.id, order++, data.closing]
          );
        }
        if (data.solNote) {
          await client.query(
            `INSERT INTO intake_scripts (template_id, script_order, script_type, script_text)
             VALUES ($1,$2,'sol_note',$3)`,
            [tmpl.id, order++, data.solNote]
          );
        }
        const fieldGroups = INTAKE_FORM_FIELDS[pa] || [];
        let fOrder = 0;
        for (const group of fieldGroups) {
          for (const f of (group.fields || [])) {
            await client.query(
              `INSERT INTO intake_fields
                 (template_id, field_name, field_label, field_type, field_order,
                  field_options, is_required, sol_field, field_section)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
              [
                tmpl.id,
                f.name   || null,
                f.label,
                f.type,
                fOrder++,
                f.options ? JSON.stringify(f.options) : null,
                f.required  || false,
                f.solField  || false,
                group.section || null,
              ]
            );
          }
        }
      }
      await client.query('COMMIT');
      console.log('Intake templates seeded.');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Intake seed rollback:', err.message);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Intake seed skipped:', err.message);
  }
}

seedIntakeTemplates();

router.use(requireAuth);

// ── Static data (DB-first, fallback to hardcoded) ────────────────────────────

router.get('/scripts/:practiceArea', async (req, res) => {
  const pa = decodeURIComponent(req.params.practiceArea);
  try {
    const { rows: [tmpl] } = await pool.query(
      `SELECT id FROM intake_templates WHERE practice_area=$1 AND is_active=true`, [pa]
    );
    if (tmpl) {
      const { rows: scripts } = await pool.query(
        `SELECT script_type, script_text FROM intake_scripts WHERE template_id=$1 ORDER BY script_order`, [tmpl.id]
      );
      const result = { practiceArea: pa, intro: '', sections: [], closing: '', solNote: '' };
      let currentSection = null;
      for (const row of scripts) {
        if (row.script_type === 'intro') { result.intro = row.script_text; }
        else if (row.script_type === 'closing') { result.closing = row.script_text; }
        else if (row.script_type === 'sol_note') { result.solNote = row.script_text; }
        else if (row.script_type === 'section_title') {
          currentSection = { title: row.script_text, questions: [] };
          result.sections.push(currentSection);
        } else if (row.script_type === 'question' && currentSection) {
          try { currentSection.questions.push(JSON.parse(row.script_text)); } catch { currentSection.questions.push({ q: row.script_text, purpose: '' }); }
        }
      }
      return res.json(result);
    }
  } catch (err) { console.error('DB scripts error, falling back:', err.message); }
  const script = getIntakeScript(pa);
  if (!script) return res.status(404).json({ error: 'Script not found for that practice area' });
  res.json(script);
});

router.get('/form-fields/:practiceArea', async (req, res) => {
  const pa = decodeURIComponent(req.params.practiceArea);
  try {
    const { rows: [tmpl] } = await pool.query(
      `SELECT id FROM intake_templates WHERE practice_area=$1 AND is_active=true`, [pa]
    );
    if (tmpl) {
      const { rows: fields } = await pool.query(
        `SELECT field_name, field_label, field_type, field_options, is_required, sol_field, field_section
         FROM intake_fields WHERE template_id=$1 ORDER BY field_order`, [tmpl.id]
      );
      const grouped = [];
      const sectionMap = {};
      for (const f of fields) {
        const sec = f.field_section || '';
        if (!sectionMap[sec]) { sectionMap[sec] = { section: sec, fields: [] }; grouped.push(sectionMap[sec]); }
        sectionMap[sec].fields.push({
          name:     f.field_name,
          label:    f.field_label,
          type:     f.field_type,
          options:  f.field_options ? JSON.parse(f.field_options) : undefined,
          required: f.is_required,
          solField: f.sol_field,
        });
      }
      return res.json(grouped);
    }
  } catch (err) { console.error('DB fields error, falling back:', err.message); }
  const fields = getFormFields(pa);
  if (!fields) return res.status(404).json({ error: 'Form fields not found for that practice area' });
  res.json(fields);
});

// ── CRUD ─────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.*,
             c.first_name, c.last_name, c.email
      FROM   intake_forms i
      LEFT JOIN contacts c ON i.contact_id = c.id
      ORDER  BY i.created_at DESC
      LIMIT  200
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// must be registered before /:id to prevent Express capturing 'templates' as an id
router.get('/templates', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM intake_templates ORDER BY sort_order, practice_area');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const { rows: [tmpl] } = await pool.query('SELECT * FROM intake_templates WHERE id=$1', [req.params.id]);
    if (!tmpl) return res.status(404).json({ error: 'Not found' });
    const { rows: scripts } = await pool.query(
      'SELECT * FROM intake_scripts WHERE template_id=$1 ORDER BY script_order', [tmpl.id]
    );
    const { rows: fields } = await pool.query(
      'SELECT * FROM intake_fields WHERE template_id=$1 ORDER BY field_order', [tmpl.id]
    );
    res.json({ ...tmpl, scripts, fields });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.*, c.first_name, c.last_name, c.email
      FROM   intake_forms i
      LEFT JOIN contacts c ON i.contact_id = c.id
      WHERE  i.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Intake not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let { contact_id, newContact, practice_area, form_data,
          conflict_check_completed, conflict_check_cleared } = req.body;

    if (!practice_area) return res.status(400).json({ error: 'practice_area is required' });

    // Optionally create a new contact inline
    if (newContact && !contact_id) {
      const { first_name, last_name, email, phone } = newContact;
      if (!first_name?.trim() || !last_name?.trim())
        return res.status(400).json({ error: 'New contact requires first and last name' });
      const { rows } = await client.query(
        `INSERT INTO contacts (first_name, last_name, email, phone, contact_type)
         VALUES ($1, $2, $3, $4, 'client') RETURNING id`,
        [first_name.trim(), last_name.trim(), email || null, phone || null]
      );
      contact_id = rows[0].id;
    }

    const { rows } = await client.query(
      `INSERT INTO intake_forms
         (contact_id, practice_area, form_data, conflict_check_completed, conflict_check_cleared, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        contact_id || null,
        practice_area,
        JSON.stringify(form_data || {}),
        conflict_check_completed || false,
        conflict_check_cleared   || false,
        req.user.id,
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { form_data, conflict_check_completed, conflict_check_cleared, status } = req.body;
    const { rows } = await pool.query(
      `UPDATE intake_forms
       SET    form_data=$1, conflict_check_completed=$2, conflict_check_cleared=$3, status=$4
       WHERE  id=$5
       RETURNING *`,
      [
        JSON.stringify(form_data || {}),
        conflict_check_completed || false,
        conflict_check_cleared   || false,
        status || 'Draft',
        req.params.id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Intake not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Template management (attorney only) ──────────────────────────────────────

const attorneyOnly = (req, res, next) => {
  if (req.user.role !== 'attorney') return res.status(403).json({ error: 'Attorney access only' });
  next();
};

router.put('/templates/:id', attorneyOnly, async (req, res) => {
  const { display_name, is_active, sort_order } = req.body;
  try {
    const { rows: [t] } = await pool.query(
      `UPDATE intake_templates SET display_name=COALESCE($1,display_name), is_active=COALESCE($2,is_active),
       sort_order=COALESCE($3,sort_order), updated_at=NOW() WHERE id=$4 RETURNING *`,
      [display_name || null, is_active != null ? is_active : null, sort_order != null ? sort_order : null, req.params.id]
    );
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Scripts
router.post('/templates/:id/scripts', attorneyOnly, async (req, res) => {
  const { script_type, script_text, script_order } = req.body;
  try {
    const { rows: [s] } = await pool.query(
      `INSERT INTO intake_scripts (template_id, script_order, script_type, script_text)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, script_order ?? 999, script_type || 'question', script_text || '']
    );
    res.status(201).json(s);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/scripts/:id', attorneyOnly, async (req, res) => {
  const { script_type, script_text } = req.body;
  try {
    const { rows: [s] } = await pool.query(
      `UPDATE intake_scripts SET script_type=COALESCE($1,script_type), script_text=COALESCE($2,script_text)
       WHERE id=$3 RETURNING *`,
      [script_type || null, script_text != null ? script_text : null, req.params.id]
    );
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json(s);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/scripts/:id', attorneyOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM intake_scripts WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/templates/:id/scripts/reorder', attorneyOnly, async (req, res) => {
  const { script_ids } = req.body;
  if (!Array.isArray(script_ids)) return res.status(400).json({ error: 'script_ids required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < script_ids.length; i++) {
      await client.query('UPDATE intake_scripts SET script_order=$1 WHERE id=$2', [i, script_ids[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally { client.release(); }
});

// Fields
router.post('/templates/:id/fields', attorneyOnly, async (req, res) => {
  const { field_name, field_label, field_type, field_order, field_options, is_required, sol_field, field_section } = req.body;
  try {
    const { rows: [f] } = await pool.query(
      `INSERT INTO intake_fields
         (template_id, field_name, field_label, field_type, field_order, field_options, is_required, sol_field, field_section)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.id, field_name||null, field_label||'', field_type||'text', field_order??999,
       field_options?JSON.stringify(field_options):null, is_required||false, sol_field||false, field_section||null]
    );
    res.status(201).json(f);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/fields/:id', attorneyOnly, async (req, res) => {
  const { field_name, field_label, field_type, field_options, is_required, sol_field, field_section } = req.body;
  try {
    const { rows: [f] } = await pool.query(
      `UPDATE intake_fields
       SET field_name=COALESCE($1,field_name), field_label=COALESCE($2,field_label),
           field_type=COALESCE($3,field_type),
           field_options=CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE field_options END,
           is_required=COALESCE($5,is_required), sol_field=COALESCE($6,sol_field),
           field_section=COALESCE($7,field_section)
       WHERE id=$8 RETURNING *`,
      [field_name||null, field_label||null, field_type||null,
       field_options!=null?JSON.stringify(field_options):null,
       is_required!=null?is_required:null, sol_field!=null?sol_field:null,
       field_section||null, req.params.id]
    );
    if (!f) return res.status(404).json({ error: 'Not found' });
    res.json(f);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/fields/:id', attorneyOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM intake_fields WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/templates/:id/fields/reorder', attorneyOnly, async (req, res) => {
  const { field_ids } = req.body;
  if (!Array.isArray(field_ids)) return res.status(400).json({ error: 'field_ids required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < field_ids.length; i++) {
      await client.query('UPDATE intake_fields SET field_order=$1 WHERE id=$2', [i, field_ids[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally { client.release(); }
});

module.exports = router;
