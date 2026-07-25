const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');
const activity    = require('../utils/activity');
const { generateInvoicePdf } = require('../services/billingPdfService');

router.use(requireAuth);

const requireAttorney = (req, res, next) => {
  if (req.user.role !== 'attorney') return res.status(403).json({ error: 'Attorney access only' });
  next();
};

// ── Matters list (dropdown helper) ───────────────────────────────────────────

router.get('/matters', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.id, m.matter_number, m.matter_name, m.practice_area, m.status,
             c.first_name, c.last_name, c.id AS contact_id
      FROM   matters m
      LEFT JOIN contacts c ON m.client_id = c.id
      ORDER  BY m.matter_number
    `);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Unpaid count (dashboard widget) ──────────────────────────────────────────

router.get('/unpaid-count', requireAttorney, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT COUNT(*) AS count FROM invoices WHERE status IN ('unpaid','partial')`);
    res.json({ count: Number(rows[0].count) });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Time entries ──────────────────────────────────────────────────────────────

router.get('/time-entries', async (req, res) => {
  try {
    const { matter_id } = req.query;
    const where  = [];
    const params = [];
    if (matter_id) { where.push(`te.matter_id = $${params.length + 1}`); params.push(matter_id); }
    if (req.user.role !== 'attorney') { where.push(`te.user_id = $${params.length + 1}`); params.push(req.user.id); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await pool.query(`
      SELECT te.*, u.name AS user_name, m.matter_number, m.matter_name
      FROM   time_entries te
      LEFT JOIN users   u ON te.user_id   = u.id
      LEFT JOIN matters m ON te.matter_id = m.id
      ${clause}
      ORDER  BY te.date DESC, te.id DESC
    `, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/time-entries', async (req, res) => {
  const { matter_id, date, description, hours, rate, billable } = req.body;
  if (!date || !description) return res.status(400).json({ error: 'date and description required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO time_entries (matter_id, user_id, date, description, hours, rate, billable)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [matter_id || null, req.user.id, date, description, hours || 0, rate || 0, billable !== false]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/time-entries/:id', async (req, res) => {
  const { date, description, hours, rate, billable, status } = req.body;
  try {
    const check = await pool.query('SELECT user_id FROM time_entries WHERE id=$1', [req.params.id]);
    if (!check.rows[0]) return res.status(404).json({ error: 'Entry not found' });
    if (req.user.role !== 'attorney' && check.rows[0].user_id !== req.user.id)
      return res.status(403).json({ error: 'Can only edit your own entries' });
    const { rows } = await pool.query(
      `UPDATE time_entries SET date=$1, description=$2, hours=$3, rate=$4, billable=$5, status=COALESCE($6,status)
       WHERE id=$7 RETURNING *`,
      [date, description, hours, rate, billable, status || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/time-entries/:id', requireAttorney, async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM time_entries WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Entry not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Invoices ──────────────────────────────────────────────────────────────────

router.get('/invoices', requireAttorney, async (req, res) => {
  try {
    const { matter_id } = req.query;
    const where  = matter_id ? 'WHERE i.matter_id = $1' : '';
    const params = matter_id ? [matter_id] : [];
    const { rows } = await pool.query(`
      SELECT i.*, m.matter_number, m.matter_name, m.practice_area,
             c.first_name || ' ' || c.last_name AS client_name
      FROM   invoices i
      LEFT JOIN matters  m ON i.matter_id  = m.id
      LEFT JOIN contacts c ON i.contact_id = c.id
      ${where}
      ORDER  BY i.invoice_date DESC, i.id DESC
    `, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/invoices/:id', requireAttorney, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.*, m.matter_number, m.matter_name, m.practice_area,
             c.first_name || ' ' || c.last_name AS client_name,
             c.email AS client_email, c.phone AS client_phone, c.address AS client_address
      FROM   invoices i
      LEFT JOIN matters  m ON i.matter_id  = m.id
      LEFT JOIN contacts c ON i.contact_id = c.id
      WHERE  i.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Invoice not found' });
    const { rows: items } = await pool.query(
      'SELECT * FROM invoice_line_items WHERE invoice_id=$1 ORDER BY id',
      [req.params.id]
    );
    res.json({ ...rows[0], line_items: items });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/invoices', requireAttorney, async (req, res) => {
  const { matter_id, due_date, notes, flat_items = [] } = req.body;
  if (!matter_id) return res.status(400).json({ error: 'matter_id required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get matter + contact info
    const { rows: matters } = await client.query(
      `SELECT m.*, c.id AS contact_id FROM matters m LEFT JOIN contacts c ON m.client_id = c.id WHERE m.id=$1`,
      [matter_id]
    );
    if (!matters[0]) throw new Error('Matter not found');
    const matter = matters[0];

    // Collect unbilled time entries
    const { rows: entries } = await client.query(
      `SELECT * FROM time_entries WHERE matter_id=$1 AND status='unbilled' AND billable=TRUE`,
      [matter_id]
    );

    // Compute total
    const timeTotal = entries.reduce((s, e) => s + (Number(e.hours) * Number(e.rate)), 0);
    const flatTotal = flat_items.reduce((s, f) => s + Number(f.amount || 0), 0);
    const total = timeTotal + flatTotal;

    // Create invoice
    const { rows: inv } = await client.query(
      `INSERT INTO invoices (matter_id, contact_id, due_date, notes, total_amount, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [matter_id, matter.contact_id || null, due_date || null, notes || null, total, req.user.id]
    );
    const invoice = inv[0];

    // Create line items from time entries
    for (const e of entries) {
      const amount = Number(e.hours) * Number(e.rate);
      await client.query(
        `INSERT INTO invoice_line_items (invoice_id, description, quantity, rate, amount, entry_id)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [invoice.id, e.description, e.hours, e.rate, amount, e.id]
      );
    }

    // Create flat fee line items
    for (const f of flat_items) {
      if (!f.description || !f.amount) continue;
      await client.query(
        `INSERT INTO invoice_line_items (invoice_id, description, quantity, rate, amount)
         VALUES ($1,$2,$3,$4,$5)`,
        [invoice.id, f.description, 1, f.amount, f.amount]
      );
    }

    // Mark time entries as billed
    if (entries.length > 0) {
      const ids = entries.map(e => e.id);
      await client.query(
        `UPDATE time_entries SET status='billed', invoiced=TRUE, invoice_id=$1 WHERE id = ANY($2)`,
        [invoice.id, ids]
      );
    }

    await activity.log({ event_type:'invoice_created', description:`Invoice created for $${total.toFixed(2)}`, matter_id: parseInt(matter_id,10), contact_id: matter.contact_id||null, user_id: req.user.id, meta:{ invoice_id: invoice.id, total, time_entries_count: entries.length } });
    await client.query('COMMIT');
    res.status(201).json(invoice);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  } finally {
    client.release();
  }
});

router.put('/invoices/:id/payment', requireAttorney, async (req, res) => {
  const { amount_paid, payment_method, notes } = req.body;
  try {
    const { rows: inv } = await pool.query('SELECT total_amount FROM invoices WHERE id=$1', [req.params.id]);
    if (!inv[0]) return res.status(404).json({ error: 'Invoice not found' });
    const paid   = Number(amount_paid || 0);
    const total  = Number(inv[0].total_amount || 0);
    const status = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
    const { rows } = await pool.query(
      `UPDATE invoices SET amount_paid=$1, payment_method=$2, status=$3, notes=COALESCE($4,notes)
       WHERE id=$5 RETURNING *`,
      [paid, payment_method || null, status, notes || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/invoices/:id/pdf', requireAttorney, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.*, m.matter_number, m.matter_name, m.practice_area,
             c.first_name || ' ' || c.last_name AS client_name,
             c.email AS client_email, c.phone AS client_phone, c.address AS client_address
      FROM   invoices i
      LEFT JOIN matters  m ON i.matter_id  = m.id
      LEFT JOIN contacts c ON i.contact_id = c.id
      WHERE  i.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Invoice not found' });
    const { rows: items } = await pool.query(
      'SELECT * FROM invoice_line_items WHERE invoice_id=$1 ORDER BY id', [req.params.id]
    );
    const invoice = { ...rows[0], line_items: items };
    const pdfBuffer = await generateInvoicePdf(invoice);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="INV-${String(invoice.invoice_number).padStart(4,'0')}.pdf"` });
    res.send(pdfBuffer);
  } catch (err) { console.error(err); res.status(500).json({ error: 'PDF generation failed' }); }
});

// ── Trust ledger ──────────────────────────────────────────────────────────────

router.get('/trust', requireAttorney, async (req, res) => {
  try {
    const { matter_id } = req.query;
    const where  = matter_id ? 'WHERE tl.matter_id = $1' : '';
    const params = matter_id ? [matter_id] : [];
    const { rows } = await pool.query(`
      SELECT tl.*, u.name AS created_by_name, m.matter_number
      FROM   trust_ledger tl
      LEFT JOIN users   u ON tl.created_by = u.id
      LEFT JOIN matters m ON tl.matter_id  = m.id
      ${where}
      ORDER  BY tl.date ASC, tl.id ASC
    `, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/trust', requireAttorney, async (req, res) => {
  const { matter_id, transaction_type, date, amount, description, reference_number, invoice_id } = req.body;
  if (!matter_id || !transaction_type || !date || !amount)
    return res.status(400).json({ error: 'matter_id, transaction_type, date, and amount required' });

  try {
    const { rows: prev } = await pool.query(
      `SELECT balance_after FROM trust_ledger WHERE matter_id=$1 ORDER BY date DESC, id DESC LIMIT 1`,
      [matter_id]
    );
    const prevBalance  = Number(prev[0]?.balance_after || 0);
    const amt          = Number(amount);
    const delta        = transaction_type === 'retainer_received' ? amt : -amt;
    const balanceAfter = prevBalance + delta;

    const { rows } = await pool.query(
      `INSERT INTO trust_ledger
         (matter_id, transaction_type, date, amount, description, reference_number, balance_after, invoice_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [matter_id, transaction_type, date, amt, description || null, reference_number || null, balanceAfter, invoice_id || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/trust/reconciliation', requireAttorney, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.id, m.matter_number, m.matter_name,
             tl.balance_after AS current_balance
      FROM   matters m
      JOIN LATERAL (
        SELECT balance_after FROM trust_ledger
        WHERE matter_id = m.id
        ORDER BY date DESC, id DESC LIMIT 1
      ) tl ON TRUE
      ORDER BY m.matter_number
    `);
    const total = rows.reduce((s, r) => s + Number(r.current_balance || 0), 0);
    res.json({ matters: rows, total_client_ledger: total });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
