const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');
const { generateMatterSummaryPdf } = require('../services/billingPdfService');

router.use(requireAuth, (req, res, next) => {
  if (req.user.role !== 'attorney') return res.status(403).json({ error: 'Attorney access only' });
  next();
});

// ── Matter summary (view) ─────────────────────────────────────────────────────

router.get('/matter/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.*,
             c.first_name, c.last_name, c.email AS client_email, c.phone AS client_phone,
             c.address AS client_address, c.company AS client_company,
             u.name AS assigned_name
      FROM   matters m
      LEFT JOIN contacts c ON m.client_id     = c.id
      LEFT JOIN users    u ON m.assigned_staff = u.id
      WHERE  m.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Matter not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/matters', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.id, m.matter_number, m.matter_name, m.practice_area, m.status,
             c.first_name || ' ' || c.last_name AS client_name
      FROM   matters m
      LEFT JOIN contacts c ON m.client_id = c.id
      ORDER  BY m.matter_number
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── CSV exports ───────────────────────────────────────────────────────────────

router.get('/csv/contacts', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT first_name, last_name, company, email, phone, address, '', '', '',
             contact_type, notes
      FROM   contacts ORDER BY last_name, first_name
    `);
    const headers = ['First Name','Last Name','Company','Email','Phone','Address','City','State','Zip','Type','Notes'];
    const escape = (v) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };
    const csv = [
      headers.join(','),
      ...rows.map(r => Object.values(r).map(escape).join(',')),
    ].join('\r\n');
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="contacts.csv"' });
    res.send(csv);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/csv/matters', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.matter_name,
             c.first_name || ' ' || c.last_name AS client,
             m.practice_area, m.status::text,
             TO_CHAR(m.open_date, 'MM/DD/YYYY'),
             '' AS close_date,
             m.description, u.name AS assigned_to, m.notes
      FROM   matters m
      LEFT JOIN contacts c ON m.client_id     = c.id
      LEFT JOIN users    u ON m.assigned_staff = u.id
      ORDER  BY m.matter_number
    `);
    const headers = ['Matter Name','Client','Practice Area','Status','Open Date','Close Date','Description','Assigned To','Notes'];
    const escape = (v) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };
    const csv = [
      headers.join(','),
      ...rows.map(r => Object.values(r).map(escape).join(',')),
    ].join('\r\n');
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="matters.csv"' });
    res.send(csv);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── PDF matter summary ────────────────────────────────────────────────────────

router.get('/pdf/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.*,
             c.first_name || ' ' || c.last_name AS client_name,
             c.email AS client_email, c.phone AS client_phone,
             c.address AS client_address, c.company AS client_company,
             u.name AS assigned_name
      FROM   matters m
      LEFT JOIN contacts c ON m.client_id     = c.id
      LEFT JOIN users    u ON m.assigned_staff = u.id
      WHERE  m.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Matter not found' });
    const pdfBuffer = await generateMatterSummaryPdf(rows[0]);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${rows[0].matter_number}-summary.pdf"` });
    res.send(pdfBuffer);
  } catch (err) { console.error(err); res.status(500).json({ error: 'PDF generation failed' }); }
});

module.exports = router;
