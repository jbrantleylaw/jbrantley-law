/**
 * POST /.netlify/functions/request-payment-plan
 *
 * A client who has already signed asks the firm about paying in instalments.
 * This takes no money and changes nothing about the agreement they signed — it
 * simply emails the firm so a plan can be arranged by hand, in writing.
 *
 * Body: { docId, areaSlug, contact, message, website }
 * 200:  { ok, emailed }
 */
import { getArea } from '../../public/data/practice-areas.mjs';
import { clientOfRecord } from '../../public/data/letter.mjs';
import { sendMail, mailConfig } from './lib/mailer.mjs';
import { buildPaymentPlanEmail } from './lib/email-body.mjs';
import { json, fail, clientIp, rateLimited, readJson, plainObject } from './lib/http.mjs';

const MAX_BODY_BYTES = 20_000;

export default async (req, context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return fail(405, 'Use POST.');

  const ip = clientIp(req, context);

  const body = await readJson(req, MAX_BODY_BYTES);
  if (body.response) return body.response;
  const payload = body.payload;

  if (payload.website) return fail(400, 'Submission rejected.');
  if (rateLimited(ip, { max: 4 })) {
    return fail(429, 'Too many requests from this connection. Please email the firm directly.');
  }

  const area = getArea(payload.areaSlug);
  if (!area) return fail(400, 'We could not tell which service this is about.');

  const contact = plainObject(payload.contact, 2_000);
  const message = String(payload.message || '').slice(0, 4_000).trim();
  const docId = String(payload.docId || '').slice(0, 40);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(contact.email || ''))) {
    return fail(422, 'We need a valid email address to reply to.');
  }

  const cfg = mailConfig();
  const email = buildPaymentPlanEmail({ area, contact, docId, message, ip });

  const delivery = await sendMail({
    to: [cfg.to],
    replyTo: contact.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    attachments: [],
  });

  if (!delivery.ok) {
    console.error('Payment plan request email failed', { docId, provider: delivery.provider, error: delivery.error });
    // The client is shown the firm's address so the request is never simply lost.
    return json(200, { ok: true, emailed: false, mailTo: cfg.to });
  }

  console.log('Payment plan requested', { docId, area: area.slug, client: clientOfRecord(contact) });
  return json(200, { ok: true, emailed: true });
};
