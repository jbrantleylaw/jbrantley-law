/**
 * POST /.netlify/functions/log-installment-choice
 *
 * Fired from the browser the moment a signed client clicks an installment
 * deposit payment link instead of the full-fee link, so the firm knows to
 * send the remaining invoice(s) by hand. This only flags the client's choice
 * of button — it is not a payment confirmation, since the actual payment
 * happens entirely on PracticePanther's own page and this portal never learns
 * whether it went through.
 *
 * Body: { docId, areaSlug, tierLabel, fraction, contact, website }
 * 200:  { ok, emailed }
 */
import { getArea } from '../../public/data/practice-areas.mjs';
import { clientOfRecord } from '../../public/data/letter.mjs';
import { sendMail, mailConfig } from './lib/mailer.mjs';
import { buildInstallmentChoiceEmail } from './lib/email-body.mjs';
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
  if (rateLimited(ip, { max: 8 })) {
    return json(200, { ok: true, emailed: false });
  }

  const area = getArea(payload.areaSlug);
  if (!area) return fail(400, 'We could not tell which service this is about.');

  const contact = plainObject(payload.contact, 2_000);
  const docId = String(payload.docId || '').slice(0, 40);
  const tierLabel = String(payload.tierLabel || '').slice(0, 200);
  const fraction = String(payload.fraction || '').slice(0, 20);

  const cfg = mailConfig();
  const email = buildInstallmentChoiceEmail({ area, contact, docId, tierLabel, fraction, ip });

  const delivery = await sendMail({
    to: [cfg.to],
    replyTo: contact.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    attachments: [],
  });

  if (!delivery.ok) {
    console.error('Installment choice email failed', { docId, provider: delivery.provider, error: delivery.error });
    return json(200, { ok: true, emailed: false });
  }

  console.log('Installment deposit link clicked', { docId, area: area.slug, client: clientOfRecord(contact), fraction });
  return json(200, { ok: true, emailed: true });
};
