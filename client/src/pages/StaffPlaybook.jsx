import { useState } from 'react';
import Layout from '../components/Layout';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';
const RED = '#c53030';

function Section({ id, title, isOpen, toggle, children }) {
  return (
    <div id={id} style={{ marginBottom: '10px', border: '1px solid #e9ecef', borderRadius: '8px', overflow: 'hidden' }}>
      <button
        onClick={() => toggle(id)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '13px 20px', background: isOpen ? NAVY : '#f8f9fa', border: 'none', cursor: 'pointer',
          color: isOpen ? '#fff' : NAVY, fontFamily: 'Inter,sans-serif', fontSize: '13px', fontWeight: '600',
          textAlign: 'left',
        }}
      >
        <span>{title}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s', flexShrink: 0, marginLeft: '12px' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {isOpen && (
        <div style={{ padding: '20px 24px', background: '#fff', fontFamily: 'Inter,sans-serif', fontSize: '13px', color: '#374151', lineHeight: '1.7' }}>
          {children}
          <div style={{ textAlign: 'right', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f3f5' }}>
            <button
              onClick={() => document.getElementById('playbook-toc').scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: NAVY, fontSize: '12px', padding: '2px 4px' }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
              ↑ Return to top
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Callout({ borderColor, bg, title, children }) {
  return (
    <div style={{ borderLeft: `4px solid ${borderColor || GOLD}`, background: bg || '#fffbeb', padding: '13px 16px', borderRadius: '0 6px 6px 0', marginBottom: '16px' }}>
      {title && <div style={{ fontWeight: '700', color: borderColor || NAVY, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>{title}</div>}
      <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.7' }}>{children}</div>
    </div>
  );
}

function H2({ children }) {
  return <h2 style={{ fontSize: '14px', fontWeight: '700', color: NAVY, margin: '20px 0 10px', paddingBottom: '5px', borderBottom: `2px solid ${GOLD}` }}>{children}</h2>;
}

function P({ children }) {
  return <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.7', margin: '0 0 12px' }}>{children}</p>;
}

function Ul({ items }) {
  return (
    <ul style={{ margin: '0 0 14px', paddingLeft: '20px', lineHeight: '1.8' }}>
      {items.map((item, i) => <li key={i} style={{ marginBottom: '4px' }}>{item}</li>)}
    </ul>
  );
}

function Grid({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: '18px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: '9px 12px', background: NAVY, color: '#fff', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '9px 12px', verticalAlign: 'top', lineHeight: '1.6' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckItem({ label, checked, onChange, isGate }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
      <input type="checkbox" checked={!!checked} onChange={onChange}
        style={{ marginTop: '3px', width: '15px', height: '15px', accentColor: GOLD, flexShrink: 0 }} />
      <span style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.55 : 1 }}>
        {isGate && <strong style={{ color: RED }}>[GATE] </strong>}{label}
      </span>
    </label>
  );
}

function LinkCard({ name, url, desc, star, accessNote }) {
  const href = /^https?:\/\//.test(url) ? url : `https://${url}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ display: 'block', padding: '13px 16px', border: '1px solid #e9ecef', borderRadius: '7px', marginBottom: '8px', textDecoration: 'none', background: '#fff' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.07)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e9ecef'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '600', color: NAVY, fontSize: '13px', marginBottom: '2px' }}>
            {star && <span style={{ color: GOLD, marginRight: '5px' }}>★</span>}{name}
          </div>
          {desc && <div style={{ fontSize: '12px', color: '#495057', marginBottom: '3px', lineHeight: '1.5' }}>{desc}</div>}
          {accessNote && <div style={{ fontSize: '11px', color: '#6c757d', fontStyle: 'italic', marginBottom: '2px' }}>{accessNote}</div>}
          <div style={{ fontSize: '11px', color: GOLD, fontFamily: 'monospace', marginTop: '3px' }}>{url}</div>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </div>
    </a>
  );
}

const ALL_IDS = [
  'part1','part2','part3','part4','part5','part6','part7','part8','part9','part10','part11','part12',
  'appA','appB','appC','appD','appE','appF',
  'links1','links2','links3','links4','links5','links6','links7','links8',
];

export default function StaffPlaybook() {
  const [open, setOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return new Set();
    return new Set(ALL_IDS);
  });

  const toggle = (id) => setOpen(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const [onboard, setOnboard] = useState(Array(8).fill(false));
  const [offboard, setOffboard] = useState(Array(6).fill(false));
  const flipOnboard = (i) => setOnboard(p => { const n = [...p]; n[i] = !n[i]; return n; });
  const flipOffboard = (i) => setOffboard(p => { const n = [...p]; n[i] = !n[i]; return n; });

  const sectionLabel = (text) => (
    <div style={{ fontSize: '17px', fontWeight: '700', color: NAVY, fontFamily: 'Playfair Display,Georgia,serif', borderBottom: `2px solid ${GOLD}`, paddingBottom: '8px', marginBottom: '14px', marginTop: '32px' }}>{text}</div>
  );

  return (
    <Layout>
      <div style={{ padding: '32px 40px', maxWidth: '1100px', fontFamily: 'Inter,sans-serif' }}>

        {/* Page Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: NAVY, fontFamily: 'Playfair Display,Georgia,serif', margin: '0 0 4px' }}>Staff Playbook</h1>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>J Brantley Law, PLLC · Legal Intern Program and Operations · Version 1.0 | June 2026 · Internal Use Only · Attorney Work Product</div>
        </div>

        {/* Table of Contents */}
        {(() => {
          const jump = (id, sectionId) => {
            if (sectionId && !open.has(sectionId)) toggle(sectionId);
            setTimeout(() => {
              const el = document.getElementById(id);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
          };
          const tocItems = [
            { label: 'Firm Overview',               id: 'part1',          sectionId: 'part1' },
            { label: 'Non-Negotiable Rule',          id: 'non-negotiable', sectionId: null },
            { label: 'Three Question Test',          id: 'part3',          sectionId: 'part3' },
            { label: 'Phone Intake Script',          id: 'links2',         sectionId: 'links2' },
            { label: 'After Call Procedures',        id: 'part4',          sectionId: 'part4' },
            { label: 'SOL Quick Reference',          id: 'links2',         sectionId: 'links2' },
            { label: 'Permitted and Prohibited Tasks', id: 'part3',        sectionId: 'part3' },
            { label: 'Engagement Letter Assembly',   id: 'part5',          sectionId: 'part5' },
            { label: 'Task Catalog by Practice Area', id: 'part4',         sectionId: 'part4' },
            { label: 'Technology and System Access', id: 'part6',          sectionId: 'part6' },
            { label: 'Weekly Rhythm',                id: 'part7',          sectionId: 'part7' },
            { label: 'Key Links',                    id: 'links1',         sectionId: 'links1' },
            { label: 'Ethics Reminders',             id: 'part2',          sectionId: 'part2' },
            { label: 'Onboarding Checklist',         id: 'part10',         sectionId: 'part10' },
            { label: 'Hard Escalation Contacts',     id: 'hard-escalation', sectionId: null },
          ];
          const half = Math.ceil(tocItems.length / 2);
          return (
            <div id="playbook-toc" style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fff', border: `1.5px solid ${NAVY}`, borderRadius: '8px', padding: '14px 18px', marginBottom: '18px', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={GOLD} stroke={GOLD} strokeWidth="0">
                  <path d="M19 3H5a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2z"/>
                </svg>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#6c757d', letterSpacing: '.08em', textTransform: 'uppercase' }}>Table of Contents</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 24px' }}>
                {tocItems.map((item, i) => (
                  <button key={i} onClick={() => jump(item.id, item.sectionId)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '12px', color: NAVY, padding: '3px 0', fontFamily: 'Inter,sans-serif', lineHeight: '1.4' }}
                    onMouseEnter={e => { e.currentTarget.style.color = GOLD; e.currentTarget.style.textDecoration = 'underline'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = NAVY; e.currentTarget.style.textDecoration = 'none'; }}>
                    {i + 1}. {item.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Hard Escalation Card */}
        <div id="hard-escalation" style={{ border: `2px solid ${RED}`, borderRadius: '8px', padding: '18px 22px', marginBottom: '14px', background: '#fff5f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span style={{ fontSize: '13px', fontWeight: '800', color: RED, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Hard Escalation — Contact Attorney Immediately
            </span>
          </div>
          <div style={{ fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
            Call or text <strong>(210) 742-2435</strong> now — do not wait for the weekly sync — for any of these:
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#374151', lineHeight: '1.9' }}>
            <li>Contact from opposing party, adjuster, or court</li>
            <li>Client expressing urgency, distress, or dissatisfaction</li>
            <li>Suspected data breach or lost device</li>
            <li>Any request that fails the Three Question Test</li>
            <li>Anything involving money, a signature, or a filing</li>
            <li>SOL date within 30 days on any open PI matter</li>
          </ul>
        </div>

        {/* Non-Negotiable Rule Card */}
        <div id="non-negotiable" style={{ background: NAVY, borderRadius: '8px', padding: '18px 22px', marginBottom: '28px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: GOLD, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>Non-Negotiable Rule</div>
          <p style={{ fontSize: '13px', color: '#fff', lineHeight: '1.8', margin: 0 }}>
            The intern/paralegal never tells a client, opposing party, court, agency, or anyone else what the law is, what a document means, what a client should do, or what the Attorney thinks. If asked, the only permitted response is: <em style={{ color: GOLD }}>"That is a question for Attorney Brantley. I will make sure she gets it and follows up with you."</em> This rule has no exceptions, including for family and friends.
          </p>
        </div>

        {/* ── PARTS 1–12 ── */}
        {sectionLabel('Intern Program Playbook')}

        <Section id="part1" title="Part 1: Program Purpose and Design Principles" isOpen={open.has('part1')} toggle={toggle}>
          <P>The J Brantley Law Legal Intern Program exists to do three things at once: give a motivated learner real exposure to the practice of law, relieve the Attorney of administrative and preparatory work that does not require a license, and build a documented, repeatable system the firm can use to onboard future interns, clerks, and paralegals as it grows.</P>
          <P>The program is designed around a specific reality: the inaugural intern is an adult, an active duty enlisted member of the Air Force, and a parent of a minor child. Her availability is limited to roughly five hours per week, almost entirely remote and in the evenings after duty hours. The program therefore assumes asynchronous work as the default, treats military duty as the absolute first priority, and packages tasks in small, self-contained units that can be completed in 30 to 90 minute blocks.</P>
          <H2>1.1 Design Principles</H2>
          <Ul items={[
            'Education first. Because this is an unpaid educational internship, every assignment must teach something. Tasks are paired with short explanations of why the work matters and how it fits into the legal process.',
            'Bright lines, not judgment calls. The intern has no formal legal training. The program never asks her to exercise legal judgment. Every task is either template-driven, checklist-driven, or purely organizational.',
            "Attorney reviews everything. No work product leaves the firm, reaches a client, or gets filed anywhere without the Attorney's personal review and approval. This is both an ethics requirement and a quality control standard.",
            "Small batches, clear deadlines, generous buffers. Assignments are sized for a single evening session. Internal deadlines are set at least 72 hours ahead of any true external deadline so the Attorney always has time to review, correct, or complete the work herself.",
            "Duty and family always win. A short notice shift, an exercise, a deployment tasking, or a sick child takes priority without apology or penalty. The program flexes; the firm's deadlines do not depend on the intern.",
            'Built to scale. Everything in this playbook is written in role-neutral terms wherever possible, so the same documents, checklists, and workflows can onboard intern number two, a paid law clerk, or a virtual paralegal with minimal editing.',
          ]} />
          <H2>1.2 What Success Looks Like</H2>
          <P><strong>For the intern:</strong> by the end of the initial 90 day term, she can confidently navigate Practice Panther and the firm portal, assemble a complete engagement letter package from the master template, run a USPTO status check and docket the result, build a personal injury medical records index, and explain in plain language what each of the firm's practice areas does.</P>
          <P><strong>For the firm:</strong> the Attorney recovers three to four hours per week of administrative time, has a tested onboarding system, and has a written record demonstrating that the internship was structured, supervised, and educational.</P>
        </Section>

        <Section id="part2" title="Part 2: Legal and Compliance Foundations" isOpen={open.has('part2')} toggle={toggle}>
          <P>Four bodies of rules shape this program: the unauthorized practice of law rules and the Attorney's supervisory duties, federal wage and hour law governing unpaid internships, the intern's obligations as an active duty service member, and the firm's confidentiality and conflicts obligations. Each is addressed below with the specific controls this program uses.</P>
          <H2>2.1 Unauthorized Practice of Law and Supervision</H2>
          <P>The intern is a nonlawyer assistant. Under Texas Disciplinary Rule of Professional Conduct 5.03 and Georgia Rule of Professional Conduct 5.3, the Attorney must make reasonable efforts to ensure the intern's conduct is compatible with the Attorney's professional obligations, and the Attorney is responsible for the intern's work. The USPTO imposes parallel supervision obligations for trademark practice support.</P>
          <P>The controls in Part 3 (the permitted and prohibited task lists) are the operational expression of these rules. The short version: the intern may gather, organize, draft from templates, and prepare; she may never advise, sign, file, or communicate legal judgment to anyone outside the firm.</P>
          <H2>2.2 Unpaid Internship Compliance (FLSA Primary Beneficiary Test)</H2>
          <P>Because the intern is not enrolled in a degree program and receives no academic credit, the firm must be able to show that she, not the firm, is the primary beneficiary of the arrangement under the Department of Labor's primary beneficiary test. Courts weigh seven factors, none of which is dispositive. This program is deliberately structured to satisfy them:</P>
          <Grid
            headers={['DOL Factor', 'How This Program Satisfies It']}
            rows={[
              ['1. No expectation of compensation', 'The Intern Agreement states in writing that the internship is unpaid and that no promise of compensation, express or implied, exists.'],
              ['2. Training similar to an educational environment', 'Part 8 establishes a structured 12 week curriculum with weekly learning modules, reading assignments, and teaching sessions. Learning time counts toward weekly hours.'],
              ['3. Tied to a formal education program', 'Not applicable here, which is exactly why factors 2, 4, 5, 6, and 7 must be strong. The firm will support enrollment in a paralegal certificate program if the intern pursues one, and will provide documentation of experience.'],
              ['4. Accommodates academic and personal commitments', 'The schedule is fully flexible, asynchronous, and capped at five hours per week. Military duty and parenting obligations always take priority.'],
              ['5. Limited to the period of beneficial learning', 'The internship runs in defined 90 day terms with a learning plan for each term. It is renewed only if there is more to learn, or converted to a paid role.'],
              ['6. Does not displace paid employees', 'The firm is a solo practice with no employees. The intern supplements, and the Attorney reviews and remains responsible for, all work.'],
              ["7. No entitlement to a paid job at the end", "The Intern Agreement states that the internship creates no entitlement to employment, while noting the firm's genuine interest in developing future paid roles."],
            ]}
          />
          <Callout borderColor={RED} bg="#fff5f5" title="Risk Note for the Attorney">
            The absence of an academic affiliation is the weakest factor. The mitigation is documentation: keep the weekly work logs, the curriculum records, and the signed Intern Agreement. If the program ever drifts toward production work without a meaningful learning component, convert the role to a paid position. A modest hourly wage or stipend eliminates FLSA risk entirely and is the recommended path at renewal if the intern is performing well.
          </Callout>
          <H2>2.3 Active Duty Service Member Requirements</H2>
          <P>The intern's status as an enlisted Airman creates obligations on her side that the firm should respect and verify before she starts:</P>
          <Ul items={[
            "Off-duty employment approval. Air Force members generally must obtain supervisor or commander approval before engaging in off-duty employment or business activity, and many units treat unpaid positions and internships the same way. The intern should consult her chain of command and her unit's policy, complete any required form (commonly AF Form 3902 or a local equivalent), and provide the firm a copy of the approval or written confirmation that none is required. This is an onboarding gate: no approval or confirmation, no start date.",
            'No duty time, no government resources. The intern never performs firm work during duty hours, on a government computer or phone, on a government network, or in uniform. All firm work happens on her personal time and personal devices.',
            "No appearance of endorsement. The intern's military affiliation is never used in firm marketing, and she does not represent or imply that the Air Force or DoD endorses the firm.",
            'Conflicts awareness. If a firm matter ever touches the Air Force, the DoD, a defense contractor she works with, or anyone in her unit, she flags it immediately and is walled off from the matter. The conflicts questionnaire in Appendix C captures her duty station, unit, and spouse or family employment for screening purposes.',
            'PCS, TDY, and deployment contingency. If she receives orders, the internship pauses or ends gracefully with no penalty. The offboarding checklist in Part 10 governs.',
          ]} />
          <H2>2.4 Confidentiality, Conflicts, and Data Security</H2>
          <Ul items={[
            'Signed Confidentiality and Nonlawyer Assistant Agreement before any access is granted (key terms in Appendix B). It covers client confidences, firm business information, the duty to report inadvertent disclosures, and survival after the internship ends.',
            'Conflicts questionnaire completed at onboarding and updated whenever her circumstances change. The Attorney screens every new matter against it.',
            'Social media rule: the intern never posts about clients, matters, or anything she learns through the firm. She may state publicly that she interns at J Brantley Law. Anything beyond that requires the Attorney\'s advance approval.',
            'Household privacy: firm work is done where screens are not visible to others, documents are not printed at home unless the Attorney approves, and devices are locked when unattended.',
          ]} />
        </Section>

        <Section id="part3" title="Part 3: Role Definition — Permitted and Prohibited Tasks" isOpen={open.has('part3')} toggle={toggle}>
          <Callout borderColor={NAVY} bg="#f0f4ff" title="">
            <strong>This is the single most important page in this playbook.</strong> When in doubt, the intern stops and asks. Asking is never wrong; guessing is never right.
          </Callout>
          <H2>3.1 The Intern MAY (with Attorney review of all output)</H2>
          <Grid
            headers={['Category', 'Permitted Activities']}
            rows={[
              ['Document assembly', 'Populate firm templates with client and matter information supplied by the Attorney or pulled from completed intake forms. Format documents to firm style. Proofread for typos, blanks, and formatting errors.'],
              ['Data and records', 'Enter contacts and matters in Practice Panther per the firm checklist. Organize, label, and index documents in the client portal. Build chronologies and indexes from documents provided.'],
              ['Research support', 'Run status lookups on public databases (USPTO TSDR, Texas SOS, Georgia SOS, county clerk sites). Collect and print results. Gather publicly available facts (addresses, registered agents, filing fees) for Attorney verification.'],
              ['Scheduling and logistics', 'Maintain the firm calendar and task lists, send appointment confirmations using approved scripts, track deadlines in the docketing system, and prepare meeting agendas.'],
              ['Communications support', 'Draft routine administrative emails for the Attorney\'s review and sending (scheduling, document requests, status acknowledgments). Answer purely logistical client questions using approved scripts ("Your appointment is confirmed for Tuesday at 2:00").'],
              ['Marketing support', 'Schedule pre-approved social content, format graphics to brand standards, compile content calendars, and track engagement metrics. All copy is written or approved by the Attorney before posting.'],
              ['Billing support', 'Prepare draft invoices from Practice Panther data for Attorney review, log time entries the Attorney dictates, and flag matters with milestone events for the Attorney\'s trust accounting review.'],
            ]}
          />
          <H2>3.2 The Intern MAY NOT (no exceptions)</H2>
          <Ul items={[
            'Give legal advice or opinions to anyone, including informally, including to family and friends, including "just her opinion."',
            "Sign anything on behalf of the firm or the Attorney, including letters, filings, engagement letters, and emails that purport to come from the Attorney.",
            "Send any substantive communication to a client, opposing party, adjuster, court, or agency. The Attorney sends all substantive communications from her own accounts.",
            "File anything with any court or agency, including the USPTO, even at the Attorney's direction. Filing is an Attorney-only act in this firm.",
            "Access, move, or record entries against the IOLTA trust account or any firm bank account. The intern has no banking access of any kind. She may flag milestones; only the Attorney touches money.",
            'Set, quote, negotiate, or discount fees. If a prospect asks about pricing, the scripted response directs them to the Attorney or the published booking link.',
            "Accept or decline representation, run conflicts checks unsupervised, or tell a prospective client the firm will take their case.",
            "Use AI tools on client confidential information except firm-approved tools configured by the Attorney, and never on a personal consumer account.",
            "Remove client files, documents, or data from firm systems, or store firm materials in personal cloud accounts.",
          ]} />
          <Callout borderColor={GOLD} bg="#fffbeb" title="The Three Question Test">
            Before doing anything not explicitly listed as permitted, the intern asks: <strong>(1)</strong> Does this require knowing what the law is or what it means? <strong>(2)</strong> Would a client, court, or third party rely on this coming from the firm? <strong>(3)</strong> Does this touch money, a signature, or a filing? If the answer to any question is <strong>yes or maybe</strong>, stop and route it to the Attorney.
          </Callout>
        </Section>

        <Section id="part4" title="Part 4: Task Catalog by Practice Area" isOpen={open.has('part4')} toggle={toggle}>
          <P>Each task below is sized for an evening work block, lists what the Attorney must provide, and states the deliverable. Tasks marked with an asterisk (*) are the highest leverage offloads for the Attorney and are the priority for early training.</P>
          <H2>4.1 Firm Operations (Weeks 1 to 4 Focus)</H2>
          <Grid
            headers={['Task', 'Est. Time', 'Deliverable']}
            rows={[
              ['* New matter setup in Practice Panther per the firm checklist (matter type, flat fee amount, tags, task template, billing contact)', '20–30 min per matter', 'Fully configured PP matter ready for the Attorney\'s engagement letter'],
              ['* Portal intake review: confirm completeness of client intake submissions, flag blanks and inconsistencies', '15–20 min per intake', 'Intake completeness memo (template in Appendix E)'],
              ['Document repository hygiene: apply naming conventions, file uploads to correct matters, archive closed matter files', '30–60 min weekly', 'Clean, searchable document repository'],
              ['Deadline and docket audit: cross-check PP tasks against the portal workflow module weekly', '20 min weekly', 'Weekly docket report flagging anything due within 14 days'],
              ['Clause bank maintenance: log new clauses the Attorney approves, tag and categorize', 'As assigned', 'Updated clause bank entries'],
            ]}
          />
          <H2>4.2 Trademark Practice</H2>
          <Callout borderColor={GOLD} bg="#fffbeb" title="Trademark Guardrail">
            The intern collects search hits; she never characterizes them. "I found 14 live marks containing the word SANCTUARY, screenshots attached" is correct. "I do not think any of these conflict" is prohibited legal analysis. Likewise, all client-facing fee materials she formats must state that USPTO filing fees of $350 per class are separate government costs paid directly to the USPTO and are never included in attorney fees.
          </Callout>
          <Grid
            headers={['Task', 'Est. Time', 'Deliverable']}
            rows={[
              ['* USPTO status checks: pull TSDR status for every active application and registration, log status and next deadline', '30–45 min per cycle', 'Status log with deadlines entered in the docket'],
              ['* Raw knockout search collection: run client-provided marks through USPTO search and Google, capture screenshots and hit lists with NO analysis or conclusions', '30–45 min per mark', "Raw hit packet for the Attorney's DuPont analysis"],
              ['Specimen collection: request and organize use-in-commerce specimens from clients using the approved script', '15 min per client', 'Labeled specimen folder per class'],
              ['Application intake prep: transfer data from the trademark intake dashboard into the application worksheet', '20–30 min', 'Completed worksheet for Attorney verification'],
              ['Post-registration calendar: docket Section 8, 8/15, and renewal windows from registration certificates', '15 min per registration', 'Docketed maintenance deadlines'],
            ]}
          />
          <H2>4.3 Personal Injury (Texas and Georgia)</H2>
          <Grid
            headers={['Task', 'Est. Time', 'Deliverable']}
            rows={[
              ['* Medical records and bills tracking: maintain the request log, follow up on outstanding requests using approved scripts, log receipt', '30 min weekly per active matter', 'Current records request tracker'],
              ['* Records indexing and chronology: organize received records by provider and date, build the treatment chronology from the documents themselves', '60–90 min per batch', 'Indexed records binder and chronology draft'],
              ['Damages compilation: total medical bills and out-of-pocket expenses into the damages worksheet, attach supporting documents', '45–60 min per matter', 'Damages worksheet for Attorney verification'],
              ['Correspondence log: maintain the adjuster contact log (date, person, claim number, summary the Attorney dictates)', '10 min per entry', 'Complete claim file correspondence log'],
            ]}
          />
          <H2>4.4 Business Formation, Contracts, and Estate Planning</H2>
          <Grid
            headers={['Task', 'Est. Time', 'Deliverable']}
            rows={[
              ['* Formation document assembly: populate company agreement and organizational minutes templates with client data the Attorney confirms', '45–60 min per entity', 'Draft package flagged for Attorney review'],
              ['SOS lookups: name availability screenshots, registered agent verification, certificate of fact requests prep (TX and GA)', '15–20 min per entity', 'Lookup packet with screenshots'],
              ['Contract intake prep: convert client-provided contracts to editable format, apply firm styles, build the defined terms list', '30–45 min per contract', 'Review-ready document for the Attorney'],
              ['Estate planning intake organization: compile asset lists, beneficiary information, and fiduciary contact sheets from the executor intake tool', '30–45 min per client', 'Organized intake packet'],
              ['Signing logistics: prepare signing checklists, witness and notary requirement sheets per state, and assembly instructions', '20 min per signing', 'Signing day packet'],
            ]}
          />
          <H2>4.5 Marketing and Brand Support</H2>
          <Grid
            headers={['Task', 'Est. Time', 'Deliverable']}
            rows={[
              ["Content scheduling: load Attorney-approved posts into the scheduler per the content calendar", '20–30 min weekly', 'Scheduled week of content'],
              ['Carousel formatting: build Instagram carousels from Attorney-approved copy using brand templates', '30 min per carousel', 'Publish-ready graphics'],
              ['Engagement tracking: log reach, saves, and link clicks weekly; flag top performers', '15 min weekly', 'Metrics row in the content tracker'],
            ]}
          />
        </Section>

        <Section id="part5" title="Part 5: Engagement Letter Assembly Workflow" isOpen={open.has('part5')} toggle={toggle}>
          <P>Engagement letter assembly is the program's flagship offload because it is high-frequency, template-driven, and fully reviewable. The intern assembles; the Attorney verifies, signs, and sends. The intern never signs and never sends.</P>
          <H2>5.1 The Master Template Standard</H2>
          <P>All assembly follows the firm's May 2026 master template standard. The intern must internalize these fixed rules before her first assembly:</P>
          <Ul items={[
            'All fees deposit to the IOLTA trust account; transfers to operating occur only at the milestones defined in Section 4(B) of the letter.',
            'Deposit at signing is 50 percent of the total elected fee unless the Attorney specifies otherwise in the assignment.',
            'Party designations are Attorney, Firm, and Client throughout. No other labels.',
            'The letter contains all 16 sections, including the Texas malpractice insurance disclosure where applicable. Sections are never deleted, only marked not applicable where the template allows.',
            "The a la carte election table uses checkboxes; the intern marks only the services the Attorney's assignment specifies.",
            'One letter per matter and per client capacity. A client signing individually and as an LLC member receives separate letters.',
            'The signature block must capture the deposit amount and the total elected fee.',
            'Trademark letters: every fee cell and service description must prominently state that USPTO filing fees of $350 per class are entirely separate government costs paid directly to the USPTO and are never included in attorney fees. The word "included" never appears next to a government fee.',
          ]} />
          <H2>5.2 Assembly Procedure</H2>
          <Grid
            headers={['Step', 'Action']}
            rows={[
              ['1', "Attorney issues an assembly assignment in Practice Panther containing: client legal name and capacity, matter description, elected services, fee amounts, deposit amount, and jurisdiction. The intern works only from this assignment, never from memory or assumption."],
              ['2', "Intern pulls the current master template from the firm document repository (never from a prior client's letter, which risks carrying over another client's terms)."],
              ['3', 'Intern populates all merge fields, completes the election table, calculates and enters the deposit (50 percent unless the assignment says otherwise), and completes the signature block fields.'],
              ['4', 'Intern runs the QC checklist in Section 5.3 and initials it.'],
              ['5', 'Intern saves the draft to the matter folder using the firm naming convention (ClientLastName_MatterType_EngagementLetter_DRAFT_Date) and marks the PP task "Ready for Attorney Review."'],
              ['6', "Attorney reviews, corrects, finalizes, signs, and sends. Attorney logs corrections in the intern's feedback log so recurring errors become teaching points."],
              ['7', "On return of the signed letter, the intern files it to the matter, updates the PP matter status, and flags the deposit milestone for the Attorney's trust accounting action. The intern takes no action involving funds."],
            ]}
          />
          <H2>5.3 Engagement Letter QC Checklist</H2>
          <Ul items={[
            'Client legal name spelled identically everywhere it appears, including the signature block.',
            'Correct capacity (individual, entity, fiduciary) and one letter per capacity.',
            'All 16 sections present; Texas malpractice disclosure included for Texas matters.',
            'Election table checkboxes match the assignment exactly; no extra services marked.',
            'Deposit equals 50 percent of total elected fee, or the amount the assignment specifies; math verified twice.',
            'Trademark letters: USPTO fee separation language present in every fee cell; $350 per class stated; no "included" language.',
            'No street address appears anywhere on the document.',
            'Jurisdiction references match the matter (TX rules for TX matters, GA Rule 4-1.5 tiered cap language for GA contingency matters, TX Rule 1.04 for TX contingency matters).',
            'No placeholder text, highlighting, or bracketed fields remain.',
          ]} />
        </Section>

        <Section id="part6" title="Part 6: Technology, Access, and Security" isOpen={open.has('part6')} toggle={toggle}>
          <H2>6.1 Systems and Access Levels</H2>
          <Grid
            headers={['System', 'Intern Access', 'Explicitly Excluded']}
            rows={[
              ['Firm client portal (Railway/PostgreSQL/Supabase/R2)', 'Dedicated staff account scoped to: intake review, document repository, workflow tasks, time tracking', 'IOLTA ledger module, client messaging send function, user administration'],
              ['Practice Panther', 'Limited user: contacts, matters, tasks, calendar, draft (unbilled) time entries, draft invoices', 'Billing finalization, payment processing, trust accounting, firm settings, rate tables'],
              ['Email', 'Dedicated firm address (intern@ alias) for internal use and approved administrative scripts only', "Sending as or on behalf of the Attorney; the Attorney's mailbox"],
              ['Document repository', 'Read and write within assigned matters', 'Matters the intern is screened from; firm financial records'],
              ['Banking and payments', 'None', 'All of it. No exceptions, ever.'],
            ]}
          />
          <H2>6.2 Security Requirements</H2>
          <Ul items={[
            'Unique credentials and two-factor authentication on every firm system. No shared logins, including with the Attorney.',
            'Personal device standards: current OS, screen lock, full disk encryption enabled, no firm data synced to personal cloud accounts.',
            'All work happens inside firm systems. Documents are edited in the repository or downloaded, edited, re-uploaded, and deleted locally the same session.',
            'No firm work on government devices or networks, ever (see Part 2.3).',
            'Immediate reporting of any lost device, suspected compromise, or misdirected email. Reporting an error never results in discipline; concealing one ends the internship.',
            'On separation, all access is revoked the same day per the offboarding checklist.',
          ]} />
          <H2>6.3 Using the Portal and Practice Panther Together</H2>
          <P>The division of labor between the two systems, which the intern maintains:</P>
          <Ul items={[
            'The portal is the client-facing system of record: intakes, document uploads, client task visibility, and message threads (which the intern reads for triage but the Attorney answers).',
            'Practice Panther is the internal system of record: matter management, deadlines, tasks, time, and billing data.',
            "The intern's weekly sync duty: every active matter exists in both systems, statuses match, every portal intake has a corresponding PP matter within 48 hours of the Attorney accepting the engagement, and every deadline lives in PP with a 14 day and 7 day reminder.",
          ]} />
        </Section>

        <Section id="part7" title="Part 7: Schedule, Hours, and Logistics" isOpen={open.has('part7')} toggle={toggle}>
          <H2>7.1 The Weekly Rhythm</H2>
          <Grid
            headers={['Block', 'Description']}
            rows={[
              ['Weekly sync (30 min)', "One scheduled video or phone call per week, set for an evening that works around her duty schedule and child care. Agenda: review last week's work and feedback, assign the new week's tasks, 10 minutes of teaching tied to the curriculum."],
              ['Async work blocks (3 to 4 hours)', 'Self-scheduled evening or weekend blocks. Assignments are posted in Practice Panther by the sync call with everything she needs attached, so no task ever stalls waiting on the Attorney during her work window.'],
              ['Learning time (30 min)', 'Curriculum reading or module work per Part 8. Counts toward weekly hours. This is not optional; it is what makes the program an internship.'],
            ]}
          />
          <H2>7.2 Hours Policies</H2>
          <Ul items={[
            "Cap: five hours per week. The intern logs all time in Practice Panther under the non-billable internship matter. If she hits five hours, she stops, even mid-task. The cap protects her and documents the program's limited scope.",
            'Floor: none. A zero hour week due to duty, illness, or family needs requires only a brief heads-up message, not an explanation.',
            'No standing availability requirement. The firm never expects same-day turnaround. Every assignment carries a deadline at least 72 hours before any true external deadline.',
            'Communication windows: the Attorney may send messages anytime; the intern is never expected to respond outside her self-selected work blocks. Urgent matters are by definition Attorney matters.',
            'Blackout flexibility: exercises, inspections, TDYs, and deployments are communicated when known, and the task pipeline simply pauses.',
          ]} />
          <H2>7.3 Logging and Documentation</H2>
          <Ul items={[
            'Every work session gets a time entry: date, duration, matter or task, and a one-line description.',
            "Every Friday (or her last work block of the week), the intern submits the weekly work log (Appendix D): hours, tasks completed, questions queued for the sync, and one thing she learned.",
            "The Attorney keeps the feedback log: corrections made to intern work, patterns to teach, and praise worth recording. These logs are the program's FLSA documentation and the intern's future reference letter material.",
          ]} />
        </Section>

        <Section id="part8" title="Part 8: Education Curriculum — 12 Week Foundation Term" isOpen={open.has('part8')} toggle={toggle}>
          <P>The curriculum pairs each week's learning module with the tasks the intern is doing, so concepts land immediately. Each module is roughly 30 minutes of reading or video plus the 10 minute teaching segment of the weekly sync. The Attorney may resequence to match live matter flow.</P>
          <P>Materials come from free, reputable sources the Attorney curates: State Bar of Texas and State Bar of Georgia public education pages, USPTO Trademark Basics, and the firm's own annotated templates. The Attorney adds a one-paragraph framing note to each assignment explaining what to look for.</P>
          <Grid
            headers={['Week', 'Module', 'Paired Practical Work']}
            rows={[
              ['1', 'How a law firm works: clients, matters, engagement, the file', 'Systems onboarding; portal and PP tour; naming conventions'],
              ['2', 'Confidentiality, privilege, and why nonlawyers cannot give advice', 'Sign agreements; practice the scripted responses; shadow an intake review'],
              ['3', 'The life of a matter: intake to engagement to work to closing', 'First intake completeness memos; first PP matter setups'],
              ['4', 'Trust accounting basics: why client money is sacred and untouchable', 'Observe (not perform) a milestone transfer walkthrough; learn what she flags and why'],
              ['5', 'Engagement letters: anatomy of the master template', 'First supervised engagement letter assembly with line-by-line review'],
              ['6', 'Trademarks 1: what a trademark is, classes, and the application timeline', 'TSDR status checks; docket maintenance deadlines'],
              ['7', 'Trademarks 2: searching, specimens, and why the Attorney does the analysis', 'Raw knockout search collection; specimen requests'],
              ['8', 'Personal injury 1: claims, adjusters, and the demand process', 'Records request tracking; correspondence log'],
              ['9', 'Personal injury 2: medical records, chronologies, and damages', 'First records index and chronology build'],
              ['10', 'Business entities: LLCs, agreements, and why capacity matters', 'Formation document assembly; SOS lookups'],
              ['11', 'Estate planning basics: wills, POAs, directives, TX and GA differences', 'Intake organization; signing day packet prep'],
              ['12', 'Legal careers and pathways: paralegal certification, law school, JAG and legal roles in the Air Force', 'Term review; 90 day evaluation; next term or conversion planning'],
            ]}
          />
        </Section>

        <Section id="part9" title="Part 9: Supervision and Quality Control" isOpen={open.has('part9')} toggle={toggle}>
          <H2>9.1 Review Gates</H2>
          <P>Every category of intern work has a defined review gate before it has any effect outside the intern's own workspace:</P>
          <Grid
            headers={['Work Type', 'Review Gate']}
            rows={[
              ['Engagement letters and client documents', 'Attorney line-by-line review before signing or sending. Always.'],
              ['Data entry (PP matters, contacts)', 'Attorney spot-checks 100 percent for the first month, then audits weekly samples once error rates justify it.'],
              ['Research collection packets', 'Attorney reviews the raw packet and performs all analysis herself.'],
              ['Administrative emails from approved scripts', 'Pre-approved scripts may be sent from the intern alias; anything off-script goes to the Attorney first.'],
              ['Marketing content', 'Attorney approves all copy before scheduling; intern schedules only approved content.'],
              ['Time and billing data', 'All intern entries remain in draft; the Attorney finalizes every invoice and makes every trust accounting entry.'],
            ]}
          />
          <H2>9.2 Error Handling and Escalation</H2>
          <Ul items={[
            'Errors are expected, especially early. The standard is immediate disclosure, not perfection. The intern reports any error the moment she notices it, including errors in work already submitted.',
            'The Attorney triages: fix, teach, and log. Recurring errors become curriculum, not criticism.',
            'Hard escalations (call or text the Attorney immediately, do not wait for the sync): any contact from an opposing party, adjuster, or court; any client expressing urgency, distress, or dissatisfaction; any suspected data breach or lost device; any request that fails the Three Question Test; anything involving money.',
          ]} />
          <H2>9.3 Work Product Conventions</H2>
          <Ul items={[
            'File naming: ClientLastName_MatterType_DocumentType_Status_YYYY-MM-DD. Status values: DRAFT, FOR-REVIEW, FINAL (Attorney applies FINAL).',
            'Version control: edits happen in the repository copy; no parallel local versions; the prior version is never deleted, only superseded.',
            'Every deliverable is submitted through a Practice Panther task status change, never by text message or untracked email, so the record of what was assigned and delivered stays complete.',
          ]} />
        </Section>

        <Section id="part10" title="Part 10: Onboarding and Offboarding Checklists" isOpen={open.has('part10')} toggle={toggle}>
          <H2>10.1 Onboarding Checklist (Complete in Order — Gates Must Be Cleared First)</H2>
          <div style={{ marginBottom: '24px' }}>
            {[
              { label: 'Intern confirms in writing that she has consulted her chain of command regarding off-duty employment or activity approval and provides the approval or written confirmation that none is required.', gate: true },
              { label: 'Signed Intern Agreement (Appendix A terms) acknowledging the unpaid educational structure, the five hour cap, and the no-entitlement-to-employment term.', gate: true },
              { label: 'Signed Confidentiality and Nonlawyer Assistant Agreement (Appendix B terms).', gate: true },
              { label: 'Completed conflicts questionnaire (Appendix C); Attorney runs initial conflicts screen and documents the result.' },
              { label: 'Tech setup: firm email alias, portal staff account (scoped per Part 6), Practice Panther limited user, 2FA verified on each, device standards confirmed.' },
              { label: 'Orientation session (counts as Week 1 sync): tour of systems, the permitted and prohibited lists read aloud together, the Three Question Test, the scripted responses, and the escalation contacts.' },
              { label: 'First assignment posted: low-stakes, fully internal (document repository hygiene or an intake completeness memo).' },
              { label: 'Calendar: standing weekly sync scheduled; 30, 60, and 90 day evaluation dates docketed.' },
            ].map((item, i) => (
              <CheckItem key={i} label={item.label} checked={onboard[i]} isGate={item.gate} onChange={() => flipOnboard(i)} />
            ))}
          </div>
          <H2>10.2 Offboarding Checklist (End of Term, Conversion, PCS, or Resignation)</H2>
          <div>
            {[
              { label: 'Exit conversation: feedback both directions; the Attorney offers a written reference or LinkedIn recommendation reflecting documented work.' },
              { label: 'Work in progress inventoried and reassigned to the Attorney; nothing left half-finished and untracked.' },
              { label: 'All system access revoked the same day: portal account deactivated, PP user deactivated, email alias disabled with forwarding to the Attorney for 30 days.' },
              { label: 'Intern certifies in writing that no firm or client materials remain on personal devices or accounts; local files deleted.' },
              { label: 'Confidentiality obligations survive; the Attorney provides a one-page reminder of continuing duties.' },
              { label: 'Program retrospective: the Attorney logs what worked, what did not, and updates this playbook before the next intern.' },
            ].map((item, i) => (
              <CheckItem key={i} label={item.label} checked={offboard[i]} onChange={() => flipOffboard(i)} />
            ))}
          </div>
        </Section>

        <Section id="part11" title="Part 11: Evaluation and Growth Path" isOpen={open.has('part11')} toggle={toggle}>
          <H2>11.1 Evaluations</H2>
          <Ul items={[
            '30 day check: systems fluency and reliability. Is work submitted on time, logged correctly, and improving with feedback?',
            '60 day check: task expansion readiness. Can she move from operations tasks into practice area support (engagement letters, trademark status work) with declining correction rates?',
            '90 day evaluation (Appendix F form): full review against the success criteria in Part 1.2, plus a structured conversation about her goals.',
          ]} />
          <H2>11.2 Paths After the Foundation Term</H2>
          <Grid
            headers={['Path', 'When It Fits']}
            rows={[
              ['Renew as intern (new term)', 'She is still learning materially new things and wants to continue. A new term requires a new learning plan; rolling renewals without fresh curriculum undermine the unpaid structure.'],
              ['Convert to paid law clerk or virtual assistant (recommended default if performing well)', 'She is producing reliable value. A modest hourly rate eliminates FLSA exposure, allows production-focused work, and lets hours grow. Off-duty employment approval must be reconfirmed for paid status.'],
              ['Paralegal pipeline', 'She enrolls in a paralegal certificate program; the firm supports with flexible assignments aligned to coursework and, at the Attorney\'s discretion, education assistance as a retention investment.'],
              ['Graceful close', 'Orders, life changes, or fit. Offboard per Part 10 with a reference reflecting her documented contributions.'],
            ]}
          />
        </Section>

        <Section id="part12" title="Part 12: Scaling the Program" isOpen={open.has('part12')} toggle={toggle}>
          <P>This playbook is written so that the firm's second intern costs a fraction of the first. The scaling discipline:</P>
          <Ul items={[
            "One source of truth. This playbook lives in the firm document repository as the controlled version. Changes happen here first, then in practice, never the reverse.",
            'Role-neutral modules. Parts 3, 5, 6, 9, and 10 apply verbatim to any nonlawyer assistant: intern, paid clerk, or virtual paralegal. Only Parts 2.2, 2.3, 7, and 8 are tailored per person (compensation structure, employer-specific obligations, schedule, and curriculum).',
            "Per-person addendum, not a new playbook. Each new team member gets a two-page addendum: their schedule, their access scope, their learning plan, and any person-specific compliance items (academic credit paperwork for a student, off-duty approval for a service member, contractor agreement for a 1099 paralegal).",
            "Tiered task catalog. As team members prove out, the Attorney promotes tasks from \"Attorney only\" to the catalog in Part 4 by adding a row with its review gate. The catalog is the firm's living delegation map.",
            'Military spouse and member pipeline. The asynchronous, evening-friendly, PCS-tolerant structure is purpose-built for the military community the firm already serves and recruits from (MSJDN and base networks). Treat this program as a recruiting asset and say so in outreach.',
            "Annual review. Each January, alongside the pricing review, the Attorney reviews this playbook against current TX and GA professional conduct rules, DOL guidance, and USPTO practice rules, and increments the version number.",
          ]} />
        </Section>

        {/* ── APPENDICES ── */}
        {sectionLabel('Appendices')}

        <Section id="appA" title="Appendix A: Intern Agreement — Key Terms Outline" isOpen={open.has('appA')} toggle={toggle}>
          <P>The signed agreement should contain, at minimum, the following terms. This outline is for the Attorney's drafting use; the executed agreement is a separate document.</P>
          <Ul items={[
            'Parties, start date, and initial 90 day term with renewal by mutual written agreement only.',
            'Educational purpose statement: the internship is a structured training program; the intern is its primary beneficiary.',
            'Unpaid status: no wages, salary, or benefits; no expectation of compensation, express or implied; no entitlement to employment at the conclusion of the internship.',
            'Hours: maximum five hours per week, self-scheduled, with no minimum and no penalty for missed weeks.',
            'Nonlawyer status: the intern is not an attorney, will not hold herself out as one, and will comply with the permitted and prohibited task rules in the firm playbook, which is incorporated by reference.',
            'Supervision: all work is performed under the direct supervision and review of Jennifer N. Brantley, Esq.',
            'Military priority clause: military duties take absolute precedence; the internship pauses or terminates without penalty upon orders, deployment, or PCS.',
            'Off-duty activity representation: the intern represents she has addressed any required command approval or notification and will keep it current.',
            'Termination: either party may end the internship at any time, for any reason, with offboarding per the playbook.',
            'Incorporation of the Confidentiality and Nonlawyer Assistant Agreement.',
          ]} />
        </Section>

        <Section id="appB" title="Appendix B: Confidentiality and Nonlawyer Assistant Agreement — Key Terms Outline" isOpen={open.has('appB')} toggle={toggle}>
          <Ul items={[
            'Definition of confidential information covering client identities, matter information, documents, communications, firm financial and business information, and anything learned through the internship.',
            'Obligations: no use or disclosure except as required for assigned work; no discussion of clients or matters with anyone outside the firm, including family; obligations survive the internship indefinitely.',
            "Acknowledgment of the Attorney's professional responsibility rules (TX Rule 5.03, GA Rule 5.3) and agreement to conduct compatible with them.",
            'Data handling: firm systems only, device security standards, no personal cloud storage, same-day reporting of any loss or suspected breach.',
            'Social media and publicity restrictions per Part 2.4.',
            'Conflicts duty: ongoing obligation to disclose new circumstances that could create a conflict.',
            'Return and certification of materials at separation.',
          ]} />
        </Section>

        <Section id="appC" title="Appendix C: Conflicts Questionnaire — Fields" isOpen={open.has('appC')} toggle={toggle}>
          <Ul items={[
            "Full legal name, prior names, and household members' names.",
            'Duty station, unit, and general description of military role (no classified detail).',
            "Spouse or partner employer; family members' employers known to her.",
            'Prior employers and any businesses she or her household owns.',
            'Any lawsuits, claims, or legal matters she or immediate family are or have been involved in.',
            "Any relationship to current firm clients or adverse parties from the Attorney's screening list.",
            'Certification and ongoing duty to update.',
          ]} />
        </Section>

        <Section id="appD" title="Appendix D: Weekly Work Log — Template Fields" isOpen={open.has('appD')} toggle={toggle}>
          <Ul items={[
            'Week ending date; total hours (must not exceed five).',
            'Tasks completed with matter references and time per task.',
            'Tasks in progress and any blockers.',
            'Questions queued for the weekly sync.',
            'One thing I learned this week (required; this line is the FLSA documentation workhorse).',
            'Any errors discovered or corrected (disclosure rewarded, never punished).',
          ]} />
        </Section>

        <Section id="appE" title="Appendix E: Intake Completeness Memo — Template Fields" isOpen={open.has('appE')} toggle={toggle}>
          <Ul items={[
            'Client name, intake date, practice area, and portal intake ID.',
            'Checklist result per practice area required-fields list: complete, incomplete, or inconsistent.',
            'Specific blanks or inconsistencies, quoted exactly, with no interpretation.',
            'Documents received versus documents the intake form says were uploaded.',
            'Recommended next step limited to the approved options: route to Attorney for engagement decision, or send the approved follow-up request script for the listed missing items.',
          ]} />
        </Section>

        <Section id="appF" title="Appendix F: 90 Day Evaluation — Form Fields" isOpen={open.has('appF')} toggle={toggle}>
          <Ul items={[
            'Reliability: on-time submission rate, log compliance, communication quality (rated 1 to 5 with comments).',
            'Accuracy: correction rate trend on engagement letters, data entry, and packets.',
            'Judgment: escalation behavior, Three Question Test compliance, error disclosure.',
            'Learning: curriculum completion, sync engagement, growth in plain-language understanding of the practice areas.',
            'Intern self-assessment: what she wants more of, less of, and next.',
            'Outcome decision per Part 11.2 with rationale, signed by both.',
          ]} />
        </Section>

        {/* ── SYSTEMS & WEBSITES DIRECTORY ── */}
        {sectionLabel('Firm Systems and Websites Directory')}
        <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '12px' }}>Version 1.1 · July 2026 · Internal Use Only · All links open in a new window · ★ = Bookmark Day One</div>
        <Callout borderColor={NAVY} bg="#f0f4ff" title="Purpose">
          This directory lists every website and system the firm currently uses, organized by function and practice area. During onboarding, work through it top to bottom: visit each site, read its entry, and complete the bookmarking setup below. Afterward, keep it open as your quick-reference link sheet while completing firm tasks. Access levels reference Playbook Part 6; nothing in this directory expands what the Playbook permits.
        </Callout>
        <Callout borderColor={GOLD} bg="#fffbeb" title="Bookmarking Setup — Week 1 Task">
          In your firm browser profile, create a bookmarks folder named <strong>JBL</strong> with subfolders matching the section headings of this directory (Firm Web Presence, Daily Operations, Research, Trademark, Business Formation, Litigation and PI, Marketing, Back Office). Bookmark every site marked ★ on day one; add the rest as they enter your workflow. Use only your firm browser profile, never a personal profile, so firm logins and history stay separated.
        </Callout>

        <Section id="links1" title="1. Firm Web Presence" isOpen={open.has('links1')} toggle={toggle}>
          <LinkCard star name="The Fine Print Lawyer — Primary Firm Website" url="www.thefineprintlawyer.com"
            desc="The firm's public face: practice areas, published pricing, blog, and the consultation booking link. www.jenniferbrantleylaw.com redirects here; if a client mentions either address, they are the same site."
            accessNote="Public site; no login." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Know the site well enough to direct prospects to the right page by name (pricing, booking, blog). Booking link for approved scripts: <span style={{ fontFamily: 'monospace', color: NAVY }}>https://calendly.com/jbrantley-jenniferbrantleylaw</span>. After the Attorney publishes site changes, click through the main navigation and confirm every link and the Calendly booking button work; report anything broken.
          </div>
          <LinkCard star name="Family Law and Estate Planning Intake Hub" url="familylawintake.netlify.app"
            desc="Client intake portal for family law and estate planning matters. Submissions generate the intakes you review."
            accessNote="Reviewer access to submissions per Playbook Part 6." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Check for new submissions at the start of every work block. Complete an Intake Completeness Memo within 48 hours of each submission. Never edit a client's answers; report what the intake says exactly as submitted. Hosting for both intake sites runs on Netlify (app.netlify.com); the hosting dashboard itself is Attorney-managed and not part of your access.
          </div>
          <LinkCard star name="Copyright Intake Portal" url="jbrantleylawcopyrights.netlify.app"
            desc="Client intake portal for copyright matters."
            accessNote="Reviewer access to submissions per Playbook Part 6." />
          <div style={{ fontSize: '12px', color: '#6c757d', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Same workflow as the family law hub: monitor, run the completeness memo, route per Appendix E.
          </div>
        </Section>

        <Section id="links2" title="2. Daily Operations (Every Matter, Every Week)" isOpen={open.has('links2')} toggle={toggle}>
          <LinkCard star name="PracticePanther — Case Management System of Record" url="www.practicepanther.com"
            desc="The firm's internal system of record. Matter management, invoicing, client communication through the built-in client portal and SMS, expense tracking, and document storage all live here."
            accessNote="Limited user: contacts, matters, tasks, calendar, draft time entries, draft invoices, document uploads, expense entry. No billing finalization, no trust accounting, no firm settings." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Set up every new matter per the firm checklist within 48 hours of the Attorney accepting the engagement. Upload documents to the correct matter using the firm naming convention the same day you receive or create them. Log every expense against its matter with the receipt attached; the Attorney reviews before any invoice goes out. Read client portal messages and SMS threads for triage only; the Attorney answers anything substantive. Record all your time under the internship matter; submit deliverables by changing PP task status, never by text or untracked email.
          </div>
          <LinkCard star name="Google Workspace (Email, Drive, Calendar, Meet)" url="workspace.google.com"
            desc="The firm's email, document storage, calendar, and video meeting platform. Your firm email alias, the shared Drive, and the firm calendar all live here."
            accessNote="Firm intern alias email, shared Drive folders per matter access, firm calendar." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Use the intern alias for all firm email; approved administrative scripts only; nothing substantive to clients or third parties. Work in shared Drive folders per the document rules in Playbook Part 6; never move firm files to a personal account. Google Meet is one of the firm's two virtual meeting platforms.
          </div>
          <LinkCard star name="Google Calendar — including SOL Tracking for Personal Injury" url="calendar.google.com"
            desc="The firm calendar, which also serves a critical docketing function: statute of limitations tracking for personal injury matters."
            accessNote="Firm calendar access." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Every PI matter gets an SOL entry at intake on the firm calendar, created from the limitations date the Attorney provides. You never calculate an SOL yourself; the Attorney determines the date, you enter it. Each SOL entry carries reminders at 180, 90, 60, and 30 days — confirm the reminders saved. Mirror every SOL date into PracticePanther as a task on the matter. Your weekly docket audit (Playbook Part 4.1) includes confirming every open PI matter has its SOL entry in both places.
          </div>
          <LinkCard star name="Calendly — Scheduling with Zoom / Google Meet and AI Meeting Notes" url="calendly.com"
            desc="Client-facing scheduling. Prospects book 15 minute consultations through the firm's Calendly link, which syncs to Google Calendar. Meetings run on Zoom (zoom.us) or Google Meet, with an AI notetaker capturing notes."
            accessNote="View scheduled events; manage per Attorney direction." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Confirm each day's booked consultations appear correctly on the firm calendar with a working meeting link. Send appointment confirmations and reminders using the approved script. Meeting notes workflow — do this the same day as the meeting: download the AI notetaker's notes file, rename it per convention (ClientLastName_MatterType_MeetingNotes_YYYY-MM-DD), and upload it to the matter's document folder in PracticePanther. A meeting is not done until its notes are filed. AI notes are unreviewed machine output — never quote them to a client or treat them as the record of what was agreed; the Attorney's follow-up email is the record.
          </div>
          <LinkCard star name="Claude AI — Drafting and Skill Work" url="claude.ai"
            desc="The firm's AI platform for template-driven drafting, letters, and running the firm's saved skills."
            accessNote="Firm team seat (to be added at onboarding). Firm account only, never a personal account." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Use only your firm team seat. Client information never goes into a personal AI account of any kind (Playbook Part 3.2). Use it for permitted tasks only: template assembly, formatting, checklists, and drafts the Attorney will review. AI output is a draft, never a final; everything routes through Attorney review. Never ask it legal questions on behalf of a client or pass its answer along as advice.
          </div>
          <LinkCard name="Canva — Graphics and Flyers" url="www.canva.com"
            desc="Design platform for flyers, carousels, and marketing graphics."
            accessNote="Firm team seat (to be added at onboarding)." />
          <div style={{ fontSize: '12px', color: '#6c757d', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Build graphics only from the firm brand templates (navy and gold, per the brand guide) and only with Attorney-approved copy. Save work inside the firm team space, never a personal Canva account.
          </div>
        </Section>

        <Section id="links3" title="3. Legal Research, Reference, and Bar Member Benefits" isOpen={open.has('links3')} toggle={toggle}>
          <LinkCard name="LexisNexis" url="www.lexisnexis.com"
            desc="The firm's legal research and document drafting platform."
            accessNote="Attorney-directed sessions only." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Use Lexis only when the Attorney assigns a specific collection task (pull a named case, statute, or form). You collect and print or save; you never summarize what the law means or select among authorities. Analysis is the Attorney's work. Save research pulls to the matter folder with the firm naming convention.
          </div>
          <LinkCard star name="vLex Fastcase — State Bar of Texas Member Benefit" url="texasbar.com"
            desc="Free comprehensive legal research included with the Attorney's Texas bar membership (~$1,145/year value): cases, statutes, regulations, and court rules for all 50 states and federal, plus the Cert citator for negative treatment, Vincent AI baseline features, a library of 60M+ briefs and pleadings, Texas Case Alerts, and free Word and Chrome integrations. Free reference attorney support: (866) 773-2782."
            accessNote="Attorney's bar-linked account. Access through the Attorney's My Bar Page at texasbar.com under Online Legal Research. Bar portal credentials are never shared." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> During assigned collection sessions, the same rule as Lexis applies: pull the named authority, capture the Cert citator page for it, save to the matter folder, and leave all analysis to the Attorney. Before reaching for LexisNexis on an assigned pull, check whether vLex Fastcase covers it; the firm prefers the free benefit where coverage is equal. Free training webinars run quarterly; completing one counts toward your curriculum learning time.
          </div>
          <LinkCard name="vLex Fastcase — State Bar of Georgia Member Benefit" url="gabar.org"
            desc="The same free vLex Fastcase research platform, provided separately through the Attorney's Georgia bar membership and accessed through the gabar.org member portal."
            accessNote="Attorney's bar-linked account; same rules as the Texas benefit." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Used for Georgia matters; access runs through the Attorney's Georgia bar login. Note in the research packet which membership the pull came through.
          </div>
          <LinkCard name="Smokeball Bill — TX Bar Free Trust Accounting (Awareness Only)" url="smokeball.com/bar-associations/texasbill"
            desc="Free, unlimited trust accounting and billing software for State Bar of Texas members: compliant IOLTA trust ledgers, flexible invoicing including flat fee and contingency, matter-based time and expense tracking, and online payments. Texas bar members additionally receive 10% off Smokeball's other products."
            accessNote="None. Trust accounting is Attorney-only, always (Playbook Part 3.2). Listed for awareness only." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            For the Attorney's reference: Smokeball Bill overlaps PracticePanther's billing and trust features. It is the firm's free fallback and comparison benchmark; evaluate at each PracticePanther renewal whether the paid tier still earns its keep.
          </div>
          <LinkCard name="Texas Bar Practice and TexasBarCLE" url="texasbarpractice.com"
            desc="State Bar of Texas practice management hub: free articles, videos, and downloads on starting and running a practice, the quarterly Practice Makes Perfect newsletter, and the Texas Bar Books bookstore with practice manuals (family law, wills and probate, business, real estate). TexasBarCLE provides continuing legal education, including scholarship programs so cost is not a barrier. The bar also offers the Law Practice Management Program, the Ethics Helpline, and the Lawyer Referral and Information Service."
            accessNote="Public and member content; curriculum use." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> A standing curriculum source — the Attorney will assign specific articles and videos as weekly learning modules. When preparing signing packets or formation documents, the Attorney may direct you to a specific Texas Bar Books manual section for the checklist format the firm follows.
          </div>
          <LinkCard name="State Bar of Georgia LPMP and GeorgiaAdvocates.org" url="gabar.org"
            desc="Georgia bar free member resources: the Law Practice Management Program (business management assistance, consultations, software advice and training, sample forms, and solo and small firm resources), GeorgiaAdvocates.org (a free membership site with materials on family law, consumer law, and public benefits, plus webinars), the lawyerslivingwell.org wellness hub, and free Bar Center conference rooms in Atlanta for law-related meetings."
            accessNote="Public and member content; curriculum use." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> A curriculum source for Georgia practice topics, especially family law materials on GeorgiaAdvocates.org. The LPMP sample forms library is reference material only; firm templates always control unless the Attorney says otherwise.
          </div>
          <LinkCard name="TexasLawHelp.org" url="texaslawhelp.org"
            desc="A free, plain-language Texas legal information site maintained for the public."
            accessNote="Public site; no login." />
          <div style={{ fontSize: '12px', color: '#6c757d', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Primarily a learning resource for your curriculum: excellent for building your plain-language understanding of Texas procedures. The Attorney may direct you to pull specific public forms or explainers from it for internal reference. Nothing from this site ever goes to a client as advice.
          </div>
        </Section>

        <Section id="links4" title="4. Trademark Practice" isOpen={open.has('links4')} toggle={toggle}>
          <LinkCard star name="USPTO Trademark Center" url="www.uspto.gov/trademarks"
            desc="The United States Patent and Trademark Office's trademark portal: applications, filings, the public search system, and TSDR status records."
            accessNote="Status lookups and public searches only. Filing is Attorney-only, always." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Run TSDR status checks on every active application and registration each cycle; log the status and next deadline, and docket deadlines in PracticePanther. Run public trademark searches when assigned raw knockout collection: capture screenshots and hit lists with no analysis or conclusions (Part 4.2 guardrail). Docket Section 8, Section 8/15, and renewal windows from registration certificates. You never file, respond, pay a fee, or communicate with the USPTO. <strong>Fee rule:</strong> USPTO filing fees of $350 per class are separate government costs paid directly to the USPTO and are never included in attorney fees.
          </div>
          <LinkCard star name="TM TKO — Trademark Search Platform" url="www.tmtko.com"
            desc="The firm's professional trademark search tool for knockout and clearance search collection."
            accessNote="Firm login for assigned search collection." />
          <div style={{ fontSize: '12px', color: '#6c757d', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Run assigned marks through TM TKO exactly as the Attorney specifies (mark, classes, variations). Export or screenshot the raw results into a hit packet for the Attorney's analysis. Collection only, never characterization: "14 live marks found, results attached" is correct; any opinion about conflict is prohibited.
          </div>
        </Section>

        <Section id="links5" title="5. Business Formation" isOpen={open.has('links5')} toggle={toggle}>
          <LinkCard star name="Texas Secretary of State — Public Site and SOSDirect" url="www.sos.state.tx.us"
            desc="Texas business filings: entity formation, name searches, certificates, and record lookups. The public site is free reference; SOSDirect (direct.sos.state.tx.us) is the paid, logged-in filing and search system."
            accessNote="SOSDirect session use only as assigned; the Attorney submits all filings and payments." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>Texas SOS Instruction Sheet — keep open during every SOS task. Fees change; verify amounts against the current SOS fee schedule before quoting anything internally, and remember that you never quote fees to clients.</strong>
            <div style={{ marginTop: '10px', fontWeight: '600', color: NAVY }}>9.1 The Two Systems</div>
            <ul style={{ margin: '4px 0 10px', paddingLeft: '18px' }}>
              <li>Public site (www.sos.state.tx.us): free reference. Forms, fee schedules, filing guides, and general information live under Business and Nonprofit Filings.</li>
              <li>SOSDirect (direct.sos.state.tx.us): the logged-in, paid system for searches, filings, and document orders. The firm has an account; searches and orders bill to it. Log in only for an assigned task, and log out when the task is done.</li>
            </ul>
            <div style={{ fontWeight: '600', color: NAVY }}>9.2 Name Availability Search (Your Most Common Task) — you collect; the Attorney concludes</div>
            <ul style={{ margin: '4px 0 10px', paddingLeft: '18px' }}>
              <li><strong>Step 1 — Free preliminary check:</strong> run the proposed name through the Comptroller's Taxable Entity Search (mycpa.cpa.state.tx.us/coa/). Free; catches obvious matches. Screenshot the results.</li>
              <li><strong>Step 2 — Official check:</strong> in SOSDirect, run a Name Availability search on the exact proposed name and the close variations the Attorney's assignment lists. Per-search charge applies — run the assigned variations, not exploratory extras.</li>
              <li><strong>Step 3 — Package:</strong> save screenshots of every result page to the matter folder as a name search packet, named per convention, and mark the PP task Ready for Attorney Review.</li>
              <li><strong>Never tell a client a name is or is not available.</strong> "Availability" is a legal conclusion under Texas naming rules, and the SOS's preliminary determination is not final until filing.</li>
            </ul>
            <div style={{ fontWeight: '600', color: NAVY }}>9.3 Entity Formation Filings</div>
            <ul style={{ margin: '4px 0 10px', paddingLeft: '18px' }}>
              <li>Standard LLC filing: Certificate of Formation (Form 205); state filing fee is $300, paid from the firm account with card convenience fees added by the state.</li>
              <li>Your role: prepare the filing data sheet from the engagement and intake (exact entity name, registered agent and office, governing persons, purpose, organizer), stage it FOR-REVIEW, and confirm the registered agent has consented (Form 401-A concept: consent must exist before filing).</li>
              <li>The Attorney reviews the data sheet, enters or verifies the filing in SOSDirect, and personally submits and pays. You never click submit and never enter payment.</li>
              <li>After filing: when the file-stamped certificate and Certificate of Filing come back, save both to the matter, update the PP matter status, and docket the Comptroller franchise tax and Public Information Report obligations as the Attorney directs (those are Comptroller obligations, not SOS — a distinction clients often mix up).</li>
            </ul>
            <div style={{ fontWeight: '600', color: NAVY }}>9.4 Other Regular SOS Tasks</div>
            <ul style={{ margin: '4px 0 10px', paddingLeft: '18px' }}>
              <li>Certificate of Fact / Certificate of Status: order through SOSDirect when a bank, lender, or counterparty requests proof an entity exists and is in good standing. Save the certificate to the matter the day it arrives.</li>
              <li>Certified copies of filed documents: order through SOSDirect per assignment; per-page and certification fees apply.</li>
              <li>Entity record pulls: use SOSDirect to pull filing history and current registered agent information; screenshot and save.</li>
              <li>Registered agent changes (Form 401): prepare the data for the Attorney's filing when a client changes agents, including coordination with Northwest Registered Agent when the firm is setting up the client's RA service.</li>
              <li>Name reservations (Form 501): when the Attorney wants to hold a name before formation, prepare the reservation data; the state fee is $40; the Attorney files.</li>
            </ul>
            <div style={{ fontWeight: '600', color: NAVY }}>9.5 SOSDirect Conduct Rules</div>
            <ul style={{ margin: '4px 0 4px', paddingLeft: '18px' }}>
              <li>Assigned tasks only; every search costs the firm money and creates an account record.</li>
              <li>No payments, no submissions, no account setting changes.</li>
              <li>Screenshots and saved documents for everything; if it is not in the matter folder, it did not happen.</li>
              <li>Anything unexpected (a rejection notice, a name conflict flag, a delinquency status on a client entity) is reported to the Attorney the same day.</li>
            </ul>
          </div>
          <LinkCard star name="Northwest Registered Agent" url="www.northwestregisteredagent.com"
            desc="Two functions: (1) the firm's virtual mail address, where scanned firm mail arrives; and (2) the registered agent provider the firm sets up for business formation clients."
            accessNote="Mail queue monitoring; client RA setup only at Attorney direction." />
          <div style={{ fontSize: '12px', color: '#6c757d', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Check the scanned mail queue at the start of every work block. Save each item to the correct matter in PracticePanther the day it arrives, named per convention, and flag anything from a court, agency, or insurer to the Attorney immediately (hard escalation). For formation clients, set up the client's registered agent service only per the Attorney's written assignment specifying the entity and state. You enter data; the Attorney reviews and authorizes payment.
          </div>
        </Section>

        <Section id="links6" title="6. Litigation and Personal Injury Support" isOpen={open.has('links6')} toggle={toggle}>
          <LinkCard name="File & Serve Texas — Texas E-Filing" url="www.fileandservetexas.com"
            desc="The firm's e-filing service provider for Texas courts. E-filing is mandatory for all attorneys filing civil, family, probate, or criminal cases in the Supreme Court, the Court of Criminal Appeals, the Courts of Appeals, and all district and county courts. Non-attorney filers are encouraged but not required to e-file, and some Justice of the Peace courts also permit e-filing."
            accessNote="Preparation support only. The Attorney personally submits every filing, no exceptions." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> You may assemble filing packets: confirm the document set matches the Attorney's filing checklist, verify formatting, and stage documents in the matter folder marked FOR-REVIEW. You never log in to submit, serve, or pay. Filing is an Attorney-only act in this firm (Playbook Part 3.2), and this site is where that rule matters most.
          </div>
          <LinkCard name="Proof.com — Remote Online Notarization" url="www.proof.com"
            desc="The firm's remote online notary platform, used most often for estate planning signings and verifications."
            accessNote="Session scheduling and document prep as assigned." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Schedule notarization sessions per the Attorney's instruction and send the client the approved what-to-expect script (valid ID, working camera, the documents unsigned until the session). Stage the documents for the session and, afterward, save the completed notarized set and the completion certificate to the matter in PracticePanther.
          </div>
          <LinkCard name="MyFax" url="www.myfax.com"
            desc="The firm's fax service, used mainly for medical records requests and provider correspondence in personal injury matters."
            accessNote="Send approved outbound faxes; monitor inbound." />
          <div style={{ fontSize: '12px', color: '#6c757d', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Send records requests using the approved request letter the Attorney has signed; log the send confirmation to the matter and update the records request tracker. Check inbound faxes each work block; save received records to the matter the same day and update the tracker (Playbook Part 4.3).
          </div>
        </Section>

        <Section id="links7" title="7. Marketing and Client Development" isOpen={open.has('links7')} toggle={toggle}>
          <LinkCard name="Constant Contact — Newsletters" url="www.constantcontact.com"
            desc="The firm's email newsletter platform."
            accessNote="Load and schedule approved content." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Load Attorney-approved newsletter content into the firm template, send the test email to the Attorney, and schedule only after her written approval of the test. Maintain list hygiene as assigned (process unsubscribes, fix bounces). Never add a contact who has not opted in.
          </div>
          <LinkCard name="Instagram" url="instagram.com"
            desc="Primary social channel. Run in the 'Confident Friend Who Happens to Be an Attorney' brand voice."
            accessNote="Publish approved content through the firm accounts only." />
          <LinkCard name="Facebook" url="facebook.com"
            desc="Primary social channel."
            accessNote="Publish approved content through the firm accounts only." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Schedule and publish only content the Attorney has approved in writing; you never write or improvise public copy. Log weekly engagement metrics in the content tracker and flag top performers. You never answer legal questions in comments or DMs — the approved reply directs the person to the consultation booking link, nothing more.
          </div>
          <LinkCard name="Google Ads" url="ads.google.com"
            desc="The firm's paid search advertising account."
            accessNote="Read-only reporting as assigned." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '14px', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> Pull performance reports (spend, clicks, conversions) when assigned and add them to the marketing tracker. Campaign changes are Attorney-only.
          </div>
          <LinkCard name="Yelp — Directory Profile and Client Reviews" url="yelp.com"
            desc="Firm listing and review profile. Reviews on these sites are a core marketing asset, and requesting them is a standing intern task."
            accessNote="Profile monitoring and approved review requests." />
          <LinkCard name="Justia — Directory Profile and Client Reviews" url="justia.com"
            desc="Firm listing and review profile."
            accessNote="Profile monitoring and approved review requests." />
          <LinkCard name="Avvo — Directory Profile and Client Reviews" url="avvo.com"
            desc="Firm listing and review profile."
            accessNote="Profile monitoring and approved review requests." />
          <div style={{ fontSize: '12px', color: '#6c757d', paddingLeft: '4px', lineHeight: '1.7' }}>
            <strong>How to use it:</strong> After the Attorney marks a matter closed and approves outreach, send the client the approved review request script with the direct links to the firm's Yelp, Justia, and Avvo profiles. Verbatim script only. Never offer anything in exchange for a review, never suggest what the review should say, and never request reviews from anyone the Attorney has not approved. Attorney advertising rules apply to everything the firm does here. Check each profile monthly: confirm firm information is current and flag every new review to the Attorney. You never respond to reviews; responses can create confidentiality problems only the Attorney can navigate.
          </div>
        </Section>

        <Section id="links8" title="8. Back Office (Attorney-Only — Listed for Awareness)" isOpen={open.has('links8')} toggle={toggle}>
          <Callout borderColor={RED} bg="#fff5f5" title="">
            You will hear these systems mentioned and should know what they are. <strong>You have no access to any of them.</strong>
          </Callout>
          <LinkCard name="Gusto — Payroll" url="gusto.com"
            desc="Payroll system."
            accessNote="Attorney-only." />
          <LinkCard name="QuickBooks — Firm Bookkeeping" url="quickbooks.intuit.com"
            desc="Firm bookkeeping. Entirely separate from the IOLTA trust accounting you flag milestones for but never touch."
            accessNote="Attorney-only." />
          <LinkCard name="Gilsbar — Professional Liability Insurance" url="gilsbar.com"
            desc="The firm's professional liability (malpractice) insurance administrator. HARD ESCALATION: if any client ever mentions a claim or complaint against the firm, tell the Attorney immediately and put nothing in writing to the client."
            accessNote="Attorney-only." />
          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '14px', lineHeight: '1.7' }}>
            <em>Directory maintenance: when the firm adopts a new system, the Attorney adds it here (or runs the firm's directory-update skill), increments the version, and notifies the team. If you encounter a firm system that is not in this directory, flag it; either it is new and belongs here, or it is not a firm system and client data must not touch it.</em>
          </div>
        </Section>

        {/* Disclaimer */}
        <div style={{ borderTop: '1px solid #e9ecef', paddingTop: '16px', marginTop: '32px', fontSize: '11px', color: '#6c757d', lineHeight: '1.7' }}>
          <strong>Disclaimer:</strong> This playbook is an internal operational reference prepared by and for Jennifer N. Brantley, Esq., J Brantley Law, PLLC. It is confidential attorney work product, is not legal advice to any other person, and should be reviewed against current Texas and Georgia Disciplinary Rules of Professional Conduct, U.S. Department of Labor guidance, and applicable Air Force instructions before implementation and at least annually.
        </div>

      </div>
    </Layout>
  );
}
