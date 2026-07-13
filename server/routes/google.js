const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');
const https       = require('https');

router.use(requireAuth);

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const APP_URL       = process.env.APP_URL              || 'http://localhost:5001';
const REDIRECT_URI  = `${APP_URL}/api/google/callback`;

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

// ── OAuth helpers ─────────────────────────────────────────────────────────────

function googlePost(path, body, accessToken) {
  return new Promise((resolve, reject) => {
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const opts = {
      hostname: 'oauth2.googleapis.com',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    };
    if (path.includes('gmail') || path.includes('drive')) opts.hostname = 'www.googleapis.com';
    const req = https.request(opts, (res) => {
      let buf = '';
      res.on('data', d => { buf += d; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function refreshAccessToken(userId) {
  const { rows } = await pool.query('SELECT * FROM google_tokens WHERE user_id=$1', [userId]);
  if (!rows[0]?.refresh_token) throw new Error('Not connected to Google');
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: rows[0].refresh_token,
    grant_type: 'refresh_token',
  });
  const r = await googlePost('/token', params.toString());
  if (!r.data.access_token) throw new Error('Failed to refresh Google token');
  const expiry = new Date(Date.now() + (r.data.expires_in || 3600) * 1000);
  await pool.query(
    'UPDATE google_tokens SET access_token=$1, token_expiry=$2 WHERE user_id=$3',
    [r.data.access_token, expiry, userId]
  );
  return r.data.access_token;
}

async function getAccessToken(userId) {
  const { rows } = await pool.query('SELECT * FROM google_tokens WHERE user_id=$1', [userId]);
  if (!rows[0]) throw new Error('Not connected to Google. Connect in Settings → Integrations.');
  const now = new Date();
  const expiry = rows[0].token_expiry ? new Date(rows[0].token_expiry) : null;
  if (!expiry || now >= new Date(expiry.getTime() - 60000)) {
    return refreshAccessToken(userId);
  }
  return rows[0].access_token;
}

// ── GET /api/google/status ────────────────────────────────────────────────────

router.get('/status', async (req, res) => {
  try {
    const configured = !!(CLIENT_ID && CLIENT_ID !== 'your_google_client_id_here');
    const { rows } = await pool.query('SELECT user_id, scope, connected_at FROM google_tokens WHERE user_id=$1', [req.user.id]);
    res.json({ configured, connected: !!rows[0], scope: rows[0]?.scope, connectedAt: rows[0]?.connected_at });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── GET /api/google/auth ──────────────────────────────────────────────────────

router.get('/auth', (req, res) => {
  if (!CLIENT_ID || CLIENT_ID === 'your_google_client_id_here') {
    return res.status(400).json({ error: 'GOOGLE_CLIENT_ID not configured in .env' });
  }
  const url = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: String(req.user.id),
  });
  res.json({ url });
});

// ── GET /api/google/callback ──────────────────────────────────────────────────

router.get('/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  if (!code || !userId) return res.status(400).send('Missing code or state');
  try {
    const params = new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    });
    const r = await googlePost('/token', params.toString());
    if (!r.data.access_token) return res.status(502).send('Google token exchange failed');

    const expiry = new Date(Date.now() + (r.data.expires_in || 3600) * 1000);
    await pool.query(`
      INSERT INTO google_tokens (user_id, access_token, refresh_token, token_expiry, scope)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (user_id) DO UPDATE SET
        access_token  = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, google_tokens.refresh_token),
        token_expiry  = EXCLUDED.token_expiry,
        scope         = EXCLUDED.scope,
        connected_at  = NOW()
    `, [userId, r.data.access_token, r.data.refresh_token || null, expiry, r.data.scope || SCOPES]);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/settings?tab=integration&google=connected`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Google OAuth error: ' + err.message);
  }
});

// ── DELETE /api/google/disconnect ────────────────────────────────────────────

router.delete('/disconnect', async (req, res) => {
  try {
    await pool.query('DELETE FROM google_tokens WHERE user_id=$1', [req.user.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── POST /api/google/send-email ───────────────────────────────────────────────

router.post('/send-email', async (req, res) => {
  const { to, cc, subject, body, matter_id, contact_id } = req.body;
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, and body required' });

  try {
    const accessToken = await getAccessToken(req.user.id);

    // Build RFC 2822 message
    const headers = [`To: ${to}`, cc ? `Cc: ${cc}` : null, `Subject: ${subject}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', '', body]
      .filter(l => l !== null).join('\r\n');
    const encoded = Buffer.from(headers).toString('base64url');

    // Send via Gmail API
    const gmailData = JSON.stringify({ raw: encoded });
    const gmailOpts = {
      hostname: 'gmail.googleapis.com',
      path: '/gmail/v1/users/me/messages/send',
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(gmailData) },
    };
    const sent = await new Promise((resolve, reject) => {
      const req2 = https.request(gmailOpts, (r) => {
        let buf = ''; r.on('data', d => { buf += d; }); r.on('end', () => {
          try { resolve({ status: r.statusCode, data: JSON.parse(buf) }); } catch { resolve({ status: r.statusCode, data: buf }); }
        });
      });
      req2.on('error', reject); req2.write(gmailData); req2.end();
    });

    if (sent.status >= 400) return res.status(502).json({ error: 'Gmail send failed', detail: sent.data });

    // Log the email
    await pool.query(
      `INSERT INTO email_log (matter_id, contact_id, to_email, cc_email, subject, body_preview, sent_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [matter_id || null, contact_id || null, to, cc || null, subject, body.slice(0, 500), req.user.id]
    );

    res.json({ success: true, messageId: sent.data.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Send failed' });
  }
});

// ── GET /api/google/email-log ─────────────────────────────────────────────────

router.get('/email-log', async (req, res) => {
  const { matter_id, contact_id } = req.query;
  const params = []; const where = [];
  if (matter_id)  { params.push(matter_id);  where.push(`el.matter_id = $${params.length}`); }
  if (contact_id) { params.push(contact_id); where.push(`el.contact_id = $${params.length}`); }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  try {
    const { rows } = await pool.query(`
      SELECT el.*, u.name AS sent_by_name FROM email_log el
      LEFT JOIN users u ON el.sent_by = u.id
      ${clause} ORDER BY el.sent_at DESC
    `, params);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── POST /api/google/save-to-drive ───────────────────────────────────────────

router.post('/save-to-drive', async (req, res) => {
  const { file_url, file_name, matter_name } = req.body;
  if (!file_url || !file_name) return res.status(400).json({ error: 'file_url and file_name required' });

  try {
    const accessToken = await getAccessToken(req.user.id);
    const folderName = `J Brantley Law${matter_name ? ` / ${matter_name}` : ''}`;

    // Find or create folder
    const searchPath = `/drive/v3/files?q=${encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)}&fields=files(id,name)`;
    const folderSearch = await new Promise((resolve, reject) => {
      const opts = {
        hostname: 'www.googleapis.com', path: searchPath, method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      };
      const r2 = https.request(opts, (r) => {
        let buf = ''; r.on('data', d => { buf += d; }); r.on('end', () => {
          try { resolve({ status: r.statusCode, data: JSON.parse(buf) }); } catch { resolve({ status: r.statusCode }); }
        });
      });
      r2.on('error', reject); r2.end();
    });

    let folderId = folderSearch.data?.files?.[0]?.id;

    if (!folderId) {
      // Create folder
      const folderMeta = JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' });
      const created = await new Promise((resolve, reject) => {
        const opts = {
          hostname: 'www.googleapis.com', path: '/drive/v3/files', method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(folderMeta) },
        };
        const r2 = https.request(opts, (r) => {
          let buf = ''; r.on('data', d => { buf += d; }); r.on('end', () => {
            try { resolve({ status: r.statusCode, data: JSON.parse(buf) }); } catch { resolve({ status: r.statusCode }); }
          });
        });
        r2.on('error', reject); r2.write(folderMeta); r2.end();
      });
      folderId = created.data?.id;
    }

    if (!folderId) return res.status(502).json({ error: 'Could not create Google Drive folder' });

    res.json({ success: true, folderId, folderName, message: `Ready to upload to "${folderName}" (folderId: ${folderId}). Use the Drive API upload endpoint with this folderId.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Drive error' });
  }
});

module.exports = router;
