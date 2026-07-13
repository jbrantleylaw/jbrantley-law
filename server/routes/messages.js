const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');
const crypto      = require('crypto');

// ── Auth-gated routes ─────────────────────────────────────────────────────────

const authRouter = require('express').Router();
authRouter.use(requireAuth);

// GET /api/messages/unread-count

authRouter.get('/unread-count', async (req, res) => {
  try {
    const isAttorney = req.user.role === 'attorney';
    let query, params;
    if (isAttorney) {
      // Attorney sees all unread messages in all threads
      query = `SELECT COUNT(*) AS count FROM messages m
               JOIN message_threads mt ON m.thread_id = mt.id
               WHERE m.read_at IS NULL AND m.sender_id != $1`;
      params = [req.user.id];
    } else {
      // Staff sees unread in threads on their assigned matters
      query = `SELECT COUNT(*) AS count FROM messages m
               JOIN message_threads mt ON m.thread_id = mt.id
               JOIN matters ma ON mt.matter_id = ma.id
               WHERE m.read_at IS NULL AND m.sender_id != $1
                 AND (ma.assigned_staff = $1 OR mt.created_by = $1)`;
      params = [req.user.id];
    }
    const { rows } = await pool.query(query, params);
    res.json({ count: Number(rows[0].count) });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/messages/threads

authRouter.get('/threads', async (req, res) => {
  const isAttorney = req.user.role === 'attorney';
  const { thread_type } = req.query;
  const params = []; const where = [];
  if (thread_type) { params.push(thread_type); where.push(`mt.thread_type = $${params.length}`); }
  if (!isAttorney) {
    // Staff only sees threads for their matters or threads they created
    params.push(req.user.id);
    where.push(`(ma.assigned_staff = $${params.length} OR mt.created_by = $${params.length})`);
  }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  try {
    const { rows } = await pool.query(`
      SELECT mt.*,
             m.matter_number, m.matter_name,
             u.name AS created_by_name,
             (SELECT COUNT(*) FROM messages msg WHERE msg.thread_id = mt.id) AS message_count,
             (SELECT COUNT(*) FROM messages msg WHERE msg.thread_id = mt.id AND msg.read_at IS NULL AND msg.sender_id != $${params.length + 1}) AS unread_count,
             (SELECT msg.sent_at FROM messages msg WHERE msg.thread_id = mt.id ORDER BY msg.sent_at DESC LIMIT 1) AS last_message_at
      FROM   message_threads mt
      LEFT JOIN matters m ON mt.matter_id = m.id
      LEFT JOIN matters ma ON mt.matter_id = ma.id
      LEFT JOIN users   u ON mt.created_by = u.id
      ${clause}
      ORDER  BY last_message_at DESC NULLS LAST, mt.created_at DESC
    `, [...params, req.user.id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/messages/threads

authRouter.post('/threads', async (req, res) => {
  const { matter_id, subject, thread_type, client_email, client_name } = req.body;
  if (!subject) return res.status(400).json({ error: 'subject required' });
  const type = thread_type === 'client' ? 'client' : 'internal';
  const token = type === 'client' ? crypto.randomBytes(32).toString('hex') : null;
  try {
    const { rows } = await pool.query(`
      INSERT INTO message_threads (matter_id, subject, thread_type, created_by, client_email, client_name, secure_token)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [matter_id || null, subject, type, req.user.id, client_email || null, client_name || null, token]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/messages/threads/:id/messages

authRouter.get('/threads/:id/messages', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.*, u.name AS user_name
      FROM   messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE  m.thread_id = $1
      ORDER  BY m.sent_at ASC
    `, [req.params.id]);

    // Mark all staff messages as read
    await pool.query(
      `UPDATE messages SET read_at = NOW() WHERE thread_id=$1 AND read_at IS NULL AND sender_id != $2`,
      [req.params.id, req.user.id]
    );

    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/messages/threads/:id/messages

authRouter.post('/threads/:id/messages', async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'body required' });
  try {
    const { rows } = await pool.query(`
      INSERT INTO messages (thread_id, sender_type, sender_id, sender_name, body)
      VALUES ($1,'staff',$2,$3,$4) RETURNING *
    `, [req.params.id, req.user.id, req.user.name, body.trim()]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Public client portal routes (no auth, token-based) ────────────────────────

const publicRouter = require('express').Router();

// GET /api/messages/portal/:token — get thread and messages for client

publicRouter.get('/portal/:token', async (req, res) => {
  try {
    const { rows: threads } = await pool.query(
      `SELECT mt.*, m.matter_number, m.matter_name FROM message_threads mt
       LEFT JOIN matters m ON mt.matter_id = m.id
       WHERE mt.secure_token = $1`,
      [req.params.token]
    );
    if (!threads[0]) return res.status(404).json({ error: 'Invalid or expired link' });
    const { rows: msgs } = await pool.query(
      `SELECT m.*, u.name AS user_name FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.thread_id = $1 ORDER BY m.sent_at ASC`,
      [threads[0].id]
    );
    // Mark client-unread staff messages as read
    await pool.query(
      `UPDATE messages SET read_at=NOW() WHERE thread_id=$1 AND sender_type='staff' AND read_at IS NULL`,
      [threads[0].id]
    );
    const { secure_token, ...safeThread } = threads[0];
    res.json({ thread: safeThread, messages: msgs });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/messages/portal/:token — client replies

publicRouter.post('/portal/:token', async (req, res) => {
  const { body, client_name } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'body required' });
  try {
    const { rows: threads } = await pool.query(
      'SELECT * FROM message_threads WHERE secure_token=$1', [req.params.token]
    );
    if (!threads[0]) return res.status(404).json({ error: 'Invalid link' });
    const name = client_name || threads[0].client_name || 'Client';
    const { rows } = await pool.query(`
      INSERT INTO messages (thread_id, sender_type, sender_id, sender_name, body)
      VALUES ($1,'client',NULL,$2,$3) RETURNING *
    `, [threads[0].id, name, body.trim()]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.use('/', authRouter);
router.use('/', publicRouter);

module.exports = router;
