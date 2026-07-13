import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const CATEGORIES = ['All', 'General', 'Personal Injury (TX & GA)', 'Estate Planning', 'Business Formation', 'Trademark', 'Contracts', 'Government Contracting'];

const FIELD_DEFS = {
  'engagement-letter': [
    { name: 'clientName',        label: 'Client Name',                   type: 'text' },
    { name: 'clientAddress',     label: 'Address',                       type: 'text' },
    { name: 'clientCity',        label: 'City',                          type: 'text' },
    { name: 'clientState',       label: 'State',                         type: 'text' },
    { name: 'clientZip',         label: 'ZIP',                           type: 'text' },
    { name: 'matterDescription', label: 'Description of Legal Services', type: 'textarea' },
    { name: 'feeStructure',      label: 'Fee Structure',                 type: 'textarea' },
    { name: 'retainerAmount',    label: 'Retainer Amount ($)',           type: 'text' },
  ],
  'non-engagement-letter': [
    { name: 'clientName',    label: 'Client Name',        type: 'text' },
    { name: 'clientAddress', label: 'Address',            type: 'text' },
    { name: 'reason',        label: 'Reason (optional)',  type: 'textarea' },
  ],
  'pi-demand-letter': [
    { name: 'state',               label: 'State',                                          type: 'select', options: ['Texas', 'Georgia'] },
    { name: 'adjusterName',        label: 'Adjuster Name',                                  type: 'text' },
    { name: 'insurerName',         label: 'Insurance Company',                              type: 'text' },
    { name: 'insurerAddress',      label: 'Insurer Address',                                type: 'text' },
    { name: 'clientName',          label: 'Client Name',                                    type: 'text' },
    { name: 'insuredName',         label: 'Other Driver / Insured',                         type: 'text' },
    { name: 'claimNumber',         label: 'Claim Number',                                   type: 'text' },
    { name: 'policyLimits',        label: 'Policy Limits (if known)',                       type: 'text' },
    { name: 'accidentDate',        label: 'Date of Accident',                               type: 'date' },
    { name: 'accidentLocation',    label: 'Location of Accident',                           type: 'text' },
    { name: 'policeReportNumber',  label: 'Police Report Number',                           type: 'text' },
    { name: 'accidentFacts',       label: 'Facts of Accident (detailed narrative)',          type: 'textarea' },
    { name: 'liabilityBasis',      label: 'Basis of Liability',                             type: 'textarea' },
    { name: 'injuries',            label: 'Injuries Sustained',                             type: 'textarea' },
    { name: 'medicalTreatment',    label: 'Medical Treatment Received',                     type: 'textarea' },
    { name: 'treatingProviders',   label: 'Treating Providers / Facilities',                type: 'textarea' },
    { name: 'currentStatus',       label: 'Current Status / Residual Symptoms',             type: 'textarea' },
    { name: 'permanentImpairment', label: 'Permanent Impairment or Disability (if any)',    type: 'textarea' },
    { name: 'medicalBills',        label: 'Medical Bills Total ($)',                        type: 'text' },
    { name: 'futureMedical',       label: 'Future Medical (est.) ($)',                      type: 'text' },
    { name: 'lostWages',           label: 'Lost Wages ($)',                                 type: 'text' },
    { name: 'futureLostEarnings',  label: 'Future Lost Earning Capacity ($)',               type: 'text' },
    { name: 'painSuffering',       label: 'Pain & Suffering ($)',                           type: 'text' },
    { name: 'mentalAnguish',       label: 'Mental Anguish ($)',                             type: 'text' },
    { name: 'lossOfEnjoyment',     label: 'Loss of Enjoyment of Life ($)',                  type: 'text' },
    { name: 'propertyDamage',      label: 'Property Damage ($)',                            type: 'text' },
    { name: 'totalDamages',        label: 'Total Damages ($)',                              type: 'text' },
    { name: 'liensAmount',         label: 'Known Liens / Subrogation ($)',                  type: 'text' },
    { name: 'demandAmount',        label: 'Settlement Demand ($)',                          type: 'text' },
    { name: 'demandAmountWords',   label: 'Demand Amount (in words)',                       type: 'text' },
    { name: 'demandDeadlineDays',  label: 'Response Deadline (days)',                       type: 'text' },
  ],
  'pi-representation-letter': [
    { name: 'state',           label: 'State (TX or GA)',              type: 'select', options: ['Texas', 'Georgia'] },
    { name: 'adjusterName',    label: 'Adjuster Name',                 type: 'text' },
    { name: 'insurerName',     label: 'Insurance Company',             type: 'text' },
    { name: 'insurerAddress',  label: 'Insurer Address',               type: 'text' },
    { name: 'claimNumber',     label: 'Claim Number (if known)',       type: 'text' },
    { name: 'clientName',      label: 'Client Name',                   type: 'text' },
    { name: 'clientAddress',   label: 'Client Address',                type: 'text' },
    { name: 'clientPhone',     label: 'Client Phone',                  type: 'text' },
    { name: 'insuredName',     label: 'Other Driver / Insured Name',   type: 'text' },
    { name: 'accidentDate',    label: 'Date of Accident',              type: 'date' },
    { name: 'accidentLocation',label: 'Location of Accident',          type: 'text' },
    { name: 'coverageType',    label: 'Coverage Type',                 type: 'text' },
  ],
  'will-tx': [
    { name: 'clientName',             label: 'Testator Full Legal Name',                    type: 'text' },
    { name: 'county',                 label: 'County (TX)',                                  type: 'text' },
    { name: 'maritalStatus',          label: 'Marital Status',                               type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
    { name: 'spouseName',             label: 'Spouse Name (if married)',                     type: 'text' },
    { name: 'tangiblePropertyBequests',label: 'Tangible Personal Property — To Whom',       type: 'text' },
    { name: 'specificBequests',        label: 'Specific Bequests',                           type: 'textarea' },
    { name: 'primaryBeneficiaries',   label: 'Primary Beneficiaries & Shares',              type: 'textarea' },
    { name: 'contingentBeneficiaries',label: 'Contingent Beneficiaries',                    type: 'textarea' },
    { name: 'executor',               label: 'Executor Name',                                type: 'text' },
    { name: 'executorBackup',         label: 'Backup Executor Name',                         type: 'text' },
    { name: 'minorChildren',          label: 'Minor Children? (Yes/No)',                     type: 'text' },
    { name: 'guardian',               label: 'Guardian Name (if minor children)',            type: 'text' },
    { name: 'guardianBackup',         label: 'Backup Guardian',                              type: 'text' },
  ],
  'will-ga': [
    { name: 'clientName',             label: 'Testator Full Legal Name',                    type: 'text' },
    { name: 'county',                 label: 'County (GA)',                                  type: 'text' },
    { name: 'maritalStatus',          label: 'Marital Status',                               type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
    { name: 'spouseName',             label: 'Spouse Name (if married)',                     type: 'text' },
    { name: 'tangiblePropertyBequests',label: 'Tangible Personal Property — To Whom',       type: 'text' },
    { name: 'specificBequests',        label: 'Specific Bequests',                           type: 'textarea' },
    { name: 'primaryBeneficiaries',   label: 'Primary Beneficiaries & Shares',              type: 'textarea' },
    { name: 'contingentBeneficiaries',label: 'Contingent Beneficiaries',                    type: 'textarea' },
    { name: 'executor',               label: 'Personal Representative Name',                 type: 'text' },
    { name: 'executorBackup',         label: 'Backup Personal Representative',               type: 'text' },
    { name: 'minorChildren',          label: 'Minor Children? (Yes/No)',                     type: 'text' },
    { name: 'guardian',               label: 'Guardian Name (if minor children)',            type: 'text' },
    { name: 'guardianBackup',         label: 'Backup Guardian',                              type: 'text' },
  ],
  'directive-tx': [
    { name: 'clientName',             label: 'Principal Name',              type: 'text' },
    { name: 'city',                   label: 'City',                         type: 'text' },
    { name: 'county',                 label: 'County',                       type: 'text' },
    { name: 'healthcareAgent',        label: 'Healthcare Agent Name',        type: 'text' },
    { name: 'healthcareAgentBackup',  label: 'Backup Healthcare Agent',      type: 'text' },
    { name: 'additionalWishes',       label: 'Additional Treatment Wishes',  type: 'textarea' },
  ],
  'directive-ga': [
    { name: 'clientName',              label: 'Principal Name',             type: 'text' },
    { name: 'address',                 label: 'Address',                    type: 'text' },
    { name: 'county',                  label: 'County',                     type: 'text' },
    { name: 'healthcareAgent',         label: 'Healthcare Agent Name',      type: 'text' },
    { name: 'healthcareAgentAddress',  label: 'Agent Address',              type: 'text' },
    { name: 'healthcareAgentPhone',    label: 'Agent Phone',                type: 'tel' },
    { name: 'healthcareAgentBackup',   label: 'Alternate Agent',            type: 'text' },
    { name: 'lifeSupportWishes',       label: 'Life Support Wishes',        type: 'textarea' },
    { name: 'artificialNutrition',     label: 'Artificial Nutrition',       type: 'select', options: ['Withdraw', 'Withhold', 'Continue'] },
    { name: 'organDonation',           label: 'Organ Donation',             type: 'select', options: ['Yes — any organs', 'Yes — specific organs only', 'No'] },
  ],
  'dpoa-tx': [
    { name: 'clientName',           label: 'Principal Name',                                        type: 'text' },
    { name: 'financialAgent',       label: 'Agent Name',                                            type: 'text' },
    { name: 'financialAgentBackup', label: 'Successor Agent',                                       type: 'text' },
    { name: 'springPoa',            label: 'Springing POA?',                                        type: 'select', options: ['No — immediate', 'Yes — springing'] },
  ],
  'dpoa-ga': [
    { name: 'clientName',           label: 'Principal Name',   type: 'text' },
    { name: 'county',               label: 'County',           type: 'text' },
    { name: 'financialAgent',       label: 'Agent Name',       type: 'text' },
    { name: 'financialAgentBackup', label: 'Successor Agent',  type: 'text' },
    { name: 'springPoa',            label: 'Springing POA?',   type: 'select', options: ['No — immediate', 'Yes — springing'] },
  ],
  'medical-poa-tx': [
    { name: 'clientName',              label: 'Principal Name',         type: 'text' },
    { name: 'healthcareAgent',         label: 'Agent Name',             type: 'text' },
    { name: 'healthcareAgentAddress',  label: 'Agent Address',          type: 'text' },
    { name: 'healthcareAgentPhone',    label: 'Agent Phone',            type: 'tel' },
    { name: 'healthcareAgentBackup',   label: 'Backup Agent',           type: 'text' },
    { name: 'specificInstructions',    label: 'Specific Instructions',  type: 'textarea' },
    { name: 'agentLimitations',        label: 'Agent Limitations',      type: 'textarea' },
  ],
  'llc-operating-tx': [
    { name: 'companyName',            label: 'LLC Name',               type: 'text' },
    { name: 'principalAddress',       label: 'Principal Office Address',type: 'text' },
    { name: 'registeredAgent',        label: 'Registered Agent Name',  type: 'text' },
    { name: 'registeredAgentAddress', label: 'Registered Agent Address',type: 'text' },
    { name: 'businessPurpose',        label: 'Business Purpose',       type: 'textarea' },
    { name: 'managementType',         label: 'Management Type',        type: 'select', options: ['Member-Managed', 'Manager-Managed'] },
    { name: 'member1Name',            label: 'Member 1 Name',          type: 'text' },
    { name: 'member1Ownership',       label: 'Member 1 Ownership %',   type: 'text' },
    { name: 'capitalContributions',   label: 'Capital Contributions',  type: 'textarea' },
  ],
  'llc-operating-ga': [
    { name: 'companyName',            label: 'LLC Name',               type: 'text' },
    { name: 'principalAddress',       label: 'Principal Office Address',type: 'text' },
    { name: 'registeredAgent',        label: 'Registered Agent Name',  type: 'text' },
    { name: 'registeredAgentAddress', label: 'Registered Agent Address',type: 'text' },
    { name: 'businessPurpose',        label: 'Business Purpose',       type: 'textarea' },
    { name: 'managementType',         label: 'Management Type',        type: 'select', options: ['Member-Managed', 'Manager-Managed'] },
    { name: 'member1Name',            label: 'Member 1 Name',          type: 'text' },
    { name: 'member1Ownership',       label: 'Member 1 Ownership %',   type: 'text' },
    { name: 'capitalContributions',   label: 'Capital Contributions',  type: 'textarea' },
  ],
  'corporate-resolution-tx': [
    { name: 'companyName',          label: 'Company Name',                           type: 'text' },
    { name: 'formationDate',        label: 'Formation/Filing Date',                  type: 'date' },
    { name: 'registeredAgent',      label: 'Registered Agent Name',                  type: 'text' },
    { name: 'registeredAgentAddress',label: 'Registered Agent Address',              type: 'text' },
    { name: 'authorizedSigners',    label: 'Authorized Bank Signers',                type: 'text' },
    { name: 'taxClassification',    label: 'Tax Classification',                     type: 'text' },
    { name: 'officers',             label: 'Officers & Titles',                      type: 'textarea' },
    { name: 'sCorpElection',        label: 'S-Corp Election?',                       type: 'select', options: ['No', 'Yes'] },
    { name: 'taxElectionDate',      label: 'S-Corp Election Effective Date (if Yes)',type: 'date' },
    { name: 'member1Name',          label: 'Member/Manager 1',                       type: 'text' },
    { name: 'member2Name',          label: 'Member/Manager 2 (if applicable)',        type: 'text' },
  ],
  'annual-meeting-minutes': [
    { name: 'companyName',      label: 'Company Name',                   type: 'text' },
    { name: 'meetingDate',      label: 'Meeting Date',                   type: 'date' },
    { name: 'meetingTime',      label: 'Meeting Time',                   type: 'text' },
    { name: 'meetingLocation',  label: 'Meeting Location/Platform',      type: 'text' },
    { name: 'presidingOfficer', label: 'Presiding Officer',              type: 'text' },
    { name: 'attendees',        label: 'Attendees',                      type: 'textarea' },
    { name: 'financialReport',  label: 'Financial Report Summary',       type: 'textarea' },
    { name: 'officers',         label: 'Elected Officers/Managers',      type: 'textarea' },
    { name: 'otherBusiness',    label: 'Other Business Transacted',      type: 'textarea' },
    { name: 'adjournTime',      label: 'Adjournment Time',               type: 'text' },
  ],
  'special-meeting-minutes': [
    { name: 'companyName',       label: 'Company Name',                      type: 'text' },
    { name: 'meetingDate',       label: 'Meeting Date',                      type: 'date' },
    { name: 'meetingTime',       label: 'Meeting Time',                      type: 'text' },
    { name: 'meetingLocation',   label: 'Meeting Location/Platform',         type: 'text' },
    { name: 'meetingPurpose',    label: 'Purpose of Special Meeting',        type: 'textarea' },
    { name: 'presidingOfficer',  label: 'Presiding Officer',                 type: 'text' },
    { name: 'attendees',         label: 'Attendees',                         type: 'textarea' },
    { name: 'businessConducted', label: 'Business Conducted / Resolutions',  type: 'textarea' },
    { name: 'adjournTime',       label: 'Adjournment Time',                  type: 'text' },
  ],
  'trademark-opinion': [
    { name: 'clientName',       label: 'Client Name',               type: 'text' },
    { name: 'markText',         label: 'Mark / Name',               type: 'text' },
    { name: 'goodsServices',    label: 'Goods / Services',          type: 'textarea' },
    { name: 'tessResults',      label: 'USPTO TESS Search Results', type: 'textarea' },
    { name: 'commonLawResults', label: 'Common Law Search Results', type: 'textarea' },
    { name: 'domainResults',    label: 'Domain & Social Results',   type: 'textarea' },
    { name: 'analysisText',     label: 'Analysis (DuPont factors)', type: 'textarea' },
    { name: 'recommendation',   label: 'Opinion & Recommendation',  type: 'textarea' },
    { name: 'caveats',          label: 'Limitations / Caveats',     type: 'textarea' },
  ],
  'contract-review-memo': [
    { name: 'clientName',            label: 'Client Name',                          type: 'text' },
    { name: 'contractType',          label: 'Contract Type',                        type: 'text' },
    { name: 'parties',               label: 'Parties to Contract',                  type: 'textarea' },
    { name: 'effectiveDate',         label: 'Effective Date',                       type: 'date' },
    { name: 'term',                  label: 'Contract Term',                        type: 'text' },
    { name: 'governingLaw',          label: 'Governing Law',                        type: 'text' },
    { name: 'contractValue',         label: 'Contract Value',                       type: 'text' },
    { name: 'terminationProvisions', label: 'Termination Provisions',               type: 'textarea' },
    { name: 'issues',                label: 'Issues & Concerns (numbered list)',     type: 'textarea' },
    { name: 'missingProvisions',     label: 'Missing Provisions',                   type: 'textarea' },
    { name: 'favorableProvisions',   label: 'Favorable Provisions',                 type: 'textarea' },
    { name: 'recommendations',       label: 'Recommendations',                      type: 'textarea' },
  ],
  'gov-engagement-letter': [
    { name: 'clientName',   label: 'Client Name',                    type: 'text' },
    { name: 'businessName', label: 'Business Name',                  type: 'text' },
    { name: 'clientAddress',label: 'Address',                        type: 'text' },
    { name: 'phase1Fee',    label: 'Phase 1 Fee (SAM.gov) $',        type: 'text' },
    { name: 'phase2Fee',    label: 'Phase 2 Fee (Certifications) $', type: 'text' },
    { name: 'phase3Fee',    label: 'Phase 3 Fee (Contract Review) $',type: 'text' },
    { name: 'phase4Fee',    label: 'Phase 4 Monthly Retainer $',     type: 'text' },
  ],
};

const CATEGORY_COLORS = {
  'General': { bg: '#f0f2f5', text: '#495057' },
  'Personal Injury (TX & GA)': { bg: '#fff0f0', text: '#c53030' },
  'Estate Planning': { bg: '#f0fff4', text: '#276749' },
  'Business Formation': { bg: '#ebf8ff', text: '#2b6cb0' },
  'Trademark': { bg: '#faf0ff', text: '#6b46c1' },
  'Contracts': { bg: '#fffaf0', text: '#c05621' },
  'Government Contracting': { bg: `${GOLD}15`, text: '#7a5c0a' },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function DocumentLibrary() {
  const { user } = useAuth();
  const [templates,  setTemplates]  = useState([]);
  const [generated,  setGenerated]  = useState([]);
  const [category,   setCategory]   = useState('All');
  const [tab,        setTab]        = useState('templates');
  const [selected,   setSelected]   = useState(null);
  const [formData,   setFormData]   = useState({});
  const [format,     setFormat]     = useState('docx');
  const [generating, setGenerating] = useState(false);
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [panelVis,   setPanelVis]   = useState(false);
  const [focused,    setFocused]    = useState(null);
  const [deleteId,   setDeleteId]   = useState(null);
  const [toast,      setToast]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [signDoc,    setSignDoc]    = useState(null);
  const [signForm,   setSignForm]   = useState({ recipient_name: '', recipient_email: '', matter_id: '' });
  const [matters,    setMatters]    = useState([]);
  const [signing,    setSigning]    = useState(false);
  const panelRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadAll();
    axios.get('/api/billing/matters').then(r => setMatters(r.data)).catch(() => {});
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tmplRes, genRes] = await Promise.all([
        axios.get('/api/doc-library/templates'),
        axios.get('/api/doc-library/generated'),
      ]);
      setTemplates(tmplRes.data);
      setGenerated(genRes.data);
    } catch {
      showToast('Failed to load document library.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openPanel = (tmpl) => {
    setSelected(tmpl);
    setFormData({});
    setFormat('docx');
    setFocused(null);
    setPanelOpen(true);
    setTimeout(() => setPanelVis(true), 30);
  };

  const closePanel = () => {
    setPanelVis(false);
    setTimeout(() => { setPanelOpen(false); setSelected(null); }, 280);
  };

  const handleGenerate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const { data: result } = await axios.post('/api/doc-library/generate', {
        templateKey: selected.key,
        format,
        data: formData,
      });
      showToast(`${selected.name} generated — downloading…`);
      closePanel();
      // Download immediately via blob
      const { data: blob } = await axios.get(`/api/doc-library/download/${result.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      a.click();
      URL.revokeObjectURL(url);
      await axios.get('/api/doc-library/generated').then(r => setGenerated(r.data));
    } catch (err) {
      showToast(err.response?.data?.error || 'Generation failed.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const { data: blob } = await axios.get(`/api/doc-library/download/${doc.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.document_name}.${doc.document_type}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Download failed.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/doc-library/${id}`);
      setDeleteId(null);
      setGenerated(prev => prev.filter(d => d.id !== id));
      showToast('Document deleted.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed.', 'error');
    }
  };

  const handleSign = async () => {
    if (!signForm.recipient_email || !signDoc) return;
    setSigning(true);
    try {
      await axios.post('/api/esignature/send', {
        document_name: signDoc.document_name,
        recipient_name: signForm.recipient_name,
        recipient_email: signForm.recipient_email,
        matter_id: signForm.matter_id || null,
      });
      setSignDoc(null);
      setSignForm({ recipient_name: '', recipient_email: '', matter_id: '' });
      showToast('Signature request sent successfully.');
    } catch {
      showToast('Failed to send signature request.', 'error');
    }
    setSigning(false);
  };

  const fields         = selected ? (FIELD_DEFS[selected.key] || []) : [];
  const filtered       = category === 'All' ? templates : templates.filter(t => t.category === category);

  const inp = (name) => ({
    width: '100%', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box',
    border: `1.5px solid ${focused === name ? GOLD : '#dee2e6'}`, borderRadius: '5px',
    outline: 'none', fontFamily: 'Inter,sans-serif', color: '#1a1a2e', background: '#fff',
    transition: 'border-color .15s',
  });
  const sel = (name) => ({
    ...inp(name), appearance: 'none', cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px',
  });

  return (
    <Layout>
      <div style={{ padding: '36px 40px', maxWidth: '1260px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '600', color: NAVY, fontFamily: 'Playfair Display,Georgia,serif', margin: '0 0 4px' }}>
            Document Library
          </h1>
          <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
            {loading ? 'Loading…' : `${templates.length} templates — Word (.docx) and PDF generation`}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', background: '#f0f2f5', padding: '4px', borderRadius: '8px', width: 'fit-content', marginBottom: '24px' }}>
          {[['templates', 'Templates'], ['generated', 'Generated Documents']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '7px 18px', fontSize: '13px', fontWeight: '500', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontFamily: 'Inter,sans-serif', transition: 'all .15s',
              background: tab === key ? '#fff' : 'transparent',
              color:      tab === key ? NAVY : '#6c757d',
              boxShadow:  tab === key ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Templates tab ───────────────────────────────────────────── */}
        {tab === 'templates' && (
          <>
            {/* Category filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)} style={{
                  padding: '5px 14px', fontSize: '12px', fontWeight: '500', borderRadius: '20px',
                  border: `1.5px solid ${category === c ? NAVY : '#dee2e6'}`,
                  background: category === c ? NAVY : '#fff',
                  color:      category === c ? '#fff' : '#495057',
                  cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all .15s',
                }}>
                  {c}
                </button>
              ))}
            </div>

            {/* Template grid */}
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#adb5bd', fontSize: '14px' }}>Loading templates…</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: '16px' }}>
                {filtered.map(tmpl => {
                  const cat = CATEGORY_COLORS[tmpl.category] || { bg: '#f0f2f5', text: '#495057' };
                  return (
                    <div key={tmpl.key}
                      onClick={() => openPanel(tmpl)}
                      style={{
                        background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px',
                        padding: '18px 20px', cursor: 'pointer', transition: 'all .18s',
                        boxShadow: '0 1px 4px rgba(0,0,0,.04)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.boxShadow = '0 4px 12px rgba(201,168,76,.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e9ecef'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.04)'; e.currentTarget.style.transform = 'none'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', background: cat.bg, color: cat.text, padding: '3px 8px', borderRadius: '4px' }}>
                          {tmpl.category}
                        </span>
                        <span style={{ fontSize: '11px', color: '#adb5bd', fontFamily: 'monospace' }}>DOCX+PDF</span>
                      </div>
                      <h3 style={{ fontSize: '13px', fontWeight: '600', color: NAVY, margin: '0 0 4px' }}>{tmpl.name}</h3>
                      <p style={{ fontSize: '12px', color: '#6c757d', margin: '0 0 14px', lineHeight: 1.4 }}>{tmpl.description}</p>
                      <span style={{ fontSize: '12px', color: GOLD, fontWeight: '600' }}>Generate Document →</span>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div style={{ gridColumn: '1/-1', padding: '60px', textAlign: 'center', color: '#adb5bd', fontSize: '14px' }}>
                    No templates in this category.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Generated documents tab ─────────────────────────────────── */}
        {tab === 'generated' && (
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e9ecef', boxShadow: '0 1px 4px rgba(0,0,0,.04)', overflow: 'hidden' }}>
            {generated.length === 0 ? (
              <div style={{ padding: '80px 40px', textAlign: 'center' }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#dee2e6" strokeWidth="1.2" style={{ marginBottom: '14px' }}>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#adb5bd', margin: '0 0 6px' }}>No documents generated yet</h3>
                <p style={{ fontSize: '14px', color: '#ced4da', margin: '0 0 16px' }}>Select a template from the Templates tab to get started.</p>
                <button onClick={() => setTab('templates')} style={{ padding: '9px 20px', background: GOLD, border: 'none', borderRadius: '6px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                  Browse Templates
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                    {['Document', 'Type', 'Generated By', 'Date', ''].map((h, i) => (
                      <th key={i} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6c757d', letterSpacing: '.06em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {generated.map((d, i) => {
                    const isDel = deleteId === d.id;
                    return (
                      <tr key={d.id}
                        style={{ borderBottom: i < generated.length - 1 ? '1px solid #f1f3f5' : 'none', background: isDel ? '#fff5f5' : 'transparent', transition: 'background .1s' }}
                        onMouseEnter={(e) => { if (!isDel) e.currentTarget.style.background = '#fafbfc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isDel ? '#fff5f5' : 'transparent'; }}>
                        <td style={{ padding: '13px 16px', fontWeight: '500', color: NAVY }}>
                          <div>{d.document_name}</div>
                          {d.practice_area && <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>{d.practice_area}</div>}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', color: d.document_type === 'pdf' ? '#c53030' : '#1B4FBE', background: d.document_type === 'pdf' ? '#fff5f5' : '#f0f4ff', padding: '2px 6px', borderRadius: '3px', letterSpacing: '.04em' }}>
                            {d.document_type?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '13px 16px', fontSize: '13px', color: '#6c757d' }}>{d.created_by_name || '—'}</td>
                        <td style={{ padding: '13px 16px', fontSize: '13px', color: '#6c757d', whiteSpace: 'nowrap' }}>{fmtDate(d.created_at)}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {isDel ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                              <span style={{ fontSize: '12px', color: '#c53030' }}>Delete permanently?</span>
                              <button onClick={() => handleDelete(d.id)} style={{ padding: '3px 10px', background: '#c53030', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>Delete</button>
                              <button onClick={() => setDeleteId(null)} style={{ padding: '3px 8px', background: 'transparent', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>Cancel</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', opacity: 0 }}
                              ref={(el) => { if (el) { el.closest('tr').addEventListener('mouseenter', () => el.style.opacity = 1); el.closest('tr').addEventListener('mouseleave', () => el.style.opacity = 0); } }}>
                              <button onClick={() => handleDownload(d)} title="Download" style={{ background: 'none', border: '1px solid #dee2e6', borderRadius: '5px', padding: '4px 7px', cursor: 'pointer', color: '#6c757d', display: 'flex', alignItems: 'center' }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.color = NAVY; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.color = '#6c757d'; }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              </button>
                              {user?.role === 'attorney' && (
                                <button onClick={() => { setSignDoc(d); setSignForm({ recipient_name: '', recipient_email: '', matter_id: '' }); }} title="Send for Signature" style={{ background: 'none', border: '1px solid #dee2e6', borderRadius: '5px', padding: '4px 7px', cursor: 'pointer', color: '#6c757d', display: 'flex', alignItems: 'center', fontSize: '11px', gap: '3px', fontFamily: 'Inter,sans-serif' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = '#b8943d'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.color = '#6c757d'; }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                  Sign
                                </button>
                              )}
                              {user?.role === 'attorney' && (
                                <button onClick={() => setDeleteId(d.id)} title="Delete" style={{ background: 'none', border: '1px solid #dee2e6', borderRadius: '5px', padding: '4px 7px', cursor: 'pointer', color: '#6c757d', display: 'flex', alignItems: 'center' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#c53030'; e.currentTarget.style.color = '#c53030'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.color = '#6c757d'; }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Generate slide-over panel ─────────────────────────────────── */}
      {panelOpen && (
        <>
          <div onClick={closePanel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 200, opacity: panelVis ? 1 : 0, transition: 'opacity .25s' }} />
          <div ref={panelRef} style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '520px', background: '#fff', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,.15)', transform: panelVis ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .28s cubic-bezier(.4,0,.2,1)' }}>
            {/* Panel header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: '600', color: NAVY, margin: '0 0 2px', fontFamily: 'Playfair Display,Georgia,serif' }}>{selected?.name}</h2>
                <p style={{ fontSize: '12px', color: '#6c757d', margin: 0 }}>{selected?.description}</p>
              </div>
              <button onClick={closePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#adb5bd', padding: '4px', display: 'flex' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#495057'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#adb5bd'}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Format selector */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #f1f3f5', display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0, background: '#fafbfc' }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#555' }}>Format:</span>
              {[['docx', 'Word (.docx)'], ['pdf', 'PDF']].map(([val, label]) => (
                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#333' }}>
                  <input type="radio" name="format" value={val} checked={format === val} onChange={() => setFormat(val)}
                    style={{ accentColor: GOLD }} />
                  {label}
                </label>
              ))}
            </div>

            {/* Fields */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {fields.length === 0 && (
                <p style={{ color: '#6c757d', fontSize: '13px', fontStyle: 'italic' }}>
                  This template uses default firm placeholders. Click Generate to create the document.
                </p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {fields.map(field => (
                  <div key={field.name} style={{ gridColumn: field.type === 'textarea' ? '1/-1' : 'auto' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea rows={3} value={formData[field.name] || ''} style={{ ...inp(field.name), resize: 'vertical', minHeight: '72px' }}
                        onFocus={() => setFocused(field.name)} onBlur={() => setFocused(null)}
                        onChange={e => setFormData(p => ({ ...p, [field.name]: e.target.value }))} />
                    ) : field.type === 'select' ? (
                      <select value={formData[field.name] || ''} style={sel(field.name)}
                        onFocus={() => setFocused(field.name)} onBlur={() => setFocused(null)}
                        onChange={e => setFormData(p => ({ ...p, [field.name]: e.target.value }))}>
                        <option value="">Select…</option>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={field.type || 'text'} value={formData[field.name] || ''} style={inp(field.name)}
                        onFocus={() => setFocused(field.name)} onBlur={() => setFocused(null)}
                        onChange={e => setFormData(p => ({ ...p, [field.name]: e.target.value }))} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Panel footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e9ecef', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={closePanel} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #dee2e6', borderRadius: '5px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter,sans-serif', color: '#495057' }}>
                Cancel
              </button>
              <button onClick={handleGenerate} disabled={generating} style={{ padding: '9px 24px', background: generating ? '#d4b878' : NAVY, border: 'none', borderRadius: '5px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'Inter,sans-serif', transition: 'background .15s' }}
                onMouseEnter={(e) => { if (!generating) e.currentTarget.style.background = '#131f36'; }}
                onMouseLeave={(e) => { if (!generating) e.currentTarget.style.background = NAVY; }}>
                {generating ? 'Generating…' : `Generate ${format.toUpperCase()}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Sign Now Modal */}
      {signDoc && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:400 }} onClick={() => setSignDoc(null)} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:460, background:'#fff', borderRadius:'10px', boxShadow:'0 8px 40px rgba(0,0,0,.18)', zIndex:500, padding:28 }}>
            <div style={{ fontSize:'15px', fontWeight:'700', color:NAVY, marginBottom:4 }}>Send for Signature</div>
            <div style={{ fontSize:'12px', color:'#6c757d', marginBottom:16 }}>{signDoc.document_name}</div>
            <label style={{ fontSize:'12px', fontWeight:'600', color:'#555', display:'block', marginBottom:4 }}>Recipient Name</label>
            <input style={{ width:'100%', border:'1px solid #ced4da', borderRadius:6, padding:'9px 12px', fontSize:13, boxSizing:'border-box', marginBottom:12, fontFamily:'Inter,sans-serif' }}
              value={signForm.recipient_name} placeholder="Client name"
              onChange={e => setSignForm(p => ({ ...p, recipient_name: e.target.value }))} />
            <label style={{ fontSize:'12px', fontWeight:'600', color:'#555', display:'block', marginBottom:4 }}>Recipient Email *</label>
            <input type="email" style={{ width:'100%', border:'1px solid #ced4da', borderRadius:6, padding:'9px 12px', fontSize:13, boxSizing:'border-box', marginBottom:12, fontFamily:'Inter,sans-serif' }}
              value={signForm.recipient_email} placeholder="client@email.com"
              onChange={e => setSignForm(p => ({ ...p, recipient_email: e.target.value }))} />
            <label style={{ fontSize:'12px', fontWeight:'600', color:'#555', display:'block', marginBottom:4 }}>Link to Matter (optional)</label>
            <select style={{ width:'100%', border:'1px solid #ced4da', borderRadius:6, padding:'9px 12px', fontSize:13, boxSizing:'border-box', marginBottom:16, fontFamily:'Inter,sans-serif' }}
              value={signForm.matter_id} onChange={e => setSignForm(p => ({ ...p, matter_id: e.target.value }))}>
              <option value="">— None —</option>
              {matters.map(m => <option key={m.id} value={m.id}>{m.matter_number} — {m.matter_name}</option>)}
            </select>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button style={{ background:'#fff', color:'#555', border:'1px solid #ced4da', borderRadius:6, padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif' }} onClick={() => setSignDoc(null)}>Cancel</button>
              <button style={{ background:NAVY, color:'#fff', border:'none', borderRadius:6, padding:'9px 18px', fontSize:13, fontWeight:600, cursor:signing?'not-allowed':'pointer', opacity:signing?0.7:1, fontFamily:'Inter,sans-serif' }}
                onClick={handleSign} disabled={signing || !signForm.recipient_email}>
                {signing ? 'Sending…' : 'Send Signature Link'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '28px', right: '28px', background: toast.type === 'error' ? '#c53030' : '#276749', color: '#fff', padding: '12px 20px', borderRadius: '7px', fontSize: '14px', fontWeight: '500', zIndex: 400, boxShadow: '0 4px 16px rgba(0,0,0,.2)', animation: 'slideUp .2s ease' }}>
          {toast.message}
        </div>
      )}
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Layout>
  );
}
