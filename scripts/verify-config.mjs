/**
 * Sanity-checks practice-areas.mjs. Run `npm run check` after editing it —
 * it catches the mistakes that would otherwise show up as a broken form or a
 * raw {{token}} in a client's engagement letter.
 */
import {
  PRACTICE_AREAS, CONTACT_FIELDS, COMMON_QUESTIONS, FIRM, LETTER_INTRO,
  questionsFor, letterSectionsFor,
} from '../public/data/practice-areas.mjs';
import { buildContext, paymentChoicesFor } from '../public/data/letter.mjs';
import { LETTERS } from '../public/data/letters.generated.mjs';

const problems = [];
const notes = [];

const fail = (m) => problems.push(m);
const note = (m) => notes.push(m);

if (!FIRM.name || !FIRM.email) fail('FIRM.name and FIRM.email are both required.');
if (!FIRM.phone) note('FIRM.phone is empty — it will be left off the letterhead.');

const slugs = new Set();
for (const area of PRACTICE_AREAS) {
  const where = `[${area.slug || '(no slug)'}]`;

  if (!area.slug || !/^[a-z0-9-]+$/.test(area.slug)) fail(`${where} slug must be lowercase letters, numbers, and hyphens.`);
  if (slugs.has(area.slug)) fail(`${where} duplicate slug.`);
  slugs.add(area.slug);

  for (const key of ['name', 'short', 'blurb', 'feeSummary']) {
    if (!area[key]) fail(`${where} missing "${key}".`);
  }
  // Every reachable letter, not just the draft fallback: an area with
  // letterKeyField shows a different signed agreement per answer, and each one
  // ships to a real client. A blank answer set alone would only ever check the
  // draft fallback and never notice a mistake in an imported .docx.
  const importedKeys = Object.keys(LETTERS).filter((k) => k.startsWith(`${area.slug}:`));
  const selections = importedKeys.length
    ? importedKeys.map((k) => {
      const suffix = k.slice(area.slug.length + 1);
      return suffix === 'default' ? {} : { [area.letterKeyField]: suffix };
    })
    : [{}]; // no imported agreement at all: check the draft fallback only

  for (const answers of selections) {
    const sections = letterSectionsFor(area, answers);
    if (!Array.isArray(sections) || sections.length === 0) {
      fail(`${where} has no letter sections for ${JSON.stringify(answers)}.`);
    }
  }

  const ids = new Set();
  const all = questionsFor(area);
  for (const q of all) {
    if (!q.id || !/^[a-z0-9_]+$/.test(q.id)) fail(`${where} question id "${q.id}" must be lowercase with underscores.`);
    if (ids.has(q.id)) fail(`${where} duplicate question id "${q.id}".`);
    ids.add(q.id);
    if (!q.label) fail(`${where} question "${q.id}" has no label.`);
    if (['radio', 'checkboxes', 'select'].includes(q.type) && !(q.options?.length > 1)) {
      fail(`${where} question "${q.id}" is a ${q.type} but has no options.`);
    }
    if (q.showIf) {
      const parent = all.find((p) => p.id === q.showIf.field);
      if (!parent) fail(`${where} question "${q.id}" depends on "${q.showIf.field}", which does not exist.`);
      else if (parent.options) {
        const wanted = Array.isArray(q.showIf.equals) ? q.showIf.equals : [q.showIf.equals];
        const bad = wanted.filter((v) => !parent.options.includes(v));
        if (bad.length) fail(`${where} question "${q.id}" waits for "${parent.id}" to equal "${bad.join(', ')}", which is not one of its options.`);
      }
    }
  }

  const payOptions = paymentChoicesFor(area);
  if (!payOptions.length) {
    note(`${where} has no payment link yet — clients are told an invoice will follow.`);
  }
  for (const [i, opt] of payOptions.entries()) {
    const at = `${where} payment option ${i + 1}`;
    if (!/^https:\/\/[^\s/]+\.[^\s/]+/.test(opt.url)) {
      fail(`${at} must be a full https:// address.`);
    } else if (/\s/.test(opt.url)) {
      fail(`${at} contains a space — it was probably pasted with trailing text.`);
    }
    if (payOptions.length > 1 && !opt.label) {
      fail(`${at} needs a label — with several options the client has to be told what each fee is for.`);
    }
    if (opt.whenAnswer) {
      const q = all.find((x) => x.id === opt.whenAnswer.field);
      if (!q) {
        fail(`${at} keys off question "${opt.whenAnswer.field}", which does not exist in this area.`);
      } else if (q.options) {
        const wanted = Array.isArray(opt.whenAnswer.equals) ? opt.whenAnswer.equals : [opt.whenAnswer.equals];
        for (const w of wanted) {
          if (!q.options.includes(w)) {
            fail(`${at} waits for "${q.id}" to equal "${w}", which is not one of its options.`);
          }
        }
      }
    }
  }
  const urls = payOptions.map((o) => o.url);
  const dupe = urls.find((u, i) => urls.indexOf(u) !== i);
  if (dupe) fail(`${where} uses the same payment link for two options — one of them is probably wrong.`);

  // Checkbox lines and merge fields, checked against EVERY reachable letter —
  // an imported agreement is real content a client will sign, not a fixture.
  const sampleContact = Object.fromEntries(CONTACT_FIELDS.map((f) => [f.id, 'x']));

  for (const answers of selections) {
    const sections = letterSectionsFor(area, answers);
    const tag = importedKeys.length ? ` (${JSON.stringify(answers)})` : '';

    for (const section of sections) {
      for (const line of section.body) {
        if (/^\s*\[/.test(line) && !/^\[[ *]\]\s*\S/.test(line)) {
          fail(`${where}${tag} letter line starts with "[" but is not a valid checkbox — use "[ ] text" or "[*] text": ${line.slice(0, 50)}…`);
        }
      }
    }

    const known = new Set(Object.keys(buildContext(area, sampleContact, answers)));
    const letterText = [
      ...LETTER_INTRO,
      ...sections.flatMap((s) => [s.heading || '', ...s.body]),
      area.feeSummary,
    ].join('\n');

    for (const [, token] of letterText.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) {
      if (!known.has(token)) fail(`${where}${tag} letter references {{${token}}}, which is not a known merge field.`);
    }
  }
}

const contactIds = new Set();
for (const f of CONTACT_FIELDS) {
  if (contactIds.has(f.id)) fail(`Duplicate contact field id "${f.id}".`);
  contactIds.add(f.id);
}
for (const q of COMMON_QUESTIONS) {
  if (contactIds.has(q.id)) fail(`Common question "${q.id}" collides with a contact field id.`);
}

/* ------------------------------------------------------------------------ */

for (const n of notes) console.log(`  note   ${n}`);
if (problems.length) {
  console.error('\nConfiguration problems:\n');
  for (const p of problems) console.error(`  error  ${p}`);
  console.error(`\n${problems.length} problem(s) found.\n`);
  process.exit(1);
}
console.log(`\nOK — ${PRACTICE_AREAS.length} practice areas, ${CONTACT_FIELDS.length} contact fields, config is valid.\n`);
