const puppeteer = require('puppeteer');

const FIRM = {
  name: 'J Brantley Law',
  attorney: 'Jennifer N. Brantley, Esq.',
  phone: '(210) 742-2435',
  email: 'jbrantley@jenniferbrantleylaw.com',
  website: 'jenniferbrantleylaw.com',
};

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

function firmHeaderHtml() {
  return `
    <div style="text-align:center; border-bottom: 2px solid ${GOLD}; padding-bottom: 12px; margin-bottom: 20px;">
      <div style="font-family: 'Georgia', serif; font-size: 22px; font-weight: bold; color: ${NAVY};">${FIRM.name}</div>
      <div style="font-size: 13px; color: ${NAVY};">${FIRM.attorney}</div>
      <div style="font-size: 11px; color: #666;">${FIRM.phone} &nbsp;|&nbsp; ${FIRM.email} &nbsp;|&nbsp; ${FIRM.website}</div>
    </div>
  `;
}

const baseHtml = (title, body) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Georgia', serif; font-size: 11pt; color: #222; margin: 0; padding: 40px 60px; line-height: 1.6; }
    h1 { font-size: 16pt; color: ${NAVY}; font-weight: bold; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid ${GOLD}; padding-bottom: 4px; }
    h2 { font-size: 13pt; color: ${NAVY}; margin-top: 18px; margin-bottom: 6px; }
    p { margin: 0 0 10px 0; }
    .field { background: #f9f5e7; border-left: 3px solid ${GOLD}; padding: 4px 10px; margin-bottom: 8px; }
    .sig-line { border-top: 1px solid #333; margin-top: 30px; margin-bottom: 4px; width: 60%; }
    .sig-label { font-size: 10pt; color: #555; margin-bottom: 20px; }
    .notice { background: #fff8e1; border: 1px solid ${GOLD}; padding: 10px; margin: 12px 0; font-size: 10pt; }
    .confidential { color: #cc0000; font-size: 10pt; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 4px 8px; }
  </style>
</head>
<body>
  ${firmHeaderHtml()}
  <h1>${title}</h1>
  ${body}
  <div style="margin-top:40px; font-size: 9pt; color: #888; border-top: 1px solid #ddd; padding-top: 8px;">
    Prepared by: ${FIRM.attorney} &bull; ${FIRM.name} &bull; ${FIRM.phone}
  </div>
</body>
</html>`;

const TEMPLATE_HTML = {
  'engagement-letter': (data) => baseHtml('ENGAGEMENT LETTER', `
    <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
    <p>${data.clientName || '_______________'}<br>${data.clientAddress || '_______________'}</p>
    <p>Dear ${data.clientName || 'Client'}:</p>
    <p>Thank you for choosing J Brantley Law to represent you. This letter confirms the terms of our attorney-client relationship regarding the matter described below.</p>
    <h2>Scope of Representation</h2>
    <p>${data.matterDescription || '[Description of legal services]'}</p>
    <h2>Attorney Fees</h2>
    <p>${data.feeStructure || '[Fee structure]'}</p>
    <h2>Client Responsibilities</h2>
    <p>You agree to keep us informed, respond promptly, be truthful, and pay fees as agreed.</p>
    <h2>Confidentiality</h2>
    <p>All communications are protected by attorney-client privilege.</p>
    <p><em style="color:${NAVY};">"I handle the fine print so you can build a life and business you love."</em></p>
    <div class="sig-line"></div><div class="sig-label">Jennifer N. Brantley, Esq. &mdash; J Brantley Law &mdash; Date</div>
    <div class="sig-line"></div><div class="sig-label">Client Signature &mdash; Date</div>
  `),

  'non-engagement-letter': (data) => baseHtml('NOTICE OF NON-REPRESENTATION', `
    <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
    <p>${data.clientName || '_______________'}<br>${data.clientAddress || '_______________'}</p>
    <p>Dear ${data.clientName || 'Prospective Client'}:</p>
    <p>Thank you for contacting J Brantley Law. After careful consideration, I am unable to represent you in this matter at this time.</p>
    <p>${data.reason || 'This decision is based on our current caseload and is not a reflection of the merits of your matter.'}</p>
    <p class="notice"><strong>IMPORTANT:</strong> Legal matters are subject to statutes of limitations. Please consult another attorney immediately regarding any applicable deadlines.</p>
    <p>No attorney-client relationship has been formed as a result of this communication.</p>
    <div class="sig-line"></div><div class="sig-label">Jennifer N. Brantley, Esq. &mdash; J Brantley Law</div>
  `),

  'intake-summary': (data) => {
    const formData = typeof data.form_data === 'string' ? JSON.parse(data.form_data) : (data.form_data || {});
    const rows = Object.entries(formData).map(([k, v]) =>
      `<div class="field"><strong>${k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}:</strong> ${v || '—'}</div>`
    ).join('');
    return baseHtml('CLIENT INTAKE SUMMARY', `
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Practice Area:</strong> ${data.practice_area || '—'}</p>
      <h2>Client</h2>
      <p>${data.first_name || ''} ${data.last_name || ''} &bull; ${data.email || ''}</p>
      <h2>Intake Responses</h2>
      ${rows}
      <h2>Conflict Check</h2>
      <p>Completed: ${data.conflict_check_completed ? 'Yes' : 'No'} &bull; Cleared: ${data.conflict_check_cleared ? 'Yes' : 'Pending'}</p>
    `);
  },

  'pi-demand-letter': (data) => baseHtml('DEMAND FOR SETTLEMENT', `
    <p><em>VIA CERTIFIED MAIL &mdash; RETURN RECEIPT REQUESTED</em></p>
    <p>${data.adjusterName || '_______________'}<br>${data.insurerName || '_______________'}<br>${data.insurerAddress || '_______________'}</p>
    <p><strong>Re: Client:</strong> ${data.clientName || '___'} &bull; <strong>Claim No.:</strong> ${data.claimNumber || '___'} &bull; <strong>Date of Loss:</strong> ${data.accidentDate || '___'}</p>
    <h2>Facts of the Accident</h2>
    <p>${data.accidentFacts || '[Accident description]'}</p>
    <h2>Injuries and Treatment</h2>
    <p>${data.injuries || '[Injuries]'}</p>
    <h2>Damages</h2>
    <table>
      <tr><td>Medical Bills:</td><td align="right">$${data.medicalBills || '________'}</td></tr>
      <tr><td>Lost Wages:</td><td align="right">$${data.lostWages || '________'}</td></tr>
      <tr><td>Pain &amp; Suffering:</td><td align="right">$${data.painSuffering || '________'}</td></tr>
      <tr><td>Property Damage:</td><td align="right">$${data.propertyDamage || '________'}</td></tr>
      <tr style="border-top:2px solid #333;"><td><strong>TOTAL DEMAND:</strong></td><td align="right"><strong>$${data.demandAmount || '________'}</strong></td></tr>
    </table>
    <p style="margin-top:12px;">This demand is open for ${data.demandDeadlineDays || 'thirty (30)'} days from the date of this letter.</p>
    <div class="sig-line"></div><div class="sig-label">Jennifer N. Brantley, Esq. &mdash; J Brantley Law</div>
  `),

  'pi-representation-letter': (data) => baseHtml('NOTICE OF REPRESENTATION', `
    <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
    <p>${data.adjusterName || '_______________'}<br>${data.insurerName || '_______________'}<br>${data.insurerAddress || '_______________'}</p>
    <p><strong>Re: Our Client:</strong> ${data.clientName || '___'} &bull; <strong>Claim No.:</strong> ${data.claimNumber || '___'} &bull; <strong>Date of Loss:</strong> ${data.accidentDate || '___'}</p>
    <p>Please be advised that J Brantley Law has been retained to represent ${data.clientName || 'our client'} in connection with the above-referenced matter.</p>
    <p>Effective immediately, please direct all communications regarding this claim to this office. Do not contact our client directly.</p>
    <p>Please forward all correspondence, reservation of rights letters, and any other communications to: Jennifer N. Brantley, Esq., J Brantley Law, ${FIRM.email}.</p>
    <p>We also request copies of all documentation in your file related to this claim, including the policy declarations page, the full policy, any recorded statements, and all investigative reports.</p>
    <div class="sig-line"></div><div class="sig-label">Jennifer N. Brantley, Esq. &mdash; J Brantley Law</div>
  `),

  'trademark-opinion': (data) => baseHtml('TRADEMARK SEARCH OPINION MEMORANDUM', `
    <p class="confidential">PRIVILEGED AND CONFIDENTIAL &mdash; ATTORNEY-CLIENT COMMUNICATION</p>
    <p><strong>TO:</strong> ${data.clientName || '___'}<br><strong>FROM:</strong> Jennifer N. Brantley, Esq.<br><strong>DATE:</strong> ${new Date().toLocaleDateString()}<br><strong>RE:</strong> Trademark Search &mdash; "${data.markText || '___'}"</p>
    <h2>I. Introduction</h2>
    <p>You have asked this office to conduct a trademark availability search for the mark "${data.markText || '___'}" in connection with ${data.goodsServices || '[goods/services]'}.</p>
    <h2>II. Search Results</h2>
    <p><strong>USPTO TESS:</strong> ${data.tessResults || '[USPTO search results]'}</p>
    <p><strong>Common Law:</strong> ${data.commonLawResults || '[Common law results]'}</p>
    <p><strong>Domain/Social:</strong> ${data.domainResults || '[Domain results]'}</p>
    <h2>III. Analysis</h2><p>${data.analysisText || '[Analysis]'}</p>
    <h2>IV. Opinion &amp; Recommendation</h2><p>${data.recommendation || '[Recommendation]'}</p>
    <h2>V. Caveats</h2><p>${data.caveats || 'This opinion is based solely on the search results obtained and does not constitute a guarantee of registration or non-infringement.'}</p>
    <div class="sig-line"></div><div class="sig-label">Jennifer N. Brantley, Esq.</div>
  `),

  'contract-review-memo': (data) => baseHtml('CONTRACT REVIEW MEMORANDUM', `
    <p class="confidential">PRIVILEGED AND CONFIDENTIAL &mdash; ATTORNEY-CLIENT COMMUNICATION</p>
    <p><strong>TO:</strong> ${data.clientName || '___'}<br><strong>FROM:</strong> Jennifer N. Brantley, Esq.<br><strong>DATE:</strong> ${new Date().toLocaleDateString()}<br><strong>RE:</strong> Review of ${data.contractType || '[Contract]'}</p>
    <h2>I. Overview</h2><p>Parties: ${data.parties || '___'} | Effective: ${data.effectiveDate || '___'} | Value: ${data.contractValue || '___'} | Law: ${data.governingLaw || '___'}</p>
    <h2>II. Issues &amp; Concerns</h2><p>${data.issues || '[Issues]'}</p>
    <h2>III. Missing Provisions</h2><p>${data.missingProvisions || '[Missing provisions]'}</p>
    <h2>IV. Favorable Provisions</h2><p>${data.favorableProvisions || '[Favorable provisions]'}</p>
    <h2>V. Recommendations</h2><p>${data.recommendations || '[Recommendations]'}</p>
    <div class="sig-line"></div><div class="sig-label">Jennifer N. Brantley, Esq.</div>
  `),
};

async function generatePdf(templateKey, data, filePath) {
  const htmlFn = TEMPLATE_HTML[templateKey];
  const html = htmlFn
    ? htmlFn(data)
    : baseHtml(templateKey, `<pre>${JSON.stringify(data, null, 2)}</pre>`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: filePath,
      format: 'Letter',
      margin: { top: '1.25in', bottom: '1.25in', left: '1.25in', right: '1.25in' },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
}

module.exports = { generatePdf };
