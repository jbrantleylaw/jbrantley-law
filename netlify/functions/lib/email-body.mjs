/**
 * The email the firm receives. Everything needed to open the file is in the
 * body, so the PDF only has to be opened when the letter itself is wanted.
 */
import { FIRM } from '../../../public/data/practice-areas.mjs';
import { answerPairs, clientOfRecord, signerName, addressOneLine } from '../../../public/data/letter.mjs';

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function contactRows(contact) {
  const address = addressOneLine(contact);

  return [
    ['Client of record', clientOfRecord(contact)],
    ['Signed by', signerName(contact)],
    ['Role', contact.entity_role],
    ['Email', contact.email],
    ['Phone', contact.phone],
    ['Address', address],
    ['Preferred contact', contact.preferred_contact],
    ['Heard about firm via', contact.referral_source],
  ].filter(([, v]) => v && String(v).trim());
}

export function buildEmail({ area, contact, answers, docId, signedAt, ip, paymentOptions = [] }) {
  const name = clientOfRecord(contact);
  const subject = `${name} — ${area.name}`;

  const row = (label, value) => `
    <tr>
      <td style="padding:7px 14px 7px 0;vertical-align:top;width:190px;font:600 12px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#7b8798;">${escapeHtml(label)}</td>
      <td style="padding:7px 0;vertical-align:top;font:14px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:#16263c;">${escapeHtml(value).replace(/\n/g, '<br>')}</td>
    </tr>`;

  const section = (title, rows) => `
    <p style="margin:30px 0 8px;font:600 11px/1 -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#9d7a37;">${escapeHtml(title)}</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border-top:1px solid #e2ddd3;">${rows}</table>`;

  const html = `
<div style="background:#faf9f6;padding:26px 0;">
  <div style="max-width:660px;margin:0 auto;background:#fff;border:1px solid #e2ddd3;border-radius:10px;overflow:hidden;">
    <div style="background:#16263c;border-bottom:3px solid #9d7a37;padding:20px 26px;">
      <div style="font:600 17px/1.3 Georgia,serif;color:#fff;">New signed engagement</div>
      <div style="font:12px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#f3ecdd;opacity:.85;margin-top:3px;">
        ${escapeHtml(area.name)}
      </div>
    </div>
    <div style="padding:8px 26px 30px;">
      <p style="margin:22px 0 0;font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#47586e;">
        <strong style="color:#16263c;">${escapeHtml(name)}</strong> completed intake and signed the
        ${escapeHtml(area.name)} engagement letter. The signed PDF is attached, with the intake
        answers on the last page.
      </p>

      ${section('Contact', contactRows(contact).map(([l, v]) => row(l, v)).join(''))}
      ${section('Intake answers', answerPairs(area, answers).map((p) => row(p.label, p.value)).join(''))}
      ${section('Record', [
        row('Document ID', docId),
        row('Signed at', signedAt),
        row('Client IP', ip || 'not recorded'),
        row('Payment', paymentOptions.length
          ? `${paymentOptions.length} payment option${paymentOptions.length > 1 ? 's' : ''} shown to the client`
          : 'No payment link configured — invoice manually'),
      ].join(''))}

      <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e2ddd3;font:12px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#7b8798;">
        Reply to this email to reach the client directly. Sent by the ${escapeHtml(FIRM.name)} intake portal.
      </p>
    </div>
  </div>
</div>`;

  const text = [
    `New signed engagement — ${area.name}`,
    '',
    ...contactRows(contact).map(([l, v]) => `${l}: ${v}`),
    '',
    'INTAKE ANSWERS',
    ...answerPairs(area, answers).map((p) => `\n${p.label}\n  ${p.value.replace(/\n/g, '\n  ')}`),
    '',
    `Document ID: ${docId}`,
    `Signed at: ${signedAt}`,
    `Client IP: ${ip || 'not recorded'}`,
  ].join('\n');

  return { subject, html, text };
}

/** Optional confirmation to the client — off unless SEND_CLIENT_COPY=true. */
export function buildClientCopy({ area, contact }) {
  const first = escapeHtml(contact.first_name || 'there');
  const html = `
<div style="background:#faf9f6;padding:26px 0;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2ddd3;border-radius:10px;padding:30px;">
    <div style="font:600 18px/1.3 Georgia,serif;color:#16263c;">${escapeHtml(FIRM.name)}</div>
    <p style="font:15px/1.65 -apple-system,Segoe UI,Roboto,sans-serif;color:#47586e;">
      ${first}, attached is the ${escapeHtml(area.name)} engagement letter you signed, along with a
      copy of the intake answers you provided. Please keep it for your records.
    </p>
    <p style="font:15px/1.65 -apple-system,Segoe UI,Roboto,sans-serif;color:#47586e;">
      The firm will confirm the engagement after completing a conflicts check. Until then, no
      attorney-client relationship has been formed. If anything in the letter is not what you
      expected, reply to this email before making any payment.
    </p>
    <p style="font:13px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#7b8798;margin-top:26px;">
      ${escapeHtml(FIRM.attorneyName)} &middot; ${escapeHtml(FIRM.email)}
    </p>
  </div>
</div>`;

  return {
    subject: `Your signed engagement letter — ${area.name}`,
    html,
    text: `Attached is the ${area.name} engagement letter you signed with ${FIRM.name}, along with your intake answers. `
      + 'The firm will confirm the engagement after completing a conflicts check; until then no attorney-client relationship has been formed. '
      + `Questions: ${FIRM.email}`,
  };
}
