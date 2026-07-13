const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth, (req, res, next) => {
  if (req.user.role !== 'attorney') return res.status(403).json({ error: 'Attorney access only' });
  next();
});

// ── Contacts import ───────────────────────────────────────────────────────────

router.post('/contacts', async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0)
    return res.status(400).json({ error: 'records array required' });

  const results = { imported: 0, skipped: 0, duplicates: 0, errors: [] };

  for (const r of records) {
    try {
      // Duplicate detection: same first_name + last_name + email
      if (r.email) {
        const { rows: existing } = await pool.query(
          `SELECT id FROM contacts WHERE LOWER(first_name)=LOWER($1) AND LOWER(last_name)=LOWER($2) AND LOWER(email)=LOWER($3)`,
          [r.first_name || '', r.last_name || '', r.email]
        );
        if (existing.length > 0) {
          results.duplicates++;
          results.errors.push({ record: `${r.first_name} ${r.last_name}`, reason: 'Duplicate (same name + email)' });
          continue;
        }
      }

      if (!r.first_name && !r.last_name) {
        results.skipped++;
        results.errors.push({ record: JSON.stringify(r), reason: 'Missing name' });
        continue;
      }

      await pool.query(
        `INSERT INTO contacts (first_name, last_name, company, email, phone, address, contact_type, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          r.first_name || '',
          r.last_name  || '',
          r.company    || null,
          r.email      || null,
          r.phone      || null,
          r.address    || null,
          r.contact_type || 'client',
          r.notes      || null,
        ]
      );
      results.imported++;
    } catch (err) {
      results.errors.push({ record: `${r.first_name} ${r.last_name}`, reason: err.message });
      results.skipped++;
    }
  }

  res.json(results);
});

// ── Matters import ────────────────────────────────────────────────────────────

const STATUS_MAP = {
  active: 'open', open: 'open',
  closed: 'closed', close: 'closed',
  pending: 'pending',
  inactive: 'inactive',
};

router.post('/matters', async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0)
    return res.status(400).json({ error: 'records array required' });

  // Pre-fetch contacts for name matching
  const { rows: contacts } = await pool.query(
    `SELECT id, LOWER(first_name || ' ' || last_name) AS full_name FROM contacts`
  );
  const contactMap = {};
  contacts.forEach(c => { contactMap[c.full_name] = c.id; });

  // Pre-fetch users for assigned_staff matching
  const { rows: users } = await pool.query(`SELECT id, LOWER(name) AS name FROM users`);
  const userMap = {};
  users.forEach(u => { userMap[u.name] = u.id; });

  const results = { imported: 0, skipped: 0, duplicates: 0, errors: [] };

  for (const r of records) {
    try {
      if (!r.matter_name) {
        results.skipped++;
        results.errors.push({ record: 'Unknown matter', reason: 'Missing matter name' });
        continue;
      }

      // Look up client_id by name
      const clientId = r.client
        ? (contactMap[r.client.toLowerCase().trim()] || null)
        : null;

      // Look up assigned_staff user id
      const staffId = r.assigned_to
        ? (userMap[r.assigned_to.toLowerCase().trim()] || null)
        : null;

      // Map status
      const rawStatus = (r.status || 'active').toLowerCase().trim();
      const status = STATUS_MAP[rawStatus] || 'open';

      // Auto-generate matter number
      const year = new Date().getFullYear();
      const { rows: last } = await pool.query(
        `SELECT matter_number FROM matters WHERE matter_number LIKE $1 ORDER BY matter_number DESC LIMIT 1`,
        [`JBL-${year}-%`]
      );
      let seq = 1;
      if (last[0]) {
        const parts = last[0].matter_number.split('-');
        seq = parseInt(parts[2], 10) + 1;
      }
      const matter_number = `JBL-${year}-${String(seq).padStart(4, '0')}`;

      // Combine notes with close_date if present
      let notes = r.notes || null;
      if (r.close_date) {
        notes = notes ? `${notes}\nClose Date (PP): ${r.close_date}` : `Close Date (PP): ${r.close_date}`;
      }

      await pool.query(
        `INSERT INTO matters (matter_number, matter_name, client_id, practice_area, status, open_date, description, assigned_staff, notes)
         VALUES ($1,$2,$3,$4,$5::matter_status,$6,$7,$8,$9)`,
        [
          matter_number,
          r.matter_name,
          clientId,
          r.practice_area || null,
          status,
          r.open_date    || null,
          r.description  || null,
          staffId,
          notes,
        ]
      );
      results.imported++;
    } catch (err) {
      results.errors.push({ record: r.matter_name || 'Unknown', reason: err.message });
      results.skipped++;
    }
  }

  res.json(results);
});

module.exports = router;
