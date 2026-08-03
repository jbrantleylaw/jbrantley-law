/**
 * POST /.netlify/functions/track-intake-start
 *
 * Fired once from the browser when a client finishes the contact screen and
 * moves on to the matter questions — the earliest point the portal knows
 * enough (name, email, area) to follow up if they never come back. Recorded
 * in Netlify Blobs and read later by send-intake-reminders.mjs.
 *
 * Not a payment or a signed record of anything — just enough to send one
 * reminder email if the intake is abandoned.
 *
 * Body: { sessionId, areaSlug, contact, website }
 * 200:  { ok: true }
 */
import { getArea } from '../../public/data/practice-areas.mjs';
import { intakeProgressStore } from './lib/store.mjs';
import { json, fail, clientIp, rateLimited, readJson, plainObject } from './lib/http.mjs';

const MAX_BODY_BYTES = 8_000;

export default async (req, context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return fail(405, 'Use POST.');

  const ip = clientIp(req, context);
  const body = await readJson(req, MAX_BODY_BYTES);
  if (body.response) return body.response;
  const payload = body.payload;

  if (payload.website) return json(200, { ok: true }); // honeypot — pretend success, do nothing
  if (rateLimited(ip, { max: 20 })) return json(200, { ok: true });

  const sessionId = String(payload.sessionId || '').slice(0, 100);
  if (!/^[A-Za-z0-9-]{10,100}$/.test(sessionId)) return fail(400, 'Missing or malformed session id.');

  const area = getArea(payload.areaSlug);
  if (!area) return fail(400, 'We could not tell which service this is about.');

  const contact = plainObject(payload.contact, 2_000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(contact.email || ''))) {
    return json(200, { ok: true }); // nothing useful to remind without a valid email
  }

  // Best-effort: a client's contact info was already validated above and this
  // is not something the client is waiting on, so a Blobs outage (or, in a
  // non-Netlify local dev setup, Blobs being unavailable at all) should never
  // surface as an error and should never block the client from continuing.
  try {
    const store = intakeProgressStore();
    const existing = await store.get(sessionId, { type: 'json' }).catch(() => null);
    const now = new Date().toISOString();

    await store.setJSON(sessionId, {
      ...existing,
      sessionId,
      areaSlug: area.slug,
      contact: {
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
      },
      startedAt: existing?.startedAt || now,
      lastSeenAt: now,
      completed: existing?.completed || false,
      completedAt: existing?.completedAt || null,
      reminded: existing?.reminded || false,
      remindedAt: existing?.remindedAt || null,
    });
  } catch (err) {
    console.error('Could not record intake progress', { sessionId, error: err?.message || err });
  }

  return json(200, { ok: true });
};
