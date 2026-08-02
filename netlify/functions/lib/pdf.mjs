/**
 * Renders the signed engagement letter to a PDF.
 *
 * Page 1..n  — the engagement letter, the signature block, and the electronic
 *              signature audit record.
 * Last page  — the client's intake answers, so the whole file is one document.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { FIRM } from '../../../public/data/practice-areas.mjs';
import { buildLetter, answerPairs, clientOfRecord, addressOneLine } from '../../../public/data/letter.mjs';

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 66;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK = rgb(0.07, 0.13, 0.21);
const GRAY = rgb(0.42, 0.46, 0.52);
const RULE = rgb(0.78, 0.76, 0.72);
const GOLD = rgb(0.55, 0.42, 0.16);

/**
 * pdf-lib's standard fonts are WinAnsi-encoded and throw on any character
 * outside that set -- which a client can easily paste in. Keep everything
 * WinAnsi can render (real em dashes, curly quotes, accented names), fold the
 * common near-misses down to an equivalent it can render, and drop the rest.
 */

// The CP1252 high range. Proper typography lives here, not in Latin-1.
const WINANSI_EXTRAS = new Set([
  '\u20AC', '\u201A', '\u0192', '\u201E', '\u2026', '\u2020', '\u2021',
  '\u02C6', '\u2030', '\u0160', '\u2039', '\u0152', '\u017D', '\u2018',
  '\u2019', '\u201C', '\u201D', '\u2022', '\u2013', '\u2014', '\u02DC',
  '\u2122', '\u0161', '\u203A', '\u0153', '\u017E', '\u0178',
]);

const CHAR_MAP = {
  '\u201B': '\u2018', '\u2032': '\u2019', '\u2033': '\u201D', '\u201F': '\u201C',
  '\u2015': '\u2014', '\u2012': '\u2013', '\u2212': '-', '\u2010': '-', '\u2011': '-',
  '\u00A0': ' ', '\u2007': ' ', '\u2009': ' ', '\u202F': ' ', '\t': '  ',
  '\u2192': '->', '\u2190': '<-', '\u21D2': '=>', '\u2194': '<->',
  '\u2713': '[x]', '\u2714': '[x]', '\u2717': '[ ]', '\u2610': '[ ]', '\u2611': '[x]',
  '\u2116': 'No.', '\u2120': '(SM)', '\u2044': '/',
};

export function sanitize(input) {
  const s = String(input ?? '').normalize('NFC');
  let out = '';
  for (const ch of s) {
    if (CHAR_MAP[ch] !== undefined) { out += CHAR_MAP[ch]; continue; }
    if (ch === '\n') { out += '\n'; continue; }
    if (WINANSI_EXTRAS.has(ch)) { out += ch; continue; }
    const code = ch.codePointAt(0);
    if (code >= 32 && code <= 126) { out += ch; continue; }
    if (code >= 160 && code <= 255) { out += ch; continue; }
    // Anything else (emoji, CJK, control characters) is dropped.
  }
  return out;
}

/**
 * A truncated PNG sends pdf-lib's decoder into a loop it never returns from,
 * so check the container is intact before handing it over: PNG magic bytes at
 * the front, IEND chunk at the back.
 */
const PNG_PREFIX = 'data:image/png;base64,';

export function isCompletePng(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith(PNG_PREFIX)) return false;
  let bytes;
  try {
    bytes = Buffer.from(dataUrl.slice(PNG_PREFIX.length), 'base64');
  } catch {
    return false;
  }
  if (bytes.length < 24) return false;
  const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (magic.some((b, i) => bytes[i] !== b)) return false;
  return bytes.subarray(-12).includes(Buffer.from('IEND'));
}

class Doc {
  constructor(pdf, fonts) {
    this.pdf = pdf;
    this.fonts = fonts;
    this.pages = [];
    this.newPage();
  }

  newPage() {
    this.page = this.pdf.addPage([PAGE_W, PAGE_H]);
    this.pages.push(this.page);
    this.y = PAGE_H - MARGIN;
    return this.page;
  }

  /** Start a new page if `height` will not fit above the footer. */
  need(height) {
    if (this.y - height < MARGIN + 34) this.newPage();
  }

  gap(h) { this.y -= h; }

  wrap(text, font, size, maxWidth) {
    const lines = [];
    for (const rawLine of String(text).split('\n')) {
      const words = rawLine.split(/\s+/).filter(Boolean);
      if (!words.length) { lines.push(''); continue; }
      let line = words[0];
      for (let i = 1; i < words.length; i++) {
        const candidate = `${line} ${words[i]}`;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
        else { lines.push(line); line = words[i]; }
      }
      lines.push(line);
    }
    return lines;
  }

  text(raw, opts = {}) {
    const {
      font = this.fonts.body,
      size = 10.5,
      lead = 1.42,
      color = INK,
      x = MARGIN,
      width = CONTENT_W,
      after = 8,
      align = 'left',
      indent = 0,
    } = opts;

    const clean = sanitize(raw);
    if (!clean.trim()) { this.gap(after); return; }
    const lineHeight = size * lead;
    const lines = this.wrap(clean, font, size, width - indent);

    for (const line of lines) {
      this.need(lineHeight);
      let px = x + indent;
      if (align === 'center') px = x + (width - font.widthOfTextAtSize(line, size)) / 2;
      if (align === 'right') px = x + width - font.widthOfTextAtSize(line, size);
      this.page.drawText(line, { x: px, y: this.y - size, size, font, color });
      this.y -= lineHeight;
    }
    this.gap(after);
  }

  bullet(raw, opts = {}) {
    const size = opts.size ?? 10.5;
    this.need(size * 1.42);
    this.page.drawText('-', { x: MARGIN + 12, y: this.y - size, size, font: this.fonts.body, color: INK });
    this.text(raw, { ...opts, indent: 26, after: opts.after ?? 5 });
  }

  rule(opts = {}) {
    const { color = RULE, thickness = 0.75, width = CONTENT_W, x = MARGIN, after = 12 } = opts;
    this.need(thickness + after);
    this.page.drawLine({
      start: { x, y: this.y },
      end: { x: x + width, y: this.y },
      thickness,
      color,
    });
    this.gap(after);
  }

  /** Page numbers + document id, drawn once the total page count is known. */
  stampFooters(docId) {
    const total = this.pages.length;
    this.pages.forEach((page, i) => {
      const left = sanitize(`${FIRM.name} - Engagement Agreement`);
      const right = `Page ${i + 1} of ${total}  |  Doc ID ${docId}`;
      page.drawText(left, { x: MARGIN, y: MARGIN - 24, size: 7.5, font: this.fonts.meta, color: GRAY });
      const w = this.fonts.meta.widthOfTextAtSize(right, 7.5);
      page.drawText(right, { x: PAGE_W - MARGIN - w, y: MARGIN - 24, size: 7.5, font: this.fonts.meta, color: GRAY });
    });
  }
}

function letterhead(doc) {
  doc.text(FIRM.name, { font: doc.fonts.headBold, size: 16, align: 'center', after: 3 });
  const meta = [FIRM.tagline, FIRM.address.join(', '), FIRM.phone, FIRM.email, FIRM.licenses]
    .filter(Boolean).join('  |  ');
  doc.text(meta, { font: doc.fonts.meta, size: 8, color: GRAY, align: 'center', after: 9 });
  doc.rule({ color: INK, thickness: 1.4, after: 22 });
}

function signatureBlock(doc, { signatureImage, typedName, signedOn, clientName, isEntity, entityRole }) {
  doc.need(210);
  doc.gap(6);
  doc.rule({ color: RULE, after: 16 });
  doc.text('SIGNATURES', { font: doc.fonts.headBold, size: 10, color: GOLD, after: 14 });

  const colW = (CONTENT_W - 34) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 34;
  const topY = doc.y;

  // ---- client (electronically signed) ----
  const sigTop = topY - 6;
  if (signatureImage) {
    const maxW = colW - 8;
    const maxH = 46;
    const scale = Math.min(maxW / signatureImage.width, maxH / signatureImage.height, 1);
    const w = signatureImage.width * scale;
    const h = signatureImage.height * scale;
    doc.page.drawImage(signatureImage, { x: leftX + 2, y: sigTop - h, width: w, height: h });
  }
  const lineY = sigTop - 52;
  doc.page.drawLine({
    start: { x: leftX, y: lineY }, end: { x: leftX + colW, y: lineY },
    thickness: 0.9, color: INK,
  });

  const put = (t, x, y, size, font, color = INK) =>
    doc.page.drawText(sanitize(t), { x, y, size, font, color });

  put('CLIENT', leftX, lineY - 13, 7.5, doc.fonts.meta, GRAY);
  put(typedName, leftX, lineY - 26, 10, doc.fonts.bodyBold);
  if (isEntity) {
    put(`for ${clientName}${entityRole ? `, ${entityRole}` : ''}`, leftX, lineY - 38, 8.5, doc.fonts.body, GRAY);
    put(`Date: ${signedOn}`, leftX, lineY - 51, 8.5, doc.fonts.body, GRAY);
  } else {
    put(`Date: ${signedOn}`, leftX, lineY - 38, 8.5, doc.fonts.body, GRAY);
  }

  // ---- firm (countersigned on acceptance) ----
  doc.page.drawLine({
    start: { x: rightX, y: lineY }, end: { x: rightX + colW, y: lineY },
    thickness: 0.9, color: INK,
  });
  put(sanitize(FIRM.name.toUpperCase()), rightX, lineY - 13, 7.5, doc.fonts.meta, GRAY);
  put(FIRM.attorneyName, rightX, lineY - 26, 10, doc.fonts.bodyBold);
  put(FIRM.attorneyTitle, rightX, lineY - 38, 8.5, doc.fonts.body, GRAY);
  put('Date: ________________', rightX, lineY - 51, 8.5, doc.fonts.body, GRAY);

  doc.y = lineY - 68;
}

function auditBlock(doc, audit) {
  const rows = [
    ['Document ID', audit.docId],
    ['Signed (UTC)', audit.signedUtc],
    ['Signed (client local time)', `${audit.signedLocal}${audit.timezone ? ` (${audit.timezone})` : ''}`],
    ['Typed name', audit.typedName],
    ['Signature method', 'Drawn on-screen (touch, mouse, or trackpad)'],
    ['Consent to electronic signature', 'Accepted — client affirmatively checked the consent box'],
    ['Client IP address', audit.ip || 'not recorded'],
    ['Client browser', (audit.userAgent || 'not recorded').slice(0, 96)],
  ];

  const rowH = 11.5;
  const boxH = rows.length * rowH + 34;
  doc.need(boxH + 10);

  const top = doc.y;
  doc.page.drawRectangle({
    x: MARGIN, y: top - boxH, width: CONTENT_W, height: boxH,
    borderColor: RULE, borderWidth: 0.75, color: rgb(0.985, 0.98, 0.965),
  });

  doc.page.drawText('ELECTRONIC SIGNATURE RECORD', {
    x: MARGIN + 12, y: top - 17, size: 7.5, font: doc.fonts.meta, color: GOLD,
  });

  let y = top - 32;
  for (const [label, value] of rows) {
    doc.page.drawText(sanitize(label), { x: MARGIN + 12, y, size: 7.5, font: doc.fonts.meta, color: GRAY });
    doc.page.drawText(sanitize(value), { x: MARGIN + 158, y, size: 7.5, font: doc.fonts.meta, color: INK });
    y -= rowH;
  }

  doc.y = top - boxH - 14;
  doc.text(
    'This record is retained by the firm as evidence of the client\'s intent to sign and of the ' +
    'consent required by the federal E-SIGN Act and applicable state law.',
    { font: doc.fonts.metaItalic, size: 7.5, color: GRAY, after: 4 },
  );
}

function intakePage(doc, { area, contact, answers, docId }) {
  doc.newPage();
  doc.text('CLIENT INTAKE SUMMARY', { font: doc.fonts.headBold, size: 13, after: 3 });
  doc.text(area.name, { font: doc.fonts.metaItalic, size: 10, color: GOLD, after: 10 });
  doc.rule({ color: INK, thickness: 1, after: 18 });

  const contactRows = [
    ['Client of record', clientOfRecord(contact)],
    ['Signed by', `${contact.first_name || ''} ${contact.last_name || ''}`.trim()],
    ['Email', contact.email],
    ['Phone', contact.phone],
    ['Address', addressOneLine(contact)],
    ['Preferred contact', contact.preferred_contact],
    ['Referral source', contact.referral_source],
  ].filter(([, v]) => v && String(v).trim());

  for (const [label, value] of contactRows) {
    doc.need(14);
    doc.page.drawText(sanitize(label), { x: MARGIN, y: doc.y - 9, size: 8, font: doc.fonts.meta, color: GRAY });
    doc.text(value, { x: MARGIN + 132, width: CONTENT_W - 132, size: 9.5, after: 4.5 });
  }

  doc.gap(10);
  doc.rule({ after: 16 });

  for (const { label, value } of answerPairs(area, answers)) {
    doc.need(34);
    doc.text(label, { font: doc.fonts.bodyBold, size: 9, color: GRAY, after: 3 });
    doc.text(value, { size: 10.5, after: 13 });
  }

  doc.gap(4);
  doc.text(
    `Submitted through the firm's online intake portal. Document ID ${docId}. ` +
    'The client attested to the accuracy of these answers when signing the engagement agreement.',
    { font: doc.fonts.metaItalic, size: 7.5, color: GRAY },
  );
}

/**
 * @returns {Promise<Uint8Array>} the finished PDF
 */
export async function buildEngagementPdf({ area, contact, answers, signature, docId, ip, signedAt }) {
  const pdf = await PDFDocument.create();
  const fonts = {
    body: await pdf.embedFont(StandardFonts.TimesRoman),
    bodyBold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    bodyItalic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
    headBold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    meta: await pdf.embedFont(StandardFonts.Helvetica),
    metaItalic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };

  const signedDate = signedAt instanceof Date ? signedAt : new Date(signedAt);
  const letter = buildLetter(area, contact, answers, signedDate);
  const doc = new Doc(pdf, fonts);

  letterhead(doc);
  doc.text(letter.dateLine, { after: 16 });
  doc.text(letter.addressTo.join('\n'), { lead: 1.3, after: 16 });
  doc.text(letter.reLine, { font: fonts.bodyBold, after: 16 });
  doc.text(letter.salutation, { after: 12 });

  for (const b of letter.blocks) {
    if (b.type === 'h') {
      doc.need(38);
      doc.gap(6);
      doc.text(b.text, { font: fonts.bodyBold, size: 11, after: 7 });
    } else if (b.type === 'li') {
      doc.bullet(b.text);
    } else {
      doc.text(b.text, { after: 10 });
    }
  }

  doc.gap(10);
  doc.text('Sincerely,', { after: 26 });
  doc.text([FIRM.attorneyName, FIRM.attorneyTitle, FIRM.name].filter(Boolean).join('\n'), { lead: 1.3, after: 20 });

  let sigImage = null;
  if (isCompletePng(signature.image)) {
    try {
      sigImage = await pdf.embedPng(signature.image);
    } catch {
      sigImage = null; // a corrupt image must not lose the whole signed letter
    }
  }

  // Keep the signature block and its audit record together on one page.
  doc.need(370);

  signatureBlock(doc, {
    signatureImage: sigImage,
    typedName: signature.typedName,
    signedOn: letter.dateLine,
    clientName: clientOfRecord(contact),
    isEntity: contact.client_type === 'A business or other entity',
    entityRole: contact.entity_role,
  });

  auditBlock(doc, {
    docId,
    signedUtc: signedDate.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'),
    signedLocal: signedDate.toLocaleString('en-US', { timeZone: signature.timezone || 'UTC' }),
    timezone: signature.timezone,
    typedName: signature.typedName,
    ip,
    userAgent: signature.userAgent,
  });

  intakePage(doc, { area, contact, answers, docId });
  doc.stampFooters(docId);

  pdf.setTitle(`Engagement Agreement - ${clientOfRecord(contact)} - ${area.name}`);
  pdf.setAuthor(FIRM.name);
  pdf.setSubject(`Signed engagement agreement and client intake (Doc ID ${docId})`);
  pdf.setProducer(FIRM.name);
  pdf.setCreationDate(signedDate);

  return pdf.save();
}
