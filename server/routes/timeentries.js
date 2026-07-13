const router = require('express').Router();
const pool   = require('../config/db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

const BASE_QUERY = `
  SELECT te.*,
    m.matter_number, m.matter_name,
    u.name AS staff_name
  FROM time_entries te
  LEFT JOIN matters m ON te.matter_id = m.id
  LEFT JOIN users   u ON te.user_id   = u.id
`;

router.get('/', async (req, res) => {
  try {
    const { matter_id, user_id, billable, invoiced, start_date, end_date } = req.query;
    const where = [];
    const params = [];
    let i = 1;

    if (matter_id)  { where.push(`te.matter_id = $${i++}`);   params.push(matter_id); }
    if (user_id)    { where.push(`te.user_id = $${i++}`);     params.push(user_id); }
    if (billable !== undefined) { where.push(`te.billable = $${i++}`); params.push(billable === 'true'); }
    if (invoiced !== undefined) { where.push(`te.invoiced = $${i++}`); params.push(invoiced === 'true'); }
    if (start_date) { where.push(`te.entry_date >= $${i++}`); params.push(start_date); }
    if (end_date)   { where.push(`te.entry_date <= $${i++}`); params.push(end_date); }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await pool.query(`${BASE_QUERY} ${clause} ORDER BY te.entry_date DESC, te.id DESC`, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { matter_id, entry_date, hours, rate, description, billable = true } = req.body;
  if (!hours || !description?.trim()) return res.status(400).json({ error: 'Hours and description are required' });
  try {
    const { rows: [row] } = await pool.query(
      `INSERT INTO time_entries (matter_id, user_id, entry_date, hours, rate, description, billable)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [matter_id || null, req.user.id, entry_date || new Date().toISOString().slice(0,10),
       hours, rate || null, description.trim(), billable]
    );
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { matter_id, entry_date, hours, rate, description, billable } = req.body;
  if (!hours || !description?.trim()) return res.status(400).json({ error: 'Hours and description are required' });
  try {
    const { rows: [row] } = await pool.query(
      `UPDATE time_entries SET matter_id=$1, entry_date=$2, hours=$3, rate=$4, description=$5, billable=$6
       WHERE id=$7 RETURNING *`,
      [matter_id || null, entry_date, hours, rate || null, description.trim(), billable ?? true, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM time_entries WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
