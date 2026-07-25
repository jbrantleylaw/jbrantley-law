const router  = require('express').Router();
const pool    = require('../config/db');
const require_auth = require('../middleware/auth');
const activity = require('../utils/activity');

router.use(require_auth);

const BASE = `
  SELECT t.*,
    m.matter_name, m.matter_number,
    u.name  AS assigned_name,
    cu.name AS created_by_name
  FROM tasks t
  LEFT JOIN matters m  ON t.matter_id  = m.id
  LEFT JOIN users   u  ON t.assigned_to = u.id
  LEFT JOIN users   cu ON t.created_by  = cu.id
`;

router.get('/', async (req, res) => {
  try {
    const { filter = 'my_tasks', matter_id } = req.query;
    const uid   = req.user.id;
    const today = new Date().toISOString().slice(0, 10);
    const where = [];
    const params = [];
    let i = 1;

    if (filter !== 'completed') where.push(`t.status != 'completed'`);

    // Visibility filter: attorneys see all; staff see public + own + assigned
    if (req.user.role !== 'attorney') {
      where.push(`(t.visibility = 'all' OR t.assigned_to = $${i} OR t.created_by = $${i})`);
      params.push(uid); i++;
    }

    switch (filter) {
      case 'my_tasks':
        where.push(`t.assigned_to = $${i++}`); params.push(uid); break;
      case 'overdue':
        where.push(`t.due_date < $${i++}`); params.push(today); break;
      case 'due_today':
        where.push(`t.due_date = $${i++}`); params.push(today); break;
      case 'due_this_week': {
        const end = new Date();
        end.setDate(end.getDate() + 7);
        where.push(`t.due_date BETWEEN $${i} AND $${i + 1}`);
        params.push(today, end.toISOString().slice(0, 10)); i += 2; break;
      }
      case 'completed':
        where.push(`t.status = 'completed'`); break;
      case 'all':
        if (req.user.role !== 'attorney') { where.push(`t.assigned_to = $${i++}`); params.push(uid); }
        break;
    }

    if (matter_id) { where.push(`t.matter_id = $${i++}`); params.push(matter_id); }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `${BASE} ${clause}
       ORDER BY
         CASE WHEN t.status='completed' THEN 1 ELSE 0 END,
         CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         t.due_date ASC NULLS LAST`,
      params
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`${BASE} WHERE t.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const { task_name, matter_id, assigned_to, due_date, priority, status, recurring, notes, visibility } = req.body;
    if (!task_name?.trim()) return res.status(400).json({ error: 'Task name is required' });
    const { rows } = await pool.query(
      `INSERT INTO tasks (task_name, matter_id, assigned_to, due_date, priority, status, recurring, notes, created_by, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [task_name.trim(), matter_id||null, assigned_to||null, due_date||null,
       priority||'medium', status||'not_started', recurring||'none', notes||null, req.user.id,
       visibility||'all']
    );
    await activity.log({ event_type:'task_created', description:`Task created: ${task_name.trim()}`, matter_id: matter_id||null, user_id: req.user.id, meta:{ task_id: rows[0].id } });
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/bulk', async (req, res) => {
  const { tasks } = req.body;
  if (!Array.isArray(tasks) || tasks.length === 0)
    return res.status(400).json({ error: 'tasks array required' });
  const results = []; const errors = [];
  for (const t of tasks) {
    if (!t.task_name?.trim()) continue; // skip blank rows silently
    try {
      const { rows } = await pool.query(
        `INSERT INTO tasks (task_name, matter_id, assigned_to, due_date, priority, status, recurring, notes, created_by, visibility)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [t.task_name.trim(), t.matter_id||null, t.assigned_to||null, t.due_date||null,
         t.priority||'medium', 'not_started', 'none', t.notes||null, req.user.id,
         t.visibility||'all']
      );
      results.push(rows[0]);
    } catch (err) { errors.push({ task: t.task_name, error: err.message }); }
  }
  res.status(201).json({ created: results.length, errors, tasks: results });
});

router.put('/:id', async (req, res) => {
  try {
    const { task_name, matter_id, assigned_to, due_date, priority, status, recurring, notes } = req.body;
    if (!task_name?.trim()) return res.status(400).json({ error: 'Task name is required' });
    const completedAt = status === 'completed'
      ? `(SELECT COALESCE(completed_at, NOW()) FROM tasks WHERE id = $9)`
      : 'NULL';
    const { rows } = await pool.query(
      `UPDATE tasks SET task_name=$1, matter_id=$2, assigned_to=$3, due_date=$4,
         priority=$5, status=$6, recurring=$7, notes=$8,
         completed_at=${completedAt}
       WHERE id=$9 RETURNING *`,
      [task_name.trim(), matter_id||null, assigned_to||null, due_date||null,
       priority||'medium', status||'not_started', recurring||'none', notes||null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id/complete', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE tasks SET status='completed', completed_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    await activity.log({ event_type:'task_completed', description:`Task completed: ${rows[0].task_name}`, matter_id: rows[0].matter_id||null, user_id: req.user.id, meta:{ task_id: rows[0].id } });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
