import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

const NAVY = '#1B2A4A';
const GOLD  = '#C9A84C';

const PRACTICE_AREAS = [
  'Federal Trademark (USPTO)',
  'Personal Injury - TX',
  'Personal Injury - GA',
  'Business Formation',
  'Contract Review and Drafting',
  'Estate Planning',
  'Government Contracting',
  'Family Law',
];

const PA_ICONS = {
  'Federal Trademark (USPTO)':   '®',
  'Personal Injury - TX':        '🚗',
  'Personal Injury - GA':        '🚗',
  'Business Formation':          '🏢',
  'Contract Review and Drafting':'📜',
  'Estate Planning':             '🏛️',
  'Government Contracting':      '🏛',
  'Family Law':                  '⚖️',
};

// ── Style helpers ────────────────────────────────────────────────────────────
const card = (extra = {}) => ({
  background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px',
  padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,.04)', marginBottom: '16px', ...extra,
});

const inputStyle = (isFocused, readOnly = false) => ({
  width: '100%', padding: '10px 12px', fontSize: '14px',
  border: `1.5px solid ${isFocused ? GOLD : '#dee2e6'}`,
  borderRadius: '5px', outline: 'none', fontFamily: 'Inter,sans-serif',
  color: '#1a1a2e', background: readOnly ? '#fffdf0' : '#fff',
  transition: 'border-color .15s', boxSizing: 'border-box',
});

const selectStyle = (isFocused) => ({
  ...inputStyle(isFocused),
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px',
});

const STATUS_BADGE = {
  Draft:    { bg: '#f1f5f9', color: '#64748b' },
  Complete: { bg: '#dcfce7', color: '#166534' },
  Pending:  { bg: '#fef3c7', color: '#92400e' },
};

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.Draft;
  return (
    <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '20px',
      fontSize: '11px', fontWeight: '600', background: s.bg, color: s.color }}>
      {status || 'Draft'}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function IntakeHub() {
  const [view,              setView]           = useState('grid'); // 'grid' | 'detail' | 'list'
  const [selectedArea,      setSelectedArea]   = useState(null);
  const [step,              setStep]           = useState('script'); // 'script' | 'form'
  const [script,            setScript]         = useState(null);
  const [formFields,        setFormFields]     = useState([]);
  const [formData,          setFormData]       = useState({});
  const [focused,           setFocused]        = useState(null);
  const [contacts,          setContacts]       = useState([]);
  const [intakes,           setIntakes]        = useState([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [useNewContact,     setUseNewContact]  = useState(false);
  const [newContact,        setNewContact]     = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [activeIntakeId,    setActiveIntakeId] = useState(null);
  const [saving,            setSaving]         = useState(false);
  const [exportGenerating,  setExportGenerating] = useState(null); // 'docx' | 'pdf' | null
  const [loading,           setLoading]        = useState(false);
  const [toast,             setToast]          = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadIntakes();
    axios.get('/api/contacts', { params: { type: 'client' } })
      .then(r => setContacts(r.data))
      .catch(() => {});
  }, []);

  const loadIntakes = () => {
    axios.get('/api/intake').then(r => setIntakes(r.data)).catch(() => {});
  };

  const selectArea = async (area) => {
    setLoading(true);
    setSelectedArea(area);
    setFormData({});
    setActiveIntakeId(null);
    setSelectedContactId('');
    setUseNewContact(false);
    setNewContact({ first_name: '', last_name: '', email: '', phone: '' });
    try {
      const [sc, ff] = await Promise.all([
        axios.get(`/api/intake/scripts/${encodeURIComponent(area)}`),
        axios.get(`/api/intake/form-fields/${encodeURIComponent(area)}`),
      ]);
      setScript(sc.data);
      setFormFields(ff.data);
    } catch {
      showToast('Failed to load intake data.', 'error');
    } finally {
      setLoading(false);
    }
    setStep('script');
    setView('detail');
  };

  const handleFieldChange = (name, value) => {
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Auto-compute SOL deadline for PI matters
      if (name === 'accidentDate' && value) {
        const sol = new Date(value);
        sol.setFullYear(sol.getFullYear() + 2);
        updated.solDeadline = sol.toISOString().split('T')[0];
      }
      return updated;
    });
  };

  const saveIntake = async () => {
    if (!selectedContactId && !useNewContact) {
      showToast('Select or create a client contact first.', 'error');
      return;
    }
    if (useNewContact && (!newContact.first_name.trim() || !newContact.last_name.trim())) {
      showToast('New contact requires first and last name.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        practice_area:            selectedArea,
        form_data:                formData,
        conflict_check_completed: formData.conflictCheckCompleted || false,
        conflict_check_cleared:   formData.conflictCheckCleared   || false,
      };
      if (useNewContact) { payload.newContact = newContact; }
      else               { payload.contact_id = selectedContactId; }

      if (activeIntakeId) {
        await axios.put(`/api/intake/${activeIntakeId}`, payload);
        showToast('Intake updated.');
      } else {
        const r = await axios.post('/api/intake', payload);
        setActiveIntakeId(r.data.id);
        showToast('Intake saved.');
      }
      loadIntakes();
    } catch {
      showToast('Failed to save intake.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format) => {
    if (!activeIntakeId) {
      showToast('Save the intake first before exporting.', 'error');
      return;
    }
    setExportGenerating(format);
    try {
      const { data: result } = await axios.post('/api/doc-library/generate-intake', {
        intakeId: activeIntakeId,
        format,
      });
      showToast(`Intake summary generated — downloading…`);
      const { data: blob } = await axios.get(`/api/doc-library/download/${result.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.response?.data?.error || 'Export failed.', 'error');
    } finally {
      setExportGenerating(null);
    }
  };

  const Toast = () => toast ? (
    <div style={{ position: 'fixed', bottom: '28px', right: '28px', zIndex: 400,
      background: toast.type === 'error' ? '#c53030' : '#276749', color: '#fff',
      padding: '12px 20px', borderRadius: '7px', fontSize: '14px', fontWeight: '500',
      boxShadow: '0 4px 16px rgba(0,0,0,.2)', animation: 'slideUp .2s ease' }}>
      {toast.message}
    </div>
  ) : null;

  // ── DETAIL VIEW ─────────────────────────────────────────────────────────────
  if (view === 'detail' && selectedArea) {
    return (
      <Layout>
        <div style={{ padding: '32px 40px', maxWidth: '1100px' }}>
          {/* Back + header */}
          <button onClick={() => { setView('grid'); setSelectedArea(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none',
              border: 'none', color: '#6c757d', fontSize: '13px', cursor: 'pointer',
              padding: '0 0 14px', fontFamily: 'Inter,sans-serif' }}
            onMouseEnter={e => e.currentTarget.style.color = NAVY}
            onMouseLeave={e => e.currentTarget.style.color = '#6c757d'}>
            ← Back to Intake Hub
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '600', color: NAVY,
                fontFamily: 'Playfair Display,Georgia,serif', margin: '0 0 4px' }}>
                {selectedArea} Intake
              </h1>
              <p style={{ color: '#6c757d', fontSize: '13px', margin: 0 }}>
                {PA_ICONS[selectedArea]} Complete the intake script, then fill in the form
              </p>
            </div>
            {/* Step tabs */}
            <div style={{ display: 'flex', gap: '4px', background: '#f1f3f5', borderRadius: '8px', padding: '4px' }}>
              {[
                { id: 'script', label: '📋 Intake Script' },
                { id: 'form',   label: '📝 Intake Form' },
              ].map(t => (
                <button key={t.id} onClick={() => setStep(t.id)} style={{
                  padding: '7px 16px', borderRadius: '6px', border: 'none', fontSize: '13px',
                  fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter,sans-serif',
                  transition: 'all .15s',
                  background: step === t.id ? '#fff' : 'transparent',
                  color:      step === t.id ? NAVY : '#6c757d',
                  boxShadow:  step === t.id ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#adb5bd', fontSize: '14px' }}>
              Loading intake data…
            </div>
          )}

          {/* ── SCRIPT TAB ─────────────────────────────────────────── */}
          {!loading && step === 'script' && script && (
            <div>
              {/* SOL warning */}
              {script.solNote && (
                <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px',
                  padding: '14px 16px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#9b2c2c', margin: 0 }}>
                    ⚠️ {script.solNote}
                  </p>
                </div>
              )}

              {/* Opening script */}
              <div style={card({ borderLeft: `4px solid ${GOLD}` })}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: NAVY, margin: '0 0 12px' }}>
                  Opening Script
                </h3>
                <p style={{ fontSize: '13px', color: '#495057', lineHeight: '1.75',
                  whiteSpace: 'pre-line', margin: 0 }}>
                  {script.intro}
                </p>
              </div>

              {/* Question sections */}
              {script.sections?.map((section, si) => (
                <div key={si} style={card()}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: NAVY, margin: '0 0 14px' }}>
                    {section.title}
                  </h3>
                  {section.questions.map((q, qi) => (
                    <div key={qi} style={{ background: '#f8f9fa', borderRadius: '6px',
                      padding: '12px 14px', marginBottom: qi < section.questions.length - 1 ? '10px' : 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#212529',
                        margin: '0 0 4px', lineHeight: '1.5' }}>
                        Q{qi + 1}: {q.q}
                      </p>
                      <p style={{ fontSize: '11px', color: '#adb5bd', fontStyle: 'italic', margin: 0 }}>
                        Purpose: {q.purpose}
                      </p>
                    </div>
                  ))}
                </div>
              ))}

              {/* Closing script */}
              {script.closing && (
                <div style={card({ borderLeft: `4px solid ${NAVY}` })}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: NAVY, margin: '0 0 12px' }}>
                    Closing Script
                  </h3>
                  <p style={{ fontSize: '13px', color: '#495057', lineHeight: '1.75',
                    whiteSpace: 'pre-line', margin: 0 }}>
                    {script.closing}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => setStep('form')} style={{ padding: '10px 22px', background: GOLD,
                  border: 'none', borderRadius: '6px', color: '#fff', fontSize: '14px', fontWeight: '600',
                  cursor: 'pointer', fontFamily: 'Inter,sans-serif',
                  boxShadow: '0 2px 8px rgba(201,168,76,.35)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#b8943d'}
                  onMouseLeave={e => e.currentTarget.style.background = GOLD}>
                  Continue to Intake Form →
                </button>
              </div>
            </div>
          )}

          {/* ── FORM TAB ───────────────────────────────────────────── */}
          {!loading && step === 'form' && (
            <div>
              {/* Client selection */}
              <div style={card()}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: NAVY, margin: '0 0 14px' }}>Client</h3>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '14px' }}>
                  {[
                    { value: false, label: 'Existing contact' },
                    { value: true,  label: 'New contact' },
                  ].map(opt => (
                    <label key={String(opt.value)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px',
                        cursor: 'pointer', fontSize: '13px', color: '#495057' }}>
                      <input type="radio" checked={useNewContact === opt.value}
                        onChange={() => setUseNewContact(opt.value)}
                        style={{ accentColor: GOLD, cursor: 'pointer' }} />
                      {opt.label}
                    </label>
                  ))}
                </div>

                {!useNewContact ? (
                  <select value={selectedContactId}
                    onChange={e => setSelectedContactId(e.target.value)}
                    style={selectStyle(focused === '__contact')}
                    onFocus={() => setFocused('__contact')}
                    onBlur={() => setFocused(null)}>
                    <option value="">— Select existing client contact —</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}{c.email ? ` — ${c.email}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { name: 'first_name', label: 'First Name', type: 'text' },
                      { name: 'last_name',  label: 'Last Name',  type: 'text' },
                      { name: 'email',      label: 'Email',      type: 'email' },
                      { name: 'phone',      label: 'Phone',      type: 'tel' },
                    ].map(f => (
                      <div key={f.name}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '500',
                          color: '#555', marginBottom: '5px' }}>{f.label}</label>
                        <input type={f.type} value={newContact[f.name] || ''}
                          onChange={e => setNewContact(p => ({ ...p, [f.name]: e.target.value }))}
                          style={inputStyle(focused === `__nc_${f.name}`)}
                          onFocus={() => setFocused(`__nc_${f.name}`)}
                          onBlur={() => setFocused(null)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic form sections */}
              {formFields.map((section, si) => (
                <div key={si} style={card()}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: NAVY, margin: '0 0 14px' }}>
                    {section.section}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {section.fields.map(field => (
                      <div key={field.name}
                        style={{ gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '500',
                          color: '#555', marginBottom: '5px' }}>
                          {field.label}
                          {field.required && <span style={{ color: '#c53030', marginLeft: '3px' }}>*</span>}
                          {field.solField && (
                            <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: '700',
                              background: '#fee2e2', color: '#c53030', padding: '1px 6px',
                              borderRadius: '10px', letterSpacing: '.03em' }}>SOL</span>
                          )}
                        </label>

                        {field.type === 'textarea' ? (
                          <textarea rows={3} value={formData[field.name] || ''}
                            onChange={e => handleFieldChange(field.name, e.target.value)}
                            readOnly={field.readOnly}
                            style={{ ...inputStyle(focused === field.name, field.readOnly),
                              resize: 'vertical', minHeight: '72px' }}
                            onFocus={() => setFocused(field.name)}
                            onBlur={() => setFocused(null)} />

                        ) : field.type === 'select' ? (
                          <select value={formData[field.name] || ''}
                            onChange={e => handleFieldChange(field.name, e.target.value)}
                            style={selectStyle(focused === field.name)}
                            onFocus={() => setFocused(field.name)}
                            onBlur={() => setFocused(null)}>
                            <option value="">Select…</option>
                            {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>

                        ) : (
                          <input type={field.type || 'text'}
                            value={formData[field.name] || ''}
                            onChange={e => handleFieldChange(field.name, e.target.value)}
                            readOnly={field.readOnly}
                            placeholder={field.readOnly ? 'Auto-calculated' : ''}
                            style={inputStyle(focused === field.name, field.readOnly)}
                            onFocus={() => setFocused(field.name)}
                            onBlur={() => setFocused(null)} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Conflict check */}
              <div style={card({ borderLeft: `4px solid ${GOLD}` })}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: NAVY, margin: '0 0 8px' }}>
                  ⚠️ Conflict Check
                </h3>
                <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '14px' }}>
                  Before proceeding, confirm no conflict of interest exists. Check all parties against existing clients and matters.
                </p>
                <div style={{ display: 'flex', gap: '28px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', fontSize: '13px', color: '#495057' }}>
                    <input type="checkbox"
                      checked={formData.conflictCheckCompleted || false}
                      onChange={e => handleFieldChange('conflictCheckCompleted', e.target.checked)}
                      style={{ accentColor: GOLD, cursor: 'pointer' }} />
                    Conflict check completed
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', fontSize: '13px', color: '#166534', fontWeight: '600' }}>
                    <input type="checkbox"
                      checked={formData.conflictCheckCleared || false}
                      onChange={e => handleFieldChange('conflictCheckCleared', e.target.checked)}
                      style={{ accentColor: GOLD, cursor: 'pointer' }} />
                    Cleared — no conflicts identified
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <button onClick={saveIntake} disabled={saving}
                  style={{ padding: '10px 24px', background: saving ? '#2d4a7a' : NAVY, border: 'none',
                    borderRadius: '6px', color: '#fff', fontSize: '14px', fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Inter,sans-serif',
                    opacity: saving ? .8 : 1 }}>
                  {saving ? 'Saving…' : activeIntakeId ? 'Update Intake' : 'Save Intake'}
                </button>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!activeIntakeId && (
                    <span style={{ fontSize: '11px', color: '#adb5bd' }}>
                      Save intake first to export
                    </span>
                  )}
                  {[
                    { format: 'docx', label: '📄 Word (.docx)' },
                    { format: 'pdf',  label: '📋 PDF' },
                  ].map(({ format, label }) => {
                    const isGenerating = exportGenerating === format;
                    const isDisabled   = !activeIntakeId || !!exportGenerating;
                    return (
                      <button key={format}
                        onClick={() => handleExport(format)}
                        disabled={isDisabled}
                        style={{
                          padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '500',
                          fontFamily: 'Inter,sans-serif', transition: 'all .15s', cursor: isDisabled ? 'not-allowed' : 'pointer',
                          background: isDisabled ? '#f1f3f5' : '#fff',
                          border: `1px solid ${isDisabled ? '#dee2e6' : NAVY}`,
                          color: isDisabled ? '#adb5bd' : NAVY,
                          opacity: isDisabled ? .6 : 1,
                        }}
                        onMouseEnter={e => { if (!isDisabled) { e.currentTarget.style.background = NAVY; e.currentTarget.style.color = '#fff'; } }}
                        onMouseLeave={e => { if (!isDisabled) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = NAVY; } }}>
                        {isGenerating ? 'Generating…' : label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeIntakeId && (
                <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '10px' }}>
                  ✓ Intake #{activeIntakeId} saved.
                </p>
              )}
            </div>
          )}
        </div>
        <Toast />
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </Layout>
    );
  }

  // ── GRID / LIST VIEW ─────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ padding: '36px 40px', maxWidth: '1200px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '600', color: NAVY,
              fontFamily: 'Playfair Display,Georgia,serif', margin: '0 0 4px' }}>
              Intake Hub
            </h1>
            <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
              {view === 'list'
                ? `${intakes.length} saved intake${intakes.length !== 1 ? 's' : ''}`
                : 'Select a practice area to begin — script and intake form included'}
            </p>
          </div>
          <button onClick={() => setView(view === 'list' ? 'grid' : 'list')}
            style={{ padding: '9px 18px', background: '#f1f3f5', border: '1px solid #dee2e6',
              borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              fontFamily: 'Inter,sans-serif', color: '#495057' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e9ecef'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f1f3f5'; }}>
            {view === 'list' ? '← Practice Area Grid' : `View All Intakes (${intakes.length})`}
          </button>
        </div>

        {/* ── LIST VIEW ─────────────────────────────────────────── */}
        {view === 'list' ? (
          <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px',
            overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            {intakes.length === 0 ? (
              <div style={{ padding: '80px 40px', textAlign: 'center', color: '#ced4da' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>No intakes saved yet</div>
                <div style={{ fontSize: '13px' }}>Select a practice area from the grid to start your first intake.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                    {['Client', 'Practice Area', 'Status', 'Conflict Check', 'Date Saved'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px',
                        fontWeight: '600', color: '#6c757d', letterSpacing: '.06em',
                        textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {intakes.map((row, i) => (
                    <tr key={row.id}
                      style={{ borderBottom: i < intakes.length - 1 ? '1px solid #f1f3f5' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 16px', fontWeight: '500', color: NAVY }}>
                        {row.first_name
                          ? `${row.first_name} ${row.last_name}`
                          : <span style={{ color: '#ced4da' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6c757d' }}>
                        {PA_ICONS[row.practice_area]} {row.practice_area}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={row.status} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                        {row.conflict_check_cleared
                          ? <span style={{ color: '#166534', fontWeight: '600' }}>✓ Cleared</span>
                          : row.conflict_check_completed
                          ? <span style={{ color: GOLD }}>Completed</span>
                          : <span style={{ color: '#ced4da' }}>Pending</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6c757d' }}>
                        {new Date(row.created_at).toLocaleDateString('en-US',
                          { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        ) : (
          /* ── GRID VIEW ─────────────────────────────────────────── */
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {PRACTICE_AREAS.map(area => (
                <button key={area} onClick={() => selectArea(area)}
                  style={{ textAlign: 'left', background: '#fff', border: '1px solid #e9ecef',
                    borderRadius: '10px', padding: '22px 20px', cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,.04)', transition: 'all .15s',
                    fontFamily: 'Inter,sans-serif' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = GOLD;
                    e.currentTarget.style.boxShadow = `0 4px 16px rgba(201,168,76,.2)`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e9ecef';
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.04)';
                    e.currentTarget.style.transform = 'none';
                  }}>
                  <div style={{ fontSize: '30px', marginBottom: '12px' }}>{PA_ICONS[area] || '⚖️'}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: NAVY,
                    marginBottom: '6px', lineHeight: '1.3' }}>{area}</div>
                  <div style={{ fontSize: '11px', color: '#adb5bd' }}>Script + intake form included</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Toast />
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Layout>
  );
}
