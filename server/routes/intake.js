const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');
const { getIntakeScript, getFormFields } = require('../services/intakeData');

router.use(requireAuth);

// ── Static data ──────────────────────────────────────────────────────────────

router.get('/scripts/:practiceArea', (req, res) => {
  const script = getIntakeScript(decodeURIComponent(req.params.practiceArea));
  if (!script) return res.status(404).json({ error: 'Script not found for that practice area' });
  res.json(script);
});

router.get('/form-fields/:practiceArea', (req, res) => {
  const fields = getFormFields(decodeURIComponent(req.params.practiceArea));
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

module.exports = router;
