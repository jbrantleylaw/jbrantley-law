const INTAKE_SCRIPTS = {
  'Federal Trademark (USPTO)': {
    practiceArea: 'Federal Trademark (USPTO)',
    intro: `GREETING:
"Good [morning/afternoon], may I speak with [CLIENT NAME]? … Hi [CLIENT NAME], my name is [YOUR NAME] and I'm a paralegal with J Brantley Law, calling on behalf of Attorney Jennifer Brantley. Thank you for reaching out to us — do you have about 10 to 15 minutes to go through some intake questions about your trademark matter?"

[If yes, continue. If not a good time, schedule a callback.]

"Wonderful. The purpose of this call is to gather some information about the mark you'd like to protect so that Attorney Brantley can evaluate your matter and advise you on the best path forward. Everything you share with us today is confidential and protected by attorney-client privilege. I'll be taking notes as we go, so please feel free to take your time. There are no wrong answers — just be as specific as you can.

Let's get started."`,
    sections: [
      {
        title: 'About the Mark',
        questions: [
          { q: 'Tell me about the name, logo, or slogan you want to protect. Is it a word or phrase, a stylized logo, or both?', purpose: 'Determines mark format (standard character vs. stylized/design)' },
          { q: 'How do you want to spell it? Any special capitalization, punctuation, or styling?', purpose: 'Exact mark spelling for application' },
          { q: 'Does the mark include any images, icons, or design elements beyond the text?', purpose: 'Design mark requires separate specimen and description' },
        ],
      },
      {
        title: 'Goods & Services',
        questions: [
          { q: 'What product or service do you sell under this name? Be as specific as possible — for example, "online coaching services in the field of business development" rather than just "coaching."', purpose: 'Identifies International Class(es) for filing' },
          { q: 'Who are your customers? Consumers, businesses, or both?', purpose: 'Helps scope the description of goods/services' },
        ],
      },
      {
        title: 'Use in Commerce',
        questions: [
          { q: 'Have you already used this name to sell your product or service to actual customers?', purpose: 'Determines filing basis: Use in Commerce (1a) vs. Intent to Use (1b)' },
          { q: 'If yes — when did you first use it publicly, outside your state? We call this the "date of first use in commerce."', purpose: 'Critical date for use in commerce applications' },
          { q: 'Do you have a website, product label, business card, or screenshot showing the name being used in connection with your product/service? We need this as the specimen for your application.', purpose: 'Specimen requirement for 1(a) filing basis' },
        ],
      },
      {
        title: 'Ownership',
        questions: [
          { q: 'Who will own the trademark — you personally, your LLC, or your corporation?', purpose: 'Owner name on application must match legal entity name exactly' },
          { q: 'What is the legal name of the owner entity and what state is it organized in?', purpose: 'Required for application' },
        ],
      },
      {
        title: 'Prior Knowledge',
        questions: [
          { q: 'Are you aware of any other businesses using the same or a similar name, especially in your industry?', purpose: 'Flags potential conflicts before search' },
          { q: 'Have you already searched online or on the USPTO website for similar marks?', purpose: 'Context for advising on search scope' },
          { q: 'Have you received any cease-and-desist letters or complaints from other businesses about your name?', purpose: 'Flags existing disputes' },
        ],
      },
    ],
    closing: `CLOSING SCRIPT:
"Thank you, [CLIENT NAME] — that gives us everything we need to get started. Let me walk you through what happens next:

First, Attorney Brantley will review the information we've gathered today. She will then conduct a comprehensive search of the USPTO database and common law sources to check for any conflicting marks.

Once the search is complete, she will prepare a written Search Opinion Memo — usually within [5–7 business days] — explaining what was found and her recommendation on whether to move forward with filing.

You'll receive that memo by email. At that point, you'll have the opportunity to speak directly with Attorney Brantley to discuss the findings and decide on next steps. If you choose to move forward, she will prepare and file your application with the USPTO.

Do you have any questions for me before we wrap up? … [Answer any questions.] … Great. You can expect to hear from us within [timeframe]. Our main number is (210) 742-2435 and our email is jbrantley@jenniferbrantleylaw.com. Don't hesitate to reach out if anything else comes up in the meantime. Have a great day!"`,
  },

  'Personal Injury - TX': {
    practiceArea: 'Personal Injury - TX',
    intro: `GREETING:
"Good [morning/afternoon], may I speak with [CLIENT NAME]? … Hi [CLIENT NAME], my name is [YOUR NAME] and I'm a paralegal with J Brantley Law, reaching out on behalf of Attorney Jennifer Brantley. Thank you for contacting our office — I'm so sorry to hear you've been through an accident. Do you have about 15 to 20 minutes so I can go through some intake questions with you?"

[If yes, continue. If not a good time, schedule a callback and note any immediate deadlines.]

"I appreciate your time. The purpose of this call is to gather the details of what happened so that Attorney Brantley can evaluate your case. Everything you tell me is protected by attorney-client privilege — it's completely confidential. I want you to know there are no wrong answers. Just tell me what happened as best you can, and I'll guide us through the questions.

Are you ready to get started?"`,
    sections: [
      {
        title: 'The Accident',
        questions: [
          { q: 'Tell me what happened. Start from the beginning — where were you, what were you doing, and how did the accident occur?', purpose: 'Full narrative for case intake' },
          { q: 'When did this happen? I need the exact date.', purpose: 'Critical for SOL calculation — 2 years from date of injury in TX' },
          { q: 'Where exactly did it happen? City, street, intersection, or property name?', purpose: 'Jurisdiction confirmation and police report location' },
          { q: 'Was a police or incident report filed? Do you have a report number?', purpose: 'Evidence gathering' },
        ],
      },
      {
        title: 'The Other Party',
        questions: [
          { q: 'Who was at fault? What is the name of the other driver or party, if you know it?', purpose: 'Defendant identification' },
          { q: 'Do you have their insurance information? Carrier name and policy number?', purpose: 'Initiating claim with insurer' },
          { q: 'Were there any witnesses? Do you have their contact information?', purpose: 'Witness list for investigation' },
        ],
      },
      {
        title: 'Your Injuries',
        questions: [
          { q: 'What injuries did you suffer? Be specific — every part of your body that was hurt.', purpose: 'Injury documentation for damages' },
          { q: 'Did you go to the hospital or ER on the day of the accident?', purpose: 'Immediate medical treatment documentation' },
          { q: 'Are you currently receiving medical treatment? Who are your treating doctors?', purpose: 'Current provider list for records request' },
          { q: 'Have you had any surgeries, imaging (MRIs, X-rays), or physical therapy?', purpose: 'Medical records scope' },
          { q: 'How are you feeling now compared to before the accident?', purpose: 'Ongoing damages assessment' },
        ],
      },
      {
        title: 'Financial Impact',
        questions: [
          { q: 'Have you missed work because of your injuries? How much time?', purpose: 'Lost wages calculation' },
          { q: 'What do you do for work and what is your approximate income?', purpose: 'Lost wages documentation' },
          { q: 'Do you have health insurance that has paid for any of your treatment?', purpose: 'Lien identification' },
          { q: 'Have you received any payment from any insurance company so far?', purpose: 'Prior settlements or payments' },
        ],
      },
      {
        title: 'Your Insurance',
        questions: [
          { q: 'Do you have your own auto insurance? Who is your carrier?', purpose: 'Uninsured/underinsured motorist coverage check' },
          { q: 'Do you have PIP (Personal Injury Protection) or MedPay coverage on your policy?', purpose: 'Available first-party benefits' },
        ],
      },
      {
        title: 'Prior History',
        questions: [
          { q: 'Have you had any prior accidents or injuries to the same body parts?', purpose: 'Pre-existing conditions disclosure' },
          { q: 'Have you filed any prior personal injury lawsuits?', purpose: 'Prior litigation history' },
        ],
      },
    ],
    closing: `CLOSING SCRIPT:
"Thank you for sharing all of that with me, [CLIENT NAME] — I know that wasn't easy. I want to make sure you know: your job right now is to focus on your health and your recovery. Attorney Brantley's job is to handle everything else.

Here is what happens next:

Attorney Brantley will review everything from our conversation today. If she determines we can move forward with your case, our office will send you an Engagement Letter and a HIPAA medical authorization form for your signature. Once those are signed, we will send Representation Letters directly to the insurance companies involved — which means they will contact us, not you.

We will also begin gathering your medical records and the accident report. You should continue treating with your doctors and following their instructions. Please keep track of all medical appointments, bills, and any time you miss from work.

[⚠️ NOTE FOR STAFF: Texas SOL is 2 years from the accident date. Calendar the deadline immediately.]

Do you have any questions for me right now? … [Answer any questions.] … We will be in touch shortly. If anything changes — new medical treatment, contact from the insurance company, anything — please call us right away at (210) 742-2435. Take care of yourself."`,
    solNote: 'IMPORTANT: Texas statute of limitations for personal injury is 2 years from the date of the accident (Tex. Civ. Prac. & Rem. Code § 16.003). Calendar the SOL deadline immediately.',
  },

  'Personal Injury - GA': {
    practiceArea: 'Personal Injury - GA',
    intro: `GREETING:
"Good [morning/afternoon], may I speak with [CLIENT NAME]? … Hi [CLIENT NAME], my name is [YOUR NAME] and I'm a paralegal with J Brantley Law, calling on behalf of Attorney Jennifer Brantley. Thank you for reaching out to our office — I'm sorry to hear what you've been dealing with. Do you have about 15 to 20 minutes so I can ask you some questions about your accident?"

[If yes, continue. If not a good time, schedule a callback and note any immediate deadlines.]

"Thank you. I want to gather the details of what happened so that Attorney Brantley can properly evaluate your case. Everything we discuss is completely confidential and protected by attorney-client privilege. Just walk me through things in your own words — there are no wrong answers.

Let's get started."`,
    sections: [
      {
        title: 'The Accident',
        questions: [
          { q: 'Tell me what happened in your own words. Where were you, what were you doing, and how did the accident occur?', purpose: 'Full narrative for case intake' },
          { q: 'What is the exact date of the accident?', purpose: 'Critical for SOL — 2 years from date of injury in GA (O.C.G.A. § 9-3-33)' },
          { q: 'Where did it happen? City, county, street or intersection?', purpose: 'Georgia jurisdiction confirmation' },
          { q: 'Was a police report filed? Do you have the report number?', purpose: 'Evidence gathering' },
        ],
      },
      {
        title: 'The Other Party',
        questions: [
          { q: 'Who was at fault? What is the other party\'s name and insurance information?', purpose: 'Defendant and insurer identification' },
          { q: 'Were there any witnesses? Names and contact information?', purpose: 'Witness list' },
        ],
      },
      {
        title: 'Your Injuries',
        questions: [
          { q: 'What injuries did you suffer? List every part of your body that was affected.', purpose: 'Injury documentation' },
          { q: 'Did you go to the ER or see a doctor on the day of the accident?', purpose: 'Immediate treatment documentation' },
          { q: 'Who are your current treating physicians?', purpose: 'Records request list' },
          { q: 'Have you had any surgeries, imaging, or physical therapy?', purpose: 'Medical treatment scope' },
        ],
      },
      {
        title: 'Financial Impact',
        questions: [
          { q: 'Have you missed work? For how long and how much per week do you earn?', purpose: 'Lost wages calculation' },
          { q: 'Does any health insurance or other coverage apply to your treatment?', purpose: 'Lien identification' },
        ],
      },
      {
        title: 'Your Insurance',
        questions: [
          { q: 'What auto insurance do you carry? Do you have UM/UIM coverage?', purpose: 'First-party coverage check' },
          { q: 'Have you received any payments from any insurer so far?', purpose: 'Prior payments' },
        ],
      },
      {
        title: 'Prior History',
        questions: [
          { q: 'Any prior accidents or injuries to the same body areas?', purpose: 'Pre-existing conditions' },
          { q: 'Have you filed a personal injury claim or lawsuit before?', purpose: 'Prior litigation' },
        ],
      },
    ],
    closing: `CLOSING SCRIPT:
"Thank you for taking the time to walk me through everything, [CLIENT NAME]. I know this has been a lot, and I appreciate your patience.

Here is what happens next:

Attorney Brantley will review the details from our conversation. If she determines she can represent you, our office will send you an Engagement Letter and a HIPAA medical authorization form to sign. As soon as those are signed, we will send Representation Letters to the insurance companies — so from that point on, they deal with us, not you directly.

In the meantime, please continue following your doctor's treatment plan and keep records of all your medical visits, bills, and any missed work. Do not give any recorded statements to any insurance company before speaking with Attorney Brantley.

[⚠️ NOTE FOR STAFF: Georgia SOL is 2 years from the accident date — O.C.G.A. § 9-3-33. Calendar the deadline immediately.]

Do you have any questions for me right now? … [Answer any questions.] … You will hear from us soon. If the insurance company contacts you in the meantime, please do not speak with them — just call us at (210) 742-2435. Take care."`,
    solNote: 'IMPORTANT: Georgia statute of limitations for personal injury is 2 years from the date of the accident (O.C.G.A. § 9-3-33). Calendar the SOL deadline immediately.',
  },

  'Business Formation': {
    practiceArea: 'Business Formation',
    intro: `GREETING:
"Good [morning/afternoon], may I speak with [CLIENT NAME]? … Hi [CLIENT NAME], my name is [YOUR NAME] and I'm a paralegal with J Brantley Law, calling on behalf of Attorney Jennifer Brantley. Congratulations on taking this step — it's an exciting one. Do you have about 15 minutes so I can ask you a few questions about your business formation matter?"

[If yes, continue. If not a good time, schedule a callback.]

"Wonderful. The purpose of this call is to gather information about the business you're looking to form so that Attorney Brantley can advise you on the right entity type and prepare your formation documents. Everything we discuss is confidential. I'll be taking notes throughout, so please don't hesitate to say 'I don't know' on anything — Attorney Brantley can walk you through those details when she speaks with you.

Let's get started."`,
    sections: [
      {
        title: 'Business Overview',
        questions: [
          { q: 'Tell me about your business. What do you do or plan to do?', purpose: 'Business purpose for formation documents' },
          { q: 'What state do you primarily operate in — Texas or Georgia?', purpose: 'Determines filing jurisdiction' },
          { q: 'Are you the only owner, or will there be other members or shareholders?', purpose: 'Single vs. multi-member entity' },
        ],
      },
      {
        title: 'Entity Type',
        questions: [
          { q: 'Have you thought about what type of entity you want — LLC, PLLC (for licensed professionals), S-Corp, or C-Corp? If not, I can advise you.', purpose: 'Entity type selection' },
          { q: 'Are you a licensed professional (attorney, doctor, CPA, engineer)? If so, you may need a PLLC.', purpose: 'PLLC requirement check' },
        ],
      },
      {
        title: 'Business Name',
        questions: [
          { q: 'What name do you want to use for your business?', purpose: 'Name for state filing' },
          { q: 'Do you have any backup names in case your first choice is taken?', purpose: 'Name availability planning' },
          { q: 'Will you be doing business under a DBA (assumed name) different from your LLC name?', purpose: 'DBA filing need' },
        ],
      },
      {
        title: 'Ownership & Management',
        questions: [
          { q: 'If there are co-owners: what are their names and what percentage of the business does each person own?', purpose: 'Ownership structure for operating agreement' },
          { q: 'Will the LLC be member-managed (owners run it day-to-day) or manager-managed (you appoint a manager)?', purpose: 'Management structure for operating agreement' },
          { q: 'What is the initial capital contribution — how much money or assets is each owner putting in?', purpose: 'Capital contributions clause' },
        ],
      },
      {
        title: 'Registered Agent & Address',
        questions: [
          { q: 'Do you have a physical business address in the state of formation?', purpose: 'Registered office address' },
          { q: 'Do you want to serve as your own registered agent, or would you like a third-party registered agent service?', purpose: 'Registered agent for state filing' },
        ],
      },
      {
        title: 'Tax & Banking',
        questions: [
          { q: 'Have you already applied for an EIN (employer identification number) from the IRS?', purpose: 'EIN status' },
          { q: 'Have you spoken with a CPA about your tax situation? I recommend an S-Corp election for some clients — would you like to discuss that?', purpose: 'Tax planning referral opportunity' },
        ],
      },
    ],
    closing: `CLOSING SCRIPT:
"Thank you, [CLIENT NAME] — that's everything we need to get the process started.

Here is what happens next:

Attorney Brantley will review the information from our call. Our office will send you an Engagement Letter outlining the scope of work and our fee. Once that is signed and the retainer is received, we will check business name availability with the Secretary of State and begin preparing your formation documents — which typically includes your Articles of Organization or Incorporation and your Operating Agreement or Bylaws.

Once the documents are ready, we will send them to you for review before filing. After the state approves your filing, you will receive a complete Business Formation Package including your filed documents, EIN application guidance, and any next steps we recommend — such as setting up a business bank account or making an S-Corp tax election.

The typical turnaround time from signed engagement to filed documents is approximately [2 weeks], depending on state processing times.

Do you have any questions for me right now? … [Answer any questions.] … Great. Watch for our Engagement Letter by email. You can reach us at (210) 742-2435 or jbrantley@jenniferbrantleylaw.com. Looking forward to working with you!"`,
  },

  'Contract Review and Drafting': {
    practiceArea: 'Contract Review and Drafting',
    intro: `GREETING:
"Good [morning/afternoon], may I speak with [CLIENT NAME]? … Hi [CLIENT NAME], my name is [YOUR NAME] and I'm a paralegal with J Brantley Law, calling on behalf of Attorney Jennifer Brantley. Thank you for reaching out to us. Do you have about 10 minutes so I can ask you a few questions about the contract matter you need help with?"

[If yes, continue. If not a good time, schedule a callback. Note any signing deadline upfront.]

"Perfect. Before we dive in — do you have a deadline by which this contract needs to be signed? [Note the date.] … Got it, thank you — that helps us prioritize.

The purpose of this call is to gather some background on the contract so Attorney Brantley can determine the scope of the review and get started right away. Everything we discuss is confidential. I'll be taking notes as we go.

Let's get into it."`,
    sections: [
      {
        title: 'The Contract',
        questions: [
          { q: 'Can you send me the contract? Please send the complete document including all exhibits, addenda, and attachments.', purpose: 'Document receipt' },
          { q: 'What type of contract is this — service agreement, vendor contract, employment, lease, sale of business, or something else?', purpose: 'Contract type classification' },
          { q: 'Who are the parties to this contract?', purpose: 'Party identification for conflict check' },
        ],
      },
      {
        title: 'Context & Concerns',
        questions: [
          { q: 'Give me the big picture — why are you entering into this contract and what do you hope to get out of it?', purpose: 'Business purpose and client priorities' },
          { q: 'Is there anything in the contract that already jumped out at you as concerning?', purpose: 'Client-identified issues' },
          { q: 'What is most important to you in this deal — price, timeline, termination rights, IP ownership, limitation of liability?', purpose: 'Negotiation priorities' },
        ],
      },
      {
        title: 'Timeline',
        questions: [
          { q: 'Do you have a deadline by which the contract needs to be signed?', purpose: 'Turnaround urgency' },
          { q: 'Who is the other party? Are they represented by counsel?', purpose: 'Negotiation dynamics' },
        ],
      },
      {
        title: 'Scope of Engagement',
        questions: [
          { q: 'Do you want me to: (1) review and provide a written memo only, (2) review and provide a redlined version, or (3) negotiate on your behalf with the other party?', purpose: 'Scope of work selection' },
        ],
      },
    ],
    closing: `CLOSING SCRIPT:
"Thank you, [CLIENT NAME] — that gives us a clear picture of what you need.

Here is what happens next:

Our office will send you an Engagement Letter by email outlining the scope and our flat fee for this review. Once that is signed and the fee is received, please send us the complete contract — including all exhibits, addenda, and attachments — to jbrantley@jenniferbrantleylaw.com.

Attorney Brantley will review the contract thoroughly and prepare a written Contract Review Memo identifying the key issues, risks, and her recommendations. [If redline selected: She will also prepare a redlined version with suggested edits.] [If negotiation selected: She will also reach out to the other party's counsel on your behalf.]

Turnaround time is typically [3 to 5 business days] after we receive the signed engagement and the contract. [If there is a tight deadline: Given your signing deadline of [DATE], we will prioritize your matter.]

Do you have any questions for me right now? … [Answer any questions.] … Watch for our Engagement Letter shortly. You can reach us at (210) 742-2435 or jbrantley@jenniferbrantleylaw.com. Thank you, [CLIENT NAME]!"`,
  },

  'Estate Planning': {
    practiceArea: 'Estate Planning',
    intro: `GREETING:
"Good [morning/afternoon], may I speak with [CLIENT NAME]? … Hi [CLIENT NAME], my name is [YOUR NAME] and I'm a paralegal with J Brantley Law, calling on behalf of Attorney Jennifer Brantley. Thank you for reaching out to us about estate planning. Do you have about 20 to 25 minutes so I can go through some intake questions with you today?"

[If yes, continue. If not a good time, schedule a callback.]

"I appreciate your time. I want to start by saying that estate planning is one of the most meaningful things you can do for yourself and the people you love — and Attorney Brantley is here to make the process as smooth and straightforward as possible.

The purpose of this call is to gather some information about your family, your assets, and your wishes so that Attorney Brantley can prepare the right documents for your situation. Everything you share is completely confidential and protected by attorney-client privilege. There are no right or wrong answers — just be as honest and thorough as you can, and I'll guide us through each section.

Ready to get started?"`,
    sections: [
      {
        title: 'Personal Information',
        questions: [
          { q: 'What state do you primarily live in — Texas or Georgia?', purpose: 'Determines which state law documents to draft under' },
          { q: 'Are you married? If so, what is your spouse\'s name?', purpose: 'Marital status affects will structure and POA' },
          { q: 'Do you have children? If so, please list their names and ages.', purpose: 'Beneficiary and guardian designation' },
          { q: 'Do any of your children have special needs or disabilities?', purpose: 'Special needs trust consideration' },
        ],
      },
      {
        title: 'Assets',
        questions: [
          { q: 'Give me a general picture of your assets: do you own real property? Retirement accounts? Bank accounts? Business interests? Life insurance?', purpose: 'Asset inventory for estate planning advice' },
          { q: 'Do you have any assets in another state?', purpose: 'Multi-state estate planning considerations' },
          { q: 'Roughly, what is the total estimated value of your estate?', purpose: 'Advise on estate tax exposure (federal threshold currently $13.6M)' },
        ],
      },
      {
        title: 'Beneficiaries & Distribution',
        questions: [
          { q: 'Who do you want to receive your assets when you pass away? How do you want things divided?', purpose: 'Beneficiary designation' },
          { q: 'If any primary beneficiary predeceases you, who should receive their share?', purpose: 'Contingent beneficiaries' },
          { q: 'Are there any family members or individuals you want to specifically exclude from your estate?', purpose: 'Disinheritance provision' },
        ],
      },
      {
        title: 'Personal Representative / Executor',
        questions: [
          { q: 'Who do you trust to wrap up your affairs — pay bills, deal with your accounts, distribute your assets? This person is called the executor (TX) or personal representative (GA).', purpose: 'Executor/PR designation' },
          { q: 'Do you have a backup person in case your first choice can\'t serve?', purpose: 'Successor executor' },
          { q: 'If you have minor children, who would you want to raise them if something happened to you and your spouse?', purpose: 'Guardian designation' },
        ],
      },
      {
        title: 'Healthcare & End of Life',
        questions: [
          { q: 'If you were in a medical emergency and couldn\'t speak for yourself, who do you trust to make healthcare decisions for you?', purpose: 'Medical POA / Healthcare agent designation' },
          { q: 'What are your wishes regarding life support, artificial nutrition, and other life-sustaining treatment if you are terminally ill or in a persistent vegetative state?', purpose: 'Healthcare directive / advance directive content' },
          { q: 'Do you have any organ donation wishes?', purpose: 'Anatomical gift provision' },
        ],
      },
      {
        title: 'Financial Power of Attorney',
        questions: [
          { q: 'If you became incapacitated, who do you want to handle your finances — pay your bills, manage your accounts, deal with your real estate?', purpose: 'Durable POA agent designation' },
          { q: 'Do you want this person to have authority right away (immediate) or only if you become incapacitated (springing)?', purpose: 'POA timing: immediate vs. springing' },
        ],
      },
    ],
    closing: `CLOSING SCRIPT:
"Thank you so much, [CLIENT NAME] — I know this is a lot of personal information to share, and I truly appreciate your trust in us.

Here is what happens next:

Attorney Brantley will review everything from our conversation and determine which documents are appropriate for your situation. Our office will send you an Engagement Letter outlining the documents to be prepared and our fee. Once that is signed and the retainer is received, Attorney Brantley will begin drafting your estate planning documents.

Depending on your situation, those may include your Will, a Durable Power of Attorney, a Medical Power of Attorney, and a Healthcare Directive or Directive to Physicians. We will send you drafts to review before anything is finalized — you will have the opportunity to ask questions and request changes.

Once the drafts are approved, we will schedule a signing appointment. The documents must be signed before a notary and witnesses to be legally valid, and we will coordinate that process with you.

The entire process typically takes about two to three weeks from the time we receive your signed engagement.

[⚠️ NOTE FOR STAFF: If the client mentioned any urgent health situation or upcoming surgery, flag for Attorney Brantley to expedite.]

Do you have any questions for me right now? … [Answer any questions.] … You will hear from us very soon. Our number is (210) 742-2435 and email is jbrantley@jenniferbrantleylaw.com. Thank you again, [CLIENT NAME] — you're doing something wonderful for your family."`,
  },

  'Government Contracting': {
    practiceArea: 'Government Contracting',
    intro: `GREETING:
"Good [morning/afternoon], may I speak with [CLIENT NAME]? … Hi [CLIENT NAME], my name is [YOUR NAME] and I'm a paralegal with J Brantley Law, calling on behalf of Attorney Jennifer Brantley. Thank you for reaching out to us about government contracting. Do you have about 15 minutes so I can ask you some questions and get a picture of where your business stands?"

[If yes, continue. If not a good time, schedule a callback.]

"Great. J Brantley Law works with small businesses navigating the federal contracting space — everything from SAM.gov registration to set-aside certifications to contract review. The purpose of this call is to find out where your business currently is and what you need help with so Attorney Brantley can recommend the right services and put together an engagement proposal for you.

Everything we discuss is confidential. I'll be taking notes as we go. Let's get started."`,
    sections: [
      {
        title: 'Business Background',
        questions: [
          { q: 'Tell me about your business — what do you do and how long have you been operating?', purpose: 'Business overview' },
          { q: 'What is your business structure — LLC, corporation, sole proprietor?', purpose: 'Entity type for SAM registration' },
          { q: 'What state are you registered in?', purpose: 'State of formation' },
        ],
      },
      {
        title: 'SAM.gov Status',
        questions: [
          { q: 'Are you currently registered in SAM.gov?', purpose: 'Registration status — foundation of all federal contracting' },
          { q: 'If yes: when does your registration expire? (SAM.gov must be renewed annually)', purpose: 'Renewal deadline' },
          { q: 'Do you have a UEI number (Unique Entity Identifier)?', purpose: 'Required for federal contracting' },
          { q: 'Do you have a CAGE code?', purpose: 'Required for DoD and most federal contracts' },
        ],
      },
      {
        title: 'NAICS Codes',
        questions: [
          { q: 'What NAICS codes do you currently have in SAM.gov?', purpose: 'NAICS code audit and optimization' },
          { q: 'What types of government contracts are you pursuing — products, services, or both?', purpose: 'Opportunity targeting' },
          { q: 'Which federal agencies are you most interested in contracting with?', purpose: 'Agency targeting strategy' },
        ],
      },
      {
        title: 'Set-Aside Eligibility',
        questions: [
          { q: 'Do you qualify as any of the following: Veteran-Owned Small Business, Service-Disabled Veteran-Owned (SDVOSB), Woman-Owned Small Business (WOSB), Economically Disadvantaged WOSB, 8(a) Business, or HUBZone?', purpose: 'Set-aside certification eligibility' },
          { q: 'Have you pursued any of those certifications? If not, I can advise which ones make sense.', purpose: 'Certification guidance' },
        ],
      },
      {
        title: 'Current Needs',
        questions: [
          { q: 'What specifically do you need help with right now — SAM.gov registration/renewal, capability statement, certification application, contract review, or teaming agreement?', purpose: 'Scoping the engagement phase' },
          { q: 'Do you have a specific solicitation or contract you need reviewed?', purpose: 'Immediate deliverable' },
        ],
      },
    ],
    closing: `CLOSING SCRIPT:
"Thank you, [CLIENT NAME] — that gives us a clear picture of where your business stands and what you need.

Here is what happens next:

Attorney Brantley will review the information from our call and put together an Engagement Letter for you. Our government contracting work is structured in phases with flat fees, so you will know exactly what you are paying for at each step before committing to anything. You can select the phase or phases most relevant to your immediate needs.

Our office will send that Engagement Letter to your email — typically within one to two business days. Once you review it, you can select the phase or phases you'd like to move forward with, sign the letter, and submit payment. Work begins as soon as the engagement is signed.

Do you have any questions for me right now? … [Answer any questions.] … Wonderful. Watch for our email at [CLIENT EMAIL ADDRESS — confirm it]. You can also reach us at (210) 742-2435 or jbrantley@jenniferbrantleylaw.com. We look forward to helping you grow your government contracting business!"`,
  },

  'Family Law': {
    practiceArea: 'Family Law',
    intro: `GREETING:
"Good [morning/afternoon], may I speak with [CLIENT NAME]? … Hi [CLIENT NAME], my name is [YOUR NAME] and I'm a paralegal with J Brantley Law, calling on behalf of Attorney Jennifer Brantley. Thank you for reaching out to us. I know that making this call takes a lot of courage, and I want you to know you are in the right place. Do you have about 20 minutes so I can ask you some questions about your situation?"

[If yes, continue. If not a good time, schedule a callback. If client mentions safety concerns, prioritize and note immediately.]

[⚠️ STAFF NOTE: If the client sounds distressed or mentions any threat to their safety, ask: "Before we start — are you safe right now?" If they are not safe, provide the National DV Hotline: 1-800-799-7233 and let Attorney Brantley know immediately.]

"Thank you. I want you to know that everything you share with me today is completely confidential and protected by attorney-client privilege. There are no judgments here — just tell me what's going on in your own words, and I will guide us through the questions. Attorney Brantley is here to help you understand your options and protect your rights.

Take your time. Are you ready to get started?"`,
    sections: [
      {
        title: 'Type of Matter',
        questions: [
          { q: 'What type of legal matter are you dealing with — divorce, custody, child support, modification of prior orders, protective order, adoption, or something else?', purpose: 'Matter type classification' },
          { q: 'What state are you in? Family law is state-specific, and I practice in Texas and Georgia.', purpose: 'Jurisdiction confirmation' },
        ],
      },
      {
        title: 'Your Situation (Divorce)',
        questions: [
          { q: 'When were you married and where?', purpose: 'Marriage date for divorce filing' },
          { q: 'How long have you been separated?', purpose: 'Separation period — relevant in some jurisdictions' },
          { q: 'Is this uncontested (you and your spouse agree on everything) or contested (you disagree on some issues)?', purpose: 'Determines complexity and timeline' },
          { q: 'Do you and your spouse have a general sense of how you want to divide things, or is there significant disagreement?', purpose: 'Settlement prospects' },
        ],
      },
      {
        title: 'Children',
        questions: [
          { q: 'Do you have minor children together? If so, please share their names and ages.', purpose: 'Child custody and support issues' },
          { q: 'What is your current living and custody arrangement with the children?', purpose: 'Temporary orders assessment' },
          { q: 'What custody arrangement are you hoping for?', purpose: 'Client goals' },
          { q: 'Are there any concerns about the children\'s safety or welfare?', purpose: 'CPS involvement or protective order need' },
        ],
      },
      {
        title: 'Assets & Finances',
        questions: [
          { q: 'What major assets do you have — home, vehicles, retirement accounts, business interests, bank accounts?', purpose: 'Marital estate inventory' },
          { q: 'Are there significant debts — mortgage, credit cards, business loans?', purpose: 'Debt division' },
          { q: 'Do both spouses work? Approximately what does each earn?', purpose: 'Spousal support / alimony analysis' },
        ],
      },
      {
        title: 'Safety',
        questions: [
          { q: 'Has there been any domestic violence, abuse, or threats in the relationship? I ask because there may be legal protections available to you immediately.', purpose: 'Safety assessment and TRO consideration' },
          { q: 'Do you feel safe right now?', purpose: 'Emergency protective order assessment' },
        ],
      },
      {
        title: 'Other Parties',
        questions: [
          { q: 'Is the other party represented by an attorney?', purpose: 'Adversarial posture' },
          { q: 'Has any paperwork already been filed with the court?', purpose: 'Existing proceedings' },
        ],
      },
    ],
    closing: `CLOSING SCRIPT:
"Thank you for trusting us with something so personal, [CLIENT NAME]. I want you to know that you are not alone in this — Attorney Brantley will be with you every step of the way.

Here is what happens next:

Attorney Brantley will review everything from our conversation today. Our office will send you an Engagement Letter along with a Document Checklist — a list of things we will need you to gather, such as marriage certificate, financial statements, existing court orders, and similar records. Please don't worry about getting everything at once; we will walk you through it.

Once the Engagement Letter is signed and the retainer is received, Attorney Brantley will schedule a consultation with you directly to go over your situation in detail, discuss your options, and outline the strategy for your case.

[⚠️ NOTE FOR STAFF: Check for any immediate deadlines — if a petition has already been filed, note the response deadline. If a protective order is involved, note its expiration date. Flag both for Attorney Brantley immediately.]

Do you have any questions for me right now? … [Answer any questions.] … You will hear from us very soon. Our number is (210) 742-2435 and our email is jbrantley@jenniferbrantleylaw.com. And [CLIENT NAME] — if anything urgent comes up before then, please don't hesitate to call us right away. You've got this."`,
    solNote: 'NOTE: Check for any pending deadlines — response deadlines if petition already filed, temporary orders hearings, or protective order expiration dates.',
  },
};

const INTAKE_FORM_FIELDS = {
  'Federal Trademark (USPTO)': [
    { section: 'Client Information', fields: [
      { name: 'clientName', label: 'Full Legal Name (Owner)', type: 'text', required: true },
      { name: 'entityType', label: 'Owner Type', type: 'select', options: ['Individual', 'LLC', 'Corporation', 'Partnership', 'Other'], required: true },
      { name: 'entityState', label: 'State of Formation/Residence', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
    ]},
    { section: 'The Mark', fields: [
      { name: 'markText', label: 'Mark / Name / Slogan (exact spelling)', type: 'text', required: true },
      { name: 'markType', label: 'Mark Type', type: 'select', options: ['Word Mark (standard character)', 'Design/Logo Mark', 'Combined Word and Design'], required: true },
      { name: 'markDescription', label: 'Description of mark/logo (if design)', type: 'textarea' },
    ]},
    { section: 'Goods & Services', fields: [
      { name: 'goodsServices', label: 'Describe your goods or services in detail', type: 'textarea', required: true },
      { name: 'internationalClass', label: 'International Class (if known)', type: 'text' },
    ]},
    { section: 'Use in Commerce', fields: [
      { name: 'filingBasis', label: 'Filing Basis', type: 'select', options: ['Use in Commerce (1a) — already in use', 'Intent to Use (1b) — not yet in use'], required: true },
      { name: 'firstUseAnywhere', label: 'Date of First Use Anywhere', type: 'date' },
      { name: 'firstUseCommerce', label: 'Date of First Use in Interstate Commerce', type: 'date' },
      { name: 'specimenDescription', label: 'Specimen description (website, label, etc.)', type: 'textarea' },
    ]},
    { section: 'Conflict & History', fields: [
      { name: 'priorSearch', label: 'Have you done any prior searching?', type: 'select', options: ['Yes', 'No'] },
      { name: 'priorSearchNotes', label: 'Prior search notes or known conflicts', type: 'textarea' },
      { name: 'ceaseDesist', label: 'Have you received any C&D letters?', type: 'select', options: ['Yes', 'No'] },
    ]},
    { section: 'Notes', fields: [
      { name: 'additionalNotes', label: 'Additional information', type: 'textarea' },
    ]},
  ],

  'Personal Injury - TX': [
    { section: 'Client Information', fields: [
      { name: 'clientName', label: 'Full Legal Name', type: 'text', required: true },
      { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { name: 'address', label: 'Address', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
    ]},
    { section: 'Accident Details', fields: [
      { name: 'accidentDate', label: 'Date of Accident', type: 'date', required: true, solField: true },
      { name: 'accidentLocation', label: 'Location of Accident (city, street, intersection)', type: 'text', required: true },
      { name: 'accidentDescription', label: 'Describe how the accident occurred', type: 'textarea', required: true },
      { name: 'policeReport', label: 'Was a police report filed?', type: 'select', options: ['Yes', 'No', 'Unknown'] },
      { name: 'policeReportNumber', label: 'Police Report Number', type: 'text' },
    ]},
    { section: 'Other Party', fields: [
      { name: 'defendantName', label: 'Other Party\'s Name', type: 'text' },
      { name: 'defendantInsurer', label: 'Other Party\'s Insurance Carrier', type: 'text' },
      { name: 'defendantPolicyNumber', label: 'Policy Number', type: 'text' },
      { name: 'witnesses', label: 'Witness names and contact info', type: 'textarea' },
    ]},
    { section: 'Injuries & Treatment', fields: [
      { name: 'injuries', label: 'Describe all injuries', type: 'textarea', required: true },
      { name: 'erVisit', label: 'Did you go to ER on day of accident?', type: 'select', options: ['Yes', 'No'] },
      { name: 'treatingProviders', label: 'Current treating providers', type: 'textarea' },
      { name: 'surgeries', label: 'Surgeries or procedures', type: 'textarea' },
    ]},
    { section: 'Financial Impact', fields: [
      { name: 'missedWork', label: 'Days/weeks missed from work', type: 'text' },
      { name: 'weeklyWage', label: 'Approximate weekly wage', type: 'text' },
      { name: 'employer', label: 'Employer name', type: 'text' },
      { name: 'healthInsurance', label: 'Health insurance carrier', type: 'text' },
    ]},
    { section: 'Client\'s Insurance', fields: [
      { name: 'clientInsurer', label: 'Client\'s auto insurer', type: 'text' },
      { name: 'pipMedpay', label: 'PIP or MedPay coverage?', type: 'select', options: ['Yes', 'No', 'Unknown'] },
      { name: 'umUim', label: 'UM/UIM coverage?', type: 'select', options: ['Yes', 'No', 'Unknown'] },
    ]},
    { section: 'Conflict & History', fields: [
      { name: 'priorInjuries', label: 'Prior injuries to same body areas?', type: 'textarea' },
      { name: 'priorLawsuits', label: 'Prior PI lawsuits?', type: 'select', options: ['Yes', 'No'] },
      { name: 'conflictCheckCleared', label: 'Conflict check cleared?', type: 'select', options: ['Yes', 'No', 'Pending'] },
    ]},
    { section: 'SOL', fields: [
      { name: 'solDeadline', label: 'SOL Deadline (2 years from accident date — TX)', type: 'date', readOnly: true, computed: true, solField: true },
    ]},
  ],

  'Personal Injury - GA': [
    { section: 'Client Information', fields: [
      { name: 'clientName', label: 'Full Legal Name', type: 'text', required: true },
      { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { name: 'address', label: 'Address', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
    ]},
    { section: 'Accident Details', fields: [
      { name: 'accidentDate', label: 'Date of Accident', type: 'date', required: true, solField: true },
      { name: 'accidentCounty', label: 'County where accident occurred (GA)', type: 'text', required: true },
      { name: 'accidentLocation', label: 'Location (street/intersection)', type: 'text' },
      { name: 'accidentDescription', label: 'Describe how the accident occurred', type: 'textarea', required: true },
      { name: 'policeReport', label: 'Was a police report filed?', type: 'select', options: ['Yes', 'No', 'Unknown'] },
      { name: 'policeReportNumber', label: 'Police Report Number', type: 'text' },
    ]},
    { section: 'Other Party', fields: [
      { name: 'defendantName', label: 'Other Party\'s Name', type: 'text' },
      { name: 'defendantInsurer', label: 'Other Party\'s Insurance Carrier', type: 'text' },
      { name: 'defendantPolicyNumber', label: 'Policy Number', type: 'text' },
      { name: 'witnesses', label: 'Witness names and contact info', type: 'textarea' },
    ]},
    { section: 'Injuries & Treatment', fields: [
      { name: 'injuries', label: 'Describe all injuries', type: 'textarea', required: true },
      { name: 'erVisit', label: 'Did you go to ER on day of accident?', type: 'select', options: ['Yes', 'No'] },
      { name: 'treatingProviders', label: 'Current treating providers', type: 'textarea' },
    ]},
    { section: 'Financial Impact', fields: [
      { name: 'missedWork', label: 'Days/weeks missed from work', type: 'text' },
      { name: 'weeklyWage', label: 'Approximate weekly wage', type: 'text' },
      { name: 'healthInsurance', label: 'Health insurance carrier', type: 'text' },
    ]},
    { section: 'SOL', fields: [
      { name: 'solDeadline', label: 'SOL Deadline (2 years from accident date — GA O.C.G.A. § 9-3-33)', type: 'date', readOnly: true, computed: true, solField: true },
    ]},
  ],

  'Business Formation': [
    { section: 'Client / Owner Information', fields: [
      { name: 'ownerName', label: 'Primary Owner Full Legal Name', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'address', label: 'Address', type: 'text', required: true },
    ]},
    { section: 'Business Details', fields: [
      { name: 'businessName', label: 'Proposed Business Name', type: 'text', required: true },
      { name: 'alternateNames', label: 'Alternate names (if first is unavailable)', type: 'text' },
      { name: 'businessPurpose', label: 'Business purpose / what you do', type: 'textarea', required: true },
      { name: 'filingState', label: 'State of Formation', type: 'select', options: ['Texas', 'Georgia'], required: true },
    ]},
    { section: 'Entity Type', fields: [
      { name: 'entityType', label: 'Entity Type', type: 'select', options: ['LLC', 'PLLC (licensed professionals)', 'S-Corporation', 'C-Corporation', 'Undecided — advise me'], required: true },
      { name: 'managementType', label: 'LLC Management', type: 'select', options: ['Member-Managed', 'Manager-Managed', 'N/A'] },
    ]},
    { section: 'Ownership', fields: [
      { name: 'coOwners', label: 'Co-owner names and ownership percentages (if any)', type: 'textarea' },
      { name: 'initialCapital', label: 'Initial capital contributions', type: 'textarea' },
    ]},
    { section: 'Registered Agent', fields: [
      { name: 'registeredAgent', label: 'Registered Agent', type: 'select', options: ['Owner will serve as registered agent', 'Use third-party registered agent service'] },
      { name: 'registeredAgentAddress', label: 'Registered agent address', type: 'text' },
    ]},
    { section: 'Additional Notes', fields: [
      { name: 'einStatus', label: 'EIN Status', type: 'select', options: ['Already obtained', 'Need to apply', 'Not sure'] },
      { name: 'additionalNotes', label: 'Additional notes', type: 'textarea' },
    ]},
  ],

  'Contract Review and Drafting': [
    { section: 'Client Information', fields: [
      { name: 'clientName', label: 'Full Name / Business Name', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
    ]},
    { section: 'Contract Details', fields: [
      { name: 'contractType', label: 'Type of Contract', type: 'select', options: ['Service Agreement', 'Vendor/Supplier Contract', 'Employment Agreement', 'NDA/Confidentiality', 'Lease', 'Partnership/Joint Venture', 'Sale of Business', 'Government Contract', 'Other'], required: true },
      { name: 'parties', label: 'All parties to the contract (names)', type: 'textarea', required: true },
      { name: 'governingLaw', label: 'Governing law (what state\'s law applies)', type: 'select', options: ['Texas', 'Georgia', 'Other', 'Not specified'] },
      { name: 'contractValue', label: 'Contract value or deal size (approximate)', type: 'text' },
    ]},
    { section: 'Scope of Work', fields: [
      { name: 'engagementScope', label: 'What do you need?', type: 'select', options: ['Review and written memo only', 'Review and redlined version', 'Full negotiation on my behalf'], required: true },
      { name: 'deadline', label: 'Signing deadline', type: 'date' },
    ]},
    { section: 'Concerns & Priorities', fields: [
      { name: 'concerns', label: 'Specific concerns or provisions you\'ve noticed', type: 'textarea' },
      { name: 'priorities', label: 'Top negotiation priorities', type: 'textarea' },
      { name: 'additionalNotes', label: 'Additional context', type: 'textarea' },
    ]},
  ],

  'Estate Planning': [
    { section: 'Client Information', fields: [
      { name: 'clientName', label: 'Full Legal Name', type: 'text', required: true },
      { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { name: 'state', label: 'State of Residence', type: 'select', options: ['Texas', 'Georgia'], required: true },
      { name: 'address', label: 'Address', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
    ]},
    { section: 'Family', fields: [
      { name: 'maritalStatus', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'], required: true },
      { name: 'spouseName', label: 'Spouse\'s Full Name (if married)', type: 'text' },
      { name: 'children', label: 'Children\'s names and ages', type: 'textarea' },
      { name: 'specialNeedsChildren', label: 'Any children with special needs?', type: 'select', options: ['Yes', 'No'] },
    ]},
    { section: 'Assets', fields: [
      { name: 'realProperty', label: 'Real property (address and approximate value)', type: 'textarea' },
      { name: 'bankAccounts', label: 'Bank/investment accounts (institutions, approximate balances)', type: 'textarea' },
      { name: 'retirementAccounts', label: 'Retirement accounts (401k, IRA, pension)', type: 'textarea' },
      { name: 'lifeInsurance', label: 'Life insurance policies', type: 'textarea' },
      { name: 'businessInterests', label: 'Business interests', type: 'textarea' },
      { name: 'otherAssets', label: 'Other significant assets', type: 'textarea' },
      { name: 'totalEstateValue', label: 'Approximate total estate value', type: 'text' },
    ]},
    { section: 'Beneficiaries', fields: [
      { name: 'primaryBeneficiaries', label: 'Primary beneficiaries and shares', type: 'textarea', required: true },
      { name: 'contingentBeneficiaries', label: 'Contingent (backup) beneficiaries', type: 'textarea' },
      { name: 'exclusions', label: 'Anyone to specifically exclude?', type: 'textarea' },
    ]},
    { section: 'Key Persons', fields: [
      { name: 'executor', label: 'Executor / Personal Representative', type: 'text', required: true },
      { name: 'executorBackup', label: 'Backup Executor', type: 'text' },
      { name: 'guardian', label: 'Guardian for minor children (if applicable)', type: 'text' },
      { name: 'healthcareAgent', label: 'Healthcare Agent / Medical POA', type: 'text', required: true },
      { name: 'financialAgent', label: 'Financial POA Agent', type: 'text', required: true },
      { name: 'financialAgentBackup', label: 'Backup Financial POA Agent', type: 'text' },
    ]},
    { section: 'Healthcare Wishes', fields: [
      { name: 'lifeSupportWishes', label: 'Life support wishes (if terminally ill/vegetative)', type: 'textarea' },
      { name: 'organDonation', label: 'Organ donation?', type: 'select', options: ['Yes — any organs', 'Yes — specific organs only', 'No'] },
      { name: 'funeralWishes', label: 'Funeral/burial wishes', type: 'textarea' },
    ]},
  ],

  'Government Contracting': [
    { section: 'Business Information', fields: [
      { name: 'businessName', label: 'Legal Business Name', type: 'text', required: true },
      { name: 'ownerName', label: 'Owner/Principal Name', type: 'text', required: true },
      { name: 'entityType', label: 'Entity Type', type: 'select', options: ['LLC', 'Corporation', 'Sole Proprietor', 'Partnership'], required: true },
      { name: 'stateOfFormation', label: 'State of Formation', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
    ]},
    { section: 'SAM.gov Status', fields: [
      { name: 'samRegistered', label: 'Currently registered in SAM.gov?', type: 'select', options: ['Yes — active', 'Yes — expired', 'No — never registered'], required: true },
      { name: 'samExpirationDate', label: 'SAM.gov expiration date', type: 'date' },
      { name: 'ueiNumber', label: 'UEI Number', type: 'text' },
      { name: 'cageCode', label: 'CAGE Code', type: 'text' },
    ]},
    { section: 'NAICS & Capabilities', fields: [
      { name: 'naicsCodes', label: 'Current NAICS codes', type: 'textarea' },
      { name: 'targetAgencies', label: 'Target federal agencies', type: 'textarea' },
      { name: 'pastPerformance', label: 'Past government contract performance (if any)', type: 'textarea' },
    ]},
    { section: 'Certifications', fields: [
      { name: 'certifications', label: 'Current certifications (SDVOSB, WOSB, 8(a), HUBZone, etc.)', type: 'textarea' },
      { name: 'certificationGoals', label: 'Certifications you want to pursue', type: 'textarea' },
    ]},
    { section: 'Scope of Engagement', fields: [
      { name: 'engagementScope', label: 'Primary need', type: 'select', options: ['SAM.gov Registration/Renewal', 'Capability Statement', 'Certification Application', 'Contract Review', 'Teaming Agreement', 'Multiple services'], required: true },
      { name: 'immediateNeed', label: 'Specific contract or solicitation to review (if any)', type: 'textarea' },
      { name: 'additionalNotes', label: 'Additional notes', type: 'textarea' },
    ]},
  ],

  'Family Law': [
    { section: 'Client Information', fields: [
      { name: 'clientName', label: 'Full Legal Name', type: 'text', required: true },
      { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { name: 'address', label: 'Current Address', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'state', label: 'State', type: 'select', options: ['Texas', 'Georgia'], required: true },
    ]},
    { section: 'Matter Type', fields: [
      { name: 'matterType', label: 'Type of Matter', type: 'select', options: ['Divorce', 'Legal Separation', 'Child Custody', 'Child Support', 'Modification of Prior Order', 'Protective Order / Restraining Order', 'Paternity', 'Adoption', 'Other'], required: true },
      { name: 'contested', label: 'Contested or Uncontested?', type: 'select', options: ['Uncontested — we agree on most things', 'Contested — we disagree on key issues', 'Not sure yet'] },
    ]},
    { section: 'Marriage / Relationship', fields: [
      { name: 'marriageDate', label: 'Date of Marriage', type: 'date' },
      { name: 'separationDate', label: 'Date of Separation', type: 'date' },
      { name: 'spouseName', label: 'Other Party\'s Full Name', type: 'text' },
      { name: 'spouseRepresented', label: 'Does the other party have an attorney?', type: 'select', options: ['Yes', 'No', 'Unknown'] },
    ]},
    { section: 'Children', fields: [
      { name: 'minorChildren', label: 'Minor children together (names and ages)', type: 'textarea' },
      { name: 'currentCustody', label: 'Current custody arrangement', type: 'textarea' },
      { name: 'desiredCustody', label: 'Desired custody arrangement', type: 'textarea' },
      { name: 'childSafetyIssues', label: 'Any child safety or welfare concerns?', type: 'textarea' },
    ]},
    { section: 'Assets & Debts', fields: [
      { name: 'maritalAssets', label: 'Major marital assets', type: 'textarea' },
      { name: 'maritalDebts', label: 'Major marital debts', type: 'textarea' },
      { name: 'clientIncome', label: 'Client\'s approximate monthly income', type: 'text' },
      { name: 'spouseIncome', label: 'Other party\'s approximate monthly income', type: 'text' },
    ]},
    { section: 'Safety', fields: [
      { name: 'domesticViolence', label: 'History of domestic violence or threats?', type: 'select', options: ['Yes', 'No', 'Prefer not to say here'] },
      { name: 'clientSafe', label: 'Client currently safe?', type: 'select', options: ['Yes', 'No — immediate concern'] },
      { name: 'existingOrders', label: 'Any existing protective orders or court orders?', type: 'textarea' },
    ]},
  ],
};

const getIntakeScript = (practiceArea) => INTAKE_SCRIPTS[practiceArea] || null;
const getFormFields = (practiceArea) => INTAKE_FORM_FIELDS[practiceArea] || null;

module.exports = { getIntakeScript, getFormFields, INTAKE_SCRIPTS, INTAKE_FORM_FIELDS };
