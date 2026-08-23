import { useState, useEffect } from 'react';
import axios from '../utils/axios';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const REPORTS = [
  { id: 'matter-status',   label: 'Matter Status',    desc: 'All matters grouped by status with SOL dates.' },
  { id: 'sol-alerts',      label: 'SOL Alerts',       desc: 'Open matters with SOL deadlines approaching.' },
  { id: 'billing-summary', label: 'Billing Summary',  desc: 'Invoiced vs collected by matter and practice area.' },
  { id: 'time-entries',    label: 'Time Entries',     desc: 'All time entries with totals by staff and matter.' },
  { id: 'trust-ledger',    label: 'Trust Ledger',     desc: 'Trust transactions with running balances per matter.' },
  { id: 'client-roster',   label: 'Client Roster',    desc: 'All clients with matter counts and last activity.' },
  { id: 'staff-activity',  label: 'Staff Activity',   desc: 'Hours and billable value per staff member.' },
];

const s = {
  page: { display: 'flex', height: '100vh', fontFamily: 'Inter, sans-serif' },
  sidebar: { width: 220, flexShrink: 0, background: '#f8f9fa', borderRight: '1px solid #e9ecef', padding: '24px 0', display: 'flex', flexDirection: 'column' },
  sidebarTitle: { fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 16px 12px' },
  navItem: (active) => ({
    padding: '9px 16px', fontSize: 13, fontWeight: active ? 700 : 400,
    color: active ? NAVY : '#555', background: active ? '#e8edf5' : 'transparent',
    borderLeft: `3px solid ${active ? GOLD : 'transparent'}`,
    cursor: 'pointer', display: 'block',
  }),
  main: { flex: 1, overflowY: 'auto', padding: '28px 36px' },
  heading: { fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 4 },
  sub: { fontSize: 13, color: '#6c757d', marginBottom: 20 },
  filterBar: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 11, fontWeight: 600, color: '#555' },
  input: { border: '1px solid #ced4da', borderRadius: 6, padding: '7px 10px', fontSize: 13, color: '#333' },
  select: { border: '1px solid #ced4da', borderRadius: 6, padding: '7px 10px', fontSize: 13, color: '#333' },
  btn: (color = NAVY) => ({
    background: color, color: '#fff', border: 'none', borderRadius: 6,
    padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  }),
  btnOutline: {
    background: '#fff', color: NAVY, border: `1px solid #ced4da`, borderRadius: 6,
    padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { background: NAVY, color: '#fff', padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600 },
  td: (red) => ({ padding: '8px 12px', borderBottom: '1px solid #f1f3f5', background: red ? '#fff5f5' : 'transparent' }),
  totalRow: { fontWeight: 700, background: '#f8f9fa', borderTop: `2px solid ${NAVY}` },
  solBadge: (days) => {
    if (days <= 30) return { background: '#fee2e2', color: '#9b2c2c', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 };
    if (days <= 60) return { background: '#fef3c7', color: '#7c4a00', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 };
    return { background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 };
  },
  statusBadge: (st) => {
    const map = { open: ['#166534','#dcfce7'], closed: ['#6c757d','#f1f3f5'], pending: ['#7c4a00','#fef3c7'], inactive: ['#9b2c2c','#fff5f5'] };
    const [c, bg] = map[st] || ['#333','#f1f3f5'];
    return { color: c, background: bg, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 };
  },
  empty: { textAlign: 'center', padding: '40px 0', color: '#aaa', fontSize: 14 },
  loading: { textAlign: 'center', padding: '40px 0', color: '#6c757d', fontSize: 14 },
};

const fmt$ = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// ── Report table renderers ────────────────────────────────────────────────────

function MatterStatusTable({ data }) {
  if (!data?.length) return <div style={s.empty}>No matters found for these filters.</div>;
  const groups = {};
  data.forEach(r => { (groups[r.status] = groups[r.status] || []).push(r); });

  return (
    <>
      {Object.entries(groups).map(([status, rows]) => (
        <div key={status} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {status} ({rows.length})
          </div>
          <table style={s.table}>
            <thead><tr>
              {['Matter #','Matter Name','Client','Practice Area','Open Date','SOL Date','Assigned To'].map(h => <th key={h} style={s.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={s.td()}>{r.matter_number || '—'}</td>
                  <td style={s.td()}>{r.matter_name}</td>
                  <td style={s.td()}>{r.client_name || '—'}</td>
                  <td style={s.td()}>{r.practice_area || '—'}</td>
                  <td style={s.td()}>{fmtDate(r.open_date)}</td>
                  <td style={s.td(!!r.sol_date)}>{fmtDate(r.sol_date)}</td>
                  <td style={s.td()}>{r.assigned_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

function SolAlertsTable({ data }) {
  if (!data?.length) return <div style={s.empty}>No SOL alerts for the selected timeframe.</div>;
  return (
    <table style={s.table}>
      <thead><tr>
        {['Matter #','Matter Name','Client','Practice Area','SOL Date','Days Left','Assigned To'].map(h => <th key={h} style={s.th}>{h}</th>)}
      </tr></thead>
      <tbody>
        {data.map((r, i) => (
          <tr key={i} style={Number(r.days_remaining) <= 30 ? { background: '#fff5f5' } : {}}>
            <td style={s.td()}>{r.matter_number}</td>
            <td style={s.td()}>{r.matter_name}</td>
            <td style={s.td()}>{r.client_name || '—'}</td>
            <td style={s.td()}>{r.practice_area || '—'}</td>
            <td style={s.td()}>{fmtDate(r.sol_date)}</td>
            <td style={s.td()}><span style={s.solBadge(Number(r.days_remaining))}>{r.days_remaining} days</span></td>
            <td style={s.td()}>{r.assigned_name || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BillingSummaryTable({ data }) {
  if (!data?.rows?.length) return <div style={s.empty}>No invoices found for this date range.</div>;
  const byArea = data.byArea || {};
  const grand = data.rows.reduce((s, r) => ({
    i: s.i + Number(r.total_invoiced || 0),
    c: s.c + Number(r.total_collected || 0),
    o: s.o + Number(r.total_outstanding || 0),
  }), { i: 0, c: 0, o: 0 });

  return (
    <>
      {Object.entries(byArea).map(([area, rows]) => {
        const sub = rows.reduce((s,r) => ({ i: s.i+Number(r.total_invoiced||0), c: s.c+Number(r.total_collected||0), o: s.o+Number(r.total_outstanding||0) }), {i:0,c:0,o:0});
        return (
          <div key={area} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 6 }}>{area}</div>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Matter #</th><th style={s.th}>Matter Name</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Invoiced</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Collected</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Outstanding</th>
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={s.td()}>{r.matter_number}</td>
                    <td style={s.td()}>{r.matter_name}</td>
                    <td style={{ ...s.td(), textAlign: 'right' }}>{fmt$(r.total_invoiced)}</td>
                    <td style={{ ...s.td(), textAlign: 'right' }}>{fmt$(r.total_collected)}</td>
                    <td style={{ ...s.td(), textAlign: 'right', color: Number(r.total_outstanding) > 0 ? '#c53030' : '#166534' }}>{fmt$(r.total_outstanding)}</td>
                  </tr>
                ))}
                <tr style={s.totalRow}>
                  <td style={s.td()} colSpan={2}>Subtotal — {area}</td>
                  <td style={{ ...s.td(), textAlign: 'right' }}>{fmt$(sub.i)}</td>
                  <td style={{ ...s.td(), textAlign: 'right' }}>{fmt$(sub.c)}</td>
                  <td style={{ ...s.td(), textAlign: 'right' }}>{fmt$(sub.o)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
      <table style={s.table}>
        <tbody>
          <tr style={{ ...s.totalRow, fontSize: 14 }}>
            <td style={{ padding: '10px 12px', fontWeight: 700 }} colSpan={2}>GRAND TOTAL</td>
            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt$(grand.i)}</td>
            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt$(grand.c)}</td>
            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: grand.o > 0 ? '#c53030' : '#166534' }}>{fmt$(grand.o)}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function TimeEntriesTable({ data }) {
  if (!data?.rows?.length) return <div style={s.empty}>No time entries found.</div>;
  return (
    <table style={s.table}>
      <thead><tr>
        {['Date','User','Matter #','Description','Hours','Rate','Amount','Billable'].map(h => <th key={h} style={s.th}>{h}</th>)}
      </tr></thead>
      <tbody>
        {data.rows.map((r, i) => (
          <tr key={i}>
            <td style={s.td()}>{fmtDate(r.date)}</td>
            <td style={s.td()}>{r.user_name || '—'}</td>
            <td style={s.td()}>{r.matter_number || '—'}</td>
            <td style={s.td()}>{r.description}</td>
            <td style={{ ...s.td(), textAlign: 'right' }}>{Number(r.hours).toFixed(2)}</td>
            <td style={{ ...s.td(), textAlign: 'right' }}>{fmt$(r.rate)}</td>
            <td style={{ ...s.td(), textAlign: 'right' }}>{fmt$(r.amount)}</td>
            <td style={s.td()}>{r.billable ? 'Yes' : 'No'}</td>
          </tr>
        ))}
        <tr style={s.totalRow}>
          <td style={s.td()} colSpan={4}>TOTAL</td>
          <td style={{ ...s.td(), textAlign: 'right' }}>{Number(data.totalHours).toFixed(2)}</td>
          <td style={s.td()}></td>
          <td style={{ ...s.td(), textAlign: 'right' }}>{fmt$(data.totalValue)}</td>
          <td style={s.td()}></td>
        </tr>
      </tbody>
    </table>
  );
}

function TrustLedgerTable({ data }) {
  if (!data?.rows?.length) return <div style={s.empty}>No trust transactions found.</div>;
  const byMatter = {};
  data.rows.forEach(r => {
    const key = r.matter_number || 'No Matter';
    (byMatter[key] = byMatter[key] || { name: r.matter_name, rows: [] }).rows.push(r);
  });
  return (
    <>
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#7c4a00', marginBottom: 14 }}>
        IOLTA Trust Account — All trust funds must be held in a separate interest-bearing account.
      </div>
      {Object.entries(byMatter).map(([mn, d]) => {
        const lastBal = d.rows[d.rows.length - 1]?.balance_after || 0;
        return (
          <div key={mn} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{mn} — {d.name}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: Number(lastBal) >= 0 ? '#166534' : '#c53030' }}>Balance: {fmt$(lastBal)}</div>
            </div>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Date</th><th style={s.th}>Type</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Amount</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Balance After</th>
                <th style={s.th}>Description</th>
              </tr></thead>
              <tbody>
                {d.rows.map((r, i) => (
                  <tr key={i}>
                    <td style={s.td()}>{fmtDate(r.date)}</td>
                    <td style={s.td()}>{r.transaction_type?.replace(/_/g, ' ')}</td>
                    <td style={{ ...s.td(), textAlign: 'right' }}>{fmt$(r.amount)}</td>
                    <td style={{ ...s.td(), textAlign: 'right', fontWeight: 600 }}>{fmt$(r.balance_after)}</td>
                    <td style={s.td()}>{r.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: NAVY, marginTop: 8, padding: '10px 0', borderTop: `2px solid ${NAVY}` }}>
        Total Client Ledger Balance: {fmt$(data.grandTotal)}
      </div>
    </>
  );
}

function ClientRosterTable({ data }) {
  if (!data?.length) return <div style={s.empty}>No clients found.</div>;
  return (
    <table style={s.table}>
      <thead><tr>
        {['Name','Email','Phone','Company','Matters','Open','Last Activity'].map(h => <th key={h} style={s.th}>{h}</th>)}
      </tr></thead>
      <tbody>
        {data.map((r, i) => (
          <tr key={i}>
            <td style={s.td()}>{r.name}</td>
            <td style={s.td()}>{r.email || '—'}</td>
            <td style={s.td()}>{r.phone || '—'}</td>
            <td style={s.td()}>{r.company || '—'}</td>
            <td style={{ ...s.td(), textAlign: 'center' }}>{r.matter_count}</td>
            <td style={{ ...s.td(), textAlign: 'center' }}>{r.open_matters}</td>
            <td style={s.td()}>{fmtDate(r.last_activity)}</td>
          </tr>
        ))}
        <tr style={s.totalRow}>
          <td style={{ padding: '8px 12px' }} colSpan={7}>{data.length} clients total</td>
        </tr>
      </tbody>
    </table>
  );
}

function StaffActivityTable({ data }) {
  if (!data?.rows?.length) return <div style={s.empty}>No time entries found for this period.</div>;
  const byUser = data.byUser || {};
  return (
    <>
      {Object.entries(byUser).map(([user, rows]) => {
        const sub = rows.reduce((s, r) => ({ h: s.h + Number(r.total_hours || 0), v: s.v + Number(r.total_value || 0) }), { h: 0, v: 0 });
        return (
          <div key={user} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 6 }}>{user}</div>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Matter #</th><th style={s.th}>Matter Name</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Entries</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Hours</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Value</th>
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={s.td()}>{r.matter_number || 'N/A'}</td>
                    <td style={s.td()}>{r.matter_name || 'No Matter Assigned'}</td>
                    <td style={{ ...s.td(), textAlign: 'center' }}>{r.entry_count}</td>
                    <td style={{ ...s.td(), textAlign: 'right' }}>{Number(r.total_hours).toFixed(2)}</td>
                    <td style={{ ...s.td(), textAlign: 'right' }}>{fmt$(r.total_value)}</td>
                  </tr>
                ))}
                <tr style={s.totalRow}>
                  <td style={{ padding: '7px 12px' }} colSpan={3}>Subtotal — {user}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right' }}>{sub.h.toFixed(2)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right' }}>{fmt$(sub.v)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}

// ── Main Reports page ─────────────────────────────────────────────────────────

export default function Reports() {
  const [active, setActive]   = useState('matter-status');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [matters, setMatters] = useState([]);
  const [users, setUsers]     = useState([]);

  // Filters
  const [start,         setStart]         = useState('');
  const [end,           setEnd]           = useState('');
  const [practiceArea,  setPracticeArea]  = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [matterId,      setMatterId]      = useState('');
  const [userId,        setUserId]        = useState('');
  const [billable,      setBillable]      = useState('');
  const [solDays,       setSolDays]       = useState('90');

  useEffect(() => {
    axios.get('/api/reports/filters/matters').then(r => setMatters(r.data)).catch(() => {});
    axios.get('/api/reports/filters/users').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const buildParams = () => {
    const p = {};
    if (start)        p.start        = start;
    if (end)          p.end          = end;
    if (practiceArea) p.practice_area = practiceArea;
    if (statusFilter) p.status       = statusFilter;
    if (matterId)     p.matter_id    = matterId;
    if (userId)       p.user_id      = userId;
    if (billable)     p.billable     = billable;
    if (active === 'sol-alerts') p.days = solDays;
    return p;
  };

  const runReport = async () => {
    setLoading(true);
    setData(null);
    try {
      const { data: result } = await axios.get(`/api/reports/${active}`, { params: buildParams() });
      setData(result);
    } catch (err) {
      alert(err.response?.data?.error || 'Report failed.');
    } finally {
      setLoading(false);
    }
  };

  const download = async (format) => {
    try {
      const { data: blob } = await axios.get(`/api/reports/${active}`, {
        params: { ...buildParams(), format },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${active}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed.');
    }
  };

  const current = REPORTS.find(r => r.id === active);

  const renderTable = () => {
    if (loading) return <div style={s.loading}>Running report…</div>;
    if (!data)   return <div style={s.empty}>Configure filters above and click Run Report.</div>;
    switch (active) {
      case 'matter-status':   return <MatterStatusTable   data={data} />;
      case 'sol-alerts':      return <SolAlertsTable      data={data} />;
      case 'billing-summary': return <BillingSummaryTable data={data} />;
      case 'time-entries':    return <TimeEntriesTable    data={data} />;
      case 'trust-ledger':    return <TrustLedgerTable    data={data} />;
      case 'client-roster':   return <ClientRosterTable   data={data} />;
      case 'staff-activity':  return <StaffActivityTable  data={data} />;
      default: return null;
    }
  };

  return (
    <div style={s.page}>
      {/* Left sidebar */}
      <div style={s.sidebar}>
        <div style={s.sidebarTitle}>Reports</div>
        {REPORTS.map(r => (
          <button key={r.id} style={s.navItem(active === r.id)}
            onClick={() => { setActive(r.id); setData(null); }}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={s.main}>
        <div style={s.heading}>{current?.label}</div>
        <div style={s.sub}>{current?.desc}</div>

        {/* Filters */}
        <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <div style={s.filterBar}>
            {/* Date range — shown for most reports */}
            {active !== 'client-roster' && (
              <>
                <div style={s.filterGroup}>
                  <span style={s.label}>Start Date</span>
                  <input type="date" style={s.input} value={start} onChange={e => setStart(e.target.value)} />
                </div>
                <div style={s.filterGroup}>
                  <span style={s.label}>End Date</span>
                  <input type="date" style={s.input} value={end} onChange={e => setEnd(e.target.value)} />
                </div>
              </>
            )}

            {/* Practice area — matters and billing */}
            {['matter-status','billing-summary'].includes(active) && (
              <div style={s.filterGroup}>
                <span style={s.label}>Practice Area</span>
                <input style={s.input} placeholder="Filter…" value={practiceArea} onChange={e => setPracticeArea(e.target.value)} />
              </div>
            )}

            {/* Status — matter status */}
            {active === 'matter-status' && (
              <div style={s.filterGroup}>
                <span style={s.label}>Status</span>
                <select style={s.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}

            {/* SOL days */}
            {active === 'sol-alerts' && (
              <div style={s.filterGroup}>
                <span style={s.label}>Within</span>
                <select style={s.select} value={solDays} onChange={e => setSolDays(e.target.value)}>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>
            )}

            {/* Matter filter — time entries and trust */}
            {['time-entries','trust-ledger'].includes(active) && (
              <div style={s.filterGroup}>
                <span style={s.label}>Matter</span>
                <select style={s.select} value={matterId} onChange={e => setMatterId(e.target.value)}>
                  <option value="">All Matters</option>
                  {matters.map(m => <option key={m.id} value={m.id}>{m.matter_number} — {m.matter_name}</option>)}
                </select>
              </div>
            )}

            {/* Staff filter — time entries and staff activity */}
            {['time-entries','staff-activity'].includes(active) && (
              <div style={s.filterGroup}>
                <span style={s.label}>Staff Member</span>
                <select style={s.select} value={userId} onChange={e => setUserId(e.target.value)}>
                  <option value="">All Staff</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}

            {/* Billable filter — time entries */}
            {active === 'time-entries' && (
              <div style={s.filterGroup}>
                <span style={s.label}>Billable</span>
                <select style={s.select} value={billable} onChange={e => setBillable(e.target.value)}>
                  <option value="">All</option>
                  <option value="true">Billable</option>
                  <option value="false">Non-billable</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
              <button style={s.btn(NAVY)} onClick={runReport}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Run Report
              </button>
              {data && (
                <>
                  <button style={s.btnOutline} onClick={() => download('pdf')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    PDF
                  </button>
                  <button style={s.btnOutline} onClick={() => download('csv')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    CSV
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Report output */}
        <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 8, padding: 20 }}>
          {renderTable()}
        </div>
      </div>
    </div>
  );
}
