const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');
const puppeteer   = require('puppeteer');

router.use(requireAuth, (req, res, next) => {
  if (req.user.role !== 'attorney') return res.status(403).json({ error: 'Attorney access only' });
  next();
});

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';
const FIRM = {
  name: 'J Brantley Law',
  attorney: 'Jennifer N. Brantley, Esq.',
  address: '5900 Balcones Dr., #9008, Austin, TX 78731',
  phone: '(210) 742-2435',
  email: 'jbrantley@jenniferbrantleylaw.com',
};

const fmt$ = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

function baseHtml(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:Georgia,serif;font-size:10pt;color:#222;margin:0;padding:36px 52px;line-height:1.5}
    h2{font-size:12pt;color:${NAVY};margin:16px 0 6px;border-bottom:1px solid #e9ecef;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;font-size:9.5pt}
    th{background:${NAVY};color:#fff;padding:6px 10px;text-align:left;font-size:8.5pt}
    td{padding:5px 10px;border-bottom:1px solid #f1f3f5}
    .total td{font-weight:bold;border-top:2px solid ${NAVY};background:#f8f9fa}
    .red td{background:#fff5f5;color:#9b2c2c}
    .gold td{background:#fffbeb}
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${GOLD};padding-bottom:12px;margin-bottom:20px;">
    <div>
      <div style="font-family:Georgia,serif;font-size:20px;font-weight:bold;color:${NAVY}">${FIRM.name}</div>
      <div style="font-size:11px;color:${NAVY};margin-top:2px">${FIRM.attorney}</div>
      <div style="font-size:10px;color:#666;margin-top:2px">${FIRM.address}</div>
      <div style="font-size:10px;color:#666">${FIRM.phone} | ${FIRM.email}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#888">
      <div style="font-size:14pt;font-weight:bold;color:${NAVY}">${title}</div>
      <div style="margin-top:4px">Generated: ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
    </div>
  </div>
  ${body}
  <div style="margin-top:40px;font-size:8pt;color:#aaa;border-top:1px solid #eee;padding-top:6px">
    J Brantley Law Case Management System &bull; Confidential &bull; Attorney Work Product
  </div>
  </body></html>`;
}

async function renderPdf(html) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({ format: 'Letter', margin: { top: '.75in', bottom: '.75in', left: '.75in', right: '.75in' }, printBackground: true });
  } finally { await browser.close(); }
}

function toCsv(headers, rows) {
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g,'""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };
  return [headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n');
}

// ── 1. Matter Status Report ───────────────────────────────────────────────────

router.get('/matter-status', async (req, res) => {
  const { start, end, practice_area, status: statusFilter, format } = req.query;
  const params = []; const where = [];
  if (start)          { params.push(start);          where.push(`m.open_date >= $${params.length}`); }
  if (end)            { params.push(end);             where.push(`m.open_date <= $${params.length}`); }
  if (practice_area)  { params.push(practice_area);   where.push(`m.practice_area = $${params.length}`); }
  if (statusFilter)   { params.push(statusFilter);    where.push(`m.status = $${params.length}::matter_status`); }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const { rows } = await pool.query(`
      SELECT m.matter_number, m.matter_name, m.practice_area, m.status, m.open_date, m.sol_date,
             c.first_name || ' ' || c.last_name AS client_name, u.name AS assigned_name
      FROM   matters m
      LEFT JOIN contacts c ON m.client_id = c.id
      LEFT JOIN users    u ON m.assigned_staff = u.id
      ${clause}
      ORDER  BY m.status, m.matter_number
    `, params);

    if (format === 'csv') {
      const headers = ['Matter #','Matter Name','Client','Practice Area','Status','Open Date','SOL Date','Assigned To'];
      const csvRows = rows.map(r => [r.matter_number,r.matter_name,r.client_name,r.practice_area,r.status,fmtDate(r.open_date),fmtDate(r.sol_date),r.assigned_name]);
      res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="matter-status.csv"' });
      return res.send(toCsv(headers, csvRows));
    }

    if (format === 'pdf') {
      const groups = {};
      rows.forEach(r => { (groups[r.status] = groups[r.status] || []).push(r); });
      let body = '';
      for (const [status, matters] of Object.entries(groups)) {
        body += `<h2>${status.toUpperCase()} (${matters.length})</h2>
        <table><thead><tr><th>Matter #</th><th>Matter Name</th><th>Client</th><th>Practice Area</th><th>Open Date</th><th>SOL Date</th><th>Assigned To</th></tr></thead><tbody>
        ${matters.map(r => `<tr><td>${r.matter_number||'—'}</td><td>${r.matter_name||'—'}</td><td>${r.client_name||'—'}</td><td>${r.practice_area||'—'}</td><td>${fmtDate(r.open_date)}</td><td>${fmtDate(r.sol_date)}</td><td>${r.assigned_name||'—'}</td></tr>`).join('')}
        </tbody></table>`;
      }
      const pdf = await renderPdf(baseHtml('Matter Status Report', body));
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="matter-status.pdf"' });
      return res.send(pdf);
    }

    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── 2. SOL Alert Report ───────────────────────────────────────────────────────

router.get('/sol-alerts', async (req, res) => {
  const { days = 90, format } = req.query;
  try {
    const { rows } = await pool.query(`
      SELECT m.matter_number, m.matter_name, m.practice_area, m.status, m.sol_date, m.open_date,
             c.first_name || ' ' || c.last_name AS client_name, u.name AS assigned_name,
             (m.sol_date::date - CURRENT_DATE) AS days_remaining
      FROM   matters m
      LEFT JOIN contacts c ON m.client_id = c.id
      LEFT JOIN users    u ON m.assigned_staff = u.id
      WHERE  m.sol_date IS NOT NULL
        AND  m.status = 'open'
        AND  m.sol_date::date <= CURRENT_DATE + $1::integer
      ORDER  BY m.sol_date ASC
    `, [Number(days)]);

    if (format === 'csv') {
      const headers = ['Matter #','Matter Name','Client','Practice Area','SOL Date','Days Remaining','Assigned To'];
      const csvRows = rows.map(r => [r.matter_number,r.matter_name,r.client_name,r.practice_area,fmtDate(r.sol_date),r.days_remaining,r.assigned_name]);
      res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="sol-alerts.csv"' });
      return res.send(toCsv(headers, csvRows));
    }

    if (format === 'pdf') {
      const body = `
        <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:6px;padding:10px 14px;font-size:10pt;color:#9b2c2c;margin-bottom:16px">
          ⚠ Statute of Limitations Alert — Matters with SOL dates within ${days} days. Verify all deadlines independently.
        </div>
        <table><thead><tr><th>Matter #</th><th>Matter Name</th><th>Client</th><th>Practice Area</th><th>SOL Date</th><th>Days Left</th><th>Assigned To</th></tr></thead><tbody>
        ${rows.map(r => {
          const urgent = Number(r.days_remaining) <= 30;
          return `<tr class="${urgent ? 'red' : ''}"><td>${r.matter_number||'—'}</td><td>${r.matter_name||'—'}</td><td>${r.client_name||'—'}</td><td>${r.practice_area||'—'}</td><td>${fmtDate(r.sol_date)}</td><td style="font-weight:bold">${r.days_remaining}</td><td>${r.assigned_name||'—'}</td></tr>`;
        }).join('')}
        </tbody></table>`;
      const pdf = await renderPdf(baseHtml('SOL Alert Report', body));
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="sol-alerts.pdf"' });
      return res.send(pdf);
    }

    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── 3. Billing Summary Report ──────────────────────────────────────────────────

router.get('/billing-summary', async (req, res) => {
  const { start, end, format } = req.query;
  const params = []; const where = [];
  if (start) { params.push(start); where.push(`i.invoice_date >= $${params.length}`); }
  if (end)   { params.push(end);   where.push(`i.invoice_date <= $${params.length}`); }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const { rows } = await pool.query(`
      SELECT m.practice_area, m.matter_number, m.matter_name,
             SUM(i.total_amount) AS total_invoiced,
             SUM(i.amount_paid)  AS total_collected,
             SUM(i.total_amount - i.amount_paid) AS total_outstanding
      FROM   invoices i
      JOIN   matters m ON i.matter_id = m.id
      ${clause}
      GROUP  BY m.practice_area, m.matter_number, m.matter_name
      ORDER  BY m.practice_area, m.matter_number
    `, params);

    const byArea = {};
    rows.forEach(r => {
      const area = r.practice_area || 'Uncategorized';
      (byArea[area] = byArea[area] || []).push(r);
    });

    if (format === 'csv') {
      const headers = ['Practice Area','Matter #','Matter Name','Total Invoiced','Total Collected','Outstanding'];
      const csvRows = [];
      for (const [area, matters] of Object.entries(byArea)) {
        matters.forEach(r => csvRows.push([area, r.matter_number, r.matter_name, fmt$(r.total_invoiced), fmt$(r.total_collected), fmt$(r.total_outstanding)]));
        const sub = matters.reduce((s,r) => ({ i: s.i + Number(r.total_invoiced||0), c: s.c + Number(r.total_collected||0), o: s.o + Number(r.total_outstanding||0) }), { i:0,c:0,o:0 });
        csvRows.push([`SUBTOTAL: ${area}`, '', '', fmt$(sub.i), fmt$(sub.c), fmt$(sub.o)]);
      }
      res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="billing-summary.csv"' });
      return res.send(toCsv(headers, csvRows));
    }

    if (format === 'pdf') {
      let body = '';
      let grandI = 0, grandC = 0, grandO = 0;
      for (const [area, matters] of Object.entries(byArea)) {
        const sub = matters.reduce((s,r) => ({ i: s.i + Number(r.total_invoiced||0), c: s.c + Number(r.total_collected||0), o: s.o + Number(r.total_outstanding||0) }), { i:0,c:0,o:0 });
        grandI += sub.i; grandC += sub.c; grandO += sub.o;
        body += `<h2>${area}</h2>
        <table><thead><tr><th>Matter #</th><th>Matter Name</th><th style="text-align:right">Invoiced</th><th style="text-align:right">Collected</th><th style="text-align:right">Outstanding</th></tr></thead><tbody>
        ${matters.map(r => `<tr><td>${r.matter_number||'—'}</td><td>${r.matter_name||'—'}</td><td style="text-align:right">${fmt$(r.total_invoiced)}</td><td style="text-align:right">${fmt$(r.total_collected)}</td><td style="text-align:right;color:${Number(r.total_outstanding)>0?'#c53030':'#166534'}">${fmt$(r.total_outstanding)}</td></tr>`).join('')}
        <tr class="total"><td colspan="2">Subtotal — ${area}</td><td style="text-align:right">${fmt$(sub.i)}</td><td style="text-align:right">${fmt$(sub.c)}</td><td style="text-align:right">${fmt$(sub.o)}</td></tr>
        </tbody></table>`;
      }
      body += `<table style="margin-top:16px"><tbody><tr class="total"><td colspan="2" style="font-size:11pt">GRAND TOTAL</td><td style="text-align:right;font-size:11pt">${fmt$(grandI)}</td><td style="text-align:right;font-size:11pt">${fmt$(grandC)}</td><td style="text-align:right;font-size:11pt;color:${grandO>0?'#c53030':'#166534'}">${fmt$(grandO)}</td></tr></tbody></table>`;
      const pdf = await renderPdf(baseHtml('Billing Summary Report', body));
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="billing-summary.pdf"' });
      return res.send(pdf);
    }

    res.json({ rows, byArea });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── 4. Time Entry Report ──────────────────────────────────────────────────────

router.get('/time-entries', async (req, res) => {
  const { start, end, matter_id, user_id, billable, format } = req.query;
  const params = []; const where = [];
  if (start)     { params.push(start);     where.push(`te.date >= $${params.length}`); }
  if (end)       { params.push(end);       where.push(`te.date <= $${params.length}`); }
  if (matter_id) { params.push(matter_id); where.push(`te.matter_id = $${params.length}`); }
  if (user_id)   { params.push(user_id);   where.push(`te.user_id = $${params.length}`); }
  if (billable !== undefined && billable !== '') { params.push(billable === 'true'); where.push(`te.billable = $${params.length}`); }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const { rows } = await pool.query(`
      SELECT te.date, te.description, te.hours, te.rate, (te.hours * te.rate) AS amount,
             te.billable, te.status, u.name AS user_name, m.matter_number, m.matter_name
      FROM   time_entries te
      LEFT JOIN users   u ON te.user_id   = u.id
      LEFT JOIN matters m ON te.matter_id = m.id
      ${clause}
      ORDER  BY te.date DESC, u.name
    `, params);

    const totalHours  = rows.reduce((s,r) => s + Number(r.hours||0), 0);
    const totalValue  = rows.reduce((s,r) => s + Number(r.amount||0), 0);

    if (format === 'csv') {
      const headers = ['Date','User','Matter #','Matter Name','Description','Hours','Rate','Amount','Billable','Status'];
      const csvRows = rows.map(r => [fmtDate(r.date),r.user_name,r.matter_number,r.matter_name,r.description,Number(r.hours).toFixed(2),fmt$(r.rate),fmt$(r.amount),r.billable?'Yes':'No',r.status]);
      csvRows.push(['TOTAL','','','','',totalHours.toFixed(2),'',fmt$(totalValue),'','']);
      res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="time-entries.csv"' });
      return res.send(toCsv(headers, csvRows));
    }

    if (format === 'pdf') {
      const body = `
        <table><thead><tr><th>Date</th><th>User</th><th>Matter</th><th>Description</th><th style="text-align:right">Hours</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th><th>Billable</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${fmtDate(r.date)}</td><td>${r.user_name||'—'}</td><td>${r.matter_number||'—'}</td><td>${r.description||'—'}</td><td style="text-align:right">${Number(r.hours).toFixed(2)}</td><td style="text-align:right">${fmt$(r.rate)}</td><td style="text-align:right">${fmt$(r.amount)}</td><td>${r.billable?'Yes':'No'}</td></tr>`).join('')}
        <tr class="total"><td colspan="4">TOTAL</td><td style="text-align:right">${totalHours.toFixed(2)}</td><td></td><td style="text-align:right">${fmt$(totalValue)}</td><td></td></tr>
        </tbody></table>`;
      const pdf = await renderPdf(baseHtml('Time Entry Report', body));
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="time-entries.pdf"' });
      return res.send(pdf);
    }

    res.json({ rows, totalHours, totalValue });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── 5. Trust Ledger Report ────────────────────────────────────────────────────

router.get('/trust-ledger', async (req, res) => {
  const { matter_id, format } = req.query;
  const params = []; const where = [];
  if (matter_id) { params.push(matter_id); where.push(`tl.matter_id = $${params.length}`); }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const { rows } = await pool.query(`
      SELECT tl.date, tl.transaction_type, tl.amount, tl.description, tl.balance_after,
             m.matter_number, m.matter_name, u.name AS created_by_name
      FROM   trust_ledger tl
      LEFT JOIN matters m ON tl.matter_id = m.id
      LEFT JOIN users   u ON tl.created_by = u.id
      ${clause}
      ORDER  BY m.matter_number, tl.date ASC, tl.id ASC
    `, params);

    const totalBalance = {};
    rows.forEach(r => { totalBalance[r.matter_number] = Number(r.balance_after || 0); });
    const grandTotal = Object.values(totalBalance).reduce((s, v) => s + v, 0);

    if (format === 'csv') {
      const headers = ['Matter #','Matter Name','Date','Transaction Type','Amount','Balance After','Description','Created By'];
      const csvRows = rows.map(r => [r.matter_number,r.matter_name,fmtDate(r.date),r.transaction_type,fmt$(r.amount),fmt$(r.balance_after),r.description,r.created_by_name]);
      csvRows.push(['','','','GRAND TOTAL TRUST BALANCE','',fmt$(grandTotal),'','']);
      res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="trust-ledger.csv"' });
      return res.send(toCsv(headers, csvRows));
    }

    if (format === 'pdf') {
      const byMatter = {};
      rows.forEach(r => { (byMatter[r.matter_number] = byMatter[r.matter_number] || { name: r.matter_name, rows: [] }).rows.push(r); });
      let body = `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;font-size:9pt;color:#7c4a00;margin-bottom:14px">IOLTA Trust Account — Confidential. All trust funds must be held in a separate interest-bearing account.</div>`;
      for (const [mn, data] of Object.entries(byMatter)) {
        const lastBal = data.rows[data.rows.length - 1]?.balance_after || 0;
        body += `<h2>${mn} — ${data.matter_name} <span style="float:right;font-size:9pt">Current Balance: ${fmt$(lastBal)}</span></h2>
        <table><thead><tr><th>Date</th><th>Type</th><th style="text-align:right">Amount</th><th style="text-align:right">Balance After</th><th>Description</th></tr></thead><tbody>
        ${data.rows.map(r => `<tr><td>${fmtDate(r.date)}</td><td>${r.transaction_type}</td><td style="text-align:right">${fmt$(r.amount)}</td><td style="text-align:right">${fmt$(r.balance_after)}</td><td>${r.description||'—'}</td></tr>`).join('')}
        </tbody></table>`;
      }
      body += `<table style="margin-top:16px"><tbody><tr class="total"><td colspan="3">TOTAL CLIENT LEDGER BALANCE</td><td style="text-align:right">${fmt$(grandTotal)}</td><td></td></tr></tbody></table>`;
      const pdf = await renderPdf(baseHtml('Trust Ledger Report', body));
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="trust-ledger.pdf"' });
      return res.send(pdf);
    }

    res.json({ rows, grandTotal });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── 6. Client Roster Report ───────────────────────────────────────────────────

router.get('/client-roster', async (req, res) => {
  const { format } = req.query;
  try {
    const { rows } = await pool.query(`
      SELECT c.first_name || ' ' || c.last_name AS name, c.email, c.phone, c.company,
             COUNT(m.id) FILTER (WHERE m.id IS NOT NULL) AS matter_count,
             COUNT(m.id) FILTER (WHERE m.status = 'open') AS open_matters,
             MAX(te.date) AS last_activity
      FROM   contacts c
      LEFT JOIN matters      m  ON m.client_id  = c.id
      LEFT JOIN time_entries te ON te.matter_id = m.id
      WHERE  c.contact_type = 'client'
      GROUP  BY c.id, c.first_name, c.last_name, c.email, c.phone, c.company
      ORDER  BY c.last_name, c.first_name
    `);

    if (format === 'csv') {
      const headers = ['Name','Email','Phone','Company','Total Matters','Open Matters','Last Activity'];
      const csvRows = rows.map(r => [r.name,r.email,r.phone,r.company,r.matter_count,r.open_matters,fmtDate(r.last_activity)]);
      res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="client-roster.csv"' });
      return res.send(toCsv(headers, csvRows));
    }

    if (format === 'pdf') {
      const body = `
        <table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Matters</th><th>Open</th><th>Last Activity</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${r.name}</td><td>${r.email||'—'}</td><td>${r.phone||'—'}</td><td>${r.company||'—'}</td><td style="text-align:center">${r.matter_count}</td><td style="text-align:center">${r.open_matters}</td><td>${fmtDate(r.last_activity)}</td></tr>`).join('')}
        </tbody></table>
        <div style="margin-top:10px;font-size:9pt;color:#6c757d">${rows.length} clients total</div>`;
      const pdf = await renderPdf(baseHtml('Client Roster', body));
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="client-roster.pdf"' });
      return res.send(pdf);
    }

    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── 7. Staff Activity Report ──────────────────────────────────────────────────

router.get('/staff-activity', async (req, res) => {
  const { start, end, format } = req.query;
  const params = []; const where = [];
  if (start) { params.push(start); where.push(`te.date >= $${params.length}`); }
  if (end)   { params.push(end);   where.push(`te.date <= $${params.length}`); }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const { rows } = await pool.query(`
      SELECT u.name AS user_name, m.matter_number, m.matter_name,
             SUM(te.hours) AS total_hours, COUNT(te.id) AS entry_count,
             SUM(te.hours * te.rate) AS total_value
      FROM   time_entries te
      JOIN   users   u ON te.user_id   = u.id
      LEFT JOIN matters m ON te.matter_id = m.id
      ${clause}
      GROUP  BY u.id, u.name, m.matter_number, m.matter_name
      ORDER  BY u.name, m.matter_number
    `, params);

    const byUser = {};
    rows.forEach(r => { (byUser[r.user_name] = byUser[r.user_name] || []).push(r); });

    if (format === 'csv') {
      const headers = ['User','Matter #','Matter Name','Entries','Total Hours','Total Value'];
      const csvRows = [];
      for (const [user, matters] of Object.entries(byUser)) {
        matters.forEach(r => csvRows.push([user, r.matter_number||'N/A', r.matter_name||'No Matter', r.entry_count, Number(r.total_hours).toFixed(2), fmt$(r.total_value)]));
        const sub = matters.reduce((s,r) => ({ h: s.h + Number(r.total_hours||0), v: s.v + Number(r.total_value||0) }), { h:0, v:0 });
        csvRows.push([`SUBTOTAL: ${user}`, '', '', '', sub.h.toFixed(2), fmt$(sub.v)]);
      }
      res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="staff-activity.csv"' });
      return res.send(toCsv(headers, csvRows));
    }

    if (format === 'pdf') {
      let body = '';
      for (const [user, matters] of Object.entries(byUser)) {
        const sub = matters.reduce((s,r) => ({ h: s.h + Number(r.total_hours||0), v: s.v + Number(r.total_value||0) }), { h:0, v:0 });
        body += `<h2>${user}</h2>
        <table><thead><tr><th>Matter #</th><th>Matter Name</th><th style="text-align:center">Entries</th><th style="text-align:right">Hours</th><th style="text-align:right">Value</th></tr></thead><tbody>
        ${matters.map(r => `<tr><td>${r.matter_number||'N/A'}</td><td>${r.matter_name||'No Matter'}</td><td style="text-align:center">${r.entry_count}</td><td style="text-align:right">${Number(r.total_hours).toFixed(2)}</td><td style="text-align:right">${fmt$(r.total_value)}</td></tr>`).join('')}
        <tr class="total"><td colspan="3">Subtotal — ${user}</td><td style="text-align:right">${sub.h.toFixed(2)}</td><td style="text-align:right">${fmt$(sub.v)}</td></tr>
        </tbody></table>`;
      }
      const pdf = await renderPdf(baseHtml('Staff Activity Report', body));
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="staff-activity.pdf"' });
      return res.send(pdf);
    }

    res.json({ rows, byUser });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Dropdown helpers ──────────────────────────────────────────────────────────

router.get('/filters/matters', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT id, matter_number, matter_name FROM matters ORDER BY matter_number`);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/filters/users', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT id, name FROM users WHERE is_active=TRUE ORDER BY name`);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
