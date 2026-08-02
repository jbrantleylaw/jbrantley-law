/**
 * Builds the engagement letter into a flat list of blocks.
 *
 * Both the on-screen preview and the PDF generator consume the output of
 * `buildLetter()`, so what the client reads and signs on screen and what ends
 * up in the PDF cannot drift apart.
 */

import { FIRM, LETTER_INTRO, letterSectionsFor, questionsFor } from './practice-areas.mjs';

const BLANK = '__________';

/** Value shown when a merge field has nothing behind it. */
function orBlank(v) {
  const s = (v ?? '').toString().trim();
  return s === '' ? BLANK : s;
}

export function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** The name the client is contracting under: the entity if there is one. */
export function clientOfRecord(contact) {
  const person = `${(contact.first_name || '').trim()} ${(contact.last_name || '').trim()}`.trim();
  if (contact.client_type === 'A business or other entity' && (contact.entity_name || '').trim()) {
    return contact.entity_name.trim();
  }
  return person;
}

export function signerName(contact) {
  return `${(contact.first_name || '').trim()} ${(contact.last_name || '').trim()}`.trim();
}

export function addressLines(contact) {
  const lines = [];
  if (contact.street) lines.push(contact.street.trim());
  const cityLine = [contact.city, contact.state].filter(Boolean).join(', ');
  const withZip = [cityLine, contact.zip].filter(Boolean).join(' ').trim();
  if (withZip) lines.push(withZip);
  return lines;
}

/** "1400 Broadway St, San Antonio, TX 78215" — no stray comma before the ZIP. */
export function addressOneLine(contact) {
  return addressLines(contact).join(', ');
}

/** Flat lookup table for {{merge}} fields. */
export function buildContext(area, contact, answers, date = new Date()) {
  const ctx = {
    clientName: clientOfRecord(contact),
    signerName: signerName(contact),
    firstName: contact.first_name || '',
    clientAddress: addressLines(contact).join(', '),
    clientEmail: contact.email || '',
    clientPhone: contact.phone || '',
    today: formatDate(date),
    areaName: area.name,
    feeSummary: area.feeSummary || '',
    firmName: FIRM.name,
    attorneyName: FIRM.attorneyName,
    firmEmail: FIRM.email,
    firmPhone: FIRM.phone,
  };
  for (const q of questionsFor(area)) {
    const v = answers[q.id];
    ctx[`answers.${q.id}`] = Array.isArray(v) ? v.join(', ') : (v ?? '');
  }
  return ctx;
}

export function merge(text, ctx) {
  return String(text).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => orBlank(ctx[key]));
}

/**
 * @returns {{
 *   subject: string, dateLine: string, addressTo: string[], reLine: string,
 *   salutation: string, blocks: {type: 'h'|'p'|'li', text: string}[]
 * }}
 */
export function buildLetter(area, contact, answers, date = new Date()) {
  const ctx = buildContext(area, contact, answers, date);
  const blocks = [];

  for (const p of LETTER_INTRO) blocks.push({ type: 'p', text: merge(p, ctx) });

  for (const section of letterSectionsFor(area)) {
    if (section.heading) blocks.push({ type: 'h', text: merge(section.heading, ctx) });
    for (const line of section.body) {
      const text = merge(line, ctx);
      if (line.startsWith('- ')) blocks.push({ type: 'li', text: text.slice(2) });
      else blocks.push({ type: 'p', text });
    }
  }

  const addressTo = [ctx.clientName, ...addressLines(contact)].filter(Boolean);
  if (contact.client_type === 'A business or other entity' && ctx.signerName) {
    addressTo.splice(1, 0, `Attn: ${ctx.signerName}${contact.entity_role ? `, ${contact.entity_role}` : ''}`);
  }

  return {
    subject: `Engagement for Legal Services — ${area.name}`,
    dateLine: ctx.today,
    addressTo,
    reLine: `Re: Engagement for Legal Services — ${area.name}`,
    salutation: `Dear ${orBlank(ctx.firstName)}:`,
    blocks,
  };
}

/** Intake answers as label/value pairs, skipping anything hidden or empty. */
export function answerPairs(area, answers) {
  const pairs = [];
  for (const q of questionsFor(area)) {
    if (q.showIf && answers[q.showIf.field] !== q.showIf.equals) continue;
    const v = answers[q.id];
    const text = Array.isArray(v) ? v.join(', ') : (v ?? '').toString().trim();
    if (text === '') continue;
    pairs.push({ label: q.label, value: text });
  }
  return pairs;
}

export { BLANK };
