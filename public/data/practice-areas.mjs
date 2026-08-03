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
 * Trademark and copyright are federal and open to clients anywhere. Every
 * other practice area requires the client to reside in Texas or Georgia; the
 * portal stops them at the contact screen and points them to a consultation
 * rather than letting them sign an agreement the firm cannot accept.
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
 * ------------------------------------------------------------------------- */
export const CONSULT_ONLY = [
  'Personal injury',
  'Family law (other than an adult name change)',
  'Government contracting',
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
 *   what each button charges for), `amount` and `note` are optional, and
 *   `whenAnswer` optionally ties an option to an intake answer so the right fee
 *   is pulled to the top and marked "Matches your answers":
 *     paymentOptions: [
 *       {
 *         label: 'LLC formation — single member',
 *         amount: '$750',
 *         note: 'Includes the company agreement',
 *         url: 'https://app.practicepanther.com/Payment/OneLinkPayment/...',
 *         whenAnswer: { field: 'formation_need', equals: 'Form a new entity' },
 *       },
 *     ]
 *   `equals` also accepts an array if one fee covers several answers.
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
export const PRACTICE_AREAS = [
  /* ======================================================================= */
  {
    slug: 'trademark',
    name: 'Trademark & Brand Protection',
    short: 'Trademark',
    federal: true,                       // open to clients in any state
    letterKeyField: 'service_requested', // a different agreement per tier
    blurb: 'Clearance search and opinion, federal filing, and full brand protection — three tiers, available nationwide.',
    icon: '®',
    paymentOptions: [
      {
        label: 'Search and Clear',
        amount: '$350',
        note: 'Clearance search and opinion',
        url: 'https://app.practicepanther.com/Payment/OneLinkPayment/6f395e60-ba66-492f-94d9-37c9ee7355b3',
        whenAnswer: { field: 'service_requested', equals: 'Search and Clear' },
      },
      {
        label: 'File and Protect',
        amount: '$1,200',
        note: 'Plus USPTO filing fees, paid directly to the government',
        url: 'https://app.practicepanther.com/Payment/OneLinkPayment/089ccccc-01ec-4a47-ad5e-e39f6c2204ca',
        whenAnswer: { field: 'service_requested', equals: 'File and Protect' },
        installment: { fraction: '1/3', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/8789dd19-9041-42a2-8e60-026eca09f438' },
      },
      {
        label: 'Full Shield',
        amount: '$2,100',
        note: 'Plus USPTO filing fees, paid directly to the government',
        url: 'https://app.practicepanther.com/Payment/OneLinkPayment/c4436a1d-2089-436b-a739-207a0ee8b41f',
        whenAnswer: { field: 'service_requested', equals: 'Full Shield' },
        installment: { fraction: '1/3', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/daa37921-921c-488c-a1b0-10e643f7ab00' },
      },
    ],
    feeSummary:
      'The flat fee for this matter depends on the service you selected: Search and Clear, $350.00; '
      + 'File and Protect, $1,200.00; Full Shield, $2,100.00. The fee is payable in full before work begins. '
      + 'For File and Protect and Full Shield the fee does not include the USPTO filing fee, which is currently '
      + '$350.00 per class of goods or services and is paid directly to the government at the time of filing. '
      + 'No package includes responding to a substantive Office Action, an opposition, or an appeal; those are '
      + 'quoted separately if they become necessary. Any other trademark work is quoted before it begins.',
    questions: [
      {
        id: 'service_requested',
        label: 'What do you need help with?',
        type: 'radio',
        required: true,
        options: [
          'Search and Clear',
          'File and Protect',
          'Full Shield',
          'Responding to an Office Action or refusal',
          'Someone is using my mark — enforcement',
          'I received a cease-and-desist letter',
          'Trademark renewal or maintenance filing',
          'Not sure yet',
        ],
        help: 'Search and Clear is a clearance search and opinion. File and Protect adds the federal '
          + 'application. Full Shield is the complete package. If you are not sure which fits, choose '
          + '"Not sure yet" and the firm will recommend one.',
      },
      { id: 'mark_name', label: 'The mark you want to protect', type: 'text', required: true, placeholder: 'The exact word, phrase, or name', help: 'Type it exactly as you use it, including any spacing or punctuation.' },
      {
        id: 'number_of_classes',
        label: 'How many classes of goods or services do you need?',
        type: 'text',
        required: true,
        showIf: { field: 'service_requested', equals: ['Search and Clear', 'File and Protect', 'Full Shield'] },
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
    paymentOptions: [
      {
        label: 'Copyright registration — single work, single author',
        amount: '', // TODO: confirm this fee — not stated in the links you sent.
        url: 'https://app.practicepanther.com/Payment/OneLinkPayment/fa12a323-c6a4-4acf-a3a1-41ebce0d7a27',
      },
    ],
    feeSummary:
      'The flat fee for this matter is stated in the agreement below and is payable in full before '
      + 'work begins. It does not include the U.S. Copyright Office filing fee, which is a separate '
      + 'government cost paid at the time of filing.',
    questions: [
      { id: 'work_title', label: 'Title of the work you want to register', type: 'text', required: true },
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

  /* ======================================================================= */
  {
    slug: 'contracts',
    name: 'Contract Drafting & Review',
    short: 'Contracts',
    letterKeyField: 'service_tier',
    blurb: 'Review, drafting, or negotiation of the contracts you provide — three tiers, from a single review to full negotiation.',
    icon: '§',
    // The three OneLinks the firm sent were labeled "Contract Command (Tier 1)",
    // "Contract Review and Revise (Tier 2)", "Contract Draft and Deliver (Tier 3)" —
    // none of those names match a tier in the signed agreement, where "Contract
    // Command" is explicitly the $2,000 top tier, not $500. Resolved by trusting
    // the tier NUMBER and DOLLAR AMOUNT (unambiguous, and consistent with the
    // fee schedule given earlier), and using the agreement's own tier names on
    // screen — a client should see the label that appears in what they sign.
    // Flagged for the firm to confirm.
    paymentOptions: [
      {
        label: 'Review & Advise', amount: '$500',
        note: 'Review and written advice on the contract you provide',
        url: 'https://app.practicepanther.com/Payment/OneLinkPayment/f82d312e-6e29-4525-b594-52d5d2f9810b', // "Tier 1"
        whenAnswer: { field: 'service_tier', equals: 'Review & Advise' },
        installment: { fraction: '1/2', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/9693d0c4-2ef4-4442-91c1-f334b799eca0' },
      },
      {
        label: 'Draft & Deliver', amount: '$1,200',
        note: 'Drafting or redrafting, delivered ready to sign',
        url: 'https://app.practicepanther.com/Payment/OneLinkPayment/a912a954-df99-493b-bf05-d643fefa40a2', // "Tier 2"
        whenAnswer: { field: 'service_tier', equals: 'Draft & Deliver' },
        installment: { fraction: '1/3', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/99b961ea-bdb7-4278-bf50-c5adb0ff929e' },
      },
      {
        label: 'Contract Command', amount: '$2,000',
        note: 'Drafting plus negotiation with the other side',
        url: 'https://app.practicepanther.com/Payment/OneLinkPayment/884cfe72-6922-49dd-8b2d-960d947f51c5', // "Tier 3"
        whenAnswer: { field: 'service_tier', equals: 'Contract Command' },
        installment: { fraction: '1/3', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/f33b0893-8d41-48ed-b43d-89a7a195cc85' },
      },
    ],
    feeSummary:
      'The flat fee for this matter is set by the tier you elect in the agreement: Review & Advise, $500.00; '
      + 'Draft & Deliver, $1,200.00; Contract Command, $2,000.00. The fee is payable in full before work begins and covers one drafting or review '
      + 'pass and one round of revisions after your comments. Additional rounds of negotiation, or a redraft '
      + 'after the other side proposes material changes, are quoted before that work begins.',
    questions: [
      {
        id: 'service_tier',
        label: 'Which service tier do you need?',
        type: 'radio',
        required: true,
        options: ['Review & Advise', 'Draft & Deliver', 'Contract Command', 'Not sure yet'],
        help: 'Review & Advise ($500) is a review and written risk summary, no redline. Draft & Deliver '
          + '($1,200) is custom drafting of one agreement with one round of revisions. Contract Command '
          + '($2,000) covers up to 3 agreements with a full redline and negotiation with the other side. If '
          + 'you are not sure, choose "Not sure yet" and the firm will recommend one before any fee is due.',
      },
      {
        id: 'contract_need',
        label: 'What do you need?',
        type: 'radio',
        required: true,
        options: [
          'Review a contract someone sent me',
          'Draft a new contract from scratch',
          'Revise a contract I already use',
          'Negotiate terms with the other side',
          'Explain what a contract I already signed means',
        ],
      },
      {
        id: 'contract_type',
        label: 'What kind of agreement is it?',
        type: 'select',
        required: true,
        options: [
          'Services / independent contractor agreement',
          'Construction or subcontractor agreement',
          'Master services agreement (MSA) or SOW',
          'Non-disclosure agreement (NDA)',
          'Employment or offer letter',
          'Commercial lease',
          'Purchase or sale of goods',
          'Purchase or sale of a business',
          'Licensing agreement',
          'Operating agreement / partnership agreement',
          'Website terms, privacy policy, or client terms',
          'Settlement or release',
          'Other',
        ],
      },
      { id: 'contract_type_other', label: 'Describe the agreement', type: 'text', required: true, showIf: { field: 'contract_type', equals: 'Other' } },
      { id: 'counterparty', label: 'Who is on the other side of the agreement?', type: 'text', required: true, help: 'The company or person\'s name.' },
      { id: 'deal_value', label: 'Approximate dollar value of the deal', type: 'text', required: true, placeholder: '$25,000 — an estimate is fine' },
      { id: 'deal_summary', label: 'In plain English, what is the deal?', type: 'textarea', required: true, help: 'Who is doing what, for how much, over what period of time.' },
      { id: 'concerns', label: 'What worries you most about it?', type: 'textarea', help: 'Payment terms, liability, termination, non-competes, indemnity — tell us what is keeping you up at night.' },
      {
        id: 'already_signed',
        label: 'Has anyone signed it yet?',
        type: 'radio',
        required: true,
        options: ['No — nothing is signed', 'The other side signed, I have not', 'I already signed it'],
      },
    ],
    letter: [
      {
        heading: '1. Scope of Representation',
        body: [
          'You have asked the firm to represent you in connection with a {{answers.contract_type}} involving {{answers.counterparty}}, specifically to: {{answers.contract_need}}.',
          'The representation includes reviewing the relevant documents and facts you provide, advising you on the legal effect of the terms and on the risks the agreement allocates to you, and drafting or revising the agreement to reflect the business deal you have described. Where you have asked the firm to negotiate, it includes communicating with the other side or their counsel on the specific points you and the firm identify.',
          'The firm represents you alone. It does not represent the other party to the agreement, and the other party should be advised to obtain their own counsel.',
        ],
      },
      {
        heading: '2. Business Terms Are Yours',
        body: [
          'The firm advises on legal risk. It does not decide whether a deal is a good business decision — price, scope, timing, and whether to walk away are your calls, and the firm will follow your instructions on them so long as doing so is lawful and ethical.',
          'A contract cannot make a party perform. Even well-drafted terms leave you having to enforce them if the other side breaches, and enforcement is separate work not covered by this agreement.',
          'If you have already signed the agreement, the firm\'s advice is limited to explaining your existing obligations and options; the firm cannot undo terms you are already bound by.',
        ],
      },
    ],
  },

  /* ======================================================================= */
  {
    slug: 'business-formation',
    name: 'Business Formation & Governance',
    short: 'Business Formation',
    letterKeyField: 'service_tier',
    blurb: 'Entity formation in Texas or Georgia, from filing and EIN support up to full governance documents.',
    icon: '◆',
    paymentOptions: [
      {
        label: 'Launch Ready',
        amount: '$750',
        note: 'State filing, formation certificate, registered agent guidance, EIN support, onboarding call',
        url: 'https://app.practicepanther.com/Payment/OneLinkPayment/f99a1117-589f-4c40-a9dc-c31404287089',
        whenAnswer: { field: 'service_tier', equals: 'Launch Ready' },
        installment: { fraction: '1/2', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/06073d70-5cce-446f-aa47-dac2e74d850d' },
      },
      {
        label: 'Formation Plus',
        amount: '$1,500',
        note: 'Everything in Launch Ready, plus an operating agreement, S-Corp election, and initial resolutions',
        url: 'https://app.practicepanther.com/Payment/OneLinkPayment/c6b8cb41-c69d-4eab-a703-70761cae25cd',
        whenAnswer: { field: 'service_tier', equals: 'Formation Plus' },
        installment: { fraction: '1/3', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/da1842b5-4340-417f-bb47-fcba007b256c' },
      },
      {
        label: 'Business Built',
        amount: '$2,750',
        note: 'Everything in Formation Plus, plus a custom operating agreement, founders/buy-sell provisions, and a contractor or employment agreement',
        url: 'https://app.practicepanther.com/Payment/OneLinkPayment/6a2d1dc2-553e-463d-a8ff-610ae405ae0f',
        whenAnswer: { field: 'service_tier', equals: 'Business Built' },
        installment: { fraction: '1/5', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/d94b6d60-863b-4c1a-a0d6-91d5e54202d6' },
      },
    ],
    feeSummary:
      'The flat fee for this matter is set by the tier you elect in the agreement: Launch Ready, $750.00; '
      + 'Formation Plus, $1,500.00; Business Built, $2,750.00. The fee is payable in full before work begins and covers the attorney services '
      + 'described above. It does not include the Secretary of State filing fee, registered agent fees, '
      + 'franchise tax, publication costs, or federal or state tax filings, all of which are your responsibility.',
    questions: [
      {
        id: 'service_tier',
        label: 'Which service tier do you need?',
        type: 'radio',
        required: true,
        options: ['Launch Ready', 'Formation Plus', 'Business Built', 'Not sure yet'],
        help: 'Launch Ready ($750) covers state filing and EIN support. Formation Plus ($1,500) adds an '
          + 'operating agreement and S-Corp election. Business Built ($2,750) adds custom governance and a '
          + 'contractor or employment agreement. If you are not sure, choose "Not sure yet" and the firm will '
          + 'recommend one before any fee is due.',
      },
      {
        id: 'formation_need',
        label: 'What do you need?',
        type: 'radio',
        required: true,
        options: [
          'Form a new entity',
          'Draft an operating or partnership agreement',
          'Add, remove, or buy out an owner',
          'Convert or restructure an existing entity',
          'Clean up an entity that was never properly documented',
          'Dissolve an entity',
        ],
      },
      { id: 'business_name', label: 'Desired business name', type: 'text', required: true, help: 'A second and third choice help if the first is unavailable.' },
      {
        id: 'entity_type',
        label: 'What entity type are you considering?',
        type: 'select',
        required: true,
        options: ['LLC', 'Series LLC', 'S-Corporation', 'C-Corporation', 'Professional entity (PLLC / PC)', 'Nonprofit', 'Not sure — I want a recommendation'],
      },
      { id: 'formation_state', label: 'State of formation', type: 'text', required: true, placeholder: 'Texas' },
      { id: 'business_activity', label: 'What will the business actually do?', type: 'textarea', required: true },
      { id: 'owners', label: 'List every owner and their percentage', type: 'textarea', required: true, help: 'Name and ownership percentage for each. Include yourself. Percentages should total 100%.' },
      {
        id: 'funding',
        label: 'How is the business being funded?',
        type: 'select',
        required: true,
        options: ['Owner cash only', 'Owner cash and a loan', 'Outside investors', 'Sweat equity / services contributed', 'Not decided yet'],
      },
      {
        id: 'has_employees',
        label: 'Will there be employees or contractors?',
        type: 'radio',
        required: true,
        options: ['No, just the owners', 'Independent contractors only', 'W-2 employees', 'Both'],
      },
      { id: 'existing_entity', label: 'If an entity already exists, give its exact legal name and file number', type: 'text' },
    ],
    letter: [
      {
        heading: '1. Scope of Representation',
        body: [
          'You have asked the firm to represent you in connection with {{answers.business_name}}, a {{answers.entity_type}} to be formed or maintained in {{answers.formation_state}}, specifically to: {{answers.formation_need}}.',
          'The representation includes advising you on entity selection, preparing and filing the formation documents with the Secretary of State, preparing the governing document (operating agreement, company agreement, or bylaws as applicable), preparing organizational consents and initial resolutions, and preparing membership or stock certificates and the ownership ledger.',
          'The representation does not include obtaining an EIN, opening bank accounts, registered agent service, tax elections or filings (including any S-corporation election), payroll setup, licensing or permitting, or securities filings, unless separately agreed in writing. The firm will tell you which of these you need and when they are due.',
        ],
      },
      {
        heading: '2. Who the Firm Represents',
        body: [
          'The firm represents the entity and, where more than one owner is involved, must be clear about the limits of that representation. Where there are multiple owners, the firm represents the entity itself and not any owner individually. The interests of the owners may diverge — over control, compensation, exit terms, or valuation — and the firm cannot advocate for one owner against another.',
          'Where all owners have asked the firm to prepare the governing documents jointly, each owner acknowledges by signing that no confidence shared with the firm can be kept from the others, that the firm cannot advise any owner on whether the terms are favorable to that owner individually, and that each owner has the right to retain independent counsel and is encouraged to do so.',
          'If a genuine conflict develops between the owners, the firm may be required to withdraw from representing all of you.',
        ],
      },
      {
        heading: '3. Maintaining the Liability Shield',
        body: [
          'Forming an entity is the beginning, not the end, of limited liability. Protection depends on how you operate: keeping business and personal money strictly separate, signing contracts in the entity\'s name and in your representative capacity, maintaining adequate capitalization, documenting significant decisions, and making required annual filings and tax payments on time. The firm will explain these obligations; keeping them is your responsibility, and failure to do so can allow a court to disregard the entity.',
        ],
      },
    ],
  },

  /* ======================================================================= */
  {
    slug: 'name-change',
    name: 'Adult Name Change',
    short: 'Name Change',
    blurb: 'An uncontested adult name change, filed in your county of residence in Texas or Georgia.',
    icon: '✎',
    paymentOptions: [
      {
        label: 'Adult name change',
        amount: '$1,000',
        note: 'A simple, uncontested matter with no criminal-history complications',
        url: 'https://app.practicepanther.com/Payment/OneLinkPayment/8169a29d-ebab-4c80-ac73-c26e0dfd8f91',
      },
    ],
    feeSummary:
      'The flat fee for a simple, uncontested matter is $1,000.00, payable in full before work begins. '
      + 'If the firm determines, at intake or at any point during the engagement, that the matter is not '
      + 'simple and uncontested — for example because of a criminal history complication — the firm will '
      + 'tell you before doing any further work and quote the difference separately. The flat fee does not '
      + 'include the court filing fee, the cost of fingerprinting or a criminal history check where the '
      + 'court requires one, publication costs (required by statute for matters filed in Georgia), or the '
      + 'cost of certified copies of the final order, all of which are paid to the court or third parties '
      + 'and are your responsibility.',
    questions: [
      { id: 'current_name', label: 'Your current full legal name', type: 'text', required: true, help: 'Exactly as it appears on your birth certificate or current government ID.' },
      { id: 'desired_name', label: 'The full name you want going forward', type: 'text', required: true },
      { id: 'reason', label: 'Why are you changing your name?', type: 'textarea', required: true, help: 'A short explanation is enough. The court asks for the reason, and it is almost always granted.' },
      { id: 'county', label: 'County you live in', type: 'text', required: true, help: 'The petition is filed where you reside.' },
      { id: 'residency_length', label: 'How long have you lived in that county?', type: 'text', required: true },
      { id: 'birth_details', label: 'Date and place of birth', type: 'text', required: true, placeholder: 'March 4, 1990 — Bexar County, Texas' },
      {
        id: 'criminal_history',
        label: 'Have you ever been arrested, charged, or convicted of any offense?',
        type: 'radio',
        required: true,
        options: ['No', 'Yes', 'I am not sure'],
        help: 'Courts run a criminal history check on every adult name change. Telling the firm up front '
          + 'is far better than the court finding it — most records do not prevent a name change, but a '
          + 'surprise can.',
      },
      { id: 'criminal_detail', label: 'Please describe', type: 'textarea', required: true, showIf: { field: 'criminal_history', equals: 'Yes' } },
      {
        id: 'registered_offender',
        label: 'Are you required to register as a sex offender?',
        type: 'radio',
        required: true,
        options: ['No', 'Yes'],
        help: 'This changes the procedure and the notice the court requires, so the firm has to ask.',
      },
      {
        id: 'name_change_purpose',
        label: 'Is anyone likely to object, or is this connected to a pending case?',
        type: 'textarea',
        help: 'For example a pending divorce, a creditor dispute, or a bankruptcy.',
      },
    ],
    // The firm's own agreement (letters/07_Adult_Name_Change_Engagement_Agreement.docx)
    // is used; no fallback draft is needed now that it is on file.
  },

  /* ======================================================================= */
  {
    slug: 'estate-planning',
    name: 'Estate Planning',
    short: 'Estate Planning',
    letterKeyField: 'planning_need',
    blurb: 'Wills, powers of attorney, healthcare directives, trusts, and Texas deeds — priced per package.',
    icon: '⌂',
    // TODO: paste the matching OneLink URL into each `url` below.
    paymentOptions: [
      { label: 'Simple Will — one person', amount: '$1,250', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/d8286827-18d0-4412-8ba5-b24eaeca65ab',
        whenAnswer: { field: 'planning_need', equals: 'Simple Will — one person' },
        installment: { fraction: '1/3', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/75c3497a-1963-4dee-8ae1-f0fb49a07d9a' } },
      { label: 'Simple Wills — married couple', amount: '$1,995', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/ea03ff08-1f6d-4665-b66d-71c56abdae51',
        whenAnswer: { field: 'planning_need', equals: 'Simple Wills — married couple' },
        installment: { fraction: '1/3', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/c2b44312-2017-49ca-977e-3b637edd505b' } },
      { label: 'Will Package with POA — one person', amount: '$1,750', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/4251556f-ab4c-41a2-af4a-82cd8a7de4d7',
        whenAnswer: { field: 'planning_need', equals: 'Will Package with POA — one person' },
        installment: { fraction: '1/3', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/b737da09-adb1-4cc7-8f09-4e6bf564a274' } },
      { label: 'Will Package with POA — married couple', amount: '$2,995', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/81f101d8-341a-40fb-a64c-7fa3b1125713',
        whenAnswer: { field: 'planning_need', equals: 'Will Package with POA — married couple' },
        installment: { fraction: '1/3', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/795f36c7-3871-4982-b5e5-5343d9208622' } },
      { label: 'Healthcare Directive — one person', amount: '$275', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/a597dddf-3bb1-458c-8011-12d9f6ff46d0',
        whenAnswer: { field: 'planning_need', equals: 'Healthcare Directive — one person' } },
      { label: 'Healthcare Directive — married couple', amount: '$450', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/64ba1bdb-e413-43ea-81b3-ebd8e8524646',
        whenAnswer: { field: 'planning_need', equals: 'Healthcare Directive — married couple' } },
      { label: 'Revocable Living Trust — one person', amount: '$2,500', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/781d4f5f-bd3a-4288-b5fb-51efe5fae8eb',
        whenAnswer: { field: 'planning_need', equals: 'Revocable Living Trust — one person' } },
      { label: 'Revocable Living Trust — married couple', amount: '$3,995', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/15464e3d-7346-4a26-b1fb-05d77140d4ea',
        whenAnswer: { field: 'planning_need', equals: 'Revocable Living Trust — married couple' } },
      { label: 'Lady Bird Deed (Texas only)', amount: '$750', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/d580f4ea-0224-4761-8792-c28906d1678c',
        whenAnswer: { field: 'planning_need', equals: 'Lady Bird Deed (Texas only)' } },
      { label: 'Transfer on Death Deed (Texas only)', amount: '$550', url: 'https://app.practicepanther.com/Payment/OneLinkPayment/aacbf595-4819-4f82-a7fe-ef52b26d05cc',
        whenAnswer: { field: 'planning_need', equals: 'Transfer on Death Deed (Texas only)' } },
      { label: 'Durable Power of Attorney — one person', amount: '$275',
        url: 'https://app.practicepanther.com/Payment/OneLinkPayment/6d8d3ed5-8a83-4afc-b38e-7772cf0e3ae0',
        whenAnswer: { field: 'planning_need', equals: 'Durable Power of Attorney — one person' } },
      { label: 'Durable Power of Attorney — married couple', amount: '$450',
        url: 'https://app.practicepanther.com/Payment/OneLinkPayment/86fd5236-06fe-487e-9300-7b841a3ae408',
        whenAnswer: { field: 'planning_need', equals: 'Durable Power of Attorney — married couple' } },
    ],
    feeSummary:
      'The flat fee for this matter is set by the package you selected: Simple Will, $1,250.00 for one '
      + 'person or $1,995.00 for a married couple; Will Package with POA, $1,750.00 for one person or '
      + '$2,995.00 for a married couple; Revocable Living Trust, $2,500.00 for one person or $3,995.00 for a '
      + 'married couple; Healthcare Directive, $275.00 for one person or $450.00 for a married couple; Lady '
      + 'Bird Deed, $750.00; Transfer on Death Deed, $550.00; Durable Power of Attorney, $275.00 for one person '
      + 'or $450.00 for a married couple. The fee is '
      + 'payable in full before drafting begins and covers the documents in that package, one round of '
      + 'revisions after your review, and the signing ceremony. It does not include funding a trust '
      + '(retitling accounts and property), recording fees charged by the county, beneficiary designation '
      + 'changes with your financial institutions, or any tax return, each of which is quoted separately.',
    questions: [
      {
        id: 'planning_need',
        label: 'What do you need?',
        type: 'radio',
        required: true,
        options: [
          'Simple Will — one person',
          'Simple Wills — married couple',
          'Will Package with POA — one person',
          'Will Package with POA — married couple',
          'Healthcare Directive — one person',
          'Healthcare Directive — married couple',
          'Revocable Living Trust — one person',
          'Revocable Living Trust — married couple',
          'Lady Bird Deed (Texas only)',
          'Transfer on Death Deed (Texas only)',
          'Durable Power of Attorney — one person',
          'Durable Power of Attorney — married couple',
          'Not sure — I would like a recommendation',
        ],
        help: 'Choose the package you discussed with the firm. If you have not spoken to anyone yet, '
          + 'choose "Not sure" and the firm will recommend the right one before any fee is due.',
      },
      {
        id: 'marital_status',
        label: 'Marital status',
        type: 'select',
        required: true,
        options: ['Single', 'Married', 'Married, planning separately from my spouse', 'Divorced', 'Widowed', 'Partnered, not married'],
      },
      { id: 'spouse_name', label: 'Spouse or partner\'s full legal name', type: 'text', showIf: { field: 'marital_status', equals: 'Married' } },
      {
        id: 'has_minor_children',
        label: 'Do you have children under 18, or a dependent with special needs?',
        type: 'radio',
        required: true,
        options: ['No', 'Yes — minor children', 'Yes — a dependent with special needs', 'Yes — both'],
      },
      { id: 'children', label: 'List your children and their ages', type: 'textarea', help: 'Include adult children and any children from a prior relationship.' },
      { id: 'guardian', label: 'Who would raise your minor children?', type: 'text', showIf: { field: 'has_minor_children', equals: 'Yes — minor children' }, help: 'First choice and an alternate, if you have thought about it.' },
      { id: 'executor', label: 'Who should serve as executor or trustee?', type: 'text', required: true, help: 'The person who will settle your affairs. An alternate is helpful.' },
      { id: 'agent_medical', label: 'Who should make medical decisions if you cannot?', type: 'text', required: true },
      {
        id: 'estate_size',
        label: 'Approximate value of everything you own',
        type: 'select',
        required: true,
        options: ['Under $500,000', '$500,000 – $1 million', '$1 million – $5 million', '$5 million – $13 million', 'Over $13 million'],
        help: 'A rough number is fine. It determines whether tax planning is needed.',
      },
      {
        id: 'assets',
        label: 'Which of these do you own?',
        type: 'checkboxes',
        options: ['A home', 'Other real estate', 'A business interest', 'Retirement accounts', 'Life insurance', 'Brokerage or investment accounts', 'Property in another state', 'Property in another country', 'Digital assets or cryptocurrency'],
      },
      { id: 'special_wishes', label: 'Anything unusual you want handled a particular way?', type: 'textarea', help: 'Disinheriting someone, a blended family, a family member with an addiction, a specific gift, burial wishes, or pets.' },
      { id: 'existing_docs', label: 'Do you have existing estate planning documents?', type: 'textarea', help: 'What they are and roughly when they were signed.' },
    ],
    letter: [
      {
        heading: '1. Scope of Representation',
        body: [
          'You have asked the firm to represent you in preparing your estate plan: {{answers.planning_need}}.',
          'Depending on the plan you select, the representation includes preparing a Last Will and Testament, a revocable living trust and pour-over will where appropriate, a durable power of attorney for financial matters, a medical power of attorney, a directive to physicians (living will), a HIPAA authorization, a declaration of guardian, and any designation of guardian for minor children. It includes an initial planning conference, drafting, one round of revisions after your review, and supervising the signing and witnessing.',
          'The representation does not include funding a trust, preparing or recording deeds, changing beneficiary designations with your financial institutions, preparing any tax return, or handling a probate or trust administration. The firm will tell you what funding steps your plan requires; carrying them out is a separate engagement.',
        ],
      },
      {
        heading: '2. If You and Your Spouse Are Planning Together',
        body: [
          'If you and your spouse have asked the firm to prepare your plans jointly, you are both clients on this matter and you each waive confidentiality between you. Nothing either of you tells the firm can be kept from the other, and the firm will share information it believes is relevant to the plan.',
          'Your interests may not be identical, particularly in a blended family or where either of you has separate property or children from a prior relationship. The firm cannot advocate for one of you against the other. If a conflict arises that cannot be resolved, the firm may have to withdraw from representing both of you, and each of you has the right to consult independent counsel at any time.',
        ],
      },
      {
        heading: '3. A Plan Only Works If You Sign It and Keep It Current',
        body: [
          'Documents have no legal effect until they are properly signed, witnessed, and where required notarized. Drafts are not a plan. If you do not complete the signing ceremony, you have no plan.',
          'Beneficiary designations on retirement accounts and life insurance pass outside your will and control regardless of what your will says. Property titled jointly with right of survivorship does the same. Aligning those designations with your plan is essential and is your responsibility unless you engage the firm to assist.',
          'Review your plan after any marriage, divorce, birth, death, significant change in assets, or move to another state. The firm has no continuing obligation to contact you about changes in the law or in your circumstances after the plan is delivered.',
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
