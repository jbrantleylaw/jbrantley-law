const router = require('express').Router();
const pool   = require('../config/db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || 11, 10), 100);
    const offset = parseInt(req.query.offset || 0, 10);
    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/count', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id=$1 AND read=FALSE`,
      [req.user.id]
    );
    res.json({ count: parseInt(rows[0].count, 10) });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET read=TRUE WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id/read', async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET read=TRUE WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/read-all', async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET read=TRUE WHERE user_id=$1 AND read=FALSE`, [req.user.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.put('/read-all', async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET read=TRUE WHERE user_id=$1 AND read=FALSE`, [req.user.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM notifications WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
