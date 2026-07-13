const router = require('express').Router();
const pool   = require('../config/db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end dates required' });

    const [evRes, solRes] = await Promise.all([
      pool.query(
        `SELECT e.*, m.matter_name, m.matter_number, u.name AS assigned_name
         FROM events e
         LEFT JOIN matters m ON e.matter_id = m.id
         LEFT JOIN users   u ON e.assigned_to = u.id
         WHERE e.event_date BETWEEN $1 AND $2
         ORDER BY e.event_date, e.start_time NULLS LAST`,
        [start, end]
      ),
      pool.query(
        `SELECT id, matter_number, matter_name, sol_date
         FROM matters
         WHERE sol_date BETWEEN $1 AND $2
           AND status NOT IN ('closed','inactive')`,
        [start, end]
      ),
    ]);

    const solEvents = solRes.rows.map((m) => ({
      id:           `sol-${m.id}`,
      title:        `SOL — ${m.matter_name}`,
      event_type:   'sol',
      matter_id:    m.id,
      event_date:   m.sol_date,
      matter_name:  m.matter_name,
      matter_number: m.matter_number,
      is_sol:       true,
      is_virtual:   true,
    }));

    res.json([...evRes.rows, ...solEvents]
      .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date))));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, event_type, matter_id, event_date, start_time, end_time, location, assigned_to, reminder, notes } = req.body;
    if (!title?.trim() || !event_date) return res.status(400).json({ error: 'Title and date are required' });
    const { rows } = await pool.query(
      `INSERT INTO events (title, event_type, matter_id, event_date, start_time, end_time, location, assigned_to, reminder, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [title.trim(), event_type||'other', matter_id||null, event_date,
       start_time||null, end_time||null, location||null, assigned_to||null,
       reminder||null, notes||null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, event_type, matter_id, event_date, start_time, end_time, location, assigned_to, reminder, notes } = req.body;
    if (!title?.trim() || !event_date) return res.status(400).json({ error: 'Title and date are required' });
    const { rows } = await pool.query(
      `UPDATE events SET title=$1, event_type=$2, matter_id=$3, event_date=$4,
         start_time=$5, end_time=$6, location=$7, assigned_to=$8, reminder=$9, notes=$10
       WHERE id=$11 RETURNING *`,
      [title.trim(), event_type||'other', matter_id||null, event_date,
       start_time||null, end_time||null, location||null, assigned_to||null,
       reminder||null, notes||null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Event not found' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM events WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Event not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
