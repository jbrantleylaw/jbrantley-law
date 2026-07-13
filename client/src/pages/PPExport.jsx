import { useState, useEffect } from 'react';
import axios from 'axios';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const s = {
  page: { padding: '32px 40px', maxWidth: 900, margin: '0 auto' },
  heading: { fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 4 },
  sub: { fontSize: 14, color: '#6c757d', marginBottom: 28 },
  section: { background: '#fff', border: '1px solid #e9ecef', borderRadius: 8, padding: 24, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: '#6c757d', marginBottom: 16 },
  row: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  btn: (color = NAVY) => ({
    background: color, color: '#fff', border: 'none', borderRadius: 6,
    padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  }),
  btnOutline: {
    background: '#fff', color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 6,
    padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  select: {
    border: '1px solid #ced4da', borderRadius: 6, padding: '8px 12px',
    fontSize: 13, color: '#333', flex: 1, minWidth: 240,
  },
  toast: (ok) => ({
    position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
    background: ok ? '#166534' : '#9b2c2c', color: '#fff',
    padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
  }),
  fieldRow: { display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 },
  fieldLabel: { color: '#6c757d', minWidth: 140 },
  fieldVal: { color: '#222', fontWeight: 500 },
  divider: { borderTop: '1px solid #f1f3f5', margin: '16px 0' },
  badge: (s) => {
    const map = { open: ['#1e4620','#dcfce7'], closed: ['#6c757d','#f1f3f5'], pending: ['#7c4a00','#fef3c7'], inactive: ['#9b2c2c','#fff5f5'] };
    const [c, bg] = map[s] || ['#333','#f1f3f5'];
    return { color: c, background: bg, padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 };
  },
};

function Toast({ msg, ok, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={s.toast(ok)}>{msg}</div>;
}

export default function PPExport() {
  const [matters, setMatters] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    axios.get('/api/ppexport/matters').then(r => setMatters(r.data)).catch(() => {});
  }, []);

  const showToast = (msg, ok = true) => setToast({ msg, ok });

  const loadSummary = async () => {
    if (!selectedId) return;
    setLoading(true);
    setSummary(null);
    try {
      const { data } = await axios.get(`/api/ppexport/matter/${selectedId}`);
      setSummary(data);
    } catch {
      showToast('Failed to load matter.', false);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = async (type) => {
    try {
      const { data: blob } = await axios.get(`/api/ppexport/csv/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`${type}.csv downloaded.`);
    } catch {
      showToast('CSV export failed.', false);
    }
  };

  const downloadPdf = async () => {
    if (!selectedId) return;
    try {
      const { data: blob } = await axios.get(`/api/ppexport/pdf/${selectedId}`, { responseType: 'blob' });
      const matter = matters.find(m => String(m.id) === String(selectedId));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${matter?.matter_number || 'matter'}-summary.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('PDF downloaded.');
    } catch {
      showToast('PDF generation failed.', false);
    }
  };

  const fld = (label, val) => (
    <div style={s.fieldRow}>
      <span style={s.fieldLabel}>{label}</span>
      <span style={s.fieldVal}>{val || '—'}</span>
    </div>
  );

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div style={s.page}>
      <div style={s.heading}>PP Export</div>
      <div style={s.sub}>Export data in PracticePanther-compatible format for migration or backup.</div>

      {/* CSV Export */}
      <div style={s.section}>
        <div style={s.sectionTitle}>CSV Export</div>
        <div style={s.sectionDesc}>
          Download all contacts or matters as a CSV with exact PracticePanther column headers, ready for import.
        </div>
        <div style={s.row}>
          <button style={s.btn(NAVY)} onClick={() => downloadCsv('contacts')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Contacts CSV
          </button>
          <button style={s.btn(GOLD)} onClick={() => downloadCsv('matters')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Matters CSV
          </button>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: '#aaa' }}>
          Contacts: First Name, Last Name, Company, Email, Phone, Address, City, State, Zip, Type, Notes
          <br />
          Matters: Matter Name, Client, Practice Area, Status, Open Date, Close Date, Description, Assigned To, Notes
        </div>
      </div>

      {/* Matter Selector */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Matter Summary</div>
        <div style={s.sectionDesc}>Select a matter to view a full summary or download it as a PDF.</div>
        <div style={s.row}>
          <select
            style={s.select}
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setSummary(null); }}
          >
            <option value="">— Select a matter —</option>
            {matters.map(m => (
              <option key={m.id} value={m.id}>
                {m.matter_number} — {m.matter_name} ({m.client_name})
              </option>
            ))}
          </select>
          <button style={s.btn(NAVY)} onClick={loadSummary} disabled={!selectedId || loading}>
            {loading ? 'Loading…' : 'View Summary'}
          </button>
          <button style={s.btn(GOLD)} onClick={downloadPdf} disabled={!selectedId}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* Summary Display */}
      {summary && (
        <div style={s.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>{summary.matter_number}</div>
              <div style={{ fontSize: 14, color: '#555', marginTop: 2 }}>{summary.matter_name}</div>
            </div>
            <span style={s.badge(summary.status)}>{summary.status?.toUpperCase()}</span>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</div>
          {fld('Name', summary.first_name ? `${summary.first_name} ${summary.last_name}` : null)}
          {fld('Email', summary.client_email)}
          {fld('Phone', summary.client_phone)}
          {fld('Address', summary.client_address)}
          {fld('Company', summary.client_company)}

          <div style={s.divider} />

          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Matter</div>
          {fld('Matter Number', summary.matter_number)}
          {fld('Practice Area', summary.practice_area)}
          {fld('Status', summary.status?.toUpperCase())}
          {fld('Open Date', fmtDate(summary.open_date))}
          {fld('Assigned Staff', summary.assigned_name)}

          {summary.sol_date && (
            <>
              <div style={s.divider} />
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SOL</div>
              {fld('SOL Date', fmtDate(summary.sol_date))}
              <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#9b2c2c', marginTop: 4 }}>
                ⚠ Statute of Limitations deadline — calendar and docket immediately.
              </div>
            </>
          )}

          {summary.description && (
            <>
              <div style={s.divider} />
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</div>
              <div style={{ fontSize: 13, color: '#333' }}>{summary.description}</div>
            </>
          )}

          {summary.notes && (
            <>
              <div style={s.divider} />
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</div>
              <div style={{ background: '#f8f9fa', padding: '10px 14px', borderRadius: 4, fontSize: 13, whiteSpace: 'pre-wrap' }}>{summary.notes}</div>
            </>
          )}
        </div>
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />}
    </div>
  );
}
