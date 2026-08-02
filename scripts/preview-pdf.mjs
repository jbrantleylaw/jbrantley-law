/**
 * Generates a sample signed PDF for one practice area, without deploying or
 * sending any email. Use it to proof the letter text after editing.
 *
 *   node scripts/preview-pdf.mjs trademark
 *   node scripts/preview-pdf.mjs            # every area
 *
 * Output lands in ./preview/.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { PRACTICE_AREAS, getArea, questionsFor } from '../public/data/practice-areas.mjs';
import { buildEngagementPdf } from '../netlify/functions/lib/pdf.mjs';

const SAMPLE_CONTACT = {
  first_name: 'Dana',
  last_name: 'Whitfield',
  email: 'dana@example.com',
  phone: '(210) 555-0148',
  client_type: 'A business or other entity',
  entity_name: 'Whitfield Builders, LLC',
  entity_role: 'Managing Member',
  street: '1400 Broadway St, Suite 210',
  city: 'San Antonio',
  state: 'TX',
  zip: '78215',
  preferred_contact: 'Email',
  referral_source: 'Referral from a friend or colleague',
};

// A one-pixel PNG stands in for the drawn signature.
const FAKE_SIGNATURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/** Fills every question with something plausible so the layout is exercised. */
function sampleAnswers(area) {
  const answers = {};
  for (const q of questionsFor(area)) {
    if (q.showIf && answers[q.showIf.field] !== q.showIf.equals) continue;
    switch (q.type) {
      case 'radio':
      case 'select':
        answers[q.id] = q.options[0];
        break;
      case 'checkboxes':
        answers[q.id] = q.options.slice(0, 2);
        break;
      case 'date':
        answers[q.id] = '2026-03-14';
        break;
      case 'textarea':
        answers[q.id] = `Sample answer for "${q.label}" — long enough to wrap across more than a single line so the spacing in the PDF can be checked properly.`;
        break;
      default:
        answers[q.id] = `Sample ${q.id.replace(/_/g, ' ')}`;
    }
  }
  return answers;
}

const requested = process.argv[2];
const areas = requested ? [getArea(requested)] : PRACTICE_AREAS;
if (requested && !areas[0]) {
  console.error(`Unknown area "${requested}". Try one of: ${PRACTICE_AREAS.map((a) => a.slug).join(', ')}`);
  process.exit(1);
}

await mkdir('preview', { recursive: true });

for (const area of areas) {
  const bytes = await buildEngagementPdf({
    area,
    contact: SAMPLE_CONTACT,
    answers: sampleAnswers(area),
    signature: {
      image: FAKE_SIGNATURE,
      typedName: 'Dana Whitfield',
      timezone: 'America/Chicago',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
    },
    docId: 'JBL-PREV-IEW0',
    ip: '203.0.113.42',
    signedAt: new Date(),
  });
  const path = `preview/${area.slug}.pdf`;
  await writeFile(path, bytes);
  console.log(`  ${path.padEnd(38)} ${(bytes.length / 1024).toFixed(0)} KB`);
}

console.log('\nOpen the files in ./preview to proof the letters.\n');
