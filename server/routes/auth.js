const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');

const sign = (user) =>
  jwt.sign(
    {
      id:                   user.id,
      email:                user.email,
      role:                 user.role,
      name:                 user.name,
      must_change_password: user.must_change_password,
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, password_hash, role, must_change_password FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = sign(user);
    res.json({
      token,
      user: {
        id:                   user.id,
        name:                 user.name,
        email:                user.email,
        role:                 user.role,
        must_change_password: user.must_change_password,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, must_change_password FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// First-login and general password change
router.put('/change-password', requireAuth, async (req, res) => {
  const { new_password } = req.body;

  if (!new_password || new_password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const hash = await bcrypt.hash(new_password, 10);
    const { rows } = await pool.query(
      `UPDATE users
       SET password_hash = $1, must_change_password = FALSE
       WHERE id = $2
       RETURNING id, name, email, role, must_change_password`,
      [hash, req.user.id]
    );

    const user = rows[0];
    const token = sign(user);
    res.json({ token, user });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
