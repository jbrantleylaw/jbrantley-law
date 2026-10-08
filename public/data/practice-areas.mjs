/**
 * ============================================================================
 *  THE ONE FILE YOU EDIT
 * ============================================================================
 *
 *  Everything the portal shows a client lives in this file: the list of
 *  practice areas, the intake questions for each one, the engagement letter
 *  text for each one, and the payment link for each one.
 *
 *  It is loaded by BOTH the browser (to draw the forms and preview the letter)
 *  and the Netlify function (to build the PDF), so there is only ever one copy
 *  of the truth.
 *
 *  >>> ATTORNEY REVIEW REQUIRED <<<
 *  The engagement letter text below is a complete, working starting point --
 *  not a substitute for the firm's own letters. Paste the firm's actual
 *  approved language into the `letter` array for each area before going live.
 *
 *  MERGE FIELDS -- anywhere in letter text you may write:
 *    {{clientName}}      {{clientAddress}}    {{clientEmail}}   {{clientPhone}}
 *    {{today}}           {{areaName}}         {{feeSummary}}
 *    {{firmName}}        {{attorneyName}}     {{firmEmail}}     {{firmPhone}}
 *    {{answers.QUESTION_ID}}   e.g. {{answers.mark_name}}
 *  A merge field with no value renders as a blank underline so the letter is
 *  never left with a raw {{token}} in it.
 *
 *  LETTER FORMAT -- an array of sections:
 *    { heading: "1. Scope of Representation", body: [ "paragraph", ... ] }
 *  A body line beginning with "- " is rendered as a bullet.
 *  A body line beginning with "[ ] " becomes a checkbox the client can tick.
 *  A body line beginning with "[*] " becomes a checkbox they MUST tick before
 *  they can sign. Ticks are enforced in the browser and again on the server,
 *  and are drawn into the signed PDF as filled or empty boxes.
 *  Omit `heading` for an unheaded block (used for the salutation).
 */

import { LETTERS, SCOPES } from './letters.generated.mjs';

export { SCOPES };

/* ---------------------------------------------------------------------------
 * Firm details. Blank values are skipped everywhere, so leave a field as ""
 * until you have it rather than putting a placeholder in.
 * ------------------------------------------------------------------------- */
export const FIRM = {
  name: 'J Brantley Law, PLLC',
  tagline: 'The Fine Print Lawyer',
  attorneyName: 'Jennifer N. Brantley, Esq.',
  attorneyTitle: 'Attorney & Counselor at Law',
  email: 'jbrantley@jenniferbrantleylaw.com',
  phone: '(210) 742-2435',
  address: ['5900 Balcones Dr., #9008, Austin, TX 78731'],
  website: 'fineprintlawyer.com',
  licenses: 'Licensed in Texas and Georgia',
  // Where an out-of-state client is sent to book a call. Leave '' to send them
  // to the firm's email instead.
  consultUrl: '',
};

/* ---------------------------------------------------------------------------
 * Where the firm can take a matter.
 *
 * Trademark and copyright are federal and open to clients anywhere — the only
 * two matters signed online right now (see CONSULT_ONLY below for everything
 * else). This TX/GA residency check is dormant while that stays true; it is
 * left in place, still wired into the contact screen, for whenever a
 * state-law matter is added back to self-service intake.
 * ------------------------------------------------------------------------- */
export const RESIDENT_STATES = {
  TX: 'Texas',
  GA: 'Georgia',
};

export function isEligibleState(raw) {
  const v = String(raw || '').trim().toUpperCase();
  if (RESIDENT_STATES[v]) return true;
  return Object.values(RESIDENT_STATES).some((n) => n.toUpperCase() === v);
}

/** The message shown when someone outside Texas or Georgia picks a state matter. */
export function outOfStateMessage(area) {
  const where = FIRM.consultUrl
    ? `schedule a consultation at ${FIRM.consultUrl}`
    : `email ${FIRM.email} to schedule a consultation`;
  return `${FIRM.name} can only take ${area.short.toLowerCase()} matters for clients who reside in `
    + `Texas or Georgia, because the work is governed by the law of the client's state. Your address `
    + `is outside both, so this intake cannot go forward. Please ${where} — the firm can talk through `
    + `your options, including a referral. Trademark and copyright matters are federal, and those the `
    + `firm can handle for clients in any state.`;
}

/* ---------------------------------------------------------------------------
 * Matters the firm takes, but never through self-service intake. These always
 * start with a consultation, so they are listed on the landing page as a route
 * to a call rather than as an intake form.
 *
 * Business formation, contracts, adult name change, and estate planning moved
 * here so only trademark and copyright are signed online. Their signed .docx
 * agreements are untouched in ./letters and scripts/import-letters.mjs still
 * imports them into letters.generated.mjs — only each area's config object
 * (questions, tier logic, paymentOptions) was removed from PRACTICE_AREAS
 * below. Restoring self-service for one of them means pulling that area's
 * object back out of git history (see the commit that removed them) rather
 * than rewriting it from scratch.
 * ------------------------------------------------------------------------- */
export const CONSULT_ONLY = [
  'Personal injury',
  'Family law',
  'Government contracting',
  'Business formation and governance',
  'Contract drafting and review',
  'Adult name change',
  'Estate planning',
];

/** Shown on every page — a client whose matter is not listed at all should never be stuck. */
export function otherServiceMessage() {
  const where = FIRM.consultUrl
    ? `<a href="${FIRM.consultUrl}" target="_blank" rel="noopener">schedule a consultation</a>`
    : `email <a href="mailto:${FIRM.email}">${FIRM.email}</a>`;
  return `Don't see what you need, or need something this portal doesn't cover? Please ${where} — `
    + `most matters can be scoped with a custom engagement letter.`;
}

/* ---------------------------------------------------------------------------
 * Screen 1 — contact information. Shared by every practice area.
 * ------------------------------------------------------------------------- */
export const CONTACT_FIELDS = [
  { id: 'first_name', label: 'First name', type: 'text', required: true, autocomplete: 'given-name', half: true },
  { id: 'last_name', label: 'Last name', type: 'text', required: true, autocomplete: 'family-name', half: true },
  { id: 'email', label: 'Email address', type: 'email', required: true, autocomplete: 'email', half: true },
  { id: 'phone', label: 'Phone number', type: 'tel', required: true, autocomplete: 'tel', half: true },
  {
    id: 'client_type',
    label: 'Who will the client of record be?',
    type: 'radio',
    required: true,
    options: ['Me, individually', 'A business or other entity'],
  },
  {
    id: 'entity_name',
    label: 'Full legal name of the entity',
    type: 'text',
    required: true,
    showIf: { field: 'client_type', equals: 'A business or other entity' },
    help: 'Exactly as it appears on the formation documents, including "LLC," "Inc.," etc.',
  },
  {
    id: 'entity_role',
    label: 'Your title / role in the entity',
    type: 'text',
    showIf: { field: 'client_type', equals: 'A business or other entity' },
    placeholder: 'Member, Manager, President…',
  },
  { id: 'street', label: 'Street address', type: 'text', required: true, autocomplete: 'street-address' },
  { id: 'city', label: 'City', type: 'text', required: true, autocomplete: 'address-level2', half: true },
  { id: 'state', label: 'State', type: 'text', required: true, autocomplete: 'address-level1', half: true },
  { id: 'zip', label: 'ZIP code', type: 'text', required: true, autocomplete: 'postal-code', half: true },
  {
    id: 'preferred_contact',
    label: 'Best way to reach you',
    type: 'select',
    required: true,
    options: ['Email', 'Phone call', 'Text message'],
    half: true,
  },
  {
    id: 'referral_source',
    label: 'How did you hear about the firm?',
    type: 'select',
    options: ['Google search', 'Referral from a friend or colleague', 'Referral from another attorney', 'Social media', 'Prior client', 'Other'],
  },
];

/* ---------------------------------------------------------------------------
 * Screen 2 — appended to the end of EVERY practice area's questions.
 * These are the conflict-check and deadline questions you want on every file.
 * ------------------------------------------------------------------------- */
export const COMMON_QUESTIONS = [
  {
    id: 'adverse_parties',
    label: 'Names of every other person, company, or agency involved',
    type: 'textarea',
    required: true,
    help: 'Needed to run a conflict-of-interest check. List everyone on the other side, even if things are friendly. Write "None" if there truly is no other party.',
  },
  {
    id: 'deadline',
    label: 'Is there a deadline, hearing, or filing date we need to know about?',
    type: 'textarea',
    required: true,
    help: 'Write "None that I know of" if you are not aware of one.',
  },
  {
    id: 'prior_counsel',
    label: 'Has another attorney worked on this matter?',
    type: 'radio',
    required: true,
    options: ['No', 'Yes'],
  },
  {
    id: 'prior_counsel_detail',
    label: 'Who, and what did they do?',
    type: 'textarea',
    required: true,
    showIf: { field: 'prior_counsel', equals: 'Yes' },
  },
  {
    id: 'military_affiliation',
    label: 'Are you part of the military community?',
    type: 'radio',
    required: true,
    options: [
      'Active duty',
      'Reserve or National Guard',
      'Veteran',
      'Military spouse or dependent',
      'Gold Star family',
      'No',
    ],
    help: 'The firm supports the military community with reduced fee services — Attorney Brantley is a military spouse. '
      + 'Supporting documentation will need to be provided before an invoice is issued.',
  },
  {
    id: 'anything_else',
    label: 'Anything else you want the attorney to know before your consultation?',
    type: 'textarea',
  },
];

/* ---------------------------------------------------------------------------
 * Shown on the payment screen to anyone who identified as military, so they
 * know not to pay a standard fee before the reduced fee has been applied.
 * The question above is `military_affiliation`; "No" is the only answer that
 * does not trigger this.
 * ------------------------------------------------------------------------- */
export const MILITARY_NOTE = {
  heading: 'Military and veteran families',
  body:
    'Attorney Brantley is a military spouse, and the firm offers reduced fee services to the '
    + 'military community. Supporting documentation — a military ID, LES, DD-214, or dependent ID — '
    + 'must be provided before an invoice is issued. If you would like a reduced fee applied to your '
    + 'matter, you can wait for your invoice rather than paying a standard fee below. Thank you for '
    + 'your service.',
};

/* ---------------------------------------------------------------------------
 * The opening of every engagement letter, above the numbered sections.
 * ------------------------------------------------------------------------- */
// The firm's imported agreements open themselves, so this is left empty. It
// still prefixes the draft letters used by areas with no agreement on file.
export const LETTER_INTRO = [];

/* ---------------------------------------------------------------------------
 * Boilerplate shared by every engagement letter. Edit once, applies to all.
 * Each area's own `letter` sections are inserted between the opening and this.
 * ------------------------------------------------------------------------- */
const COMMON_CLOSING = [
  {
    heading: 'Fees, Costs, and Billing',
    body: [
      '{{feeSummary}}',
      'Fees are earned as described above and are separate from out-of-pocket costs. Costs are expenses paid to third parties on your behalf — for example, government filing fees, recording fees, search-report charges, courier and delivery charges, court costs, and deposition or record-retrieval fees. Costs are your responsibility and are billed to you at what the firm actually pays. The firm will tell you before incurring any single cost over $250.00.',
      'Invoices are due upon receipt. If an invoice remains unpaid for more than thirty (30) days, the firm may suspend work on your matter or withdraw from the representation as described below, after giving you notice and a reasonable opportunity to bring the account current.',
      'Any advance fee or retainer you pay is deposited into the firm\'s trust account and withdrawn only as it is earned or as costs are incurred. Any unearned balance remaining at the end of the representation will be refunded to you.',
    ],
  },
  {
    heading: 'What This Agreement Does Not Cover',
    body: [
      'This agreement covers only the work described under "Scope of Representation" above. It does not cover any other matter, including appeals, litigation, enforcement actions, tax advice, or the drafting or review of any document not listed. The firm will be glad to take on additional work for you, but only under a separate written agreement signed by both of us.',
      'No lawyer can promise a particular outcome, and nothing in this letter or in any conversation with the firm is a guarantee or prediction of the result of your matter. Any opinion the firm gives you is its professional judgment based on the facts you provide and the law as it exists at the time.',
      'You agree to give the firm complete and accurate information, to respond to requests for information and documents promptly, to keep the firm informed of any change in your address, email, or phone number, and to tell the firm right away about anything that may affect the matter.',
    ],
  },
  {
    heading: 'Confidentiality and Communications',
    body: [
      'Communications between you and the firm about this matter are confidential and protected by the attorney-client privilege. The firm will not disclose them except as you direct or as the rules of professional conduct require or permit.',
      'The firm communicates with clients by email and other electronic means. Email is convenient but not perfectly secure, and forwarding privileged communications to a third party — including a friend, family member, or an employer-owned email account — can waive the privilege. By signing below you consent to electronic communication and agree to use an account only you control.',
    ],
  },
  {
    heading: 'Ending the Representation',
    body: [
      'You may end this representation at any time, for any reason, by telling the firm in writing. You remain responsible for fees earned and costs incurred through the date the firm receives your notice.',
      'The firm may withdraw as permitted by the applicable rules of professional conduct — for example, if you do not pay as agreed, if you ask the firm to do something unlawful or unethical, if you have given materially false information, or if the relationship has otherwise broken down. The firm will give reasonable notice and will take steps that can reasonably be taken to avoid prejudice to you.',
      'The representation ends when the work described above is finished. At that point the firm has no continuing duty to monitor deadlines, docket dates, renewal dates, or changes in the law affecting you, and will not do so unless you and the firm sign a new agreement.',
    ],
  },
  {
    heading: 'Your File',
    body: [
      'The firm keeps your file for at least five (5) years after the matter closes and may then destroy it without further notice. You may request a copy of your file at any time. The first copy is provided at no charge in electronic form.',
    ],
  },
  {
    heading: 'Governing Law and Disputes',
    body: [
      'This agreement is governed by the laws of the State of Texas without regard to its conflict-of-laws rules, except that where the matter is pending in Georgia the substantive law of Georgia governs the conduct of that matter.',
      'If a dispute arises between us, we agree to first attempt in good faith to resolve it informally, and then through mediation before a mutually agreed mediator, with the cost of the mediator split equally. This paragraph does not limit any right you have to pursue a fee dispute through the applicable state bar\'s fee dispute resolution program, and it does not prospectively limit the firm\'s liability for malpractice.',
      'You have the right to have this agreement reviewed by an independent attorney of your choosing before you sign it.',
    ],
  },
  {
    heading: 'Agreement',
    body: [
      'This letter, together with the intake information attached to it, is the entire agreement between us about this matter and replaces any earlier discussion or understanding. It can be changed only in a writing signed by both of us. If any part of it is found unenforceable, the rest stays in effect.',
      'If this letter correctly states our agreement, please tick each box below and sign. The representation begins when the firm has received both your signed agreement and the payment described above.',
      '[*] I have read this agreement in full, including the fee, and I agree to it.',
      '[*] I understand that signing this agreement does not by itself create an attorney-client relationship, and that the firm must complete a conflicts check and confirm the engagement before work begins.',
      '[ ] I would like the firm to mail me a printed copy of this agreement.',
    ],
  },
];

/* ---------------------------------------------------------------------------
 * The practice areas.
 *
 * PAYMENT. Two shapes, depending on how many fees the area has.
 *
 *   One fee — a single link:
 *     paymentLink: 'https://app.practicepanther.com/Payment/OneLinkPayment/...'
 *
 *   Several fees — a labeled list. `label` is required (the client has to know
 *   what each button charges for); `amount`, `description`, and `note` are
 *   optional, and `whenAnswer` optionally ties an option to an intake answer
 *   so the right fee is pulled to the top and marked "Matches your answers":
 *     paymentOptions: [
 *       {
 *         label: 'LLC formation — single member',
 *         amount: '$750',
 *         description: 'Formation of a single-member LLC, including Articles of Organization, an Operating Agreement, and the initial franchise tax report.',
 *         note: 'Includes the company agreement',
 *         url: 'https://app.practicepanther.com/Payment/OneLinkPayment/...',
 *         whenAnswer: { field: 'formation_need', equals: 'Form a new entity' },
 *       },
 *     ]
 *   `description` is what the client is actually buying — pull it straight
 *   from the engagement letter's own scope-of-services language rather than
 *   paraphrasing, so the fee-summary step never promises something the
 *   signed letter doesn't. `note` is for payment mechanics (what to type in,
 *   deposit timing, installment math) — keep service description out of it,
 *   or it ends up duplicated between the two fields.
 *   `equals` also accepts an array if one fee covers several answers.
 *
 *   An option can offer a second way to pay the same fee — e.g. a Buy Now,
 *   Pay Later checkout through a different hosted page — via `altPayment`,
 *   rendered as a secondary button beneath the main one:
 *     altPayment: { url: '...', label: 'Buy Now, Pay Later', note: 'On the payment page, enter $750.00.' }
 *   This differs from the (currently unused elsewhere) `installment` field,
 *   which is for paying a *fraction* of the fee as a deposit, not a full-price
 *   alternative payment method.
 *
 *   A checkout page that isn't pre-filled with the amount (LawPay's general
 *   payment pages are not) needs its `note` to say exactly what to enter —
 *   the client sees only the button, not the config.
 *
 *   IMPORTANT: an option WITH `whenAnswer` is shown only to clients whose
 *   answer matches it — so a divorce client is never offered the name-change
 *   fee. An option WITHOUT `whenAnswer` is shown to everyone. If nothing
 *   applies to a given client, they are told an invoice will follow.
 *
 * The firm uses PracticePanther OneLink. Any other hosted payment page would
 * also work — Stripe, LawPay, Clio, Square, PayPal. While an area has no link at all, the client is shown
 * an invoice-will-follow message instead of a button, so the portal is safe to
 * launch before every link exists.
 * ------------------------------------------------------------------------- */

// Verbatim from the signed copyright letter's Section 1(A) — identical across
// all three work-count tiers, since they're the same service at different
// quantities.
const COPYRIGHT_APPLICATION_DESCRIPTION =
  'Attorney will prepare and file an application for federal copyright registration of the Work with the '
  + 'United States Copyright Office, including preparation of the deposit copy, submission of the applicable '
  + 'Copyright Office filing fee on Client’s behalf, and a response to one round of Copyright Office '
  + 'correspondence, if issued. Attorney will complete and file the application within ten (10) business days '
  + 'of receipt of all materials necessary to complete the application.';

export const PRACTICE_AREAS = [
  /* ======================================================================= */
  {
    slug: 'trademark',
    name: 'Trademark & Brand Protection',
    short: 'Trademark',
    federal: true,                       // open to clients in any state
    letterKeyField: 'service_requested', // a different agreement per tier
    blurb: 'Knockout search through full federal filing — three tiers, available nationwide.',
    icon: '®',
    // Rebuilt around the Oct. 2026 letter (3 tiers — File and Protect and
    // Full Shield were folded out).
    //
    // LawPay is now live with two general-purpose pages that are not
    // pre-filled with an amount — the client types it in themselves, so
    // every `note` below spells out the exact figure to enter. Search and
    // File carries a three-way election in the signed letter (Paid in Full
    // / Installment Plan / Buy Now, Pay Later). There is no dedicated
    // installment-plan link — per the firm, Installment Plan reuses the
    // same Pay in Full page, with the client simply typing in their share
    // of $2,000.00 (split 3, 5, or 6 ways, the way the signed letter lets
    // them elect) each time a payment is due, so the note spells out each
    // plan's per-payment amount to the cent.
    paymentOptions: [
      {
        label: 'Knockout Search',
        amount: '$350',
        description: 'A quick scan of the official USPTO database and a brief risk assessment. Choose this or Search and Clear, not both. This option does not include preparation or filing of a federal trademark application. Client cannot upgrade if this search is selected.',
        note: 'Paid in full at signing — on the payment page, enter $350.00 as the amount.',
        url: 'https://secure.lawpay.com/pages/jenniferbrantleylaw/trust',
        manualAmount: true,
        whenAnswer: { field: 'service_requested', equals: 'Knockout Search' },
      },
      {
        label: 'Search and Clear',
        amount: '$650',
        description: 'Comprehensive clearance search for the Proposed Mark, with a written risk assessment, and consultation. Includes a deep-dive search of the USPTO database, state registries, business directories, domain names, and unregistered "common law" marks. This option does not include preparation or filing of a federal trademark application. Client can upgrade to a filing tier if this search is selected.',
        note: 'Paid in full at signing — on the payment page, enter $650.00 as the amount.',
        url: 'https://secure.lawpay.com/pages/jenniferbrantleylaw/trust',
        manualAmount: true,
        whenAnswer: { field: 'service_requested', equals: 'Search and Clear' },
      },
      {
        label: 'Search and File',
        amount: '$2,000',
        description: 'Search and File includes Search and Clear, plus filing strategy; review of ownership, filing basis, goods/services, classification, and specimen(s) as applicable; preparation of one federal trademark application in one class; one pre-filing revision; filing with the USPTO; Attorney’s appearance as counsel of record; docketing and routine status monitoring; and reporting routine USPTO correspondence. Also includes three (3) months of post-registration monitoring. Office Action responses, Statements of Use, Extension Requests, TTAB matters, and other substantive post-filing work are separate unless expressly included by written addendum.',
        note: 'Plus USPTO filing fees (separate government cost, billed separately — do not include it in the amount below). To pay in full, enter $2,000.00 as the amount on the payment page. Prefer an installment plan instead? Use the same payment button for each installment and enter: for 3 payments, $666.67 the first two times and $666.66 the third; for 5 payments, $400.00 each time; for 6 payments, $333.34 the first two times and $333.33 the remaining four times. Each plan totals $2,000.00.',
        url: 'https://secure.lawpay.com/pages/jenniferbrantleylaw/trust',
        manualAmount: true,
        altPayment: {
          url: 'https://secure.lawpay.com/pages/jenniferbrantleylaw/paylater-tr',
          label: 'Buy Now, Pay Later',
          note: 'To use Buy Now, Pay Later instead, enter $2,000.00 as the amount on the financing page. Subject to approval and the terms of the third-party financing provider; USPTO filing fees are billed separately and are not covered by this financing.',
        },
        whenAnswer: { field: 'service_requested', equals: 'Search and File' },
      },
    ],
    feeSummary:
      'The flat fee for this matter depends on the service you selected: Knockout Search, $350.00; Search and '
      + 'Clear, $650.00; Search and File, $2,000.00. Knockout Search and Search and Clear are payable in '
      + 'full at signing. For Search and File, Client elects Paid in Full at signing, an Installment Plan (3, 5, '
      + 'or 6 payments), or Buy Now, Pay Later financing through the firm\'s LawPay account. None of the '
      + 'above includes the USPTO filing fee, which is currently $350.00 per class of goods or services and is '
      + 'paid directly to the government; the fees above cover one class, and each additional class is billed '
      + 'at $400.00 in attorney fees plus the USPTO fee for that class. Office Action responses, Statements of '
      + 'Use, Extension Requests, a cease-and-desist letter, a pro se filing amendment, and rush handling are '
      + 'each available a la carte and quoted in the engagement letter. Any other trademark work is quoted '
      + 'before it begins.',
    questions: [
      {
        id: 'service_requested',
        label: 'What do you need help with?',
        type: 'radio',
        required: true,
        options: [
          'Knockout Search',
          'Search and Clear',
          'Search and File',
          'Responding to an Office Action or refusal',
          'Someone is using my mark — enforcement',
          'I received a cease-and-desist letter',
          'Trademark renewal or maintenance filing',
          'Not sure yet',
        ],
        help: 'Knockout Search is a quick USPTO-only scan — cheapest, but you cannot upgrade to a filing tier '
          + 'later. Search and Clear is a deeper search that can be upgraded. Search and File adds preparation '
          + 'and filing of the federal application. If you are not sure which fits, choose "Not sure yet" and '
          + 'the firm will recommend one.',
      },
      { id: 'mark_name', label: 'The mark you want to protect', type: 'text', required: true, placeholder: 'The exact word, phrase, or name', help: 'Type it exactly as you use it, including any spacing or punctuation.' },
      {
        id: 'drivers_license',
        label: 'Driver’s license number and state of issuance',
        type: 'text',
        required: true,
        placeholder: '12345678 — Texas',
        help: 'Needed for the limited power of attorney authorizing the firm to file on your behalf with the USPTO.',
      },
      {
        id: 'number_of_classes',
        label: 'How many classes of goods or services do you need?',
        type: 'text',
        required: true,
        showIf: { field: 'service_requested', equals: ['Knockout Search', 'Search and Clear', 'Search and File'] },
        placeholder: '1',
        help: 'Each class is a category of goods or services under the USPTO system and carries its own $350 filing fee. Not sure? Say so and the firm will confirm during the clearance search.',
      },
      {
        id: 'mark_type',
        label: 'What kind of mark is it?',
        type: 'radio',
        required: true,
        options: ['Word or phrase only (standard character)', 'Logo or design', 'Both — word and logo', 'Not sure'],
      },
      { id: 'goods_services', label: 'What products or services do you use the mark on?', type: 'textarea', required: true, help: 'Be specific. "Coffee shop services" is better than "food." List everything you sell or plan to sell under the mark.' },
      {
        id: 'in_use',
        label: 'Are you already using the mark in commerce?',
        type: 'radio',
        required: true,
        options: ['Yes, actively selling under it', 'Not yet, but I intend to', 'I have used it in the past'],
      },
      { id: 'first_use_date', label: 'Approximate date of first sale under the mark', type: 'text', showIf: { field: 'in_use', equals: 'Yes, actively selling under it' }, placeholder: 'March 2023 — an estimate is fine' },
      { id: 'website', label: 'Website or social handle where the mark appears', type: 'text', placeholder: 'https://' },
      {
        id: 'prior_filing',
        label: 'Have you or anyone else ever filed for this mark?',
        type: 'radio',
        required: true,
        options: ['No', 'Yes — I have filed before', 'Yes — a state registration', 'I do not know'],
      },
      { id: 'known_conflicts', label: 'Do you know of anyone else using a similar name in your industry?', type: 'textarea', help: 'Including anyone who has contacted you about the name.' },
    ],
    letter: [
      {
        heading: '1. Scope of Representation',
        body: [
          'You have asked the firm to represent you in connection with the trademark {{answers.mark_name}} and the following work: {{answers.service_requested}}.',
          'Depending on which of the above you selected, the representation includes:',
          '- Reviewing the mark and the goods and services you have identified, and advising you on registrability and risk;',
          '- Conducting a knockout or clearance search of USPTO records and, where appropriate, common-law and state sources, and reporting the results to you;',
          '- Preparing and filing a federal trademark application with the United States Patent and Trademark Office, including selecting the classes and drafting the identification of goods and services;',
          '- Docketing and monitoring the application and forwarding USPTO correspondence to you with the firm\'s recommendation; and',
          '- Preparing a response to a non-substantive Office Action where the response is procedural in nature.',
          'A trademark application is examined by a government attorney who has independent authority to refuse it. The firm cannot control that decision and does not guarantee that the mark will register.',
        ],
      },
      {
        heading: '2. What You Should Understand About Trademark Rights',
        body: [
          'Trademark rights in the United States generally come from use of the mark in commerce, not from registration alone. A federal registration adds significant benefits — a nationwide presumption of ownership, the ability to sue in federal court, and public notice of your claim — but it does not create rights against a party who was using a confusingly similar mark before you.',
          'No search is exhaustive. Common-law users, pending applications not yet published, and foreign filings with priority rights may not appear in any search. A clearance opinion reduces risk; it does not eliminate it.',
          'A registration must be maintained. Declarations are due between the fifth and sixth year after registration and again every ten years. Unless you sign a separate agreement asking the firm to docket those deadlines, tracking them is your responsibility.',
        ],
      },
    ],
  },

  /* ======================================================================= */
  {
    slug: 'copyright',
    name: 'Copyright Registration',
    short: 'Copyright',
    blurb: 'A done-with-you federal copyright registration: the firm prepares and files the application and delivers your certificate.',
    icon: '©',
    federal: true, // open to clients in any state
    // Fee changed to a $500 base work + optional additional works with the new
    // LawPay-era letter (Sept. 2026); the old PracticePanther OneLink URL was
    // for the old $350 fee, so it's removed rather than left stale.
    //
    // LawPay's "pay in full" page isn't pre-filled with an amount — the
    // client types it in — so each note below spells out the exact figure.
    // Buy Now, Pay Later is offered here too via `altPayment`, same as
    // trademark's Search and File, even though the signed letter itself
    // only describes payment in full — BNPL is just a different way to
    // fund that same full payment, not a different fee structure.
    paymentOptions: [
      {
        label: 'One work — $500 flat fee',
        amount: '$500 (due in full at signing)',
        description: COPYRIGHT_APPLICATION_DESCRIPTION,
        note: 'Plus the U.S. Copyright Office filing fee, paid directly to the government. On the payment page, enter $500.00 as the amount.',
        url: 'https://secure.lawpay.com/pages/jenniferbrantleylaw/trust',
        manualAmount: true,
        altPayment: {
          url: 'https://secure.lawpay.com/pages/jenniferbrantleylaw/paylater-tr',
          label: 'Buy Now, Pay Later',
          note: 'To use Buy Now, Pay Later instead, enter $500.00 as the amount on the financing page. Subject to approval and the terms of the third-party financing provider; the Copyright Office filing fee is billed separately and is not covered by this financing.',
        },
        whenAnswer: { field: 'works_elected', equals: 'One work — $500 flat fee' },
      },
      {
        label: 'Two works (one plus one additional) — $850 flat fee',
        amount: '$850 (due in full at signing)',
        description: COPYRIGHT_APPLICATION_DESCRIPTION,
        note: 'Plus the U.S. Copyright Office filing fee per work, paid directly to the government. On the payment page, enter $850.00 as the amount.',
        url: 'https://secure.lawpay.com/pages/jenniferbrantleylaw/trust',
        manualAmount: true,
        altPayment: {
          url: 'https://secure.lawpay.com/pages/jenniferbrantleylaw/paylater-tr',
          label: 'Buy Now, Pay Later',
          note: 'To use Buy Now, Pay Later instead, enter $850.00 as the amount on the financing page. Subject to approval and the terms of the third-party financing provider; the Copyright Office filing fees are billed separately and are not covered by this financing.',
        },
        whenAnswer: { field: 'works_elected', equals: 'Two works (one plus one additional) — $850 flat fee' },
      },
      {
        label: 'Three works (one plus two additional) — $1,200 flat fee',
        amount: '$1,200 (due in full at signing)',
        description: COPYRIGHT_APPLICATION_DESCRIPTION,
        note: 'Plus the U.S. Copyright Office filing fee per work, paid directly to the government. On the payment page, enter $1,200.00 as the amount.',
        url: 'https://secure.lawpay.com/pages/jenniferbrantleylaw/trust',
        manualAmount: true,
        altPayment: {
          url: 'https://secure.lawpay.com/pages/jenniferbrantleylaw/paylater-tr',
          label: 'Buy Now, Pay Later',
          note: 'To use Buy Now, Pay Later instead, enter $1,200.00 as the amount on the financing page. Subject to approval and the terms of the third-party financing provider; the Copyright Office filing fees are billed separately and are not covered by this financing.',
        },
        whenAnswer: { field: 'works_elected', equals: 'Three works (one plus two additional) — $1,200 flat fee' },
      },
    ],
    feeSummary:
      'The flat fee for this matter is $500.00 for one work, $850.00 for two works, or $1,200.00 for three '
      + 'works (the most this engagement covers), depending on what Client elects. The total fee is due in '
      + 'full at signing, either in one payment or through the firm\'s Buy Now, Pay Later financing option. It '
      + 'does not include the U.S. Copyright Office filing fee — currently $45.00 to $65.00 per work depending '
      + 'on authorship and claimant, or $125.00 for paper filing — which is a separate government cost paid at '
      + 'the time of filing.',
    questions: [
      {
        id: 'works_elected',
        label: 'How many works are you registering?',
        type: 'radio',
        required: true,
        options: [
          'One work — $500 flat fee',
          'Two works (one plus one additional) — $850 flat fee',
          'Three works (one plus two additional) — $1,200 flat fee',
        ],
        help: 'This engagement covers up to three works, each by a single author. Additional works beyond '
          + 'three, or a work with multiple authors or claimants, require a separate written quote.',
      },
      { id: 'work_title', label: 'Title of the work(s) you want to register', type: 'text', required: true, help: 'List every title, separated by commas, if you are registering more than one work.' },
      {
        id: 'work_type',
        label: 'What kind of work is it?',
        type: 'select',
        required: true,
        options: [
          'Literary work (book, article, blog, course)',
          'Visual art (photograph, illustration, design)',
          'Musical work or sound recording',
          'Motion picture or video',
          'Website or software',
          'Choreography or dramatic work',
          'Other',
        ],
      },
      { id: 'work_type_other', label: 'Describe the work', type: 'text', required: true, showIf: { field: 'work_type', equals: 'Other' } },
      {
        id: 'authorship',
        label: 'Who created the work?',
        type: 'radio',
        required: true,
        options: [
          'I created it, by myself',
          'I created it with someone else',
          'It was created for me as a work made for hire',
          'Someone assigned the rights to me',
        ],
        help: 'This engagement covers a single work by a single author. If more than one author or '
          + 'work is involved, the firm will quote that separately before any fee is due.',
      },
      { id: 'authorship_detail', label: 'Who else was involved, and what did they contribute?', type: 'textarea', required: true, showIf: { field: 'authorship', equals: 'I created it with someone else' } },
      { id: 'creation_date', label: 'Approximately when was the work completed?', type: 'text', required: true, placeholder: 'March 2024 — an estimate is fine' },
      {
        id: 'published',
        label: 'Has the work been published?',
        type: 'radio',
        required: true,
        options: ['Yes, it is publicly available', 'No, it has not been published', 'I am not sure what counts as published'],
        help: 'Publication has a specific meaning in copyright law. If you are unsure, say so — the firm will work it out.',
      },
      { id: 'publication_date', label: 'Approximate date of first publication', type: 'text', showIf: { field: 'published', equals: 'Yes, it is publicly available' } },
      { id: 'prior_registration', label: 'Has this work been registered before, in whole or in part?', type: 'radio', required: true, options: ['No', 'Yes', 'I do not know'] },
      {
        id: 'ai_involvement',
        label: 'Was any generative AI tool used in creating the work?',
        type: 'radio',
        required: true,
        options: ['No', 'Yes'],
        help: 'The Copyright Office requires disclosure of any more-than-minimal AI-generated content, which '
          + 'must be excluded from the claim. An application that fails to disclose AI use can be refused, '
          + 'and a registration obtained without that disclosure can later be challenged or cancelled.',
      },
      {
        id: 'ai_involvement_detail',
        label: 'Which tool did you use, and which portions of the work did it produce or influence?',
        type: 'textarea',
        required: true,
        showIf: { field: 'ai_involvement', equals: 'Yes' },
      },
      { id: 'infringement', label: 'Is anyone using the work without permission?', type: 'textarea', help: 'Registration is a prerequisite to suing for infringement, so tell the firm if this is urgent.' },
    ],
    // The firm's own agreement is used; this draft is only a fallback.
    letter: [
      {
        heading: '1. Scope of Representation',
        body: [
          'You have asked the firm to prepare and file a federal copyright application for {{answers.work_title}}.',
        ],
      },
    ],
  },

];

/* ------------------------------------------------------------------------ */
/* Helpers used by both the browser and the Netlify function.               */
/* ------------------------------------------------------------------------ */

export function getArea(slug) {
  return PRACTICE_AREAS.find((a) => a.slug === slug) || null;
}

/**
 * A short price teaser for the home page card: the lowest fee, and whether
 * an installment plan or Buy Now, Pay Later is available for any tier. Pulls
 * the figure straight out of each option's `amount` so the home page can
 * never drift from what the fee-summary step actually shows.
 */
export function priceTeaser(area) {
  const opts = area.paymentOptions || [];
  const amounts = opts
    .map((o) => {
      const m = String(o?.amount || '').match(/\$[\d,]+(?:\.\d{2})?/);
      return m ? Number(m[0].replace(/[$,]/g, '')) : null;
    })
    .filter((n) => n !== null);
  if (!amounts.length) return null;
  const min = Math.min(...amounts);
  const display = amounts.length > 1 ? `From $${min.toLocaleString('en-US')}` : `$${min.toLocaleString('en-US')}`;
  const hasFinancing = opts.some((o) => o?.altPayment) || opts.some((o) => o?.installment);
  return { display, hasFinancing };
}

/** Full question list for an area: its own questions plus the shared ones. */
export function questionsFor(area) {
  return [...area.questions, ...COMMON_QUESTIONS];
}

/**
 * The sections of the agreement this client is signing.
 *
 * Where the firm's own Word agreement has been imported (see
 * scripts/import-letters.mjs) that is used verbatim — it is already complete
 * and numbered. An area whose letter varies by package names the question that
 * selects it in `letterKeyField`. Areas with no imported agreement fall back to
 * the draft in `area.letter` plus the shared boilerplate.
 */
export function letterSectionsFor(area, answers = {}) {
  const key = area.letterKeyField ? `${area.slug}:${answers[area.letterKeyField] ?? ''}` : `${area.slug}:default`;
  const imported = LETTERS[key] || (area.letterKeyField ? null : LETTERS[`${area.slug}:default`]);
  if (imported) return imported.map((sec) => ({ ...sec }));

  // No agreement on file for this selection: fall back to the draft so the
  // client is never shown an empty letter.
  const fallback = area.letter || [];
  const areaSections = fallback.map((sec) => ({ ...sec }));
  const offset = areaSections.length;
  const closing = COMMON_CLOSING.map((sec, i) => ({
    ...sec,
    heading: `${offset + i + 1}. ${sec.heading}`,
  }));
  return [...areaSections, ...closing];
}

/** True when the firm's own signed agreement backs this exact selection. */
export function hasImportedLetter(area, answers = {}) {
  const key = area.letterKeyField ? `${area.slug}:${answers[area.letterKeyField] ?? ''}` : `${area.slug}:default`;
  return Boolean(LETTERS[key]);
}

/** Should a field be shown, given the answers collected so far? `equals` may be a single value or an array. */
export function isVisible(field, values) {
  if (!field.showIf) return true;
  const { field: dep, equals } = field.showIf;
  const wanted = Array.isArray(equals) ? equals : [equals];
  return wanted.includes(values[dep]);
}
