/**
 * Sends the intake email with the signed PDF attached.
 *
 * Two transports, picked by whichever environment variables are set:
 *   1. Resend      — RESEND_API_KEY  (recommended; nothing to install)
 *   2. SMTP        — SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *
 * Never throws. A delivery failure is reported back to the client so they can
 * forward the copy they downloaded rather than silently losing the matter.
 */

export function mailConfig() {
  const env = process.env;
  return {
    to: env.MAIL_TO || 'jbrantley@jenniferbrantleylaw.com',
    from: env.MAIL_FROM || 'intake@fineprintlawyer.com',
    fromName: env.MAIL_FROM_NAME || 'Client Intake Portal',
    resendKey: env.RESEND_API_KEY || '',
    smtp: {
      host: env.SMTP_HOST || '',
      port: Number(env.SMTP_PORT || 587),
      user: env.SMTP_USER || '',
      pass: env.SMTP_PASS || '',
      secure: String(env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(env.SMTP_PORT) === 465,
    },
    // On by default: the client should hold their own copy of what they signed.
    // Set SEND_CLIENT_COPY=false to turn it off.
    sendClientCopy: String(env.SEND_CLIENT_COPY ?? 'true').toLowerCase() !== 'false',
  };
}

export function isConfigured(cfg = mailConfig()) {
  return Boolean(cfg.resendKey || (cfg.smtp.host && cfg.smtp.user));
}

/**
 * @param {{to: string[], subject: string, html: string, text: string,
 *          replyTo?: string, attachments: {filename: string, base64: string}[]}} msg
 * @returns {Promise<{ok: boolean, provider: string, id?: string, error?: string}>}
 */
export async function sendMail(msg) {
  const cfg = mailConfig();

  if (cfg.resendKey) {
    try {
      return await sendViaResend(msg, cfg);
    } catch (err) {
      // Fall through to SMTP if it is also configured.
      if (!cfg.smtp.host) return { ok: false, provider: 'resend', error: String(err.message || err) };
    }
  }

  if (cfg.smtp.host && cfg.smtp.user) {
    try {
      return await sendViaSmtp(msg, cfg);
    } catch (err) {
      return { ok: false, provider: 'smtp', error: String(err.message || err) };
    }
  }

  return {
    ok: false,
    provider: 'none',
    error: 'No email transport configured. Set RESEND_API_KEY or the SMTP_* variables in Netlify.',
  };
}

async function sendViaResend(msg, cfg) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${cfg.fromName} <${cfg.from}>`,
      to: msg.to,
      reply_to: msg.replyTo || undefined,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      attachments: msg.attachments.map((a) => ({ filename: a.filename, content: a.base64 })),
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || `Resend responded ${res.status}`);
  }
  return { ok: true, provider: 'resend', id: body.id };
}

async function sendViaSmtp(msg, cfg) {
  const { default: nodemailer } = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host: cfg.smtp.host,
    port: cfg.smtp.port,
    secure: cfg.smtp.secure,
    auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
  });

  const info = await transport.sendMail({
    from: `"${cfg.fromName}" <${cfg.from}>`,
    to: msg.to.join(', '),
    replyTo: msg.replyTo || undefined,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    attachments: msg.attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.base64, 'base64'),
      contentType: 'application/pdf',
    })),
  });

  return { ok: true, provider: 'smtp', id: info.messageId };
}
