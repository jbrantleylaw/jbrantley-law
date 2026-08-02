/**
 * POST /.netlify/functions/submit-intake
 *
 * Takes the completed intake and the drawn signature, produces the signed
 * engagement letter as a PDF, emails it to the firm, and hands the same PDF
 * back to the browser so the client can download their copy.
 *
 * Body: { areaSlug, contact, answers, signature, meta, website }
 * 200:  { ok, id, filename, pdfBase64, emailed, paymentRequired }
 */
import { createHash, randomUUID } from 'node:crypto';
import { getArea, questionsFor, CONTACT_FIELDS, isVisible } from '../../public/data/practice-areas.mjs';
import { clientOfRecord, paymentChoicesFor } from '../../public/data/letter.mjs';
import { buildEngagementPdf } from './lib/pdf.mjs';
import { sendMail, mailConfig } from './lib/mailer.mjs';
import { buildEmail, buildClientCopy } from './lib/email-body.mjs';
import { json, fail, clientIp, rateLimited, readJson, plainObject } from './lib/http.mjs';

const MAX_BODY_BYTES = 3_000_000; // a drawn signature is tens of KB; 3 MB is generous

export default async (req, context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return fail(405, 'Use POST.');

  const ip = clientIp(req, context);

  const body = await readJson(req, MAX_BODY_BYTES);
  if (body.response) return body.response;
  const payload = body.payload;

  // Honeypot — the field is hidden from people and empty for every real client.
  if (payload.website) return fail(400, 'Submission rejected.');

  if (rateLimited(ip)) {
    return fail(429, 'Too many submissions from this connection. Please wait a few minutes or email the firm directly.');
  }

  const area = getArea(payload.areaSlug);
  if (!area) return fail(400, 'We could not tell which service this is for.');

  const contact = plainObject(payload.contact);
  const answers = plainObject(payload.answers);
  // The signature is a base64 PNG and legitimately runs to tens of KB, so it
  // gets its own limit. Truncating it would hand pdf-lib a half-finished image.
  const signature = plainObject(payload.signature, 1_600_000);

  const problem = validate({ area, contact, answers, signature });
  if (problem) return fail(422, problem);

  const signedAt = parseDate(signature.signedAt);
  const docId = makeDocId({ area, contact, signedAt });

  let pdfBytes;
  try {
    pdfBytes = await buildEngagementPdf({ area, contact, answers, signature, docId, ip, signedAt });
  } catch (err) {
    console.error('PDF generation failed', { docId, area: area.slug, error: err?.stack || err });
    return fail(500, 'We could not generate your engagement letter. Nothing was submitted — please try again.');
  }

  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
  const filename = buildFilename(area, contact, signedAt);

  const cfg = mailConfig();
  const email = buildEmail({
    area,
    contact,
    answers,
    docId,
    signedAt: signedAt.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'),
    ip,
    paymentOptions: paymentChoicesFor(area),
  });

  const delivery = await sendMail({
    to: [cfg.to],
    replyTo: contact.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    attachments: [{ filename, base64: pdfBase64 }],
  });

  if (!delivery.ok) {
    // The client still gets the PDF and is told to forward it, so a mail
    // outage never costs the firm the engagement.
    console.error('Intake email failed', { docId, provider: delivery.provider, error: delivery.error });
  }

  if (cfg.sendClientCopy && delivery.ok && contact.email) {
    const copy = buildClientCopy({ area, contact, docId });
    const clientDelivery = await sendMail({
      to: [contact.email],
      replyTo: cfg.to,
      subject: copy.subject,
      html: copy.html,
      text: copy.text,
      attachments: [{ filename, base64: pdfBase64 }],
    });
    if (!clientDelivery.ok) console.error('Client copy failed', { docId, error: clientDelivery.error });
  }

  console.log('Intake submitted', {
    docId,
    area: area.slug,
    client: clientOfRecord(contact),
    emailed: delivery.ok,
    provider: delivery.provider,
  });

  return json(200, {
    ok: true,
    id: docId,
    filename,
    pdfBase64,
    emailed: delivery.ok,
    paymentRequired: paymentChoicesFor(area).length > 0,
  });
};

/* ------------------------------------------------------------- helpers ---- */

function validate({ area, contact, answers, signature }) {
  for (const f of CONTACT_FIELDS) {
    if (!isVisible(f, contact) || !f.required) continue;
    if (isEmpty(contact[f.id])) return `Please complete "${f.label}".`;
  }
  for (const q of questionsFor(area)) {
    if (!isVisible(q, answers) || !q.required) continue;
    if (isEmpty(answers[q.id])) return `Please complete "${q.label}".`;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(contact.email || ''))) {
    return 'That email address does not look right.';
  }
  if (!String(signature.typedName || '').trim()) return 'Please type your full legal name.';
  if (signature.consented !== true) return 'Please accept the electronic signature consent.';
  if (typeof signature.image !== 'string' || !signature.image.startsWith('data:image/png;base64,')) {
    return 'We did not receive your signature. Please draw it again.';
  }
  if (signature.image.length > 1_500_000) return 'That signature image is too large.';
  return null;
}

function isEmpty(v) {
  if (Array.isArray(v)) return v.length === 0;
  return v === undefined || v === null || String(v).trim() === '';
}

function parseDate(value) {
  const d = new Date(value);
  // Never trust a clock we do not control for the record of when this was signed.
  if (Number.isNaN(d.getTime()) || Math.abs(Date.now() - d.getTime()) > 24 * 60 * 60 * 1000) {
    return new Date();
  }
  return d;
}

/** Stable, human-quotable reference: JBL-XXXX-XXXX. */
function makeDocId({ area, contact, signedAt }) {
  const hash = createHash('sha256')
    .update([area.slug, contact.email, clientOfRecord(contact), signedAt.toISOString(), randomUUID()].join('|'))
    .digest('hex')
    .toUpperCase();
  return `JBL-${hash.slice(0, 4)}-${hash.slice(4, 8)}`;
}

function buildFilename(area, contact, signedAt) {
  const safe = (s) => String(s || '').replace(/[^\w\s.-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const date = signedAt.toISOString().slice(0, 10);
  return `Signed Engagement Letter - ${safe(clientOfRecord(contact))} - ${safe(area.short)} - ${date}.pdf`;
}
