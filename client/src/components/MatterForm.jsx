import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const PRACTICE_AREAS = [
  'Personal Injury',
  'Criminal Defense',
  'Family Law',
  'Estate Planning / Probate',
  'Real Estate',
  'Business / Corporate',
  'Civil Litigation',
  'Employment Law',
  'Immigration',
  'Bankruptcy',
  'Workers Compensation',
  'Social Security Disability',
  'Other',
];

const STATUSES = [
  { value: 'open',     label: 'Open' },
  { value: 'pending',  label: 'Pending' },
  { value: 'closed',   label: 'Closed' },
  { value: 'inactive', label: 'Inactive' },
];

const EMPTY = {
  matter_number: '', matter_name: '', practice_area: '', status: 'open',
  open_date: '', sol_date: '', client_id: '', assigned_staff: '',
  description: '', notes: '',
};

// staff_ids is managed separately from form to keep EMPTY backward-compat


const toDateInput = (v) => (v ? String(v).slice(0, 10) : '');

const fieldStyle = (focused) => ({
  width: '100%', padding: '10px 12px', fontSize: '14px',
  border: `1.5px solid ${focused ? GOLD : '#dee2e6'}`,
  borderRadius: '5px', outline: 'none', fontFamily: 'Inter, sans-serif',
  color: '#1a1a2e', background: '#fff', transition: 'border-color 0.15s',
  boxSizing: 'border-box',
});

const selectStyle = (focused) => ({
  ...fieldStyle(focused),
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px',
});

const labelStyle = {
  display: 'block', fontSize: '12px', fontWeight: '500',
  color: '#555', marginBottom: '5px', letterSpacing: '0.02em',
};

export default function MatterForm({ isOpen, matter, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [staffIds, setStaffIds] = useState([]);
  const [focused, setFocused] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const firstRef = useRef(null);
  const isEdit = !!matter;

  useEffect(() => {
    if (isOpen) {
      setError('');

      if (matter) {
        setForm({
          ...EMPTY, ...matter,
          open_date: toDateInput(matter.open_date),
          sol_date:  toDateInput(matter.sol_date),
          client_id:      matter.client_id      ?? '',
          assigned_staff: matter.assigned_staff ?? '',
        });
        axios.get(`/api/matters/${matter.id}/staff`)
          .then(({ data }) => setStaffIds(data.map(s => s.id)))
          .catch(() => {});
      } else {
        setForm(EMPTY);
        setStaffIds([]);
        axios.get('/api/matters/next-number')
          .then(({ data }) => setForm((f) => ({ ...f, matter_number: data.number })))
          .catch(() => {});
      }

      Promise.all([axios.get('/api/contacts'), axios.get('/api/users')])
        .then(([c, u]) => { setContacts(c.data); setUsers(u.data); })
        .catch(() => {});

      setTimeout(() => { setVisible(true); firstRef.current?.focus(); }, 30);
    } else {
      setVisible(false);
    }
  }, [isOpen, matter]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const solWarning = () => {
    if (!form.sol_date) return null;
    const days = Math.ceil((new Date(form.sol_date) - new Date()) / 86400000);
    if (days < 0)  return { text: `SOL passed ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`, color: '#c53030' };
    if (days <= 30) return { text: `SOL in ${days} day${days !== 1 ? 's' : ''} — urgent`, color: '#c05621' };
    if (days <= 90) return { text: `SOL in ${days} days`, color: '#b7791f' };
    return null;
  };

  const syncStaff = async (matterId) => {
    const existing = await axios.get(`/api/matters/${matterId}/staff`).then(r => r.data.map(s => s.id)).catch(() => []);
    const toAdd    = staffIds.filter(id => !existing.includes(id));
    const toRemove = existing.filter(id => !staffIds.includes(id));
    await Promise.all([
      ...toAdd.map(uid    => axios.post(`/api/matters/${matterId}/staff`, { user_id: uid })),
      ...toRemove.map(uid => axios.delete(`/api/matters/${matterId}/staff/${uid}`)),
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      ...form,
      client_id:      form.client_id      ? Number(form.client_id)      : null,
      assigned_staff: form.assigned_staff ? Number(form.assigned_staff) : null,
      open_date: form.open_date || null,
      sol_date:  form.sol_date  || null,
    };
    try {
      let saved;
      if (isEdit) {
        const { data } = await axios.put(`/api/matters/${matter.id}`, payload);
        saved = data;
      } else {
        const { data } = await axios.post('/api/matters', payload);
        saved = data;
      }
      await syncStaff(saved.id);
      onSaved(saved, isEdit ? 'updated' : 'created');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save matter.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen && !visible) return null;
  const warn = solWarning();

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200,
        opacity: visible ? 1 : 0, transition: 'opacity 0.25s',
      }} />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '520px',
        background: '#fff', zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #e9ecef',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: NAVY, margin: 0 }}>
              {isEdit ? 'Edit Matter' : 'New Matter'}
            </h2>
            {isEdit && (
              <p style={{ fontSize: '13px', color: '#6c757d', margin: '2px 0 0' }}>
                {matter.matter_number} — {matter.matter_name}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#adb5bd',
            padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px',
          }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#495057'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#adb5bd'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* Matter # / Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Matter Number <span style={{ color: '#c0392b' }}>*</span></label>
              <input ref={firstRef} value={form.matter_number} onChange={set('matter_number')}
                onFocus={() => setFocused('num')} onBlur={() => setFocused(null)}
                style={{ ...fieldStyle(focused === 'num'), fontFamily: 'monospace', letterSpacing: '0.04em' }}
                placeholder="JBL-2024-0001" required />
            </div>
            <div>
              <label style={labelStyle}>Status <span style={{ color: '#c0392b' }}>*</span></label>
              <select value={form.status} onChange={set('status')}
                onFocus={() => setFocused('status')} onBlur={() => setFocused(null)}
                style={selectStyle(focused === 'status')}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Matter Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Matter Name <span style={{ color: '#c0392b' }}>*</span></label>
            <input value={form.matter_name} onChange={set('matter_name')}
              onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
              style={fieldStyle(focused === 'name')} placeholder="e.g. Smith v. Acme Corp" required />
          </div>

          {/* Client / Practice Area */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Client</label>
              <select value={form.client_id} onChange={set('client_id')}
                onFocus={() => setFocused('client')} onBlur={() => setFocused(null)}
                style={selectStyle(focused === 'client')}>
                <option value="">— Select client —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.last_name}, {c.first_name}{c.company ? ` (${c.company})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Practice Area</label>
              <select value={form.practice_area} onChange={set('practice_area')}
                onFocus={() => setFocused('area')} onBlur={() => setFocused(null)}
                style={selectStyle(focused === 'area')}>
                <option value="">— Select area —</option>
                {PRACTICE_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Staff Members / Open Date */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Staff Members</label>
            <div style={{ border: `1.5px solid ${focused === 'staff' ? GOLD : '#dee2e6'}`, borderRadius: '5px', padding: '8px 10px', minHeight: '44px', background: '#fff', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', cursor: 'pointer' }}
              onFocus={() => setFocused('staff')} onBlur={() => setFocused(null)} tabIndex={0}>
              {staffIds.map(uid => {
                const u = users.find(u => u.id === uid);
                if (!u) return null;
                return (
                  <span key={uid} style={{ display:'inline-flex', alignItems:'center', gap:'4px', background:'#e8edf5', color:NAVY, borderRadius:'20px', fontSize:'12px', fontWeight:'600', padding:'3px 8px' }}>
                    {u.name}
                    <button type="button" onClick={() => setStaffIds(ids => ids.filter(i => i !== uid))}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#adb5bd', lineHeight:1, padding:'0 0 0 2px', fontSize:'14px' }}>×</button>
                  </span>
                );
              })}
              <select value="" onChange={e => { const v=Number(e.target.value); if(v && !staffIds.includes(v)) setStaffIds(ids=>[...ids,v]); }}
                style={{ border:'none', outline:'none', fontSize:'13px', color:'#6c757d', background:'transparent', cursor:'pointer', flex:'1 1 120px', minWidth:'120px' }}>
                <option value="">+ Add staff…</option>
                {users.filter(u => !staffIds.includes(u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Open Date</label>
            <input type="date" value={form.open_date} onChange={set('open_date')}
              onFocus={() => setFocused('open')} onBlur={() => setFocused(null)}
              style={fieldStyle(focused === 'open')} />
          </div>

          {/* SOL Date */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              SOL Date
              <span style={{ color: '#6c757d', fontWeight: '400', marginLeft: '6px' }}>Statute of Limitations</span>
            </label>
            <input type="date" value={form.sol_date} onChange={set('sol_date')}
              onFocus={() => setFocused('sol')} onBlur={() => setFocused(null)}
              style={{ ...fieldStyle(focused === 'sol'), borderColor: warn ? warn.color : (focused === 'sol' ? GOLD : '#dee2e6') }} />
            {warn && (
              <div style={{
                marginTop: '5px', fontSize: '12px', fontWeight: '600',
                color: warn.color, display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                {warn.text}
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={set('description')}
              onFocus={() => setFocused('desc')} onBlur={() => setFocused(null)}
              style={{ ...fieldStyle(focused === 'desc'), resize: 'vertical', minHeight: '80px' }}
              placeholder="Brief description of the matter…" />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '8px' }}>
            <label style={labelStyle}>Internal Notes</label>
            <textarea value={form.notes} onChange={set('notes')}
              onFocus={() => setFocused('notes')} onBlur={() => setFocused(null)}
              style={{ ...fieldStyle(focused === 'notes'), resize: 'vertical', minHeight: '72px' }}
              placeholder="Internal notes visible only to staff…" />
          </div>

          {error && (
            <div style={{
              background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030',
              borderRadius: '5px', padding: '10px 12px', fontSize: '13px', marginTop: '12px',
            }}>
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #e9ecef',
          display: 'flex', gap: '10px', justifyContent: 'flex-end',
          flexShrink: 0, background: '#fff',
        }}>
          <button type="button" onClick={onClose} style={{
            padding: '9px 20px', background: 'transparent',
            border: '1px solid #dee2e6', borderRadius: '5px',
            fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', color: '#495057',
          }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} style={{
            padding: '9px 24px', background: saving ? '#d4b878' : GOLD,
            border: 'none', borderRadius: '5px', color: '#fff', fontSize: '14px',
            fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
          }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Matter'}
          </button>
        </div>
      </div>
    </>
  );
}
