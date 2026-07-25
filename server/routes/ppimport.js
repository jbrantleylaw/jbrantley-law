const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');
const { parse }           = require('csv-parse/sync');
const csvParseCallback    = require('csv-parse');

// Wrap callback parser in a Promise for async use
function parseAsync(text, opts) {
  return new Promise((resolve, reject) => {
    csvParseCallback(text, opts, (err, records) => {
      if (err) reject(err);
      else resolve(records);
    });
  });
}

router.use(requireAuth, (req, res, next) => {
  if (req.user.role !== 'attorney') return res.status(403).json({ error: 'Attorney access only' });
  next();
});

// ── CSV column mapper (PracticePanther export format) ─────────────────────────

function mapContact(row) {
  const firstName = row['Contact: FirstName']   || row['First Name'] || '';
  const lastName  = row['Contact: LastName']    || row['Last Name']  || '';
  const company   = row['Contact: CompanyName'] || row['Company']    || '';
  const email     = row['Contact: Email']       || row['Email']      || '';

  const phone = row['Contact: MobileNumber'] || row['Contact: OfficeNumber'] || row['Contact: HomeNumber'] || row['Phone'] || '';

  const street  = [row['Contact: Street1'], row['Contact: Street2']].filter(Boolean).join(', ');
  const city    = row['Contact: City']           || row['City']   || '';
  const state   = row['Contact: ProvinceState']  || row['State']  || '';
  const zip     = row['Contact: ZipPostalCode']  || row['Zip']    || '';
  const country = row['Contact: Country']        || '';
  const cityLine = [city, state].filter(Boolean).join(', ') + (zip ? ` ${zip}` : '') + (country && country !== 'United States' ? `, ${country}` : '');
  const address = [street, cityLine].filter(Boolean).join(', ');

  const noteParts = [
    row['Contact: ContactNotes'] || row['Notes'] || '',
    row['Contact: CompanyNotes']              ? `Company notes: ${row['Contact: CompanyNotes']}` : '',
    row['Contact: Tags']                      ? `Tags: ${row['Contact: Tags']}`                   : '',
    row['Contact: Website']                   ? `Website: ${row['Contact: Website']}`             : '',
    row['URL']                                ? `URL: ${row['URL']}`                              : '',
    row['Contact: AssignedTo']                ? `Assigned to: ${row['Contact: AssignedTo']}`      : '',
    row['Contact: Preferred Contact Method']  ? `Preferred contact: ${row['Contact: Preferred Contact Method']}` : '',
    row['Contact: Number']                    ? `PP #: ${row['Contact: Number']}`                 : '',
  ].filter(Boolean);

  const _errors = [];
  if (!firstName && !lastName && !company) _errors.push('Missing name');

  return {
    first_name:   firstName,
    last_name:    lastName,
    company,
    email,
    phone,
    address,
    contact_type: 'client',
    notes:        noteParts.join('\n') || '',
    _valid: !!(firstName || lastName || company),
    _errors,
  };
}

// ── Parse CSV endpoint — returns mapped records for preview ───────────────────

router.post('/contacts/parse', (req, res) => {
  try {
    const csvText = req.body.csv;
    if (!csvText || typeof csvText !== 'string') return res.status(400).json({ error: 'csv field required' });
    const raw = parse(csvText, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true, bom: true });
    const records = raw.map(mapContact);
    res.json({ records });
  } catch (err) {
    res.status(400).json({ error: `CSV parse error: ${err.message}` });
  }
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

// ── PP Matters helpers ────────────────────────────────────────────────────────

function parsePPDate(str) {
  if (!str || !str.trim()) return null;
  const s = str.trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function extractContactName(str) {
  if (!str || !str.trim()) return '';
  return str.trim().replace(/^\d+\s*-\s*/, '').trim();
}

const stripMoney = (s) => (s || '').replace(/[$,]/g, '').trim();

function buildMatterNotes(row, contactName, contactMatched) {
  const parts = [];
  if (row['Number'])       parts.push(`PP Matter #: ${row['Number']}`);
  if (row['Notes'])        parts.push(row['Notes']);
  if (row['Billable'])     parts.push(`Billed: ${stripMoney(row['Billable'])}`);
  if (row['Trust'])        parts.push(`Trust Balance: ${stripMoney(row['Trust'])}`);
  if (row['Operating'])    parts.push(`Operating Balance: ${stripMoney(row['Operating'])}`);
  if (row['Invoices Due']) parts.push(`Invoices Due: ${stripMoney(row['Invoices Due'])}`);
  if (row['Tags'])         parts.push(`Tags: ${row['Tags']}`);
  if (!contactMatched && contactName) parts.push(`PP Contact: ${contactName}`);
  const solRaw = row['Statute of Limitations'] || '';
  if (solRaw && !parsePPDate(solRaw)) parts.push(`Statute of Limitations: ${solRaw}`);
  return parts.filter(Boolean).join('\n') || null;
}

const PP_FEE_MAP = { 'flat rate': 'flat_fee', 'hourly': 'hourly', 'contingency': 'contingency' };
const PP_STATUS_MAP = { 'open': 'open', 'active': 'open', 'closed': 'closed', 'pending': 'pending', 'inactive': 'inactive' };

function mapMatterFromPP(row, contactMap, userMap) {
  const contactRaw  = row['Contact'] || '';
  const contactName = extractContactName(contactRaw);
  const clientId    = contactName ? (contactMap[contactName.toLowerCase()] || null) : null;

  const rawStatus = (row['Status'] || 'Open').toLowerCase().trim();
  const status    = PP_STATUS_MAP[rawStatus] || 'open';

  const assignedRaw  = row['Assigned To'] || '';
  let   assignedName = null;
  if (/\bJNB\b/i.test(assignedRaw) || /jennifer.*brantley/i.test(assignedRaw)) {
    assignedName = 'jennifer n. brantley';
  } else if (assignedRaw.trim()) {
    assignedName = assignedRaw.trim().toLowerCase();
  }
  const staffId = assignedName ? (userMap[assignedName] || null) : null;

  const feeTypeRaw = (row['Matter Rate'] || '').toLowerCase().trim();
  const feeType    = PP_FEE_MAP[feeTypeRaw] || null;

  const notes = buildMatterNotes(row, contactName, !!clientId);

  return {
    matter_name:       row['Matter'] || '',
    contact_name:      contactName,
    client_id:         clientId,
    staff_id:          staffId,
    status,
    open_date:         parsePPDate(row['Open Date']),
    close_date:        parsePPDate(row['Close Date']),
    sol_date:          parsePPDate(row['Statute of Limitations']),
    fee_type:          feeType,
    notes,
    _contact_matched:  !!clientId && !!contactName,
    _contact_unmatched: !!contactName && !clientId,
    _valid:            !!(row['Matter']),
    _errors:           row['Matter'] ? [] : ['Missing matter name'],
  };
}

// ── Matters parse endpoint ────────────────────────────────────────────────────

router.post('/matters/parse', async (req, res) => {
  try {
    const csvText = req.body.csv;
    if (!csvText || typeof csvText !== 'string') return res.status(400).json({ error: 'csv field required' });
    let raw;
    try {
      raw = await parseAsync(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
        bom: true,
      });
    } catch (parseErr) {
      console.error('CSV Parse error:', parseErr.message);
      return res.status(400).json({ error: 'Failed to parse CSV: ' + parseErr.message });
    }
    const [{ rows: contacts }, { rows: users }] = await Promise.all([
      pool.query(`SELECT id, LOWER(CONCAT(first_name,' ',last_name)) AS full_name, LOWER(COALESCE(company,'')) AS company FROM contacts`),
      pool.query(`SELECT id, LOWER(name) AS name FROM users`),
    ]);
    const contactMap = {};
    contacts.forEach(c => {
      if (c.full_name.trim()) contactMap[c.full_name.trim()] = c.id;
      if (c.company.trim())   contactMap[c.company.trim()]   = c.id;
    });
    const userMap = {};
    users.forEach(u => { if (u.name) userMap[u.name.trim()] = u.id; });
    const records = raw.map(row => mapMatterFromPP(row, contactMap, userMap));
    res.json({ records });
  } catch (err) {
    res.status(400).json({ error: `CSV parse error: ${err.message}` });
  }
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

  // Pre-fetch contacts and users for name matching (fallback when not pre-parsed)
  const [{ rows: contacts }, { rows: users }] = await Promise.all([
    pool.query(`SELECT id, LOWER(first_name || ' ' || last_name) AS full_name FROM contacts`),
    pool.query(`SELECT id, LOWER(name) AS name FROM users`),
  ]);
  const contactMap = {};
  contacts.forEach(c => { if (c.full_name.trim()) contactMap[c.full_name.trim()] = c.id; });
  const userMap = {};
  users.forEach(u => { if (u.name) userMap[u.name.trim()] = u.id; });

  const results = { imported: 0, skipped: 0, duplicates: 0, errors: [] };

  for (const r of records) {
    try {
      if (!r.matter_name) {
        results.skipped++;
        results.errors.push({ record: 'Unknown matter', reason: 'Missing matter name' });
        continue;
      }

      // Duplicate detection by matter_name
      const { rows: existing } = await pool.query(
        `SELECT id FROM matters WHERE LOWER(matter_name)=LOWER($1)`, [r.matter_name]
      );
      if (existing.length > 0) {
        results.duplicates++;
        results.errors.push({ record: r.matter_name, reason: 'Duplicate (matter name already exists)' });
        continue;
      }

      // Use pre-matched client_id if available, else look up by name
      const clientId = r.client_id != null
        ? r.client_id
        : (r.client ? (contactMap[r.client.toLowerCase().trim()] || null) : null);

      // Use pre-matched staff_id if available, else look up by assigned_to name
      const staffId = r.staff_id != null
        ? r.staff_id
        : (r.assigned_to ? (userMap[r.assigned_to.toLowerCase().trim()] || null) : null);

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
      if (last[0]) { const parts = last[0].matter_number.split('-'); seq = parseInt(parts[2], 10) + 1; }
      const matter_number = `JBL-${year}-${String(seq).padStart(4, '0')}`;

      // Combine notes
      let notes = r.notes || null;
      const extra = [];
      if (r.close_date) extra.push(`Close Date (PP): ${r.close_date}`);
      if (r.fee_type)   extra.push(`Fee Type: ${r.fee_type}`);
      if (extra.length) notes = notes ? `${notes}\n${extra.join('\n')}` : extra.join('\n');

      await pool.query(
        `INSERT INTO matters (matter_number, matter_name, client_id, practice_area, status, open_date, sol_date, description, assigned_staff, notes)
         VALUES ($1,$2,$3,$4,$5::matter_status,$6,$7,$8,$9,$10)`,
        [
          matter_number,
          r.matter_name,
          clientId,
          r.practice_area || null,
          status,
          r.open_date     || null,
          r.sol_date      || null,
          r.description   || null,
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
