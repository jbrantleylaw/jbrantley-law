const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

const BASE = `
  SELECT n.*, u.name AS author_name,
    m.matter_name, m.matter_number,
    CONCAT(c.first_name, ' ', c.last_name) AS contact_name
  FROM notes n
  LEFT JOIN users    u ON n.created_by = u.id
  LEFT JOIN matters  m ON n.matter_id  = m.id
  LEFT JOIN contacts c ON n.contact_id = c.id
`;

router.get('/', async (req, res) => {
  try {
    const { matter_id, contact_id } = req.query;
    const where = []; const params = []; let i = 1;
    if (matter_id)  { where.push(`n.matter_id = $${i++}`);  params.push(matter_id); }
    if (contact_id) { where.push(`n.contact_id = $${i++}`); params.push(contact_id); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await pool.query(`${BASE} ${clause} ORDER BY n.created_at DESC`, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { content, matter_id, contact_id } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });
  try {
    const { rows: [row] } = await pool.query(
      `INSERT INTO notes (content, matter_id, contact_id, created_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [content.trim(), matter_id || null, contact_id || null, req.user.id]
    );
    await logActivity(pool, {
      event_type:  'note_added',
      description: `Note added`,
      matter_id:   matter_id || null,
      contact_id:  contact_id || null,
      user_id:     req.user.id,
      meta:        { note_id: row.id },
    });
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });
  try {
    const check = await pool.query('SELECT created_by FROM notes WHERE id=$1', [req.params.id]);
    if (!check.rows[0]) return res.status(404).json({ error: 'Note not found' });
    if (req.user.role !== 'attorney' && check.rows[0].created_by !== req.user.id)
      return res.status(403).json({ error: 'Can only edit your own notes' });
    const { rows: [row] } = await pool.query(
      `UPDATE notes SET content=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [content.trim(), req.params.id]
    );
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const check = await pool.query('SELECT created_by FROM notes WHERE id=$1', [req.params.id]);
    if (!check.rows[0]) return res.status(404).json({ error: 'Note not found' });
    if (req.user.role !== 'attorney' && check.rows[0].created_by !== req.user.id)
      return res.status(403).json({ error: 'Can only delete your own notes' });
    await pool.query('DELETE FROM notes WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

async function logActivity(pool, { event_type, description, matter_id, contact_id, user_id, meta = {} }) {
  try {
    await pool.query(
      `INSERT INTO activity_log (event_type, description, matter_id, contact_id, user_id, meta)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [event_type, description, matter_id, contact_id, user_id, JSON.stringify(meta)]
    );
  } catch {}
}

module.exports = router;
