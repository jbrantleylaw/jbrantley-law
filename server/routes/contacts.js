const router = require('express').Router();
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { search, type, status } = req.query;
    const params = [];
    const where = [];
    let i = 1;

    if (search) {
      where.push(`(first_name ILIKE $${i} OR last_name ILIKE $${i} OR company ILIKE $${i} OR email ILIKE $${i} OR phone ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }
    if (type) {
      where.push(`contact_type = $${i}`);
      params.push(type);
      i++;
    }
    if (status) {
      where.push(`COALESCE(status, 'active') = $${i}`);
      params.push(status);
      i++;
    } else {
      where.push(`COALESCE(status, 'active') != 'archived'`);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT * FROM contacts ${clause} ORDER BY last_name ASC, first_name ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q = '' } = req.query;
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, company, email
       FROM contacts
       WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR company ILIKE $1 OR email ILIKE $1)
         AND COALESCE(status,'active') != 'archived'
       ORDER BY last_name ASC, first_name ASC
       LIMIT 10`,
      [`%${q}%`]
    );
    res.json(rows.map(r => ({
      value: r.id,
      label: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.company || '',
      sublabel: r.company || r.email || '',
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM contacts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Contact not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, company, phone, email, address, contact_type, notes } = req.body;
    if (!first_name?.trim() || !last_name?.trim())
      return res.status(400).json({ error: 'First and last name are required' });

    const { rows } = await pool.query(
      `INSERT INTO contacts (first_name, last_name, company, phone, email, address, contact_type, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [first_name.trim(), last_name.trim(), company||null, phone||null, email||null, address||null, contact_type||null, notes||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { first_name, last_name, company, phone, email, address, contact_type, notes } = req.body;
    if (!first_name?.trim() || !last_name?.trim())
      return res.status(400).json({ error: 'First and last name are required' });

    const { rows } = await pool.query(
      `UPDATE contacts SET
        first_name=$1, last_name=$2, company=$3, phone=$4,
        email=$5, address=$6, contact_type=$7, notes=$8
       WHERE id=$9 RETURNING *`,
      [first_name.trim(), last_name.trim(), company||null, phone||null, email||null, address||null, contact_type||null, notes||null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Contact not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'closed', 'archived'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  try {
    const { rows } = await pool.query(
      'UPDATE contacts SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Contact not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM contacts WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Contact not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
