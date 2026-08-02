/**
 * Checks the Resend transport without touching the network or needing a key.
 *
 *   npm run check:email
 *
 * Stubs fetch, captures exactly what the mailer would POST to api.resend.com,
 * and asserts the payload Resend expects — endpoint, bearer auth, `to` as an
 * array, `reply_to` in snake_case, and attachments as base64 under `content`.
 * Also covers a rejected send (unverified domain) and the fall-through to SMTP.
 *
 * Run it after touching lib/mailer.mjs. A silent field-name change here would
 * otherwise show up as engagement letters that never arrive.
 */
process.env.RESEND_API_KEY = 're_test_key_123';
process.env.MAIL_FROM = 'intake@fineprintlawyer.com';
process.env.MAIL_TO = 'jbrantley@jenniferbrantleylaw.com';
delete process.env.SMTP_HOST;

const { sendMail } = await import('../netlify/functions/lib/mailer.mjs');

let captured = null;
const realFetch = globalThis.fetch;

function stub(status, body) {
  globalThis.fetch = async (url, init) => {
    captured = { url, init };
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

const msg = {
  to: ['jbrantley@jenniferbrantleylaw.com'],
  replyTo: 'dana@whitfieldbuilders.com',
  subject: 'Dana Whitfield — Trademark & Brand Protection',
  html: '<p>hello</p>',
  text: 'hello',
  attachments: [{ filename: 'Signed Engagement Letter.pdf', base64: 'JVBERi0xLjcK' }],
};

/* ---- 1. success ---- */
stub(200, { id: 'e1b2c3d4-0000-1111-2222-333344445555' });
const ok = await sendMail(msg);
const body = JSON.parse(captured.init.body);

console.log('1. SUCCESS PATH');
console.log('   result        :', JSON.stringify(ok));
console.log('   url           :', captured.url);
console.log('   method        :', captured.init.method);
console.log('   authorization :', captured.init.headers.Authorization);
console.log('   content-type  :', captured.init.headers['Content-Type']);
console.log('   body keys     :', Object.keys(body).sort().join(', '));
console.log('   from          :', body.from);
console.log('   to            :', JSON.stringify(body.to), Array.isArray(body.to) ? '(array ✓)' : '(NOT AN ARRAY ✗)');
console.log('   reply_to      :', body.reply_to);
console.log('   subject       :', body.subject);
console.log('   attachment    :', JSON.stringify(body.attachments));

const problems = [];
if (captured.url !== 'https://api.resend.com/emails') problems.push('wrong endpoint');
if (captured.init.headers.Authorization !== 'Bearer re_test_key_123') problems.push('bad auth header');
if (!Array.isArray(body.to)) problems.push('`to` must be an array');
if (body.reply_to !== 'dana@whitfieldbuilders.com') problems.push('reply_to not set (snake_case expected)');
if (body.attachments?.[0]?.content !== 'JVBERi0xLjcK') problems.push('attachment content must be base64 under `content`');
if (body.attachments?.[0]?.filename !== 'Signed Engagement Letter.pdf') problems.push('attachment filename missing');
if (!ok.ok || ok.provider !== 'resend' || !ok.id) problems.push('success result malformed');

/* ---- 2. Resend rejects (e.g. unverified domain), no SMTP configured ---- */
stub(403, { message: 'The fineprintlawyer.com domain is not verified.' });
const denied = await sendMail(msg);
console.log('\n2. RESEND REJECTS, NO SMTP FALLBACK');
console.log('   result        :', JSON.stringify(denied));
if (denied.ok) problems.push('a 403 from Resend was reported as success');
if (!/not verified/.test(denied.error || '')) problems.push('Resend error message not surfaced');

/* ---- 3. Resend fails but SMTP is configured -> should fall through ---- */
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = '1';
process.env.SMTP_USER = 'u';
process.env.SMTP_PASS = 'p';
stub(500, { message: 'boom' });
const fell = await sendMail(msg);
console.log('\n3. RESEND FAILS, SMTP CONFIGURED');
console.log('   result        :', JSON.stringify(fell));
if (fell.provider !== 'smtp') problems.push('did not fall through to SMTP when Resend failed');

globalThis.fetch = realFetch;

console.log('\n' + (problems.length ? `FAILURES:\n - ${problems.join('\n - ')}` : 'All Resend payload checks passed.'));
process.exit(problems.length ? 1 : 0);
