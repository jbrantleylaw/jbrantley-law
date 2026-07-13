import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const CONTACT_TYPES = [
  { value: '', label: '— Select type —' },
  { value: 'client', label: 'Client' },
  { value: 'opposing_counsel', label: 'Opposing Counsel' },
  { value: 'expert', label: 'Expert Witness' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'witness', label: 'Witness' },
  { value: 'other', label: 'Other' },
];

const EMPTY = { first_name: '', last_name: '', contact_type: '', company: '', email: '', phone: '', address: '', notes: '' };

const fieldStyle = (focused) => ({
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
  border: `1.5px solid ${focused ? GOLD : '#dee2e6'}`,
  borderRadius: '5px',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  color: '#1a1a2e',
  background: '#fff',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
});

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '500',
  color: '#555',
  marginBottom: '5px',
  letterSpacing: '0.02em',
};

export default function ContactForm({ isOpen, contact, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [focused, setFocused] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const firstRef = useRef(null);

  const isEdit = !!contact;

  useEffect(() => {
    if (isOpen) {
      setForm(contact ? { ...EMPTY, ...contact } : EMPTY);
      setError('');
      setTimeout(() => { setVisible(true); firstRef.current?.focus(); }, 30);
    } else {
      setVisible(false);
    }
  }, [isOpen, contact]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        const { data } = await axios.put(`/api/contacts/${contact.id}`, form);
        onSaved(data, 'updated');
      } else {
        const { data } = await axios.post('/api/contacts', form);
        onSaved(data, 'created');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save contact.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen && !visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          zIndex: 200, opacity: visible ? 1 : 0, transition: 'opacity 0.25s',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '480px', background: '#fff',
        zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e9ecef',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: NAVY, margin: 0 }}>
              {isEdit ? 'Edit Contact' : 'Add Contact'}
            </h2>
            {isEdit && (
              <p style={{ fontSize: '13px', color: '#6c757d', margin: '2px 0 0' }}>
                {contact.first_name} {contact.last_name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#adb5bd', padding: '4px', display: 'flex', alignItems: 'center',
              borderRadius: '4px', transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#495057'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#adb5bd'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* Row: First / Last */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>First Name <span style={{ color: '#c0392b' }}>*</span></label>
              <input ref={firstRef} value={form.first_name} onChange={set('first_name')}
                onFocus={() => setFocused('first_name')} onBlur={() => setFocused(null)}
                style={fieldStyle(focused === 'first_name')} placeholder="First" required />
            </div>
            <div>
              <label style={labelStyle}>Last Name <span style={{ color: '#c0392b' }}>*</span></label>
              <input value={form.last_name} onChange={set('last_name')}
                onFocus={() => setFocused('last_name')} onBlur={() => setFocused(null)}
                style={fieldStyle(focused === 'last_name')} placeholder="Last" required />
            </div>
          </div>

          {/* Row: Type / Company */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Contact Type</label>
              <select value={form.contact_type} onChange={set('contact_type')}
                onFocus={() => setFocused('contact_type')} onBlur={() => setFocused(null)}
                style={{ ...fieldStyle(focused === 'contact_type'), appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236c757d\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}>
                {CONTACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Company / Firm</label>
              <input value={form.company} onChange={set('company')}
                onFocus={() => setFocused('company')} onBlur={() => setFocused(null)}
                style={fieldStyle(focused === 'company')} placeholder="Organization" />
            </div>
          </div>

          {/* Row: Email / Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={set('email')}
                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                style={fieldStyle(focused === 'email')} placeholder="email@example.com" />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input type="tel" value={form.phone} onChange={set('phone')}
                onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)}
                style={fieldStyle(focused === 'phone')} placeholder="(555) 555-5555" />
            </div>
          </div>

          {/* Address */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Address</label>
            <textarea value={form.address} onChange={set('address')}
              onFocus={() => setFocused('address')} onBlur={() => setFocused(null)}
              style={{ ...fieldStyle(focused === 'address'), resize: 'vertical', minHeight: '72px' }}
              placeholder="Street, City, State, ZIP" />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '8px' }}>
            <label style={labelStyle}>Notes</label>
            <textarea value={form.notes} onChange={set('notes')}
              onFocus={() => setFocused('notes')} onBlur={() => setFocused(null)}
              style={{ ...fieldStyle(focused === 'notes'), resize: 'vertical', minHeight: '80px' }}
              placeholder="Internal notes about this contact…" />
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
          padding: '16px 24px',
          borderTop: '1px solid #e9ecef',
          display: 'flex', gap: '10px', justifyContent: 'flex-end',
          flexShrink: 0, background: '#fff',
        }}>
          <button type="button" onClick={onClose} style={{
            padding: '9px 20px', background: 'transparent',
            border: '1px solid #dee2e6', borderRadius: '5px',
            fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', color: '#495057',
            transition: 'border-color 0.15s',
          }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '9px 24px', background: saving ? '#d4b878' : GOLD,
              border: 'none', borderRadius: '5px', color: '#fff',
              fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
            }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Contact'}
          </button>
        </div>
      </div>
    </>
  );
}
