/**
 * Builds a drag-and-drop bundle for Netlify Drop (https://app.netlify.com/drop).
 *
 *   npm run build:drop
 *
 * Produces:
 *   dist/                     the folder, if you would rather drag the folder
 *   jbrantley-portal.zip      the single file to drag onto Netlify Drop
 *
 * Netlify does not run `npm install` on a dropped deploy, so the serverless
 * function is compiled here into one self-contained file with pdf-lib,
 * nodemailer, and the practice-area configuration already inside it. The
 * dropped site therefore needs no node_modules and no build step.
 *
 * TRADE-OFF: the function is compiled, so editing dist/data/practice-areas.mjs
 * by hand changes only what the client reads on screen — the PDF would still
 * use the compiled copy. Always edit public/data/practice-areas.mjs in the
 * project and re-run this script.
 */
import { build } from 'esbuild';
import { cp, mkdir, rm, writeFile, readFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PRACTICE_AREAS } from '../public/data/practice-areas.mjs';

const run = promisify(execFile);
const DIST = 'dist';
const ZIP = 'jbrantley-portal.zip';

// No build step runs on a manual deploy, so the site files sit at the root of
// the bundle rather than inside a publish subfolder — that way the deploy works
// whether or not Netlify reads `[build] publish` from a dropped netlify.toml.
// The functions folder therefore lives inside the served directory, so it is
// explicitly blocked from being fetched as a static asset below.
const DROP_TOML = `# Configuration for a drag-and-drop (manual) deploy on Netlify.
# The function in netlify/functions is already compiled — no build step runs.

[functions]
  directory = "netlify/functions"

[[redirects]]
  from = "/intake/:area"
  to = "/intake.html"
  status = 200

# The compiled function and the setup notes ship inside the deployed folder.
# Serve neither as a static file.
[[redirects]]
  from = "/netlify/*"
  to = "/index.html"
  status = 404

[[redirects]]
  from = "/READ*"
  to = "/index.html"
  status = 404

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
    Content-Security-Policy = "frame-ancestors 'self' https://fineprintlawyer.com https://*.fineprintlawyer.com https://jenniferbrantleylaw.com https://*.jenniferbrantleylaw.com https://*.netlify.app"
`;

const READ_ME_FIRST = `HOW TO PUT THIS ONLINE
======================

1. Go to  https://app.netlify.com/drop  and sign in.

2. Drag "jbrantley-portal.zip" (or this whole folder) onto the page.
   Netlify gives you a live address in a few seconds, something like
   https://sparkly-otter-123456.netlify.app

3. Turn on email delivery. In Netlify, open the new site and go to
   Site configuration -> Environment variables. Add:

       MAIL_TO      = jbrantley@jenniferbrantleylaw.com
       MAIL_FROM    = intake@fineprintlawyer.com
       RESEND_API_KEY = (from resend.com, after verifying your domain)

   Then Deploys -> Trigger deploy -> Clear cache and deploy site, so the
   function picks the new values up.

   Until you do this, a client can still sign and download their PDF -- the
   confirmation screen just asks them to email it to you instead.

4. Optional: Domain management -> add a subdomain such as
   start.fineprintlawyer.com, then link to it from your website.

   Link to everything:   https://YOUR-SITE/
   Link to one service:  https://YOUR-SITE/intake/trademark


WHAT ABOUT MY REAL ENGAGEMENT LETTERS AND FEES?
-----------------------------------------------

The letters and every "$__________" in this build are placeholders for your
own language and your own numbers. They live in the project this bundle was
built from, not in this zip -- the function here is compiled, so editing the
files inside the zip will change what a client reads on screen but NOT what
comes out in the signed PDF, which is exactly the mismatch you do not want.

To change the letters, questions, fees, or payment links, edit
public/data/practice-areas.mjs in the project, run "npm run build:drop", and
drop the new zip. Netlify replaces the site in place and the address stays the
same.


PRACTICE AREAS IN THIS BUILD
----------------------------
`;

/* ------------------------------------------------------------------------ */

await rm(DIST, { recursive: true, force: true });
await rm(ZIP, { force: true });
await mkdir(`${DIST}/netlify/functions`, { recursive: true });

// The whole client-facing site, unchanged, at the root of the bundle.
await cp('public', DIST, { recursive: true });

// One self-contained function file: no imports left to resolve at runtime.
const result = await build({
  entryPoints: ['netlify/functions/submit-intake.mjs'],
  outfile: `${DIST}/netlify/functions/submit-intake.mjs`,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  minify: false,
  legalComments: 'none',
  // nodemailer reaches for optional transports it never uses here.
  external: ['aws-sdk', '@aws-sdk/*', 'nodemailer/lib/*'],
  banner: {
    js: [
      '// Compiled by scripts/build-drop.mjs for a Netlify drag-and-drop deploy.',
      '// Do not edit — edit the project source and rebuild.',
      "import { createRequire as __createRequire } from 'node:module';",
      'const require = __createRequire(import.meta.url);',
    ].join('\n'),
  },
  logLevel: 'warning',
});

if (result.errors.length) {
  console.error(result.errors);
  process.exit(1);
}

await writeFile(`${DIST}/netlify.toml`, DROP_TOML);

const areaList = PRACTICE_AREAS
  .map((a) => `  ${a.name}${(a.paymentLink || a.stripeLink) ? '' : '   (no payment link set yet)'}`)
  .join('\n');
await writeFile(`${DIST}/READ ME FIRST.txt`, `${READ_ME_FIRST}${areaList}\n`);

// Zip it so there is a single file to drag.
await run('zip', ['-r', '-q', `../${ZIP}`, '.'], { cwd: DIST });

const fnSize = (await stat(`${DIST}/netlify/functions/submit-intake.mjs`)).size;
const zipSize = (await stat(ZIP)).size;
const fnSource = await readFile(`${DIST}/netlify/functions/submit-intake.mjs`, 'utf8');

if (/^\s*(import|export)\s.*from\s+['"][^.n]/m.test(fnSource.replace(/^\/\/.*$/gm, ''))) {
  console.warn('  WARNING: the compiled function still has unresolved imports.');
}

console.log(`
  dist/                        the folder
  ${ZIP}       ${(zipSize / 1024 / 1024).toFixed(2)} MB  <- drag this to app.netlify.com/drop

  compiled function            ${(fnSize / 1024).toFixed(0)} KB, no dependencies to install
`);
