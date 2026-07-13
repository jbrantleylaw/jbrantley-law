const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');
const https       = require('https');

router.use(requireAuth);

const CALENDLY_BASE = 'https://api.calendly.com';

function calendlyGet(path, apiKey) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.calendly.com',
      path,
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── GET /api/calendly/status ──────────────────────────────────────────────────
// Returns whether Calendly is configured

router.get('/status', (req, res) => {
  const configured = !!process.env.CALENDLY_API_KEY && process.env.CALENDLY_API_KEY !== 'your_calendly_api_key_here';
  res.json({ configured });
});

// ── GET /api/calendly/events ──────────────────────────────────────────────────
// Returns stored Calendly events with optional date range

router.get('/events', async (req, res) => {
  const { start, end } = req.query;
  const params = []; const where = [];
  if (start) { params.push(start); where.push(`ce.start_time >= $${params.length}`); }
  if (end)   { params.push(end);   where.push(`ce.start_time <= $${params.length}`); }
  const clause = where.length ? 'WHERE ce.status != \'canceled\' AND ' + where.join(' AND ') : "WHERE ce.status != 'canceled'";
  try {
    const { rows } = await pool.query(`
      SELECT ce.*,
             c.first_name || ' ' || c.last_name AS contact_name,
             m.matter_number, m.matter_name
      FROM   calendly_events ce
      LEFT JOIN contacts c ON ce.linked_contact_id = c.id
      LEFT JOIN matters  m ON ce.linked_matter_id  = m.id
      ${clause}
      ORDER  BY ce.start_time
    `, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── POST /api/calendly/sync ───────────────────────────────────────────────────
// Fetch events from Calendly API, store in DB, auto-link contacts

router.post('/sync', async (req, res) => {
  const apiKey = process.env.CALENDLY_API_KEY;
  if (!apiKey || apiKey === 'your_calendly_api_key_here') {
    return res.status(400).json({ error: 'CALENDLY_API_KEY not configured in .env' });
  }

  try {
    // Get the current user's URI from Calendly
    const me = await calendlyGet('/users/me', apiKey);
    if (me.status !== 200) return res.status(502).json({ error: 'Calendly auth failed', detail: me.data });
    const userUri = me.data.resource?.uri;

    // Fetch scheduled events for this user
    const minStart = new Date();
    minStart.setMonth(minStart.getMonth() - 3); // 3 months back
    const maxEnd = new Date();
    maxEnd.setMonth(maxEnd.getMonth() + 6); // 6 months ahead

    const eventsPath = `/scheduled_events?user=${encodeURIComponent(userUri)}&min_start_time=${minStart.toISOString()}&max_start_time=${maxEnd.toISOString()}&count=100&status=active`;
    const evRes = await calendlyGet(eventsPath, apiKey);
    if (evRes.status !== 200) return res.status(502).json({ error: 'Failed to fetch events', detail: evRes.data });

    const events = evRes.data.collection || [];
    let synced = 0, errors = 0;

    // Pre-fetch contacts for email matching
    const { rows: contacts } = await pool.query(`SELECT id, LOWER(email) AS email FROM contacts WHERE email IS NOT NULL`);
    const contactByEmail = {};
    contacts.forEach(c => { contactByEmail[c.email] = c.id; });

    for (const ev of events) {
      try {
        // Fetch invitees for this event
        const eventUuid = ev.uri.split('/').pop();
        const invRes = await calendlyGet(`/scheduled_events/${eventUuid}/invitees?count=1`, apiKey);
        const invitee = invRes.data.collection?.[0] || {};

        const inviteeEmail = invitee.email?.toLowerCase() || null;
        const inviteeName  = invitee.name || null;
        const contactId    = inviteeEmail ? (contactByEmail[inviteeEmail] || null) : null;

        // Find linked matter if contact found
        let matterId = null;
        if (contactId) {
          const { rows: mRows } = await pool.query(
            `SELECT id FROM matters WHERE client_id = $1 AND status = 'open' ORDER BY created_at DESC LIMIT 1`,
            [contactId]
          );
          matterId = mRows[0]?.id || null;
        }

        await pool.query(`
          INSERT INTO calendly_events
            (calendly_event_id, invitee_name, invitee_email, event_name,
             start_time, end_time, linked_contact_id, linked_matter_id, status, raw_data)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (calendly_event_id) DO UPDATE SET
            invitee_name = EXCLUDED.invitee_name,
            invitee_email = EXCLUDED.invitee_email,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            status = EXCLUDED.status,
            linked_contact_id = EXCLUDED.linked_contact_id,
            linked_matter_id = EXCLUDED.linked_matter_id
        `, [
          eventUuid,
          inviteeName,
          inviteeEmail,
          ev.name || 'Calendly Appointment',
          ev.start_time,
          ev.end_time,
          contactId,
          matterId,
          ev.status || 'active',
          JSON.stringify(ev),
        ]);
        synced++;
      } catch (e) {
        console.error('Error syncing event:', e.message);
        errors++;
      }
    }

    res.json({ synced, errors, total: events.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sync failed', detail: err.message });
  }
});

module.exports = router;
