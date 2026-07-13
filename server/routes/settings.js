const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');
const bcrypt      = require('bcryptjs');

router.use(requireAuth, (req, res, next) => {
  if (req.user.role !== 'attorney') return res.status(403).json({ error: 'Attorney access only' });
  next();
});

// ── Firm settings ─────────────────────────────────────────────────────────────

router.get('/firm', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM firm_settings WHERE id=1');
    res.json(rows[0] || {});
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/firm', async (req, res) => {
  const { attorney_name, firm_name, phone, email, website, calendly_url, jurisdictions, tagline, pp_integration_mode } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE firm_settings SET
         attorney_name=$1, firm_name=$2, phone=$3, email=$4, website=$5,
         calendly_url=$6, jurisdictions=$7, tagline=$8, pp_integration_mode=$9, updated_at=NOW()
       WHERE id=1 RETURNING *`,
      [attorney_name, firm_name, phone, email, website, calendly_url, jurisdictions, tagline, pp_integration_mode || false]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Users ─────────────────────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, email, role, is_active, created_at
      FROM   users ORDER BY name
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/users', async (req, res) => {
  const { name, email, role, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password?.trim())
    return res.status(400).json({ error: 'name, email, and password required' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, must_change_password, is_active)
       VALUES ($1,$2,$3,$4,TRUE,TRUE) RETURNING id, name, email, role, is_active, created_at`,
      [name.trim(), email.trim().toLowerCase(), hash, role === 'attorney' ? 'attorney' : 'staff']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already in use' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:id', async (req, res) => {
  const { role } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET role=$1 WHERE id=$2 RETURNING id, name, email, role, is_active`,
      [role === 'attorney' ? 'attorney' : 'staff', req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/users/:id/deactivate', async (req, res) => {
  if (String(req.params.id) === String(req.user.id))
    return res.status(400).json({ error: 'Cannot deactivate yourself' });
  try {
    const { rows } = await pool.query(
      `UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id, name, email, role, is_active`,
      [req.body.is_active !== false, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
