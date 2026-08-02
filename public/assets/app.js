/**
 * Intake wizard: contact -> matter questions -> read & sign -> pay.
 */
import { FIRM, getArea, questionsFor, CONTACT_FIELDS, isVisible } from '/data/practice-areas.mjs';
import { buildLetter, formatDate, signerName } from '/data/letter.mjs';
import { SignaturePad } from '/assets/signature-pad.js';

const ENDPOINT = '/.netlify/functions/submit-intake';

/* ---------------------------------------------------------------- area ---- */

function areaSlugFromUrl() {
  const q = new URLSearchParams(location.search).get('area');
  if (q) return q;
  // Supports the pretty URL /intake/trademark
  const m = location.pathname.match(/\/intake\/([\w-]+)\/?$/);
  return m ? m[1] : null;
}

const area = getArea(areaSlugFromUrl());
if (!area) {
  document.getElementById('step-error').classList.remove('hidden');
  document.querySelector('.progress').classList.add('hidden');
} else {
  init(area);
}

/* --------------------------------------------------------------- state ---- */

function init(area) {
  const STORAGE_KEY = `jbl-intake:${area.slug}`;
  const state = {
    step: 0,
    contact: {},
    answers: {},
    startedAt: Date.now(),
    read: false,
    result: null,
  };

  // Restore a half-finished form (same tab only) so a refresh isn't punishing.
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) {
      Object.assign(state.contact, saved.contact || {});
      Object.assign(state.answers, saved.answers || {});
    }
  } catch { /* ignore malformed storage */ }

  const save = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ contact: state.contact, answers: state.answers }));
    } catch { /* private browsing, quota — not worth interrupting the client */ }
  };

  document.getElementById('areaTag').textContent = area.name;
  document.getElementById('matterHeading').textContent = `About your ${area.short.toLowerCase()} matter`;
  document.title = `${area.short} Intake — ${FIRM.name}`;

  /* --------------------------------------------------------- rendering --- */

  const contactForm = document.getElementById('contactFields');
  const matterForm = document.getElementById('matterFields');

  renderFields(contactForm, CONTACT_FIELDS, state.contact, save);
  renderFields(matterForm, questionsFor(area), state.answers, save);

  function renderFields(form, fields, values, onChange) {
    form.innerHTML = fields.map((f) => fieldHtml(f)).join('');
    form.addEventListener('submit', (e) => e.preventDefault());

    for (const f of fields) {
      const wrap = form.querySelector(`[data-field="${f.id}"]`);
      const inputs = wrap.querySelectorAll('input, select, textarea');

      // Seed from restored state.
      if (values[f.id] !== undefined) {
        if (f.type === 'checkboxes') {
          const chosen = values[f.id] || [];
          inputs.forEach((el) => { el.checked = chosen.includes(el.value); });
        } else if (f.type === 'radio') {
          inputs.forEach((el) => { el.checked = el.value === values[f.id]; });
        } else {
          inputs.forEach((el) => { el.value = values[f.id]; });
        }
      }

      const read = () => {
        if (f.type === 'checkboxes') {
          return [...inputs].filter((el) => el.checked).map((el) => el.value);
        }
        if (f.type === 'radio') {
          const on = [...inputs].find((el) => el.checked);
          return on ? on.value : '';
        }
        return inputs[0].value.trim();
      };

      inputs.forEach((el) => {
        el.addEventListener('input', () => { values[f.id] = read(); wrap.classList.remove('invalid'); onChange(); syncVisibility(form, fields, values); });
        el.addEventListener('change', () => { values[f.id] = read(); wrap.classList.remove('invalid'); onChange(); syncVisibility(form, fields, values); markChoices(wrap); });
      });
      markChoices(wrap);
    }
    syncVisibility(form, fields, values);
  }

  function fieldHtml(f) {
    const req = f.required ? '<span class="req" aria-hidden="true">*</span>' : '';
    const help = f.help ? `<p class="help">${f.help}</p>` : '';
    const err = `<div class="field-error">${f.required ? 'This one is required.' : 'Please check this answer.'}</div>`;
    const cls = `field${f.half ? ' half' : ''}`;
    const ph = f.placeholder ? ` placeholder="${escapeAttr(f.placeholder)}"` : '';
    const ac = f.autocomplete ? ` autocomplete="${f.autocomplete}"` : '';

    let control;
    switch (f.type) {
      case 'textarea':
        control = `<textarea id="${f.id}"${ph}></textarea>`;
        break;
      case 'select':
        control = `<select id="${f.id}"><option value="">Choose one…</option>` +
          f.options.map((o) => `<option>${escapeHtml(o)}</option>`).join('') + '</select>';
        break;
      case 'radio':
        control = '<div class="choice-list">' + f.options.map((o, i) => `
          <label class="choice"><input type="radio" name="${f.id}" id="${f.id}-${i}" value="${escapeAttr(o)}" />
          <span>${escapeHtml(o)}</span></label>`).join('') + '</div>';
        break;
      case 'checkboxes':
        control = '<div class="choice-list">' + f.options.map((o, i) => `
          <label class="choice"><input type="checkbox" name="${f.id}" id="${f.id}-${i}" value="${escapeAttr(o)}" />
          <span>${escapeHtml(o)}</span></label>`).join('') + '</div>';
        break;
      default:
        control = `<input type="${f.type || 'text'}" id="${f.id}"${ph}${ac} />`;
    }

    const labelTag = (f.type === 'radio' || f.type === 'checkboxes')
      ? `<span class="label">${escapeHtml(f.label)}${req}</span>`
      : `<label for="${f.id}">${escapeHtml(f.label)}${req}</label>`;

    return `<div class="${cls}" data-field="${f.id}">${labelTag}${help}${control}${err}</div>`;
  }

  /** Show/hide conditional fields as their controlling answer changes. */
  function syncVisibility(form, fields, values) {
    for (const f of fields) {
      const wrap = form.querySelector(`[data-field="${f.id}"]`);
      if (!wrap) continue;
      const visible = isVisible(f, values);
      wrap.classList.toggle('hidden', !visible);
      if (!visible) delete values[f.id];
    }
  }

  function markChoices(wrap) {
    wrap.querySelectorAll('.choice').forEach((c) => {
      const input = c.querySelector('input');
      c.classList.toggle('checked', !!input && input.checked);
    });
  }

  /* -------------------------------------------------------- validation --- */

  function validate(form, fields, values) {
    let firstBad = null;
    for (const f of fields) {
      const wrap = form.querySelector(`[data-field="${f.id}"]`);
      if (!wrap || !isVisible(f, values)) continue;
      const v = values[f.id];
      const empty = f.type === 'checkboxes' ? !(v && v.length) : !(v && String(v).trim());
      let bad = f.required && empty;
      let msg = 'This one is required.';

      if (!bad && !empty && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        bad = true; msg = 'That email address does not look right.';
      }
      if (!bad && !empty && f.type === 'tel' && (String(v).replace(/\D/g, '').length < 10)) {
        bad = true; msg = 'Please include the area code.';
      }

      wrap.classList.toggle('invalid', bad);
      if (bad) {
        wrap.querySelector('.field-error').textContent = msg;
        if (!firstBad) firstBad = wrap;
      }
    }
    if (firstBad) {
      firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstBad.querySelector('input, select, textarea')?.focus({ preventScroll: true });
      return false;
    }
    return true;
  }

  /* ------------------------------------------------------------- steps --- */

  const panels = [0, 1, 2, 3].map((i) => document.getElementById(`step-${i}`));
  const progressItems = [...document.querySelectorAll('#progress li')];

  function show(step) {
    state.step = step;
    panels.forEach((p, i) => p.classList.toggle('hidden', i !== step));
    progressItems.forEach((li, i) => {
      li.classList.toggle('current', i === step);
      li.classList.toggle('done', i < step);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (step === 2) renderLetter();
  }

  document.querySelectorAll('[data-next]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const from = Number(btn.dataset.next);
      const ok = from === 0
        ? validate(contactForm, CONTACT_FIELDS, state.contact)
        : validate(matterForm, questionsFor(area), state.answers);
      if (ok) show(from + 1);
    });
  });
  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', () => show(Number(btn.dataset.back) - 1));
  });

  show(0);

  /* ------------------------------------------------------------ letter --- */

  const letterBody = document.getElementById('letterBody');
  const letterScroll = document.getElementById('letterScroll');
  const scrollNudge = document.getElementById('scrollNudge');
  const signBlock = document.querySelector('.sign-block');

  function renderLetter() {
    const doc = buildLetter(area, state.contact, state.answers, new Date());
    letterBody.replaceChildren();

    const head = el('div', 'lt-firm');
    head.appendChild(el('div', 'nm', FIRM.name));
    const metaBits = [FIRM.tagline, ...FIRM.address, FIRM.phone, FIRM.email].filter(Boolean);
    head.appendChild(el('div', 'meta', metaBits.join('  ·  ')));
    letterBody.appendChild(head);

    letterBody.appendChild(el('div', 'lt-date', doc.dateLine));
    letterBody.appendChild(el('div', 'lt-to', doc.addressTo.join('\n')));
    letterBody.appendChild(el('div', 'lt-re', doc.reLine));
    letterBody.appendChild(el('p', '', doc.salutation));

    let list = null;
    for (const b of doc.blocks) {
      if (b.type === 'li') {
        if (!list) { list = document.createElement('ul'); letterBody.appendChild(list); }
        list.appendChild(el('li', '', b.text));
        continue;
      }
      list = null;
      letterBody.appendChild(el(b.type === 'h' ? 'h4' : 'p', '', b.text));
    }

    const close = el('div', 'lt-close');
    close.appendChild(el('p', '', 'Sincerely,'));
    close.appendChild(el('p', '', [FIRM.attorneyName, FIRM.attorneyTitle, FIRM.name].filter(Boolean).join('\n')));
    close.querySelector('p:last-child').style.whiteSpace = 'pre-line';
    letterBody.appendChild(close);

    document.getElementById('signDate').value = formatDate(new Date());
    const typed = document.getElementById('typedName');
    if (!typed.value) typed.value = signerName(state.contact);

    document.getElementById('consentText').textContent =
      `I have read this engagement letter in full and I agree to it. I intend my drawn signature ` +
      `and typed name to be my legal signature, with the same effect as signing on paper, and I agree ` +
      `to sign and receive this agreement electronically. I understand I may request a paper copy ` +
      `at no charge by emailing ${FIRM.email}.`;

    requestAnimationFrame(checkScrolledToEnd);
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function checkScrolledToEnd() {
    const atEnd = letterScroll.scrollTop + letterScroll.clientHeight >= letterScroll.scrollHeight - 48;
    const noScrollNeeded = letterScroll.scrollHeight <= letterScroll.clientHeight + 4;
    if (atEnd || noScrollNeeded) {
      state.read = true;
      scrollNudge.classList.add('hidden');
      signBlock.classList.remove('locked');
    }
    refreshSubmit();
  }
  letterScroll.addEventListener('scroll', checkScrolledToEnd, { passive: true });
  signBlock.classList.add('locked');

  /* --------------------------------------------------------- signature --- */

  const pad = new SignaturePad(document.getElementById('sigCanvas'));
  const sigWrap = document.getElementById('sigWrap');
  const sigStatus = document.getElementById('sigStatus');
  const consent = document.getElementById('consent');
  const typedName = document.getElementById('typedName');
  const submitBtn = document.getElementById('submitBtn');

  pad.onChange(() => {
    const has = pad.hasSignature();
    sigWrap.classList.toggle('signed', has);
    sigWrap.classList.remove('invalid');
    sigStatus.textContent = has ? 'Signature captured.' : '';
    refreshSubmit();
  });
  document.getElementById('sigClear').addEventListener('click', () => pad.clear());
  document.getElementById('sigUndo').addEventListener('click', () => pad.undo());
  consent.addEventListener('change', () => {
    consent.closest('.choice').classList.toggle('checked', consent.checked);
    refreshSubmit();
  });
  typedName.addEventListener('input', () => {
    typedName.closest('.field').classList.remove('invalid');
    refreshSubmit();
  });

  function refreshSubmit() {
    submitBtn.disabled = !(state.read && pad.hasSignature() && consent.checked && typedName.value.trim().length > 1);
  }

  /* ------------------------------------------------------------ submit --- */

  const errBox = document.getElementById('err-2');

  submitBtn.addEventListener('click', async () => {
    errBox.classList.add('hidden');
    if (!pad.hasSignature()) { sigWrap.classList.add('invalid'); return; }

    const original = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span>Preparing your document…';

    const payload = {
      areaSlug: area.slug,
      contact: state.contact,
      answers: state.answers,
      signature: {
        image: pad.toDataURL(),
        typedName: typedName.value.trim(),
        signedAt: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        consented: true,
        userAgent: navigator.userAgent,
      },
      meta: {
        elapsedMs: Date.now() - state.startedAt,
        pageUrl: location.href,
      },
      website: '', // honeypot — real clients never fill this
    };

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `The server returned ${res.status}.`);

      state.result = data;
      sessionStorage.removeItem(STORAGE_KEY);
      finish(data);
    } catch (err) {
      errBox.textContent =
        `We couldn't submit your signed letter: ${err.message} ` +
        `Nothing was lost — please try again. If it keeps failing, email ${FIRM.email} and the firm will finish this by hand.`;
      errBox.classList.remove('hidden');
      errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });

  /* -------------------------------------------------------------- done --- */

  function finish(data) {
    show(3);
    downloadPdf(data);
    document.getElementById('redownload').addEventListener('click', () => downloadPdf(data));

    document.getElementById('doneHeading').textContent = data.paymentRequired
      ? 'You’re signed. One step left.'
      : 'You’re signed. Nothing else to do.';
    document.getElementById('doneIntro').textContent = data.paymentRequired
      ? 'Your engagement letter is signed and on its way to the firm. Complete your payment below and the firm will begin work.'
      : 'Your engagement letter is signed and on its way to the firm.';

    document.getElementById('emailedNote').textContent = data.emailed
      ? `A copy of your signed engagement letter and your intake answers went to ${FIRM.email} just now. Reference ${data.id}.`
      : `Your signed letter downloaded to this device, but the firm's email delivery did not go through. Please email the PDF to ${FIRM.email} so nothing is missed. Reference ${data.id}.`;

    if (!data.emailed) {
      document.getElementById('emailedNote').closest('li').querySelector('h4').textContent =
        'Please forward your copy to the firm';
    }

    renderPayBox(data);
  }

  function renderPayBox(data) {
    const box = document.getElementById('payBox');
    box.replaceChildren();

    const options = paymentChoices(area);

    if (!options.length) {
      box.appendChild(el('h3', '', 'Payment'));
      box.appendChild(el('p', '',
        `The firm will send your invoice by email to ${state.contact.email || 'the address you provided'}, ` +
        'along with confirmation of the engagement. There is nothing to pay right now.'));
      return;
    }

    const processor = paymentUrl(options[0].url, '', '').processor;
    const reassurance =
      `${processor ? `Payment is processed by ${processor}.` : 'Payment is handled on a secure payment page.'} ` +
      'The firm never sees or stores your card number. ' +
      'Your representation begins once payment is received.';

    /* --- one fee for this service: a single button ------------------- */
    if (options.length === 1) {
      const { url } = paymentUrl(options[0].url, state.contact.email, data.id);
      box.appendChild(el('h3', '', 'Pay for your services'));
      box.appendChild(el('p', '', reassurance));

      const a = document.createElement('a');
      a.className = 'btn btn-gold btn-lg';
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = processor ? `Pay securely with ${processor} →` : 'Go to secure payment →';
      box.appendChild(a);
      box.appendChild(el('p', 'help', referenceNote(data.id)));
      return;
    }

    /* --- several fees: list them, highlighting the likely one -------- */
    const suggested = options.filter((o) => matchesAnswers(o, state.answers));

    box.appendChild(el('h3', '', 'Pay for your services'));
    box.appendChild(el('p', '',
      suggested.length
        ? 'Based on what you told us, the option below matches your matter. If the firm quoted you something different, choose that instead — or wait for your invoice.'
        : 'Choose the service you are paying for. If you are not sure which applies, wait for your invoice and the firm will confirm.'));
    box.appendChild(el('p', '', reassurance));

    const list = el('div', 'pay-options');
    const ordered = [...suggested, ...options.filter((o) => !suggested.includes(o))];

    for (const opt of ordered) {
      const { url } = paymentUrl(opt.url, state.contact.email, data.id);
      const row = el('div', 'pay-option' + (suggested.includes(opt) ? ' suggested' : ''));

      const text = el('div', 'pay-option-text');
      text.appendChild(el('span', 'pay-option-label', opt.label));
      if (opt.note) text.appendChild(el('span', 'pay-option-note', opt.note));
      if (suggested.includes(opt)) text.appendChild(el('span', 'pay-option-flag', 'Matches your answers'));
      row.appendChild(text);

      if (opt.amount) row.appendChild(el('span', 'pay-option-amount', opt.amount));

      const a = document.createElement('a');
      a.className = 'btn ' + (suggested.includes(opt) ? 'btn-gold' : 'btn-ghost');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Pay →';
      row.appendChild(a);

      list.appendChild(row);
    }
    box.appendChild(list);
    box.appendChild(el('p', 'help', referenceNote(data.id)));
  }

  function referenceNote(id) {
    return `Opens in a new tab. Your reference number is ${id} — quote it if you have any question about the payment.`;
  }

  function downloadPdf(data) {
    try {
      const bytes = Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename || 'Signed Engagement Letter.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      /* Download blocked (some in-app browsers). The emailed copy still went out. */
    }
  }
}

/* ------------------------------------------------------------- helpers ---- */

/**
 * A practice area's payment options, normalised.
 *
 * `paymentOptions` is a list of named fees, each with its own link — which is
 * what most practice areas actually look like. `paymentLink` remains supported
 * for an area with a single fee.
 */
export function paymentChoices(area) {
  if (Array.isArray(area.paymentOptions) && area.paymentOptions.length) {
    return area.paymentOptions.filter((o) => o && o.url);
  }
  const single = area.paymentLink || area.stripeLink;
  return single ? [{ label: '', url: single }] : [];
}

/**
 * True when an option declares `whenAnswer` and the client's intake answer
 * matches it — used to put the right fee at the top of the list.
 * `equals` may be a single value or an array of values.
 */
export function matchesAnswers(option, answers) {
  if (!option.whenAnswer) return false;
  const { field, equals } = option.whenAnswer;
  const given = answers[field];
  const wanted = Array.isArray(equals) ? equals : [equals];
  if (Array.isArray(given)) return given.some((g) => wanted.includes(g));
  return wanted.includes(given);
}

/**
 * Payment pages the portal can name on the button. Anything not listed still
 * works — the button just reads "Go to secure payment" instead.
 */
const PROCESSORS = [
  { match: /(^|\.)stripe\.com$/, name: 'Stripe', prefill: 'stripe' },
  { match: /(^|\.)lawpay\.com$/, name: 'LawPay' },
  { match: /(^|\.)affinipay\.com$/, name: 'LawPay' },
  { match: /(^|\.)clio\.com$/, name: 'Clio' },
  { match: /(^|\.)squareup\.com$/, name: 'Square' },
  { match: /(^|\.)square\.link$/, name: 'Square' },
  { match: /(^|\.)paypal\.com$/, name: 'PayPal' },
  { match: /(^|\.)paypal\.me$/, name: 'PayPal' },
  { match: /(^|\.)intuit\.com$/, name: 'QuickBooks' },
  { match: /(^|\.)quickbooks\.com$/, name: 'QuickBooks' },
  { match: /(^|\.)confidolegal\.com$/, name: 'Confido Legal' },
  { match: /(^|\.)gravity(forms|payments)\.com$/, name: 'Gravity Payments' },
  // PracticePanther OneLink. Clients know the firm, not the firm's software,
  // so the button stays generic rather than naming the practice-management tool.
  { match: /(^|\.)practicepanther\.com$/, name: '' },
];

/**
 * Builds the URL the client is sent to, and works out what to call the payment
 * page on the button. Stripe accepts query parameters that prefill the email
 * and carry a reference back into the dashboard; other providers may not, and
 * unknown parameters can break a signed or tokenised link — so they are only
 * added for Stripe.
 */
export function paymentUrl(link, email, reference) {
  let u;
  try {
    u = new URL(link);
  } catch {
    return { url: link, processor: '' }; // malformed link still opens as configured
  }

  const host = u.hostname.toLowerCase();
  const known = PROCESSORS.find((p) => p.match.test(host));

  if (known?.prefill === 'stripe') {
    if (email) u.searchParams.set('prefilled_email', email);
    u.searchParams.set('client_reference_id', String(reference).replace(/[^A-Za-z0-9_-]/g, ''));
  }

  return { url: u.toString(), processor: known?.name || '' };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
