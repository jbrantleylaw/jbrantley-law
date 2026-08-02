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

/**
 * Called out at the top of the email rather than left buried in the answers:
 * it changes the fee and requires documentation before an invoice goes out.
 */
function militaryBanner(answers) {
  const status = answers?.military_affiliation;
  if (!status || status === 'No') return '';
  return `
      <div style="margin:20px 0 0;padding:14px 16px;background:#f3ecdd;border-left:4px solid #16263c;border-radius:6px;">
        <div style="font:600 12px/1 -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#16263c;">Military — reduced fee</div>
        <div style="margin-top:6px;font:14px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:#47586e;">
          Client identified as <strong style="color:#16263c;">${escapeHtml(status)}</strong>.
          Collect supporting documentation before issuing an invoice.
        </div>
      </div>`;
}

export function buildEmail({ area, contact, answers, docId, signedAt, ip, paymentOptions = [] }) {
  const name = clientOfRecord(contact);
  const flagged = answers?.military_affiliation && answers.military_affiliation !== 'No';
  const subject = `${name} — ${area.name}${flagged ? ' [Military]' : ''}`;

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
      ${militaryBanner(answers)}

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

  const militaryStatus = answers?.military_affiliation;
  const militaryLine = militaryStatus && militaryStatus !== 'No'
    ? [`** MILITARY — REDUCED FEE: client identified as ${militaryStatus}. Collect supporting documentation before issuing an invoice. **`, '']
    : [];

  const text = [
    `New signed engagement — ${area.name}`,
    '',
    ...militaryLine,
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

/**
 * A signed client asking to pay in instalments. Deliberately plain and short —
 * it is a prompt to pick up the phone, not a record of anything agreed.
 */
export function buildPaymentPlanEmail({ area, contact, docId, message, ip }) {
  const name = clientOfRecord(contact);
  const subject = `Payment plan request — ${name} — ${area.name}`;

  const rows = [
    ['Client', name],
    ['Email', contact.email],
    ['Phone', contact.phone],
    ['Matter', area.name],
    ['Signed agreement', docId || 'not supplied'],
    ['Client IP', ip || 'not recorded'],
  ].filter(([, v]) => v && String(v).trim());

  const html = `
<div style="background:#faf9f6;padding:26px 0;">
  <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e2ddd3;border-radius:10px;overflow:hidden;">
    <div style="background:#9d7a37;padding:18px 26px;">
      <div style="font:600 16px/1.3 Georgia,serif;color:#fff;">Payment plan request</div>
    </div>
    <div style="padding:22px 26px 28px;">
      <p style="margin:0 0 18px;font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#47586e;">
        <strong style="color:#16263c;">${escapeHtml(name)}</strong> has signed the
        ${escapeHtml(area.name)} engagement letter and is asking about paying in
        instalments. <strong>No payment has been made</strong>, and the signed agreement
        is unchanged — it still reads payable in full.
      </p>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border-top:1px solid #e2ddd3;">
        ${rows.map(([l, v]) => `
        <tr>
          <td style="padding:7px 14px 7px 0;vertical-align:top;width:150px;font:600 12px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#7b8798;">${escapeHtml(l)}</td>
          <td style="padding:7px 0;vertical-align:top;font:14px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:#16263c;">${escapeHtml(v)}</td>
        </tr>`).join('')}
      </table>
      ${message ? `
      <p style="margin:24px 0 6px;font:600 11px/1 -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#9d7a37;">What they said</p>
      <p style="margin:0;padding:14px 16px;background:#faf9f6;border-radius:8px;font:14px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#16263c;">${escapeHtml(message).replace(/\n/g, '<br>')}</p>` : ''}
      <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2ddd3;font:12px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#7b8798;">
        Reply to this email to reach the client directly. Any payment plan should be
        confirmed in a signed writing before work begins.
      </p>
    </div>
  </div>
</div>`;

  const text = [
    `Payment plan request — ${area.name}`,
    '',
    `${name} has signed the engagement letter and is asking about paying in instalments.`,
    'No payment has been made, and the signed agreement is unchanged.',
    '',
    ...rows.map(([l, v]) => `${l}: ${v}`),
    ...(message ? ['', 'WHAT THEY SAID', message] : []),
  ].join('\n');

  return { subject, html, text };
}

/** The client's own copy of what they signed. On unless SEND_CLIENT_COPY=false. */
export function buildClientCopy({ area, contact, docId }) {
  const first = escapeHtml(contact.first_name || 'there');
  const ref = docId ? `<br><span style="color:#7b8798;">Reference ${escapeHtml(docId)}</span>` : '';

  const html = `
<div style="background:#faf9f6;padding:26px 0;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2ddd3;border-radius:10px;overflow:hidden;">
    <div style="background:#16263c;border-bottom:3px solid #9d7a37;padding:20px 26px;">
      <div style="font:600 17px/1.3 Georgia,serif;color:#fff;">${escapeHtml(FIRM.name)}</div>
      <div style="font:12px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#f3ecdd;opacity:.85;margin-top:3px;">
        ${escapeHtml(FIRM.tagline || 'Engagement agreement')}
      </div>
    </div>
    <div style="padding:26px;">
      <p style="margin:0 0 16px;font:15px/1.65 -apple-system,Segoe UI,Roboto,sans-serif;color:#47586e;">
        ${first}, attached is the <strong style="color:#16263c;">${escapeHtml(area.name)}</strong>
        engagement agreement you just signed, with the intake answers you gave on the last page.
        Please keep it for your records.${ref}
      </p>
      <p style="margin:0 0 8px;font:600 11px/1 -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#9d7a37;">What happens next</p>
      <p style="margin:0 0 16px;font:15px/1.65 -apple-system,Segoe UI,Roboto,sans-serif;color:#47586e;">
        The firm runs a conflicts check and confirms the engagement before any work begins.
        <strong style="color:#16263c;">Signing alone does not create an attorney-client
        relationship</strong> — it begins when the firm confirms it in writing and any required
        payment has been received. You should hear back within one business day.
      </p>
      <p style="margin:0;font:15px/1.65 -apple-system,Segoe UI,Roboto,sans-serif;color:#47586e;">
        If anything in the agreement is not what you expected, reply to this email before making
        any payment.
      </p>
      <p style="margin:26px 0 0;padding-top:16px;border-top:1px solid #e2ddd3;font:13px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#7b8798;">
        ${escapeHtml(FIRM.attorneyName)}${FIRM.attorneyTitle ? `, ${escapeHtml(FIRM.attorneyTitle)}` : ''}<br>
        ${escapeHtml(FIRM.name)}${FIRM.phone ? ` &middot; ${escapeHtml(FIRM.phone)}` : ''} &middot; ${escapeHtml(FIRM.email)}
      </p>
      <p style="margin:14px 0 0;font:12px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:#a3adba;">
        This email and its attachment are confidential. If it reached you in error, please delete
        it and let the firm know at ${escapeHtml(FIRM.email)}.
      </p>
    </div>
  </div>
</div>`;

  const text = [
    `${contact.first_name || 'Hello'},`,
    '',
    `Attached is the ${area.name} engagement agreement you just signed with ${FIRM.name}, with your intake answers on the last page. Please keep it for your records.`,
    ...(docId ? ['', `Reference ${docId}`] : []),
    '',
    'WHAT HAPPENS NEXT',
    'The firm runs a conflicts check and confirms the engagement before any work begins. Signing alone does not create an attorney-client relationship — it begins when the firm confirms it in writing and any required payment has been received. You should hear back within one business day.',
    '',
    'If anything in the agreement is not what you expected, reply to this email before making any payment.',
    '',
    [FIRM.attorneyName, FIRM.attorneyTitle].filter(Boolean).join(', '),
    [FIRM.name, FIRM.phone, FIRM.email].filter(Boolean).join(' · '),
    '',
    `This email and its attachment are confidential. If it reached you in error, please delete it and let the firm know at ${FIRM.email}.`,
  ].join('\n');

  return { subject: `Your signed engagement agreement — ${area.name}`, html, text };
}
