import { useState, useEffect } from 'react';
import axios from '../utils/axios';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const STATUS_COLORS = {
  pending:  { bg: '#e0f2fe', color: '#1d4ed8' },
  viewed:   { bg: '#fef3c7', color: '#7c4a00' },
  signed:   { bg: '#dcfce7', color: '#166534' },
  declined: { bg: '#fee2e2', color: '#9b2c2c' },
};

const s = {
  page: { padding: '32px 40px', maxWidth: 1000, margin: '0 auto' },
  heading: { fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 4 },
  sub: { fontSize: 14, color: '#6c757d', marginBottom: 24 },
  tabs: { display: 'flex', gap: 0, borderBottom: `2px solid #e9ecef`, marginBottom: 24 },
  tab: (active) => ({
    padding: '10px 22px', fontSize: 14, fontWeight: active ? 700 : 500,
    color: active ? NAVY : '#6c757d', background: 'none', border: 'none',
    borderBottom: active ? `2px solid ${GOLD}` : '2px solid transparent',
    marginBottom: -2, cursor: 'pointer',
  }),
  card: { background: '#fff', border: '1px solid #e9ecef', borderRadius: 8, padding: 24, marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { background: '#f8f9fa', padding: '9px 12px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: 600, color: '#555' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f3f5', verticalAlign: 'middle' },
  badge: (st) => ({ ...(STATUS_COLORS[st] || { bg: '#f1f3f5', color: '#555' }), padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }),
  btn: (color = NAVY, disabled = false) => ({
    background: disabled ? '#e9ecef' : color, color: disabled ? '#aaa' : '#fff',
    border: 'none', borderRadius: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }),
  btnOutline: { background: '#fff', color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 6, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  label: { fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 },
  input: { width: '100%', border: '1px solid #ced4da', borderRadius: 6, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' },
  field: { marginBottom: 16 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 400 },
  panel: { position: 'fixed', top: 0, right: 0, width: 460, height: '100%', background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.13)', zIndex: 500, display: 'flex', flexDirection: 'column' },
  panelHead: { padding: '20px 24px', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  panelBody: { flex: 1, overflowY: 'auto', padding: '20px 24px' },
  panelFoot: { padding: '16px 24px', borderTop: '1px solid #e9ecef', display: 'flex', gap: 10, justifyContent: 'flex-end' },
  toast: (ok) => ({ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: ok ? '#166534' : '#9b2c2c', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,.18)' }),
};

function Toast({ msg, ok, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={s.toast(ok)}>{msg}</div>;
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export default function ESignature() {
  const [tab, setTab]           = useState('built-in');
  const [requests, setRequests] = useState([]);
  const [adobeList, setAdobeList] = useState([]);
  const [matters, setMatters]   = useState([]);
  const [panel, setPanel]       = useState(false);
  const [adobeStatus, setAdobeStatus] = useState({ configured: false });
  const [toast, setToast]       = useState(null);
  const [sending, setSending]   = useState(false);

  const [form, setForm] = useState({
    matter_id: '', document_name: '', document_path: '',
    recipient_name: '', recipient_email: '',
  });

  const showToast = (msg, ok = true) => setToast({ msg, ok });

  const load = () => {
    axios.get('/api/esignature/requests').then(r => setRequests(r.data)).catch(() => {});
    axios.get('/api/esignature/adobe/agreements').then(r => setAdobeList(r.data)).catch(() => {});
    axios.get('/api/esignature/adobe/status').then(r => setAdobeStatus(r.data)).catch(() => {});
    axios.get('/api/billing/matters').then(r => setMatters(r.data)).catch(() => {});
  };

  useEffect(load, []);

  const send = async () => {
    if (!form.recipient_email || !form.document_name) {
      showToast('Recipient email and document name are required.', false);
      return;
    }
    setSending(true);
    try {
      await axios.post('/api/esignature/send', form);
      showToast('Signature request sent.');
      setPanel(false);
      setForm({ matter_id: '', document_name: '', document_path: '', recipient_name: '', recipient_email: '' });
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Send failed.', false);
    } finally { setSending(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.heading}>E-Signature</div>
      <div style={s.sub}>Send documents for electronic signature. Track status in real time.</div>

      <div style={s.tabs}>
        <button style={s.tab(tab === 'built-in')} onClick={() => setTab('built-in')}>Built-In Signature</button>
        <button style={s.tab(tab === 'adobe')}    onClick={() => setTab('adobe')}>Adobe Sign</button>
      </div>

      {tab === 'built-in' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: '#555' }}>
              Send secure signing links by email. Recipients sign in their browser — no account required.
            </div>
            <button style={s.btn(NAVY)} onClick={() => setPanel(true)}>+ Send for Signature</button>
          </div>

          <div style={s.card}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Document','Matter','Recipient','Status','Sent','Signed'].map(h => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={s.td}><strong>{r.document_name}</strong></td>
                    <td style={s.td}>{r.matter_number || '—'}</td>
                    <td style={s.td}>
                      <div>{r.recipient_name || r.recipient_email}</div>
                      {r.recipient_name && <div style={{ fontSize: 11, color: '#6c757d' }}>{r.recipient_email}</div>}
                    </td>
                    <td style={s.td}><span style={s.badge(r.status)}>{r.status?.toUpperCase()}</span></td>
                    <td style={s.td}>{fmtDate(r.sent_at)}</td>
                    <td style={s.td}>{r.signed_at ? fmtDate(r.signed_at) : r.declined_at ? <span style={{ color: '#9b2c2c' }}>Declined {fmtDate(r.declined_at)}</span> : '—'}</td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center', color: '#aaa', padding: '32px 0' }}>No signature requests yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'adobe' && (
        <>
          {!adobeStatus.configured && (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 6, padding: '12px 16px', fontSize: 13, color: '#9b2c2c', marginBottom: 16 }}>
              Adobe Sign is not configured. Add <code>ADOBE_SIGN_CLIENT_ID</code>, <code>ADOBE_SIGN_CLIENT_SECRET</code>, and <code>ADOBE_SIGN_REFRESH_TOKEN</code> to your <code>.env</code> file.
            </div>
          )}
          <div style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>
            Send documents via Adobe Sign for legally binding e-signatures.
          </div>
          <div style={s.card}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Document','Matter','Recipient','Status','Sent','Signed'].map(h => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {adobeList.map(r => (
                  <tr key={r.id}>
                    <td style={s.td}><strong>{r.document_name}</strong></td>
                    <td style={s.td}>{r.matter_number || '—'}</td>
                    <td style={s.td}>{r.recipient_email}</td>
                    <td style={s.td}><span style={{ background: '#e0f2fe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{r.status}</span></td>
                    <td style={s.td}>{fmtDate(r.sent_at)}</td>
                    <td style={s.td}>{r.signed_at ? fmtDate(r.signed_at) : '—'}</td>
                  </tr>
                ))}
                {adobeList.length === 0 && (
                  <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center', color: '#aaa', padding: '32px 0' }}>No Adobe Sign agreements yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Send Panel */}
      {panel && (
        <>
          <div style={s.overlay} onClick={() => setPanel(false)} />
          <div style={s.panel}>
            <div style={s.panelHead}>
              <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Send for Signature</span>
              <button style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }} onClick={() => setPanel(false)}>×</button>
            </div>
            <div style={s.panelBody}>
              <div style={s.field}>
                <label style={s.label}>Document Name *</label>
                <input style={s.input} value={form.document_name} onChange={e => setForm(p => ({ ...p, document_name: e.target.value }))} placeholder="e.g. Retainer Agreement" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Document File Path</label>
                <input style={s.input} value={form.document_path} onChange={e => setForm(p => ({ ...p, document_path: e.target.value }))} placeholder="uploads/doc.pdf (optional)" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Linked Matter</label>
                <select style={s.input} value={form.matter_id} onChange={e => setForm(p => ({ ...p, matter_id: e.target.value }))}>
                  <option value="">— No matter —</option>
                  {matters.map(m => <option key={m.id} value={m.id}>{m.matter_number} — {m.matter_name}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Recipient Name</label>
                <input style={s.input} value={form.recipient_name} onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Recipient Email *</label>
                <input style={s.input} type="email" value={form.recipient_email} onChange={e => setForm(p => ({ ...p, recipient_email: e.target.value }))} />
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 12px', fontSize: 12, color: '#7c4a00' }}>
                The recipient will receive an email with a secure link to review and sign the document in their browser. No login required.
              </div>
            </div>
            <div style={s.panelFoot}>
              <button style={s.btnOutline} onClick={() => setPanel(false)}>Cancel</button>
              <button style={s.btn(GOLD, sending)} onClick={send} disabled={sending}>
                {sending ? 'Sending…' : 'Send for Signature'}
              </button>
            </div>
          </div>
        </>
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />}
    </div>
  );
}
