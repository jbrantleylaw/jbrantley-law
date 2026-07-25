const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');
const crypto      = require('crypto');
const activity    = require('../utils/activity');
const https       = require('https');
const path        = require('path');
const fs          = require('fs');

router.use(requireAuth);

const requireAttorney = (req, res, next) => {
  if (req.user.role !== 'attorney') return res.status(403).json({ error: 'Attorney access only' });
  next();
};

const APP_URL    = process.env.APP_URL    || 'http://localhost:5173';
const SMTP_HOST  = process.env.SMTP_HOST  || '';
const SMTP_USER  = process.env.SMTP_USER  || '';
const SMTP_PASS  = process.env.SMTP_PASS  || '';
const SMTP_FROM  = process.env.SMTP_FROM  || 'jbrantley@jenniferbrantleylaw.com';

// ── Simple email sender (nodemailer-compatible, uses built-in net/tls if needed) ──
// If nodemailer is installed, use it; otherwise log to console

async function sendEmail({ to, subject, html }) {
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
    return true;
  } catch (err) {
    console.log('[eSign] Email would be sent to:', to);
    console.log('[eSign] Subject:', subject);
    console.log('[eSign] NOTE: Install nodemailer and configure SMTP_HOST/USER/PASS in .env to send real emails.');
    return false;
  }
}

// ── GET /api/esignature/requests ──────────────────────────────────────────────

router.get('/requests', async (req, res) => {
  const { matter_id } = req.query;
  const params = []; const where = [];
  if (matter_id) { params.push(matter_id); where.push(`sr.matter_id = $${params.length}`); }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  try {
    const { rows } = await pool.query(`
      SELECT sr.*, m.matter_number, m.matter_name, u.name AS sent_by_name
      FROM   signature_requests sr
      LEFT JOIN matters m ON sr.matter_id = m.id
      LEFT JOIN users   u ON sr.sent_by   = u.id
      ${clause}
      ORDER  BY sr.created_at DESC
    `, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── POST /api/esignature/send ─────────────────────────────────────────────────

router.post('/send', requireAttorney, async (req, res) => {
  const { matter_id, document_name, document_path, recipient_name, recipient_email } = req.body;
  if (!recipient_email || !document_name) return res.status(400).json({ error: 'recipient_email and document_name required' });

  const token = crypto.randomBytes(48).toString('hex');

  try {
    const { rows } = await pool.query(`
      INSERT INTO signature_requests
        (matter_id, document_name, document_path, recipient_name, recipient_email, secure_token, sent_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [matter_id || null, document_name, document_path || null, recipient_name || null, recipient_email, token, req.user.id]);

    const signUrl = `${APP_URL}/sign/${token}`;
    await sendEmail({
      to: recipient_email,
      subject: `Document Signature Request — ${document_name}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px">
          <div style="font-size:20px;font-weight:bold;color:#1B2A4A;margin-bottom:4px">J Brantley Law</div>
          <div style="color:#888;font-size:12px;margin-bottom:24px">Jennifer N. Brantley, Esq. · 5900 Balcones Dr., #9008, Austin, TX 78731</div>
          <p>Dear ${recipient_name || recipient_email},</p>
          <p>A document has been sent to you for signature: <strong>${document_name}</strong></p>
          <p>Please click the button below to review and sign the document at your convenience.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${signUrl}" style="background:#1B2A4A;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px">
              Review &amp; Sign Document
            </a>
          </div>
          <p style="font-size:12px;color:#888">This link is unique to you and expires only when the document has been signed or declined.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="font-size:12px;color:#aaa">Questions? Contact us at (210) 742-2435 or jbrantley@jenniferbrantleylaw.com</p>
        </div>`,
    });

    await activity.log({ event_type:'esignature_sent', description:`Signature request sent for: ${document_name}`, matter_id: matter_id||null, user_id: req.user.id, meta:{ sig_id: rows[0].id, recipient: recipient_email } });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/esignature/sign/:token (PUBLIC — no auth) ────────────────────────

router.get('/sign/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT sr.*, m.matter_number, m.matter_name
      FROM   signature_requests sr
      LEFT JOIN matters m ON sr.matter_id = m.id
      WHERE  sr.secure_token = $1
    `, [req.params.token]);

    if (!rows[0]) return res.status(404).json({ error: 'Invalid or expired link' });
    if (['signed','declined'].includes(rows[0].status)) {
      return res.json({ ...rows[0], already_completed: true });
    }

    // Mark as viewed
    if (rows[0].status === 'pending') {
      await pool.query('UPDATE signature_requests SET status=$1, viewed_at=NOW() WHERE secure_token=$2', ['viewed', req.params.token]);
    }

    // Return document info (strip sensitive path info)
    const { sent_by, ...safe } = rows[0];
    res.json({ ...safe, status: rows[0].status === 'pending' ? 'viewed' : rows[0].status });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── POST /api/esignature/sign/:token (PUBLIC — submit signature) ──────────────

router.post('/sign/:token', async (req, res) => {
  const { signature_data, signature_type, action } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || req.ip;

  try {
    const { rows } = await pool.query('SELECT * FROM signature_requests WHERE secure_token=$1', [req.params.token]);
    if (!rows[0]) return res.status(404).json({ error: 'Invalid link' });
    if (['signed','declined'].includes(rows[0].status)) return res.status(400).json({ error: 'Already completed' });

    if (action === 'decline') {
      await pool.query(
        'UPDATE signature_requests SET status=$1, declined_at=NOW(), ip_address=$2 WHERE secure_token=$3',
        ['declined', ip, req.params.token]
      );
      // Notify attorney
      await sendEmail({
        to: SMTP_FROM,
        subject: `Document Declined — ${rows[0].document_name}`,
        html: `<p>${rows[0].recipient_name || rows[0].recipient_email} declined to sign <strong>${rows[0].document_name}</strong>.</p>`,
      });
      return res.json({ success: true, status: 'declined' });
    }

    if (!signature_data) return res.status(400).json({ error: 'signature_data required' });

    await pool.query(
      `UPDATE signature_requests SET status='signed', signed_at=NOW(), ip_address=$1,
       signature_type=$2, signature_data=$3 WHERE secure_token=$4`,
      [ip, signature_type || 'typed', signature_data, req.params.token]
    );

    // Notify attorney
    await sendEmail({
      to: SMTP_FROM,
      subject: `Document Signed — ${rows[0].document_name}`,
      html: `<p><strong>${rows[0].recipient_name || rows[0].recipient_email}</strong> signed <strong>${rows[0].document_name}</strong>.</p>
             <p>Timestamp: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT<br>IP: ${ip}</p>`,
    });

    await activity.log({ event_type:'document_signed', description:`${rows[0].document_name} signed by ${rows[0].recipient_name || rows[0].recipient_email}`, matter_id: rows[0].matter_id||null, user_id: null, meta:{ sig_id: rows[0].id } });

    res.json({ success: true, status: 'signed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Adobe Sign ────────────────────────────────────────────────────────────────

async function getAdobeToken() {
  const refreshToken = process.env.ADOBE_SIGN_REFRESH_TOKEN;
  const clientId     = process.env.ADOBE_SIGN_CLIENT_ID;
  const clientSecret = process.env.ADOBE_SIGN_CLIENT_SECRET;
  if (!refreshToken || refreshToken === 'your_adobe_sign_refresh_token_here') throw new Error('Adobe Sign credentials not configured');

  const body = `grant_type=refresh_token&client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${refreshToken}`;
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.na1.adobesign.com',
      path: '/oauth/v2/refresh',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    };
    const req2 = https.request(opts, (r) => {
      let buf = ''; r.on('data', d => { buf += d; }); r.on('end', () => {
        try {
          const data = JSON.parse(buf);
          if (data.access_token) resolve(data.access_token);
          else reject(new Error('Adobe token refresh failed: ' + buf));
        } catch { reject(new Error('Adobe token parse error')); }
      });
    });
    req2.on('error', reject); req2.write(body); req2.end();
  });
}

router.get('/adobe/status', (req, res) => {
  const configured = !!(
    process.env.ADOBE_SIGN_CLIENT_ID && process.env.ADOBE_SIGN_CLIENT_ID !== 'your_adobe_sign_client_id_here' &&
    process.env.ADOBE_SIGN_REFRESH_TOKEN && process.env.ADOBE_SIGN_REFRESH_TOKEN !== 'your_adobe_sign_refresh_token_here'
  );
  res.json({ configured });
});

router.get('/adobe/agreements', requireAttorney, async (req, res) => {
  const { matter_id } = req.query;
  const params = []; const where = [];
  if (matter_id) { params.push(matter_id); where.push(`aa.matter_id = $${params.length}`); }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  try {
    const { rows } = await pool.query(`
      SELECT aa.*, m.matter_number FROM adobe_agreements aa
      LEFT JOIN matters m ON aa.matter_id = m.id
      ${clause} ORDER BY aa.created_at DESC
    `, params);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/adobe/send', requireAttorney, async (req, res) => {
  const { matter_id, document_name, recipient_email, recipient_name } = req.body;
  if (!recipient_email || !document_name) return res.status(400).json({ error: 'recipient_email and document_name required' });
  try {
    const accessToken = await getAdobeToken();
    const agreementBody = JSON.stringify({
      fileInfos: [{ transientDocumentId: req.body.transient_document_id || 'placeholder' }],
      name: document_name,
      participantSetsInfo: [{
        memberInfos: [{ email: recipient_email, name: recipient_name || '' }],
        order: 1,
        role: 'SIGNER',
      }],
      signatureType: 'ESIGN',
      state: 'IN_PROCESS',
    });

    const result = await new Promise((resolve, reject) => {
      const opts = {
        hostname: 'api.na1.adobesign.com',
        path: '/api/rest/v6/agreements',
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(agreementBody) },
      };
      const r2 = https.request(opts, (r) => {
        let buf = ''; r.on('data', d => { buf += d; }); r.on('end', () => {
          try { resolve({ status: r.statusCode, data: JSON.parse(buf) }); } catch { resolve({ status: r.statusCode, data: buf }); }
        });
      });
      r2.on('error', reject); r2.write(agreementBody); r2.end();
    });

    if (result.status >= 400) return res.status(502).json({ error: 'Adobe Sign API error', detail: result.data });

    const { rows } = await pool.query(`
      INSERT INTO adobe_agreements (matter_id, adobe_agreement_id, document_name, recipient_email, sent_by)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [matter_id || null, result.data.id || 'pending', document_name, recipient_email, req.user.id]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Adobe Sign error' });
  }
});

module.exports = router;
