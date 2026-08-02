# J. Brantley Law — Client Intake & Engagement Portal

A standalone site where a prospective client picks a practice area, fills out
intake, reads and signs the engagement letter with a finger or mouse, downloads
the signed PDF, and pays through a Stripe Payment Link — without leaving the
page.

The moment they sign, the signed engagement letter goes to
**jbrantley@jenniferbrantleylaw.com** as a PDF attachment, with the subject line
*Client Name — Practice Area*.

It is a plain static site plus one serverless function. There is no build step,
no database, and no monthly e-signature subscription.

---

## What a client sees

| Step | Screen |
|---|---|
| — | Picks their service from the landing page |
| 1 | Contact information |
| 2 | Intake questions for that practice area, plus the conflict-check questions |
| 3 | The full engagement letter, merged with their answers, with a signature box below it |
| 4 | Signed PDF downloads automatically, then the Stripe payment button |

The signature box stays locked until they have scrolled to the end of the
letter, and the submit button stays disabled until they have signed, typed their
legal name, and checked the electronic-signature consent box.

## What lands in your inbox

One email per submission:

- **Subject:** `Dana Whitfield — Trademark & Brand Protection`
- **Reply-to:** the client, so hitting reply reaches them
- **Body:** every contact field and every intake answer, formatted for reading
- **Attachment:** `Signed Engagement Letter - Dana Whitfield - Trademark - 2026-08-02.pdf`

The PDF contains the full letter on firm letterhead, the drawn signature above
the signature line, an electronic signature record (document ID, timestamps,
IP address, browser, consent), and a final page with the client's intake
answers — so one file is the whole opening file.

---

## Going live

### 1. Deploy to Netlify

Connect this repository as a **new Netlify site** (separate from the marketing
site). No build settings need changing — `netlify.toml` has them.

Then either give it a subdomain such as `start.fineprintlawyer.com` or
`intake.fineprintlawyer.com`, or use the `*.netlify.app` URL Netlify assigns.

### 2. Turn on email

In Netlify: **Site configuration → Environment variables**. Add the variables
from [`.env.example`](.env.example). The short version:

- Create a free [Resend](https://resend.com) account, verify
  `fineprintlawyer.com`, and set `RESEND_API_KEY`.
- Set `MAIL_FROM` to an address on that verified domain.
- `MAIL_TO` already defaults to `jbrantley@jenniferbrantleylaw.com`.

If you would rather use your existing mailbox, set the `SMTP_*` variables
instead — Google Workspace needs an App Password rather than the account
password.

Nothing breaks if you skip this step: the client still signs and downloads the
PDF, and the confirmation screen asks them to email it to the firm. Fix the
setting and the next submission goes through normally.

### 3. Add the Stripe payment links

In Stripe, create a **Payment Link** for each service, then paste each URL into
the matching `stripeLink` in
[`public/data/practice-areas.mjs`](public/data/practice-areas.mjs).

While a `stripeLink` is empty, that practice area tells the client an invoice
will follow by email — so you can launch before every link exists.

The portal appends `prefilled_email` and `client_reference_id` (the document ID
from the signed PDF) to the link, so a Stripe payment can always be matched back
to the engagement letter it belongs to.

### 4. Link it from the marketing site

Add a button on fineprintlawyer.com pointing at the portal:

```html
<a href="https://start.fineprintlawyer.com/">Become a client</a>
```

Or link straight to one service from that service's page:

```html
<a href="https://start.fineprintlawyer.com/intake/trademark">Start trademark intake</a>
```

To keep clients on fineprintlawyer.com entirely, embed it instead:

```html
<iframe src="https://start.fineprintlawyer.com/intake/trademark"
        title="Client intake" style="width:100%;height:1200px;border:0"></iframe>
```

Framing is already permitted for `fineprintlawyer.com` and
`jenniferbrantleylaw.com` in `netlify.toml`. Add any other host to the
`frame-ancestors` list there.

---

## Editing the content

**Everything a client reads lives in
[`public/data/practice-areas.mjs`](public/data/practice-areas.mjs).** It is one
plain file with comments, and it is the only file that normally needs editing.

Inside it you can change:

- **`FIRM`** — firm name, attorney name, address, phone, email. Blank values are
  simply left out of the letterhead.
- **Practice areas** — add, remove, rename, reorder. Each needs a `slug`,
  `name`, `short`, `blurb`, `feeSummary`, `questions`, and `letter`.
- **`questions`** — the intake questions for that area. Supported types:
  `text`, `email`, `tel`, `date`, `number`, `textarea`, `select`, `radio`,
  `checkboxes`. Add `required: true` to require an answer, `help` for a hint
  under the label, and `showIf: { field: 'other_id', equals: 'Yes' }` to reveal
  a question only when it is relevant.
- **`letter`** — the sections unique to that area.
- **`LETTER_INTRO`, `COMMON_CLOSING`, `COMMON_QUESTIONS`** — the boilerplate
  shared by every area. Edit once, applies everywhere.

### Putting your own letters in

The letters that ship here are a complete, usable starting point, but they are
not your letters. To use yours, replace the `letter` array for that area and the
`COMMON_CLOSING` sections with your approved language. Each section is:

```js
{
  heading: '1. Scope of Representation',
  body: [
    'A paragraph.',
    'Another paragraph.',
    '- A line starting with a dash becomes a bullet.',
  ],
}
```

Sections in `COMMON_CLOSING` are numbered automatically, continuing from the
area's own sections.

Anywhere in the text you can drop in a merge field:

| Field | Becomes |
|---|---|
| `{{clientName}}` | The entity name if the client is a business, otherwise the person |
| `{{signerName}}` | The individual signing |
| `{{clientAddress}}`, `{{clientEmail}}`, `{{clientPhone}}` | From screen 1 |
| `{{today}}` | The signing date, e.g. *August 2, 2026* |
| `{{areaName}}`, `{{feeSummary}}` | From the practice area |
| `{{firmName}}`, `{{attorneyName}}`, `{{firmEmail}}`, `{{firmPhone}}` | From `FIRM` |
| `{{answers.mark_name}}` | Any intake answer, by its question `id` |

A merge field with nothing behind it renders as `__________` rather than
leaving a `{{token}}` in a client's letter.

Every `feeSummary` currently reads `$__________`. Fill in your real numbers
before launch — the amount is what the client is agreeing to pay.

### After any edit

```bash
npm run check      # catches typos, duplicate ids, broken merge fields, bad links
npm run preview    # writes a sample signed PDF per area into ./preview
```

`npm run preview trademark` does just one. Open the PDFs to proof the letters
exactly as a client would receive them.

---

## Running it locally

```bash
npm install
npm run dev:local     # http://localhost:8888
```

That runs the real submit function too, so you can complete the whole flow —
sign, submit, download. With no email variables set, the response reports that
email was not sent; add a `.env` file (see `.env.example`) to test delivery.

If you have the Netlify CLI, `npm run dev` works as well.

---

## Layout

```
public/
  index.html                    landing page, practice area cards
  intake.html                   the four-step wizard
  assets/app.js                 wizard logic, validation, submit, download
  assets/signature-pad.js       the signature canvas
  assets/styles.css             all styling
  data/practice-areas.mjs       >> the file you edit <<
  data/letter.mjs               merges answers into the letter

netlify/functions/
  submit-intake.mjs             validates, builds the PDF, sends the email
  lib/pdf.mjs                   PDF layout
  lib/mailer.mjs                Resend / SMTP delivery
  lib/email-body.mjs            the email you receive

scripts/
  verify-config.mjs             npm run check
  preview-pdf.mjs               npm run preview
  dev-server.mjs                npm run dev:local
```

`public/data/` is shared by the browser and the function on purpose, so the
letter a client reads on screen and the letter in the PDF can never drift apart.

---

## Notes on how it behaves

- **Nothing is stored.** The PDF is built in memory, emailed, and handed to the
  browser. The email is the record, so a delivery failure is reported to the
  client rather than swallowed — they are told to forward the copy they
  downloaded.
- **A half-finished form survives a refresh** in the same tab. It is cleared as
  soon as the submission succeeds.
- **Required answers are enforced twice**, in the browser and again in the
  function, so a submission cannot skip them.
- **The consent language** on the signing screen tracks the federal E-SIGN Act:
  intent to sign, consent to do business electronically, and the right to
  request a paper copy. The audit record in the PDF captures what was consented
  to and when.
- **Deadline-sensitive matters.** The personal injury, family law, and
  government contracting forms all tell clients not to rely on the form when a
  deadline is close, and the footer states that no attorney-client relationship
  exists until the firm confirms it. Review that language with your own
  malpractice carrier's guidance in mind.
