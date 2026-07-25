const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { matter_id, contact_id, limit = 50 } = req.query;
    const where = []; const params = []; let i = 1;
    if (matter_id)  { where.push(`al.matter_id = $${i++}`);  params.push(matter_id); }
    if (contact_id) { where.push(`al.contact_id = $${i++}`); params.push(contact_id); }
    params.push(Math.min(parseInt(limit, 10) || 50, 200));
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await pool.query(`
      SELECT al.*,
        u.name AS actor_name,
        m.matter_name, m.matter_number,
        CONCAT(c.first_name, ' ', c.last_name) AS contact_name
      FROM activity_log al
      LEFT JOIN users    u ON al.user_id    = u.id
      LEFT JOIN matters  m ON al.matter_id  = m.id
      LEFT JOIN contacts c ON al.contact_id = c.id
      ${clause}
      ORDER BY al.created_at DESC
      LIMIT $${i}
    `, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { event_type, description, matter_id, contact_id, meta } = req.body;
  if (!event_type) return res.status(400).json({ error: 'event_type required' });
  try {
    const { rows: [row] } = await pool.query(
      `INSERT INTO activity_log (event_type, description, matter_id, contact_id, user_id, meta)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [event_type, description || null, matter_id || null, contact_id || null, req.user.id, JSON.stringify(meta || {})]
    );
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
