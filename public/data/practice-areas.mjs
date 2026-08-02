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
 *   Several fees — a labelled list. `label` is required (the client has to know
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
 * Any hosted payment page works — PracticePanther OneLink, Stripe, LawPay,
 * Clio, Square, PayPal. While an area has no link at all, the client is shown
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
    // TODO: paste the matching OneLink URL into each `url` below.
    paymentOptions: [
      {
        label: 'Search and Clear',
        amount: '$350',
        note: 'Clearance search and opinion',
        url: '',
        whenAnswer: { field: 'service_requested', equals: 'Search and Clear' },
      },
      {
        label: 'File and Protect',
        amount: '$1,100',
        note: 'Plus USPTO filing fees, paid directly to the government',
        url: '',
        whenAnswer: { field: 'service_requested', equals: 'File and Protect' },
      },
      {
        label: 'Full Shield',
        amount: '$2,100',
        note: 'Plus USPTO filing fees, paid directly to the government',
        url: '',
        whenAnswer: { field: 'service_requested', equals: 'Full Shield' },
      },
    ],
    feeSummary:
      'The flat fee for this matter depends on the service you selected: Search and Clear, $350.00; '
      + 'File and Protect, $1,100.00; Full Shield, $2,100.00. The fee is payable in full before work begins. '
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
      // TODO: paste the Copyright OneLink URL and confirm the fee.
      { label: 'Copyright registration — single work, single author', amount: '', url: '' },
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
    blurb: 'Review, drafting, or negotiation of the contracts you provide — three tiers, from a single review to full negotiation.',
    icon: '§',
    // TODO: create the Contract Review OneLinks and paste them into `url`, and
    // describe what each tier covers in its `note`.
    paymentOptions: [
      { label: 'Review & Advise', amount: '$500', note: 'Review and written advice on the contract you provide', url: '' },
      { label: 'Draft & Deliver', amount: '$1,200', note: 'Drafting or redrafting, delivered ready to sign', url: '' },
      { label: 'Contract Command', amount: '$2,000', note: 'Drafting plus negotiation with the other side', url: '' },
    ],
    feeSummary:
      'The flat fee for this matter is set by the tier you elect in the agreement: Review & Advise, $500.00; '
      + 'Draft & Deliver, $1,200.00; Contract Command, $2,000.00. The fee is payable in full before work begins and covers one drafting or review '
      + 'pass and one round of revisions after your comments. Additional rounds of negotiation, or a redraft '
      + 'after the other side proposes material changes, are quoted before that work begins.',
    questions: [
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
    blurb: 'Entity formation in Texas or Georgia, from filing and EIN support up to full governance documents.',
    icon: '◆',
    // TODO: paste the matching OneLink URL into each `url` below, and describe
    // what each tier includes in its `note` so the client can choose correctly.
    paymentOptions: [
      { label: 'Launch Ready', amount: '$750', note: 'State filing, formation certificate, registered agent guidance, EIN support, onboarding call', url: '' },
      { label: 'Formation Plus', amount: '$1,500', note: 'Tier 1 plus governance documents', url: '' },
      { label: 'Business Built', amount: '$2,750', note: 'The full formation package', url: '' },
    ],
    feeSummary:
      'The flat fee for this matter is set by the tier you elect in the agreement: Launch Ready, $750.00; '
      + 'Formation Plus, $1,500.00; Business Built, $2,750.00. The fee is payable in full before work begins and covers the attorney services '
      + 'described above. It does not include the Secretary of State filing fee, registered agent fees, '
      + 'franchise tax, publication costs, or federal or state tax filings, all of which are your responsibility.',
    questions: [
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
    slug: 'government-contracting',
    name: 'Government Contracting',
    short: 'Government Contracting',
    blurb: 'Registration, compliance, teaming, bid protests, and claims — from a former federal attorney.',
    icon: '★',
    paymentLink: '',
    feeSummary:
      'This matter is billed at the firm\'s hourly rate of $__________ per hour in one-tenth-hour increments, against an advance fee deposit of $__________ paid before work begins. The deposit is held in the firm\'s trust account and applied to fees and costs as they are earned or incurred. When the balance falls below $__________ you agree to replenish it to the original amount within ten (10) days of the firm\'s request. Any unearned balance is refunded when the matter closes.',
    questions: [
      {
        id: 'gov_need',
        label: 'What do you need help with?',
        type: 'radio',
        required: true,
        options: [
          'SAM.gov registration and representations',
          'Small business or socioeconomic certification (8(a), WOSB, SDVOSB, HUBZone)',
          'Reviewing a solicitation or RFP before bidding',
          'Teaming agreement, joint venture, or subcontract',
          'Bid protest',
          'Contract claim, REA, or dispute',
          'Compliance question (FAR / DFARS / CMMC / labor standards)',
          'Termination or cure notice received',
          'Other',
        ],
      },
      { id: 'gov_need_other', label: 'Describe what you need', type: 'text', required: true, showIf: { field: 'gov_need', equals: 'Other' } },
      { id: 'agency', label: 'Which agency or prime contractor is involved?', type: 'text', required: true },
      { id: 'solicitation_no', label: 'Solicitation or contract number, if you have one', type: 'text' },
      { id: 'contract_value', label: 'Approximate contract or bid value', type: 'text', required: true },
      {
        id: 'protest_deadline',
        label: 'Is there a protest, claim, or response deadline?',
        type: 'radio',
        required: true,
        options: ['Yes — and it is within 10 days', 'Yes — more than 10 days out', 'No', 'I do not know'],
        help: 'Bid protest deadlines can be as short as 5 or 10 days and cannot be extended. If yours is close, call the firm at once rather than waiting on this form.',
      },
      { id: 'business_size', label: 'Business size and any socioeconomic status', type: 'text', required: true, placeholder: 'Small business, WOSB, SDVOSB, 8(a), none…' },
      { id: 'cage_uei', label: 'UEI and CAGE code, if registered', type: 'text' },
      { id: 'gov_background', label: 'Tell us what happened', type: 'textarea', required: true, help: 'The sequence of events and any dates on official notices.' },
    ],
    letter: [
      {
        heading: '1. Scope of Representation',
        body: [
          'You have asked the firm to represent you in connection with a government contracting matter involving {{answers.agency}}, specifically: {{answers.gov_need}}.',
          'The representation includes reviewing the solicitation, contract, and correspondence you provide; advising you on the applicable FAR, DFARS, and agency-specific requirements; and preparing the filings, agreements, or responses the work requires.',
          'The representation does not include preparing your technical or price proposal, acting as your registered agent, performing accounting or DCAA-compliant cost work, or representing you before any tribunal other than as expressly agreed in writing.',
        ],
      },
      {
        heading: '2. Deadlines Are Jurisdictional',
        body: [
          'Government contracting deadlines are unforgiving. A GAO bid protest generally must be filed within ten (10) days of when the basis of protest was known or should have been known, and a protest challenging a solicitation defect must be filed before the proposal due date. Claims under the Contract Disputes Act have their own limits, as do appeals to the Boards of Contract Appeals and the Court of Federal Claims. Missing one of these deadlines almost always ends the matter, regardless of the merits.',
          'The firm can only meet a deadline it knows about and has the documents to address. You agree to give the firm every notice, letter, and email you receive on this matter immediately, and to tell the firm at once of any date-stamped communication from the agency or prime contractor.',
        ],
      },
      {
        heading: '3. Certifications and Accuracy',
        body: [
          'Representations and certifications made to the federal government — in SAM.gov, in a proposal, in a size or socioeconomic self-certification, or in a claim — carry criminal and civil exposure under the False Claims Act and related statutes if they are inaccurate. The firm relies entirely on the accuracy of the information you provide and cannot independently verify it. The firm will not submit, and will not assist in submitting, a certification it has reason to believe is false.',
        ],
      },
    ],
  },

  /* ======================================================================= */
  {
    slug: 'personal-injury',
    name: 'Personal Injury',
    short: 'Personal Injury',
    blurb: 'Injured through someone else\'s negligence? No fee unless the firm recovers for you.',
    icon: '✚',
    paymentLink: '',
    feeSummary:
      'This matter is handled on a contingency fee basis. You owe no attorney fee unless the firm obtains a recovery for you. If there is a recovery, the firm\'s fee is thirty-three and one-third percent (33 1/3%) of the gross recovery if the matter resolves before a lawsuit is filed, and forty percent (40%) of the gross recovery if it resolves after a lawsuit is filed. Case expenses advanced by the firm are reimbursed out of the recovery in addition to the fee. If there is no recovery, you owe no attorney fee and, at the firm\'s discretion, no reimbursement of advanced expenses. A separate contingency fee contract complying with the applicable state rules will be provided for your signature; where its terms differ from this letter, that contract controls.',
    questions: [
      {
        id: 'injury_type',
        label: 'What kind of incident?',
        type: 'radio',
        required: true,
        options: ['Motor vehicle accident', 'Commercial truck accident', 'Slip, trip, or fall', 'Dog bite', 'Injury on someone\'s property', 'Other'],
      },
      { id: 'injury_type_other', label: 'Describe the incident type', type: 'text', required: true, showIf: { field: 'injury_type', equals: 'Other' } },
      { id: 'incident_date', label: 'Date of the incident', type: 'date', required: true, help: 'The statute of limitations runs from this date — usually two years in Texas and Georgia. If yours is close, call the firm rather than waiting.' },
      { id: 'incident_location', label: 'Where did it happen?', type: 'text', required: true, placeholder: 'City and state, and the intersection or address if you know it' },
      { id: 'incident_description', label: 'Tell us what happened', type: 'textarea', required: true, help: 'In your own words. Include what you were doing, what the other party did, and the weather or conditions if they mattered.' },
      {
        id: 'fault',
        label: 'Were you cited or told you were at fault?',
        type: 'radio',
        required: true,
        options: ['No', 'Yes', 'Partially', 'I do not know'],
      },
      {
        id: 'police_report',
        label: 'Was there a police report or incident report?',
        type: 'radio',
        required: true,
        options: ['Yes', 'No', 'I do not know'],
      },
      { id: 'injuries', label: 'What injuries did you suffer?', type: 'textarea', required: true },
      {
        id: 'treatment',
        label: 'Have you received medical treatment?',
        type: 'radio',
        required: true,
        options: ['Yes, and I am still treating', 'Yes, but I have finished treatment', 'I went to the ER only', 'Not yet'],
      },
      { id: 'providers', label: 'Which providers have you seen?', type: 'textarea', help: 'Hospital, urgent care, chiropractor, orthopedist — names are enough.' },
      { id: 'insurance', label: 'Your auto or health insurance carrier', type: 'text' },
      { id: 'other_insurance', label: 'The other party\'s insurance carrier, if you know it', type: 'text' },
      {
        id: 'adjuster_contact',
        label: 'Has an insurance adjuster contacted you?',
        type: 'radio',
        required: true,
        options: ['No', 'Yes, but I have not given a statement', 'Yes, and I gave a recorded statement', 'Yes, and they made an offer'],
      },
      { id: 'lost_wages', label: 'Have you missed work?', type: 'textarea', help: 'How much time, and your approximate rate of pay.' },
    ],
    letter: [
      {
        heading: '1. Scope of Representation',
        body: [
          'You have asked the firm to represent you in connection with injuries you sustained on {{answers.incident_date}} at {{answers.incident_location}} arising out of a {{answers.injury_type}}.',
          'The representation includes investigating the incident, obtaining the police or incident report and your medical records and bills, notifying the responsible parties and their insurers of the firm\'s representation, evaluating your claim, and negotiating with the insurers toward a settlement.',
          'The representation does not include filing a lawsuit or trying the case unless you and the firm agree in writing to proceed, and it does not include any appeal, any workers\' compensation claim, any property damage claim, any criminal matter arising from the incident, or any claim for a person other than you.',
        ],
      },
      {
        heading: '2. Deadlines, Liens, and Your Bills',
        body: [
          'Every personal injury claim has a statute of limitations — generally two (2) years from the date of injury in both Texas and Georgia, with important exceptions that can make it much shorter, including claims against a governmental entity, which may require formal notice within months. If the deadline passes without a lawsuit on file, the claim is gone permanently.',
          'Health insurers, government programs such as Medicare and Medicaid, hospitals, and some providers may assert liens or subrogation rights against your recovery. These must be resolved before funds are disbursed to you, and they reduce what you receive. The firm will identify and work to reduce known liens, but you remain responsible for the underlying obligations.',
          'You remain responsible for your medical bills as they come due. Treatment decisions are yours and your doctors\' — the firm does not direct your medical care and does not tell you where to treat.',
        ],
      },
      {
        heading: '3. Talking to Insurers and About the Case',
        body: [
          'Once this agreement is signed, refer all adjusters, investigators, and defense representatives to the firm and do not give a recorded statement, sign any authorization or release, or accept any settlement offer without speaking to the firm first.',
          'Do not post about the incident, your injuries, your activities, or this case on social media. Insurers routinely search for and use those posts, and an innocent photograph can be used to argue you were not hurt.',
        ],
      },
      {
        heading: '4. Settlement Authority',
        body: [
          'No case will be settled without your approval. The firm will present every offer to you along with its recommendation, and the decision to accept or reject is yours alone. Before you accept, the firm will give you a written statement showing the gross recovery, the attorney fee, each expense, each lien or medical balance to be paid, and the net amount you will receive.',
        ],
      },
    ],
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
      { label: 'Simple Will — one person', amount: '$1,250', url: '',
        whenAnswer: { field: 'planning_need', equals: 'Simple Will — one person' } },
      { label: 'Simple Wills — married couple', amount: '$1,995', url: '',
        whenAnswer: { field: 'planning_need', equals: 'Simple Wills — married couple' } },
      { label: 'Will Package with POA — one person', amount: '$1,750', url: '',
        whenAnswer: { field: 'planning_need', equals: 'Will Package with POA — one person' } },
      { label: 'Will Package with POA — married couple', amount: '$2,995', url: '',
        whenAnswer: { field: 'planning_need', equals: 'Will Package with POA — married couple' } },
      { label: 'Healthcare Directive — one person', amount: '$275', url: '',
        whenAnswer: { field: 'planning_need', equals: 'Healthcare Directive — one person' } },
      { label: 'Healthcare Directive — married couple', amount: '$450', url: '',
        whenAnswer: { field: 'planning_need', equals: 'Healthcare Directive — married couple' } },
      { label: 'Revocable Living Trust — one person', amount: '$2,500', url: '',
        whenAnswer: { field: 'planning_need', equals: 'Revocable Living Trust — one person' } },
      { label: 'Revocable Living Trust — married couple', amount: '$3,995', url: '',
        whenAnswer: { field: 'planning_need', equals: 'Revocable Living Trust — married couple' } },
      { label: 'Lady Bird Deed (Texas only)', amount: '$750', url: '',
        whenAnswer: { field: 'planning_need', equals: 'Lady Bird Deed (Texas only)' } },
      { label: 'Transfer on Death Deed (Texas only)', amount: '$550', url: '',
        whenAnswer: { field: 'planning_need', equals: 'Transfer on Death Deed (Texas only)' } },
      { label: 'Durable Power of Attorney', amount: '$275', url: '',
        whenAnswer: { field: 'planning_need', equals: 'Durable Power of Attorney' } },
    ],
    feeSummary:
      'The flat fee for this matter is set by the package you selected: Simple Will, $1,250.00 for one '
      + 'person or $1,995.00 for a married couple; Will Package with POA, $1,750.00 for one person or '
      + '$2,995.00 for a married couple; Revocable Living Trust, $2,500.00 for one person or $3,995.00 for a '
      + 'married couple; Healthcare Directive, $275.00 for one person or $450.00 for a married couple; Lady '
      + 'Bird Deed, $750.00; Transfer on Death Deed, $550.00; Durable Power of Attorney, $275.00. The fee is '
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
          'Durable Power of Attorney',
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

  /* ======================================================================= */
  {
    slug: 'family-law',
    name: 'Family Law',
    short: 'Family Law',
    blurb: 'Low-conflict, forward-looking representation in select family matters.',
    icon: '♡',
    paymentOptions: [
      // Only offered to clients who chose this matter type — a divorce client
      // must never be shown the name-change fee.
      {
        label: 'Adult name change',
        amount: '',   // TODO: confirm the flat fee
        url: 'https://app.practicepanther.com/Payment/OneLinkPayment/8169a29d-ebab-4c80-ac73-c26e0dfd8f91',
        whenAnswer: { field: 'family_matter', equals: 'Adult name change' },
      },
    ],
    feeSummary:
      'This matter is billed at the firm\'s hourly rate of $__________ per hour in one-tenth-hour increments, against an advance fee deposit of $__________ paid before work begins. The deposit is held in the firm\'s trust account and applied to fees and costs as they are earned or incurred. When the balance falls below $__________ you agree to replenish it to the original amount within ten (10) days of the firm\'s request. Any unearned balance is refunded when the matter closes. The total cost of a family law matter depends heavily on how much the other side contests, which no attorney can predict or control.',
    questions: [
      {
        id: 'family_matter',
        label: 'What kind of matter is this?',
        type: 'radio',
        required: true,
        options: [
          'Uncontested divorce',
          'Contested divorce',
          'Child custody or visitation',
          'Child support (establish or modify)',
          'Modification of an existing order',
          'Enforcement of an existing order',
          'Prenuptial or postnuptial agreement',
          'Adoption',
          'Adult name change',
          'Other',
        ],
      },
      { id: 'family_matter_other', label: 'Describe the matter', type: 'text', required: true, showIf: { field: 'family_matter', equals: 'Other' } },
      { id: 'other_party', label: 'Other party\'s full legal name', type: 'text', required: true },
      {
        id: 'case_filed',
        label: 'Has anything been filed with a court?',
        type: 'radio',
        required: true,
        options: ['No', 'Yes — I filed', 'Yes — the other party filed', 'I do not know'],
      },
      { id: 'cause_number', label: 'Cause number and county, if a case is filed', type: 'text', showIf: { field: 'case_filed', equals: 'Yes — the other party filed' } },
      { id: 'county', label: 'County and state where you live', type: 'text', required: true },
      { id: 'residency_length', label: 'How long have you lived there?', type: 'text', required: true, help: 'Residency requirements affect where a case can be filed.' },
      {
        id: 'children_involved',
        label: 'Are children involved?',
        type: 'radio',
        required: true,
        options: ['No', 'Yes'],
      },
      { id: 'children_detail', label: 'Children\'s first names and ages', type: 'textarea', required: true, showIf: { field: 'children_involved', equals: 'Yes' } },
      { id: 'current_arrangement', label: 'What is the current arrangement?', type: 'textarea', showIf: { field: 'children_involved', equals: 'Yes' }, help: 'Where the children live now and how time is currently divided.' },
      {
        id: 'safety_concern',
        label: 'Are there any safety concerns, protective orders, or CPS involvement?',
        type: 'radio',
        required: true,
        options: ['No', 'Yes'],
        help: 'If you are in immediate danger, call 911. The National Domestic Violence Hotline is 1-800-799-7233.',
      },
      { id: 'safety_detail', label: 'Please describe', type: 'textarea', required: true, showIf: { field: 'safety_concern', equals: 'Yes' } },
      { id: 'property', label: 'Major assets and debts', type: 'textarea', help: 'House, retirement accounts, vehicles, business interests, significant debts.' },
      { id: 'goals', label: 'What outcome are you hoping for?', type: 'textarea', required: true },
    ],
    letter: [
      {
        heading: '1. Scope of Representation',
        body: [
          'You have asked the firm to represent you in a family law matter involving {{answers.other_party}} in {{answers.county}}, specifically: {{answers.family_matter}}.',
          'The representation includes advising you on your rights and obligations, preparing and filing the necessary pleadings, conducting discovery appropriate to the matter, negotiating toward an agreed resolution, and appearing on your behalf at hearings in the trial court in that matter.',
          'The representation does not include any appeal, any enforcement or modification brought after this matter concludes, any bankruptcy, criminal, or protective-order proceeding, the preparation of a qualified domestic relations order (QDRO), or the preparation or recording of deeds, unless separately agreed in writing.',
        ],
      },
      {
        heading: '2. What the Firm Cannot Promise',
        body: [
          'The firm cannot predict or guarantee a custody outcome, a property division, a support amount, or how long the matter will take. Those decisions rest with the court or with the parties\' agreement, and they turn on facts and on judicial discretion.',
          'The cost of a family law matter is driven largely by the other side\'s conduct. A matter that could resolve in weeks can take a year if the other party contests every issue. Any estimate the firm gives you is an estimate, not a cap.',
          'The firm represents you and not your children. Where the court appoints an amicus attorney or guardian ad litem for the children, that attorney is independent of the firm and their fees are an additional cost.',
        ],
      },
      {
        heading: '3. Your Conduct During the Case',
        body: [
          'What you do during the case matters as much as what the firm files. You agree not to discuss the case with or in front of the children, not to disparage the other party to them, and not to post about the case, the other party, or your personal life on social media. Courts see these posts, and they are routinely used as evidence.',
          'Follow every existing court order exactly, even one you believe is unfair, until it is changed. Violating an order damages your position far more than the order does.',
          'Tell the firm the bad facts. The firm can almost always address a difficult fact it knows about in advance; it can rarely repair one it first hears from opposing counsel.',
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

/** Should a field be shown, given the answers collected so far? */
export function isVisible(field, values) {
  if (!field.showIf) return true;
  return values[field.showIf.field] === field.showIf.equals;
}
