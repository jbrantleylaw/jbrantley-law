const router = require('express').Router();
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');
const activity = require('../utils/activity');

router.use(requireAuth);

const LIST_QUERY = `
  SELECT
    m.*,
    CONCAT(c.first_name, ' ', c.last_name) AS client_name,
    u.name AS assigned_staff_name
  FROM matters m
  LEFT JOIN contacts c ON m.client_id = c.id
  LEFT JOIN users   u ON m.assigned_staff = u.id
`;

router.get('/next-number', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const { rows } = await pool.query(
      `SELECT matter_number FROM matters
       WHERE matter_number LIKE $1
       ORDER BY matter_number DESC LIMIT 1`,
      [`JBL-${year}-%`]
    );
    let seq = 1;
    if (rows[0]) {
      const parts = rows[0].matter_number.split('-');
      seq = parseInt(parts[2], 10) + 1;
    }
    res.json({ number: `JBL-${year}-${String(seq).padStart(4, '0')}` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search, status, practice_area, contact_id } = req.query;
    const params = [];
    const where = [];
    let i = 1;

    if (search) {
      where.push(`(m.matter_number ILIKE $${i} OR m.matter_name ILIKE $${i} OR c.first_name ILIKE $${i} OR c.last_name ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }
    if (status) {
      where.push(`m.status = $${i}::matter_status`);
      params.push(status);
      i++;
    }
    if (practice_area) {
      where.push(`m.practice_area = $${i}`);
      params.push(practice_area);
      i++;
    }
    if (contact_id) {
      where.push(`m.client_id = $${i}`);
      params.push(contact_id);
      i++;
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `${LIST_QUERY} ${clause} ORDER BY m.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${LIST_QUERY} WHERE m.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Matter not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      matter_number, matter_name, practice_area, status,
      open_date, sol_date, client_id, assigned_staff, description, notes,
    } = req.body;

    if (!matter_number?.trim() || !matter_name?.trim())
      return res.status(400).json({ error: 'Matter number and name are required' });

    const { rows } = await pool.query(
      `INSERT INTO matters
         (matter_number, matter_name, practice_area, status, open_date, sol_date, client_id, assigned_staff, description, notes)
       VALUES ($1,$2,$3,$4::matter_status,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        matter_number.trim(), matter_name.trim(),
        practice_area || null, status || 'open',
        open_date || null, sol_date || null,
        client_id || null, assigned_staff || null,
        description || null, notes || null,
      ]
    );
    await activity.log({ event_type:'matter_created', description:`Matter opened: ${matter_name.trim()}`, matter_id: rows[0].id, contact_id: client_id||null, user_id: req.user.id, meta:{ matter_number: rows[0].matter_number } });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'Matter number already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      matter_number, matter_name, practice_area, status,
      open_date, sol_date, client_id, assigned_staff, description, notes,
    } = req.body;

    if (!matter_number?.trim() || !matter_name?.trim())
      return res.status(400).json({ error: 'Matter number and name are required' });

    const { rows } = await pool.query(
      `UPDATE matters SET
         matter_number=$1, matter_name=$2, practice_area=$3, status=$4::matter_status,
         open_date=$5, sol_date=$6, client_id=$7, assigned_staff=$8,
         description=$9, notes=$10
       WHERE id=$11 RETURNING *`,
      [
        matter_number.trim(), matter_name.trim(),
        practice_area || null, status || 'open',
        open_date || null, sol_date || null,
        client_id || null, assigned_staff || null,
        description || null, notes || null,
        req.params.id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Matter not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'Matter number already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['open', 'pending', 'closed', 'inactive', 'archived', 'on_hold'];
  if (!valid.includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  try {
    const { rows } = await pool.query(
      'UPDATE matters SET status=$1::matter_status WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Matter not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM matters WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Matter not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Matter Staff ──────────────────────────────────────────────────────────────

router.get('/:id/staff', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.role, ms.added_at
       FROM matter_staff ms JOIN users u ON ms.user_id = u.id
       WHERE ms.matter_id = $1 ORDER BY ms.added_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/staff', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  try {
    await pool.query(
      'INSERT INTO matter_staff (matter_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.id, user_id]
    );
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.role, ms.added_at
       FROM matter_staff ms JOIN users u ON ms.user_id = u.id
       WHERE ms.matter_id = $1 ORDER BY ms.added_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/staff/:user_id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM matter_staff WHERE matter_id=$1 AND user_id=$2',
      [req.params.id, req.params.user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
