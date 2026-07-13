import { useState, useEffect } from 'react';
import axios from 'axios';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const s = {
  page: { padding: '32px 40px', maxWidth: 860, margin: '0 auto' },
  heading: { fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 4 },
  sub: { fontSize: 14, color: '#6c757d', marginBottom: 24 },
  tabs: { display: 'flex', gap: 0, borderBottom: `2px solid #e9ecef`, marginBottom: 28 },
  tab: (active) => ({
    padding: '10px 20px', fontSize: 14, fontWeight: active ? 700 : 500,
    color: active ? NAVY : '#6c757d', background: 'none', border: 'none',
    borderBottom: active ? `2px solid ${GOLD}` : '2px solid transparent',
    marginBottom: -2, cursor: 'pointer',
  }),
  card: { background: '#fff', border: '1px solid #e9ecef', borderRadius: 8, padding: 28, marginBottom: 20 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, display: 'block' },
  input: {
    width: '100%', border: '1px solid #ced4da', borderRadius: 6,
    padding: '9px 12px', fontSize: 13, color: '#333', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', border: '1px solid #ced4da', borderRadius: 6,
    padding: '9px 12px', fontSize: 13, color: '#333', minHeight: 80, resize: 'vertical', boxSizing: 'border-box',
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  field: { marginBottom: 16 },
  btn: (color = NAVY) => ({
    background: color, color: color === '#fff' ? NAVY : '#fff',
    border: color === '#fff' ? `1px solid #ced4da` : 'none',
    borderRadius: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  }),
  btnDanger: {
    background: '#fff5f5', color: '#9b2c2c', border: '1px solid #fecaca',
    borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  btnSuccess: {
    background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
    borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { background: '#f8f9fa', color: '#555', fontWeight: 600, padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e9ecef' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f3f5', verticalAlign: 'middle' },
  badge: (active) => ({
    background: active ? '#dcfce7' : '#f1f3f5',
    color: active ? '#166534' : '#6c757d',
    padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
  }),
  roleTag: (role) => ({
    background: role === 'attorney' ? '#eff6ff' : '#f8f9fa',
    color: role === 'attorney' ? '#1d4ed8' : '#6c757d',
    padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
  }),
  toast: (ok) => ({
    position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
    background: ok ? '#166534' : '#9b2c2c', color: '#fff',
    padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
  }),
  toggle: (on) => ({
    width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', border: 'none',
    background: on ? GOLD : '#ced4da', transition: 'background 0.2s',
  }),
  toggleKnob: (on) => ({
    position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18,
    borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
  }),
  // Overlay / panel
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 400 },
  panel: {
    position: 'fixed', top: 0, right: 0, width: 420, height: '100%',
    background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.13)', zIndex: 500,
    display: 'flex', flexDirection: 'column',
  },
  panelHead: {
    padding: '20px 24px', borderBottom: '1px solid #e9ecef',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  panelTitle: { fontSize: 16, fontWeight: 700, color: NAVY },
  panelBody: { flex: 1, overflowY: 'auto', padding: '20px 24px' },
  panelFoot: { padding: '16px 24px', borderTop: '1px solid #e9ecef', display: 'flex', gap: 10, justifyContent: 'flex-end' },
};

function Toast({ msg, ok, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={s.toast(ok)}>{msg}</div>;
}

const TABS = [
  { id: 'firm', label: 'Firm Info' },
  { id: 'users', label: 'User Management' },
  { id: 'integration', label: 'PP Integration' },
  { id: 'integrations', label: 'Integrations' },
];

export default function Settings() {
  const [tab, setTab] = useState('firm');
  const [googleStatus, setGoogleStatus] = useState({ configured: false, connected: false });
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [toast, setToast] = useState(null);

  // Firm settings state
  const [firm, setFirm] = useState({
    attorney_name: '', firm_name: '', phone: '', email: '',
    website: '', calendly_url: '', jurisdictions: '', tagline: '', pp_integration_mode: false,
  });
  const [firmSaving, setFirmSaving] = useState(false);

  // Users state
  const [users, setUsers] = useState([]);
  const [addPanel, setAddPanel] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'staff', password: '' });
  const [addSaving, setAddSaving] = useState(false);

  const showToast = (msg, ok = true) => setToast({ msg, ok });

  useEffect(() => {
    axios.get('/api/settings/firm').then(r => setFirm(r.data)).catch(() => {});
    axios.get('/api/settings/users').then(r => setUsers(r.data)).catch(() => {});
    axios.get('/api/google/status').then(r => setGoogleStatus(r.data)).catch(() => {});
  }, []);

  const connectGoogle = async () => {
    setGoogleConnecting(true);
    try {
      const { data } = await axios.get('/api/google/auth');
      window.location.href = data.url;
    } catch (err) {
      showToast(err.response?.data?.error || 'Google connect failed.', false);
      setGoogleConnecting(false);
    }
  };

  const disconnectGoogle = async () => {
    try {
      await axios.delete('/api/google/disconnect');
      setGoogleStatus(prev => ({ ...prev, connected: false }));
      showToast('Google account disconnected.');
    } catch {
      showToast('Disconnect failed.', false);
    }
  };

  // Firm save
  const saveFirm = async () => {
    setFirmSaving(true);
    try {
      const { data } = await axios.put('/api/settings/firm', firm);
      setFirm(data);
      showToast('Firm settings saved.');
    } catch {
      showToast('Save failed.', false);
    } finally {
      setFirmSaving(false);
    }
  };

  // Add user
  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      showToast('Name, email, and password are required.', false);
      return;
    }
    setAddSaving(true);
    try {
      const { data } = await axios.post('/api/settings/users', newUser);
      setUsers(prev => [...prev, data]);
      setAddPanel(false);
      setNewUser({ name: '', email: '', role: 'staff', password: '' });
      showToast(`${data.name} added.`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add user.', false);
    } finally {
      setAddSaving(false);
    }
  };

  // Edit role
  const changeRole = async (id, role) => {
    try {
      const { data } = await axios.put(`/api/settings/users/${id}`, { role });
      setUsers(prev => prev.map(u => u.id === id ? data : u));
      showToast('Role updated.');
    } catch {
      showToast('Failed to update role.', false);
    }
  };

  // Toggle active
  const toggleActive = async (id, current) => {
    try {
      const { data } = await axios.put(`/api/settings/users/${id}/deactivate`, { is_active: !current });
      setUsers(prev => prev.map(u => u.id === id ? data : u));
      showToast(data.is_active ? 'User reactivated.' : 'User deactivated.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed.', false);
    }
  };

  // PP Integration toggle
  const togglePP = async () => {
    const next = !firm.pp_integration_mode;
    try {
      const { data } = await axios.put('/api/settings/firm', { ...firm, pp_integration_mode: next });
      setFirm(data);
      showToast(next ? 'PP Integration Mode enabled.' : 'PP Integration Mode disabled.');
    } catch {
      showToast('Failed to update setting.', false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.heading}>Settings</div>
      <div style={s.sub}>Firm configuration and user management.</div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button key={t.id} style={s.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Firm Info Tab */}
      {tab === 'firm' && (
        <div style={s.card}>
          <div style={s.cardTitle}>Firm Information</div>
          <div style={s.grid2}>
            {[
              ['attorney_name', 'Attorney Name'],
              ['firm_name', 'Firm Name'],
              ['phone', 'Phone'],
              ['email', 'Email'],
              ['website', 'Website'],
              ['calendly_url', 'Calendly URL'],
            ].map(([key, label]) => (
              <div key={key} style={s.field}>
                <label style={s.label}>{label}</label>
                <input
                  style={s.input}
                  value={firm[key] || ''}
                  onChange={e => setFirm(prev => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div style={s.field}>
            <label style={s.label}>Jurisdictions</label>
            <input
              style={s.input}
              value={firm.jurisdictions || ''}
              onChange={e => setFirm(prev => ({ ...prev, jurisdictions: e.target.value }))}
              placeholder="TX, GA, USPTO (Federal Trademark)"
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Tagline</label>
            <textarea
              style={s.textarea}
              value={firm.tagline || ''}
              onChange={e => setFirm(prev => ({ ...prev, tagline: e.target.value }))}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button style={s.btn(NAVY)} onClick={saveFirm} disabled={firmSaving}>
              {firmSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* User Management Tab */}
      {tab === 'users' && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={s.cardTitle}>Users</div>
            <button style={s.btn(NAVY)} onClick={() => setAddPanel(true)}>+ Add User</button>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                {['Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={s.td}>{u.name}</td>
                  <td style={s.td}>{u.email}</td>
                  <td style={s.td}>
                    <select
                      style={{ border: '1px solid #ced4da', borderRadius: 4, padding: '4px 8px', fontSize: 12 }}
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                    >
                      <option value="staff">Staff</option>
                      <option value="attorney">Attorney</option>
                    </select>
                  </td>
                  <td style={s.td}>
                    <span style={s.badge(u.is_active)}>{u.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td style={s.td}>
                    <button
                      style={u.is_active ? s.btnDanger : s.btnSuccess}
                      onClick={() => toggleActive(u.id, u.is_active)}
                    >
                      {u.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td style={{ ...s.td, color: '#aaa', textAlign: 'center' }} colSpan={5}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PP Integration Tab */}
      {tab === 'integration' && (
        <div style={s.card}>
          <div style={s.cardTitle}>PracticePanther Integration Mode</div>
          <p style={{ fontSize: 13, color: '#555', marginBottom: 20, lineHeight: 1.6 }}>
            When enabled, billing amounts, invoice totals, and trust balances are hidden from staff users.
            Only attorneys can see financial data. Use this during a PracticePanther migration period or if you
            want to keep billing information restricted to attorney-level access.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button style={s.toggle(firm.pp_integration_mode)} onClick={togglePP}>
              <div style={s.toggleKnob(firm.pp_integration_mode)} />
            </button>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: firm.pp_integration_mode ? GOLD : '#6c757d' }}>
                {firm.pp_integration_mode ? 'Enabled' : 'Disabled'}
              </div>
              <div style={{ fontSize: 12, color: '#aaa' }}>
                {firm.pp_integration_mode
                  ? 'Staff cannot see billing amounts, invoices, or trust balances.'
                  : 'All billing data visible to staff (subject to role restrictions).'}
              </div>
            </div>
          </div>

          {firm.pp_integration_mode && (
            <div style={{ marginTop: 20, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#7c4a00' }}>
              PP Integration Mode is active. Staff users see time entries only — no amounts, invoices, or trust data.
            </div>
          )}
        </div>
      )}

      {/* Integrations Tab */}
      {tab === 'integrations' && (
        <>
          {/* Google Workspace */}
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={s.cardTitle}>Google Workspace</div>
                <p style={{ fontSize: 13, color: '#555', marginTop: 0, marginBottom: 0, lineHeight: 1.6 }}>
                  Connect Gmail to send emails from contact and matter pages. Connect Google Drive to save generated documents to a matter folder automatically.
                </p>
              </div>
              <span style={s.badge(googleStatus.connected)}>
                {googleStatus.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            {!googleStatus.configured && (
              <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#9b2c2c', marginBottom: 14 }}>
                GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in your .env file before connecting.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              {googleStatus.connected ? (
                <button style={s.btnDanger} onClick={disconnectGoogle}>Disconnect Google</button>
              ) : (
                <button
                  style={s.btn(googleStatus.configured ? NAVY : '#aaa')}
                  onClick={connectGoogle}
                  disabled={!googleStatus.configured || googleConnecting}
                >
                  {googleConnecting ? 'Redirecting…' : 'Connect Google Account'}
                </button>
              )}
            </div>

            {googleStatus.connected && (
              <div style={{ marginTop: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#166534' }}>
                ✓ Gmail and Google Drive are active. Use the "Send Email" button on any contact or matter page. Use "Save to Drive" on any generated document.
              </div>
            )}
          </div>

          {/* Calendly */}
          <div style={s.card}>
            <div style={s.cardTitle}>Calendly</div>
            <p style={{ fontSize: 13, color: '#555', marginTop: 0, marginBottom: 14, lineHeight: 1.6 }}>
              Sync your Calendly scheduled events to the calendar. Events are automatically linked to contacts by email match. Set your API key in <code>.env</code> as <code>CALENDLY_API_KEY</code>, then use the Sync button on the Calendar page.
            </p>
            <div style={{ fontSize: 13, color: '#6c757d' }}>
              Calendly URL: <a href="https://calendly.com/jbrantley-jenniferbrantleylaw" style={{ color: NAVY }} target="_blank" rel="noreferrer">calendly.com/jbrantley-jenniferbrantleylaw</a>
            </div>
          </div>

          {/* Adobe Sign */}
          <div style={s.card}>
            <div style={s.cardTitle}>Adobe Sign (E-Signature)</div>
            <p style={{ fontSize: 13, color: '#555', marginTop: 0, marginBottom: 14, lineHeight: 1.6 }}>
              Send documents for electronic signature via Adobe Sign. Configure your credentials in <code>.env</code>: <code>ADOBE_SIGN_CLIENT_ID</code>, <code>ADOBE_SIGN_CLIENT_SECRET</code>, and <code>ADOBE_SIGN_REFRESH_TOKEN</code>. Then use the E-Signature page to send documents.
            </p>
          </div>
        </>
      )}

      {/* Add User Panel */}
      {addPanel && (
        <>
          <div style={s.overlay} onClick={() => setAddPanel(false)} />
          <div style={s.panel}>
            <div style={s.panelHead}>
              <span style={s.panelTitle}>Add User</span>
              <button style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }} onClick={() => setAddPanel(false)}>×</button>
            </div>
            <div style={s.panelBody}>
              <div style={s.field}>
                <label style={s.label}>Full Name *</label>
                <input style={s.input} value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Email *</label>
                <input style={s.input} type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Role</label>
                <select style={s.input} value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                  <option value="staff">Staff</option>
                  <option value="attorney">Attorney</option>
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Temporary Password *</label>
                <input style={s.input} type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 12px', fontSize: 12, color: '#7c4a00', marginTop: 8 }}>
                User will be required to change their password on first login.
              </div>
            </div>
            <div style={s.panelFoot}>
              <button style={s.btn('#fff')} onClick={() => setAddPanel(false)}>Cancel</button>
              <button style={s.btn(NAVY)} onClick={handleAddUser} disabled={addSaving}>
                {addSaving ? 'Adding…' : 'Add User'}
              </button>
            </div>
          </div>
        </>
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />}
    </div>
  );
}
