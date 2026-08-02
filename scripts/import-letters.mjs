/**
 * Turns the firm's Word engagement agreements into the letter data the portal
 * renders and signs.
 *
 *   npm run letters
 *
 * Reads every .docx in ./letters and writes public/data/letters.generated.mjs.
 * The Word files are the source of truth: to change an agreement, edit the
 * .docx, re-run this, and both the on-screen letter and the signed PDF follow.
 * Nothing is transcribed by hand, so no typo can creep into a legal document.
 *
 * Conversions applied:
 *   "Section N. Title"     -> a heading
 *   "☐ text"               -> "[ ] text", a checkbox the client can tick
 *   the Georgia/Texas pair  -> one required box naming the client's own state
 *   everything from the
 *   "Signatures" heading on -> dropped; the PDF draws its own signature block
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SRC = path.join(ROOT, 'letters');
const OUT = path.join(ROOT, 'public', 'data', 'letters.generated.mjs');

/** Which .docx backs which service key. */
const MAP = {
  'trademark:Search and Clear': '03_Trademark_Search_and_Clear_Engagement_Agreement.docx',
  'trademark:File and Protect': '04_Trademark_File_and_Protect_Engagement_Agreement.docx',
  'trademark:Full Shield': '05_Trademark_Full_Shield_Engagement_Agreement.docx',
  'copyright:default': '06_Copyright_Registration_Engagement_Agreement.docx',
  'business-formation:default': '01_Business_Formation_Engagement_Agreement.docx',
  'contracts:default': '02_Contract_Review_Engagement_Agreement.docx',
  'estate-planning:Simple Will — one person': '01_Simple_Will_Engagement_Agreement_Single.docx',
  'estate-planning:Simple Wills — married couple': '02_Simple_Will_Engagement_Agreement_Joint.docx',
  'estate-planning:Will Package with POA — one person': '03_Will_Package_with_POA_Engagement_Agreement_Single.docx',
  'estate-planning:Will Package with POA — married couple': '04_Will_Package_with_POA_Engagement_Agreement_Joint.docx',
  'estate-planning:Healthcare Directive — one person': '05_Healthcare_Directive_Engagement_Agreement_Single.docx',
  'estate-planning:Healthcare Directive — married couple': '06_Healthcare_Directive_Engagement_Agreement_Joint.docx',
  'estate-planning:Revocable Living Trust — one person': '07_Revocable_Living_Trust_Engagement_Agreement_Single.docx',
  'estate-planning:Revocable Living Trust — married couple': '08_Revocable_Living_Trust_Engagement_Agreement_Joint.docx',
  'estate-planning:Lady Bird Deed (Texas only)': '09_Ladybird_Deed_Engagement_Agreement.docx',
  'estate-planning:Transfer on Death Deed (Texas only)': '10_TODD_Engagement_Agreement.docx',
  'estate-planning:Durable Power of Attorney': '11_Durable_POA_Engagement_Agreement.docx',
};

/** Areas where the client's state is elected in the letter (TX/GA only). */
const STATE_ELECTION_AREAS = new Set(['business-formation', 'contracts', 'estate-planning']);

/* ---------------------------------------------------------------- docx ---- */

const W = 'w:';

/** Minimal .docx reader: pull word/document.xml out of the zip container. */
async function documentXml(file) {
  const buf = await readFile(file);
  // Walk the central directory rather than pulling in a zip dependency.
  const entries = [];
  let i = buf.length - 22;
  while (i >= 0 && buf.readUInt32LE(i) !== 0x06054b50) i--;
  if (i < 0) throw new Error(`${path.basename(file)} is not a valid .docx`);
  let off = buf.readUInt32LE(i + 16);
  const count = buf.readUInt16LE(i + 10);
  for (let n = 0; n < count; n++) {
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    entries.push({ name, localOff });
    off += 46 + nameLen + extraLen + commentLen;
  }
  const doc = entries.find((e) => e.name === 'word/document.xml');
  if (!doc) throw new Error(`${path.basename(file)} has no word/document.xml`);

  const lo = doc.localOff;
  const method = buf.readUInt16LE(lo + 8);
  const nameLen = buf.readUInt16LE(lo + 26);
  const extraLen = buf.readUInt16LE(lo + 28);
  const start = lo + 30 + nameLen + extraLen;
  // Compressed size in the local header can be zero when a data descriptor is
  // used, so read to the next entry instead of trusting it.
  const ends = entries.map((e) => e.localOff).filter((o) => o > lo).sort((a, b) => a - b);
  const end = ends.length ? ends[0] : buf.length;
  const raw = buf.subarray(start, end);
  return method === 0 ? raw.toString('utf8') : inflateRawSync(raw).toString('utf8');
}

function decode(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Flattens one Word table into "Cell — Cell" rows, in document order. */
function tableRows(tblXml) {
  const rows = [];
  for (const tr of tblXml.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)) {
    const cells = [];
    for (const tc of tr[1].matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)) {
      let t = '';
      for (const w of tc[1].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)) t += decode(w[1]);
      t = t.replace(/\s+/g, ' ').trim();
      if (t) cells.push(t);
    }
    if (cells.length) rows.push(cells.join(' — '));
  }
  return rows;
}

/** Paragraphs with their text and whether the whole paragraph is bold. */
function paragraphs(xml) {
  const out = [];
  let body = xml.slice(xml.indexOf('<w:body>'), xml.lastIndexOf('</w:body>'));

  // A fee schedule is usually a table. Turn each table into ordinary
  // paragraphs first, so the rows survive as readable lines instead of
  // collapsing into stray words like "Service" and "Flat Fee".
  body = body.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, (tbl) =>
    tableRows(tbl).map((r) => `<w:p><w:r><w:t>${r.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</w:t></w:r></w:p>`).join(''));
  for (const m of body.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)) {
    const inner = m[1];
    let text = '';
    for (const r of inner.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>/g)) {
      text += r[1] !== undefined ? decode(r[1]) : '\t';
    }
    text = text.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const runs = [...inner.matchAll(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g)].map((x) => x[0]);
    const withText = runs.filter((r) => /<w:t(?:\s[^>]*)?>[^<]*\S/.test(r));
    const bold = withText.length > 0 && withText.every((r) => /<w:b\s*\/>|<w:b\s+[^>]*\/>/.test(r));
    out.push({ text, bold });
  }
  return out;
}

/* -------------------------------------------------------------- convert --- */

const BOX = /^[☐☑▢□]\s*/;

function convert(paras, { areaSlug }) {
  const sections = [];
  let current = null;
  let scope = '';
  const stateBoxes = [];

  const push = (line) => {
    if (!current) {
      current = { heading: '', body: [] };
      sections.push(current);
    }
    current.body.push(line);
  };

  for (let i = 0; i < paras.length; i++) {
    const { text, bold } = paras[i];

    // The firm's letterhead is drawn by the PDF, not repeated in the body.
    if (i < 3 && (/^J\.?\s*Brantley Law/i.test(text) || /Balcones|jbrantley@/i.test(text))) continue;
    // The PDF draws its own signature block and audit record.
    if (bold && /^(Signatures|Client:|Attorney:)$/i.test(text.trim())) break;

    if (bold && /^Section\s+\d+\./i.test(text)) {
      current = { heading: text.replace(/\s*[.:]\s*$/, ''), body: [] };
      sections.push(current);
      continue;
    }
    if (bold && /Engagement Agreement/i.test(text) && !/entered into/i.test(text)) {
      continue; // the title is rendered by the PDF as the Re: line
    }

    if (BOX.test(text)) {
      const label = text.replace(BOX, '').trim();
      const stateMatch = label.match(/governing law for this engagement is (Georgia|Texas)/i);
      if (stateMatch) {
        stateBoxes.push({ state: stateMatch[1], label });
        continue; // handled after the loop
      }
      push(`[ ] ${label}`);
      continue;
    }

    push(text);
    if (/^Section 1\./i.test(sections.at(-1)?.heading || '') && !scope) scope = text;
  }

  // Two mutually exclusive state elections become one required box naming the
  // state the client actually gave, so it can never be left blank or ticked twice.
  if (stateBoxes.length) {
    const target = sections.find((s) => /^Section\s+\d+\./.test(s.heading)) ? sections : null;
    const line = STATE_ELECTION_AREAS.has(areaSlug)
      ? '[*] My state of residence, and the governing law for this engagement, is {{clientState}}.'
      : null;
    if (line && target) {
      // Put it back where the original boxes were: the section that mentioned them.
      const idx = sections.findIndex((s) => s.body.some((b) => /state of residence/i.test(b)));
      (idx >= 0 ? sections[idx] : sections.at(-1)).body.push(line);
    } else if (target) {
      // Federal matters: keep both elections optional, since the client may be
      // outside Texas and Georgia entirely.
      for (const b of stateBoxes) sections.at(-1).body.push(`[ ] ${b.label}`);
    }
  }

  return {
    sections: sections.filter((s) => s.heading || s.body.length),
    scope: scope.trim(),
  };
}

/* ----------------------------------------------------------------- run ---- */

const files = (await readdir(SRC)).filter((f) => f.endsWith('.docx') && !f.startsWith('~'));
const missing = Object.values(MAP).filter((f) => !files.includes(f));
if (missing.length) {
  console.error(`\nThese mapped files are not in ./letters:\n  ${missing.join('\n  ')}\n`);
  process.exit(1);
}
const unmapped = files.filter((f) => !Object.values(MAP).includes(f));
for (const f of unmapped) console.log(`  note   ${f} is in ./letters but not mapped to a service — skipped.`);

const letters = {};
const scopes = {};
for (const [key, file] of Object.entries(MAP)) {
  const areaSlug = key.split(':')[0];
  const { sections, scope } = convert(paragraphs(await documentXml(path.join(SRC, file))), { areaSlug });
  letters[key] = sections;
  scopes[key] = scope;
  const boxes = sections.flatMap((s) => s.body).filter((b) => /^\[[ *]\]/.test(b)).length;
  console.log(`  ${key.padEnd(52)} ${String(sections.length).padStart(2)} sections, ${boxes} checkbox(es)`);
}

const banner = `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Written by scripts/import-letters.mjs from the Word agreements in ./letters.
 * To change an agreement, edit the .docx and run: npm run letters
 */\n\n`;

await writeFile(
  OUT,
  `${banner}export const LETTERS = ${JSON.stringify(letters, null, 2)};\n\nexport const SCOPES = ${JSON.stringify(scopes, null, 2)};\n`,
);

console.log(`\n  wrote ${path.relative(ROOT, OUT)} — ${Object.keys(letters).length} agreements\n`);
