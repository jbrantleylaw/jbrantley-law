/**
 * Scheduled function — runs on its own, Netlify calls it every 6 hours.
 * (See `export const config` below; no HTTP request triggers this in normal
 * operation, though it can still be invoked manually the same way as any
 * other function for testing.)
 *
 * Finds intakes that started (the client gave contact info and moved past
 * screen 1) but never finished signing, sends each client ONE reminder email,
 * and sends the firm a single digest of everyone reminded in this run.
 */
import { getArea } from '../../public/data/practice-areas.mjs';
import { sendMail, mailConfig } from './lib/mailer.mjs';
import { buildAbandonedReminderEmail, buildAbandonedDigestEmail } from './lib/email-body.mjs';
import { intakeProgressStore } from './lib/store.mjs';

export const config = { schedule: '0 */6 * * *' };

// Give a client real time to come back on their own before nudging them, but
// do not let a months-old, long-abandoned record trigger a stale reminder.
const REMIND_AFTER_MS = 20 * 60 * 60 * 1000; // ~20 hours
const IGNORE_AFTER_MS = 21 * 24 * 60 * 60 * 1000; // 21 days — too stale to bother

export default async () => {
  let store;
  try {
    store = intakeProgressStore();
  } catch (err) {
    console.error('Blobs store unavailable — skipping this run', { error: err?.message || err });
    return new Response(JSON.stringify({ ok: false, error: 'Blobs store unavailable' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cfg = mailConfig();
  const now = Date.now();

  const digestRows = [];
  let scanned = 0;

  for await (const entry of store.list()) {
    scanned += 1;
    const record = await store.get(entry.key, { type: 'json' }).catch(() => null);
    if (!record || record.completed || record.reminded) continue;

    const started = Date.parse(record.startedAt || '');
    if (!Number.isFinite(started)) continue;
    const age = now - started;
    if (age < REMIND_AFTER_MS || age > IGNORE_AFTER_MS) continue;

    const area = getArea(record.areaSlug);
    if (!area) continue;

    const contact = record.contact || {};
    if (!contact.email) continue;

    const startUrl = `https://${process.env.URL ? new URL(process.env.URL).host : 'the portal'}/intake/${area.slug}`;
    const email = buildAbandonedReminderEmail({ area, contact, startUrl });

    const delivery = await sendMail({
      to: [contact.email],
      replyTo: cfg.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: [],
    });

    await store.setJSON(entry.key, { ...record, reminded: true, remindedAt: new Date().toISOString(), reminderEmailed: delivery.ok });

    if (delivery.ok) {
      digestRows.push({
        name: [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email,
        email: contact.email,
        phone: contact.phone || '',
        areaName: area.name,
        startedAt: record.startedAt,
      });
    } else {
      console.error('Abandoned-intake reminder failed', { sessionId: entry.key, error: delivery.error });
    }
  }

  if (digestRows.length) {
    const digest = buildAbandonedDigestEmail(digestRows);
    const delivery = await sendMail({
      to: [cfg.to],
      subject: digest.subject,
      html: digest.html,
      text: digest.text,
      attachments: [],
    });
    if (!delivery.ok) console.error('Abandoned-intake digest email failed', { error: delivery.error });
  }

  console.log('send-intake-reminders run complete', { scanned, reminded: digestRows.length });
  return new Response(JSON.stringify({ ok: true, scanned, reminded: digestRows.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
