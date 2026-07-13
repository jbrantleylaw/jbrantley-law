const router = require('express').Router();
const pool   = require('../config/db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

// ── Templates ─────────────────────────────────────────────────────────────────

router.get('/templates', async (req, res) => {
  try {
    const { rows: templates } = await pool.query(
      'SELECT * FROM workflow_templates ORDER BY name'
    );
    for (const t of templates) {
      const { rows: phases } = await pool.query(
        'SELECT * FROM workflow_template_phases WHERE template_id=$1 ORDER BY position',
        [t.id]
      );
      for (const p of phases) {
        const { rows: tasks } = await pool.query(
          'SELECT * FROM workflow_template_tasks WHERE phase_id=$1 ORDER BY position',
          [p.id]
        );
        p.tasks = tasks;
      }
      t.phases = phases;
    }
    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/templates', async (req, res) => {
  const { name, description, practice_area, phases = [] } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [t] } = await client.query(
      'INSERT INTO workflow_templates (name, description, practice_area) VALUES ($1,$2,$3) RETURNING *',
      [name.trim(), description || null, practice_area || null]
    );
    for (let pi = 0; pi < phases.length; pi++) {
      const phase = phases[pi];
      const { rows: [p] } = await client.query(
        'INSERT INTO workflow_template_phases (template_id, name, position) VALUES ($1,$2,$3) RETURNING *',
        [t.id, phase.name, pi]
      );
      for (let ti = 0; ti < (phase.tasks || []).length; ti++) {
        const task = phase.tasks[ti];
        await client.query(
          'INSERT INTO workflow_template_tasks (phase_id, name, description, days_offset, position) VALUES ($1,$2,$3,$4,$5)',
          [p.id, task.name, task.description || null, task.days_offset || 0, ti]
        );
      }
    }
    await client.query('COMMIT');
    res.status(201).json(t);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.put('/templates/:id', async (req, res) => {
  const { name, description, practice_area, phases = [] } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [t] } = await client.query(
      'UPDATE workflow_templates SET name=$1, description=$2, practice_area=$3 WHERE id=$4 RETURNING *',
      [name.trim(), description || null, practice_area || null, req.params.id]
    );
    if (!t) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    await client.query('DELETE FROM workflow_template_phases WHERE template_id=$1', [req.params.id]);
    for (let pi = 0; pi < phases.length; pi++) {
      const phase = phases[pi];
      const { rows: [p] } = await client.query(
        'INSERT INTO workflow_template_phases (template_id, name, position) VALUES ($1,$2,$3) RETURNING *',
        [t.id, phase.name, pi]
      );
      for (let ti = 0; ti < (phase.tasks || []).length; ti++) {
        const task = phase.tasks[ti];
        await client.query(
          'INSERT INTO workflow_template_tasks (phase_id, name, description, days_offset, position) VALUES ($1,$2,$3,$4,$5)',
          [p.id, task.name, task.description || null, task.days_offset || 0, ti]
        );
      }
    }
    await client.query('COMMIT');
    res.json(t);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM workflow_templates WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Matter Workflows ──────────────────────────────────────────────────────────

router.get('/matter/:matter_id', async (req, res) => {
  try {
    const { rows: workflows } = await pool.query(
      'SELECT * FROM matter_workflows WHERE matter_id=$1 ORDER BY started_at',
      [req.params.matter_id]
    );
    for (const w of workflows) {
      const { rows: phases } = await pool.query(
        'SELECT * FROM matter_workflow_phases WHERE matter_workflow_id=$1 ORDER BY position',
        [w.id]
      );
      for (const p of phases) {
        const { rows: tasks } = await pool.query(
          'SELECT * FROM matter_workflow_tasks WHERE matter_workflow_phase_id=$1 ORDER BY position',
          [p.id]
        );
        p.tasks = tasks;
      }
      w.phases = phases;
    }
    res.json(workflows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/matter/:matter_id/from-template/:template_id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [tmpl] } = await client.query(
      'SELECT * FROM workflow_templates WHERE id=$1', [req.params.template_id]
    );
    if (!tmpl) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Template not found' }); }

    const startDate = new Date();
    const { rows: [mw] } = await client.query(
      'INSERT INTO matter_workflows (matter_id, template_id, name) VALUES ($1,$2,$3) RETURNING *',
      [req.params.matter_id, tmpl.id, tmpl.name]
    );

    const { rows: phases } = await client.query(
      'SELECT * FROM workflow_template_phases WHERE template_id=$1 ORDER BY position', [tmpl.id]
    );
    for (const phase of phases) {
      const { rows: [mp] } = await client.query(
        'INSERT INTO matter_workflow_phases (matter_workflow_id, name, position) VALUES ($1,$2,$3) RETURNING *',
        [mw.id, phase.name, phase.position]
      );
      const { rows: tasks } = await client.query(
        'SELECT * FROM workflow_template_tasks WHERE phase_id=$1 ORDER BY position', [phase.id]
      );
      for (const task of tasks) {
        const due = new Date(startDate);
        due.setDate(due.getDate() + (task.days_offset || 0));
        await client.query(
          'INSERT INTO matter_workflow_tasks (matter_workflow_phase_id, name, description, due_date, position) VALUES ($1,$2,$3,$4,$5)',
          [mp.id, task.name, task.description, due.toISOString().slice(0,10), task.position]
        );
      }
    }
    await client.query('COMMIT');
    res.status(201).json(mw);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.patch('/workflow-tasks/:task_id/complete', async (req, res) => {
  try {
    const { rows: [t] } = await pool.query(
      'UPDATE matter_workflow_tasks SET completed_at = CASE WHEN completed_at IS NULL THEN NOW() ELSE NULL END WHERE id=$1 RETURNING *',
      [req.params.task_id]
    );
    res.json(t);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/matter-workflows/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM matter_workflows WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
