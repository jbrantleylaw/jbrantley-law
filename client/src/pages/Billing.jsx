import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const fmt$ = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const today = () => new Date().toISOString().split('T')[0];

const INVOICE_STATUS = {
  paid:    { bg: '#dcfce7', color: '#166534' },
  partial: { bg: '#fef3c7', color: '#92400e' },
  unpaid:  { bg: '#fff5f5', color: '#c53030' },
};

const TRUST_TYPES = [
  { value: 'retainer_received', label: 'Retainer Received' },
  { value: 'fee_earned',        label: 'Fee Earned (Transfer to Firm)' },
  { value: 'expense_paid',      label: 'Expense Paid from Trust' },
];

const inp = (focused, name, readOnly) => ({
  width: '100%', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box',
  border: `1.5px solid ${focused === name ? GOLD : '#dee2e6'}`, borderRadius: '5px',
  outline: 'none', fontFamily: 'Inter,sans-serif', background: readOnly ? '#f8f9fa' : '#fff',
  transition: 'border-color .15s',
});
const sel = (focused, name) => ({
  ...inp(focused, name),
  appearance: 'none', cursor: 'pointer', paddingRight: '28px',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
});

const Lbl = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
    {children}{required && <span style={{ color: '#c53030', marginLeft: '2px' }}>*</span>}
  </label>
);

export default function Billing() {
  const { user } = useAuth();
  const isAttorney = user?.role === 'attorney';
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'time');

  const [matters,    setMatters]    = useState([]);
  const [matterId,   setMatterId]   = useState('');
  const [entries,    setEntries]    = useState([]);
  const [invoices,   setInvoices]   = useState([]);
  const [invoice,    setInvoice]    = useState(null);  // expanded invoice detail
  const [trust,      setTrust]      = useState([]);
  const [recon,      setRecon]      = useState(null);
  const [unpaid,     setUnpaid]     = useState(0);

  const [panel,      setPanel]      = useState(null);
  const [panelVis,   setPanelVis]   = useState(false);
  const [focused,    setFocused]    = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [toast,      setToast]      = useState(null);
  const [deleteId,   setDeleteId]   = useState(null);
  const [editEntry,  setEditEntry]  = useState(null);

  const [timeForm, setTimeForm]     = useState({ date: today(), description: '', hours: '', rate: '', billable: true });
  const [invForm,  setInvForm]      = useState({ due_date: '', notes: '', flat_items: [] });
  const [payForm,  setPayForm]      = useState({ amount_paid: '', payment_method: '' });
  const [trustForm,setTrustForm]    = useState({ transaction_type: 'retainer_received', date: today(), amount: '', description: '', reference_number: '' });
  const [bankBal,  setBankBal]      = useState('');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const openPanel = (type) => { setPanel(type); setTimeout(() => setPanelVis(true), 30); };
  const closePanel = () => {
    setPanelVis(false);
    setTimeout(() => { setPanel(null); setEditEntry(null); }, 280);
  };

  useEffect(() => { loadMatters(); if (isAttorney) loadUnpaid(); }, []);
  useEffect(() => { if (matterId) { loadEntries(); if (isAttorney) { loadInvoices(); loadTrust(); } } }, [matterId]);
  useEffect(() => { setSearchParams(tab === 'time' ? {} : { tab }); }, [tab]);
  useEffect(() => { if (searchParams.get('new') === 'invoice' && isAttorney) { setTab('invoices'); setTimeout(() => openPanel('invoice'), 150); } }, []);

  const loadMatters   = async () => { try { const r = await axios.get('/api/billing/matters'); setMatters(r.data); } catch {} };
  const loadEntries   = async () => { try { const r = await axios.get('/api/billing/time-entries', { params: { matter_id: matterId } }); setEntries(r.data); } catch {} };
  const loadInvoices  = async () => { try { const r = await axios.get('/api/billing/invoices', { params: { matter_id: matterId } }); setInvoices(r.data); } catch {} };
  const loadTrust     = async () => { try { const r = await axios.get('/api/billing/trust', { params: { matter_id: matterId } }); setTrust(r.data); } catch {} };
  const loadUnpaid    = async () => { try { const r = await axios.get('/api/billing/unpaid-count'); setUnpaid(r.data.count); } catch {} };
  const loadRecon     = async () => { try { const r = await axios.get('/api/billing/trust/reconciliation'); setRecon(r.data); } catch {} };

  const loadInvoiceDetail = async (id) => {
    try { const r = await axios.get(`/api/billing/invoices/${id}`); setInvoice(r.data); } catch {}
  };

  // ── Time entries ──────────────────────────────────────────────────────────
  const openAddTime = () => {
    setTimeForm({ date: today(), description: '', hours: '', rate: '', billable: true });
    setEditEntry(null);
    openPanel('time');
  };
  const openEditTime = (e) => {
    setTimeForm({ date: e.date?.split('T')[0] || today(), description: e.description, hours: e.hours, rate: e.rate, billable: e.billable });
    setEditEntry(e);
    openPanel('time');
  };
  const saveTime = async () => {
    if (!timeForm.description) return showToast('Description required', 'error');
    setSaving(true);
    try {
      const payload = { ...timeForm, matter_id: matterId || null };
      if (editEntry) { await axios.put(`/api/billing/time-entries/${editEntry.id}`, payload); showToast('Entry updated.'); }
      else           { await axios.post('/api/billing/time-entries', payload); showToast('Entry added.'); }
      closePanel();
      loadEntries();
    } catch (err) { showToast(err.response?.data?.error || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };
  const deleteTime = async (id) => {
    try { await axios.delete(`/api/billing/time-entries/${id}`); setDeleteId(null); loadEntries(); showToast('Entry deleted.'); }
    catch (err) { showToast(err.response?.data?.error || 'Delete failed', 'error'); }
  };

  // ── Invoices ──────────────────────────────────────────────────────────────
  const openInvoicePanel = () => {
    setInvForm({ due_date: '', notes: '', flat_items: [] });
    openPanel('invoice');
  };
  const addFlatItem = () => setInvForm(p => ({ ...p, flat_items: [...p.flat_items, { description: '', amount: '' }] }));
  const removeFlatItem = (i) => setInvForm(p => ({ ...p, flat_items: p.flat_items.filter((_, idx) => idx !== i) }));
  const updateFlatItem = (i, k, v) => setInvForm(p => ({ ...p, flat_items: p.flat_items.map((f, idx) => idx === i ? { ...f, [k]: v } : f) }));

  const generateInvoice = async () => {
    if (!matterId) return showToast('Select a matter first', 'error');
    setSaving(true);
    try {
      await axios.post('/api/billing/invoices', { matter_id: matterId, ...invForm });
      showToast('Invoice generated.');
      closePanel();
      loadInvoices();
      loadEntries();
      loadUnpaid();
    } catch (err) { showToast(err.response?.data?.error || 'Generation failed', 'error'); }
    finally { setSaving(false); }
  };

  const openPaymentPanel = (inv) => {
    setPayForm({ amount_paid: inv.total_amount, payment_method: '', invoice_id: inv.id });
    setInvoice(inv);
    openPanel('payment');
  };
  const savePayment = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/billing/invoices/${payForm.invoice_id}/payment`, payForm);
      showToast('Payment recorded.');
      closePanel();
      loadInvoices();
      loadUnpaid();
    } catch { showToast('Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const downloadInvoicePdf = async (inv) => {
    try {
      const { data: blob } = await axios.get(`/api/billing/invoices/${inv.id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `INV-${String(inv.invoice_number).padStart(4,'0')}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { showToast('PDF generation failed', 'error'); }
  };

  // ── Trust ──────────────────────────────────────────────────────────────────
  const openTrustPanel = () => {
    setTrustForm({ transaction_type: 'retainer_received', date: today(), amount: '', description: '', reference_number: '' });
    openPanel('trust');
  };
  const saveTrust = async () => {
    if (!matterId || !trustForm.amount) return showToast('Matter and amount required', 'error');
    setSaving(true);
    try {
      await axios.post('/api/billing/trust', { ...trustForm, matter_id: matterId });
      showToast('Trust entry saved.');
      closePanel();
      loadTrust();
    } catch (err) { showToast(err.response?.data?.error || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const currentBalance = trust.length > 0 ? Number(trust[trust.length - 1].balance_after) : 0;
  const unbilledHours  = entries.filter(e => e.status === 'unbilled' && e.billable).reduce((s, e) => s + Number(e.hours || 0), 0);
  const unbilledValue  = entries.filter(e => e.status === 'unbilled' && e.billable).reduce((s, e) => s + Number(e.hours || 0) * Number(e.rate || 0), 0);

  const TABS = [
    { id: 'time',     label: 'Time Entries' },
    ...(isAttorney ? [
      { id: 'invoices', label: 'Invoices' },
      { id: 'trust',    label: 'Trust Ledger' },
    ] : []),
  ];

  const panelTitle = {
    time:    editEntry ? 'Edit Time Entry' : 'Add Time Entry',
    invoice: 'Generate Invoice',
    payment: 'Record Payment',
    trust:   'Add Trust Entry',
  }[panel] || '';

  return (
    <Layout>
      <div style={{ padding: '36px 40px', maxWidth: '1260px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '600', color: NAVY, fontFamily: 'Playfair Display,Georgia,serif', margin: '0 0 4px' }}>
              Billing &amp; Invoices
            </h1>
            <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
              {isAttorney && unpaid > 0
                ? <span style={{ color: '#c53030', fontWeight: '600' }}>⚠ {unpaid} unpaid invoice{unpaid !== 1 ? 's' : ''}</span>
                : 'Time tracking, invoicing, and trust ledger'}
            </p>
          </div>
          {/* Matter selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '13px', color: '#555', whiteSpace: 'nowrap' }}>Matter:</label>
            <select value={matterId} onChange={e => setMatterId(e.target.value)}
              style={{ ...sel(focused, '__matter'), width: '260px' }}
              onFocus={() => setFocused('__matter')} onBlur={() => setFocused(null)}>
              <option value="">— All matters —</option>
              {matters.map(m => (
                <option key={m.id} value={m.id}>{m.matter_number} — {m.matter_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', background: '#f0f2f5', padding: '4px', borderRadius: '8px', width: 'fit-content', marginBottom: '20px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '7px 18px', fontSize: '13px', fontWeight: '500', borderRadius: '6px',
              border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all .15s',
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? NAVY : '#6c757d',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── TIME ENTRIES TAB ───────────────────────────────────────── */}
        {tab === 'time' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: '#6c757d' }}>
                {matterId && <>
                  <span style={{ color: NAVY, fontWeight: '600' }}>{unbilledHours.toFixed(1)}h</span> unbilled
                  {isAttorney && <> &nbsp;&bull;&nbsp; <span style={{ color: GOLD, fontWeight: '600' }}>{fmt$(unbilledValue)}</span> unbilled value</>}
                </>}
              </div>
              <button onClick={openAddTime}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: GOLD, border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}
                onMouseEnter={e => e.currentTarget.style.background = '#b8943d'}
                onMouseLeave={e => e.currentTarget.style.background = GOLD}>
                + Add Time Entry
              </button>
            </div>
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e9ecef', boxShadow: '0 1px 4px rgba(0,0,0,.04)', overflow: 'hidden' }}>
              {entries.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#adb5bd', fontSize: '14px' }}>
                  {matterId ? 'No time entries for this matter.' : 'Select a matter to see time entries.'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                      {['Date','Description','Hours','Rate','Amount','Billable','Status',''].map((h, i) => (
                        <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6c757d', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => {
                      const isDel = deleteId === e.id;
                      return (
                        <tr key={e.id}
                          style={{ borderBottom: i < entries.length - 1 ? '1px solid #f1f3f5' : 'none', background: isDel ? '#fff5f5' : 'transparent' }}
                          onMouseEnter={el => { if (!isDel) el.currentTarget.style.background = '#fafbfc'; }}
                          onMouseLeave={el => { el.currentTarget.style.background = isDel ? '#fff5f5' : 'transparent'; }}>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
                          <td style={{ padding: '11px 14px', color: NAVY, fontWeight: '500', maxWidth: '280px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description}</div>
                            {e.matter_number && !matterId && <div style={{ fontSize: '11px', color: '#adb5bd', marginTop: '2px' }}>{e.matter_number}</div>}
                          </td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>{Number(e.hours).toFixed(2)}</td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>{isAttorney ? fmt$(e.rate) : '—'}</td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', fontWeight: '600' }}>
                            {isAttorney ? fmt$(Number(e.hours) * Number(e.rate)) : '—'}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 7px', borderRadius: '10px', background: e.billable ? '#dcfce7' : '#f1f3f5', color: e.billable ? '#166534' : '#6c757d' }}>
                              {e.billable ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 7px', borderRadius: '10px',
                              background: e.status === 'billed' ? '#e0f2fe' : e.status === 'written_off' ? '#fef3c7' : '#f1f3f5',
                              color: e.status === 'billed' ? '#0369a1' : e.status === 'written_off' ? '#92400e' : '#6c757d' }}>
                              {e.status}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                            {isDel ? (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <span style={{ fontSize: '11px', color: '#c53030' }}>Delete?</span>
                                <button onClick={() => deleteTime(e.id)} style={{ padding: '2px 8px', background: '#c53030', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>Yes</button>
                                <button onClick={() => setDeleteId(null)} style={{ padding: '2px 8px', background: 'transparent', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>No</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', opacity: 0 }}
                                ref={el => { if (el) { el.closest('tr').addEventListener('mouseenter', () => el.style.opacity = 1); el.closest('tr').addEventListener('mouseleave', () => el.style.opacity = 0); } }}>
                                <button onClick={() => openEditTime(e)} style={{ padding: '3px 8px', border: `1px solid ${NAVY}`, borderRadius: '4px', background: 'none', color: NAVY, fontSize: '11px', cursor: 'pointer' }}>Edit</button>
                                {isAttorney && (
                                  <button onClick={() => setDeleteId(e.id)} style={{ padding: '3px 8px', border: '1px solid #dee2e6', borderRadius: '4px', background: 'none', color: '#6c757d', fontSize: '11px', cursor: 'pointer' }}
                                    onMouseEnter={el => { el.currentTarget.style.borderColor = '#c53030'; el.currentTarget.style.color = '#c53030'; }}
                                    onMouseLeave={el => { el.currentTarget.style.borderColor = '#dee2e6'; el.currentTarget.style.color = '#6c757d'; }}>Del</button>
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
          </>
        )}

        {/* ── INVOICES TAB ──────────────────────────────────────────── */}
        {tab === 'invoices' && isAttorney && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button onClick={openInvoicePanel} disabled={!matterId}
                style={{ padding: '9px 18px', background: matterId ? NAVY : '#adb5bd', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: matterId ? 'pointer' : 'not-allowed', fontFamily: 'Inter,sans-serif' }}>
                Generate Invoice from Unbilled Time
              </button>
            </div>
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e9ecef', boxShadow: '0 1px 4px rgba(0,0,0,.04)', overflow: 'hidden' }}>
              {invoices.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#adb5bd', fontSize: '14px' }}>
                  {matterId ? 'No invoices for this matter.' : 'Select a matter to view invoices.'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                      {['Invoice #','Date','Due','Status','Total','Paid','Balance',''].map((h, i) => (
                        <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6c757d', letterSpacing: '.06em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, i) => {
                      const bal = Number(inv.total_amount) - Number(inv.amount_paid);
                      const st  = INVOICE_STATUS[inv.status] || INVOICE_STATUS.unpaid;
                      return (
                        <tr key={inv.id} style={{ borderBottom: i < invoices.length - 1 ? '1px solid #f1f3f5' : 'none', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontWeight: '600', color: NAVY }}>
                            INV-{String(inv.invoice_number).padStart(4,'0')}
                          </td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>{fmtDate(inv.invoice_date)}</td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', color: inv.status === 'unpaid' && inv.due_date && new Date(inv.due_date) < new Date() ? '#c53030' : '#6c757d' }}>
                            {fmtDate(inv.due_date)}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: st.bg, color: st.color }}>
                              {inv.status?.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', fontWeight: '600' }}>{fmt$(inv.total_amount)}</td>
                          <td style={{ padding: '11px 14px', color: '#166534' }}>{fmt$(inv.amount_paid)}</td>
                          <td style={{ padding: '11px 14px', fontWeight: '600', color: bal > 0 ? '#c53030' : '#166534' }}>{fmt$(bal)}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                              <button onClick={() => downloadInvoicePdf(inv)} style={{ padding: '3px 8px', border: `1px solid ${NAVY}`, borderRadius: '4px', background: 'none', color: NAVY, fontSize: '11px', cursor: 'pointer' }}>PDF</button>
                              {inv.status !== 'paid' && (
                                <button onClick={() => openPaymentPanel(inv)} style={{ padding: '3px 8px', border: `1px solid ${GOLD}`, borderRadius: '4px', background: 'none', color: '#7a5c0a', fontSize: '11px', cursor: 'pointer' }}>Pay</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── TRUST LEDGER TAB ──────────────────────────────────────── */}
        {tab === 'trust' && isAttorney && (
          <>
            {/* Warning banner */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#92400e' }}>
              <strong>Trust Account Notice:</strong> Trust funds are tracked here for recordkeeping only. All actual transactions must be processed through your IOLTA-compliant payment processor.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {matterId && (
                  <div style={{ background: '#fff', border: `2px solid ${GOLD}`, borderRadius: '8px', padding: '8px 16px' }}>
                    <div style={{ fontSize: '11px', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '.06em' }}>Trust Balance</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: currentBalance >= 0 ? '#166534' : '#c53030' }}>
                      {fmt$(currentBalance)}
                    </div>
                  </div>
                )}
                <button onClick={() => { loadRecon(); openPanel('recon'); }} style={{ padding: '8px 14px', background: '#f8f9fa', border: `1px solid ${NAVY}`, borderRadius: '6px', fontSize: '12px', color: NAVY, cursor: 'pointer', fontWeight: '600' }}>
                  Three-Way Reconciliation
                </button>
              </div>
              <button onClick={openTrustPanel} disabled={!matterId}
                style={{ padding: '9px 18px', background: matterId ? NAVY : '#adb5bd', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: matterId ? 'pointer' : 'not-allowed', fontFamily: 'Inter,sans-serif' }}>
                + Add Entry
              </button>
            </div>

            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e9ecef', boxShadow: '0 1px 4px rgba(0,0,0,.04)', overflow: 'hidden' }}>
              {trust.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#adb5bd', fontSize: '14px' }}>
                  {matterId ? 'No trust entries for this matter.' : 'Select a matter to view trust ledger.'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                      {['Date','Type','Description','Amount','Balance After','Reference'].map((h, i) => (
                        <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6c757d', letterSpacing: '.06em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trust.map((t, i) => {
                      const isIn = t.transaction_type === 'retainer_received';
                      return (
                        <tr key={t.id} style={{ borderBottom: i < trust.length - 1 ? '1px solid #f1f3f5' : 'none' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>{fmtDate(t.date)}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 7px', borderRadius: '10px',
                              background: isIn ? '#dcfce7' : '#fff5f5',
                              color: isIn ? '#166534' : '#c53030' }}>
                              {TRUST_TYPES.find(x => x.value === t.transaction_type)?.label || t.transaction_type}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description || '—'}</td>
                          <td style={{ padding: '11px 14px', fontWeight: '600', color: isIn ? '#166534' : '#c53030' }}>
                            {isIn ? '+' : '−'}{fmt$(t.amount)}
                          </td>
                          <td style={{ padding: '11px 14px', fontWeight: '700', color: Number(t.balance_after) >= 0 ? '#166534' : '#c53030' }}>
                            {fmt$(t.balance_after)}
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: '12px', color: '#adb5bd', fontFamily: 'monospace' }}>{t.reference_number || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── SLIDE-OVER PANEL ────────────────────────────────────────── */}
      {panel && (
        <>
          <div onClick={closePanel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 200, opacity: panelVis ? 1 : 0, transition: 'opacity .25s' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px', background: '#fff', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,.15)', transform: panelVis ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .28s cubic-bezier(.4,0,.2,1)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ fontSize: '17px', fontWeight: '600', color: NAVY, margin: 0 }}>{panelTitle}</h2>
              <button onClick={closePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#adb5bd', display: 'flex' }}
                onMouseEnter={e => e.currentTarget.style.color = '#495057'} onMouseLeave={e => e.currentTarget.style.color = '#adb5bd'}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

              {/* Time Entry Form */}
              {panel === 'time' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <Lbl required>Description</Lbl>
                    <input value={timeForm.description} style={inp(focused, 'desc')}
                      onFocus={() => setFocused('desc')} onBlur={() => setFocused(null)}
                      onChange={e => setTimeForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div>
                    <Lbl required>Date</Lbl>
                    <input type="date" value={timeForm.date} style={inp(focused, 'tdate')}
                      onFocus={() => setFocused('tdate')} onBlur={() => setFocused(null)}
                      onChange={e => setTimeForm(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <Lbl>Hours</Lbl>
                    <input type="number" step="0.25" value={timeForm.hours} style={inp(focused, 'hrs')}
                      onFocus={() => setFocused('hrs')} onBlur={() => setFocused(null)}
                      onChange={e => setTimeForm(p => ({ ...p, hours: e.target.value }))} />
                  </div>
                  <div>
                    <Lbl>Rate ($/hr)</Lbl>
                    <input type="number" step="0.01" value={timeForm.rate} style={inp(focused, 'rate')}
                      onFocus={() => setFocused('rate')} onBlur={() => setFocused(null)}
                      onChange={e => setTimeForm(p => ({ ...p, rate: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: '2' }}>
                    {timeForm.hours && timeForm.rate && (
                      <div style={{ fontSize: '13px', color: NAVY, fontWeight: '700' }}>
                        = {fmt$(Number(timeForm.hours) * Number(timeForm.rate))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={timeForm.billable} id="billable"
                      onChange={e => setTimeForm(p => ({ ...p, billable: e.target.checked }))} style={{ accentColor: GOLD }} />
                    <label htmlFor="billable" style={{ fontSize: '13px', cursor: 'pointer' }}>Billable</label>
                  </div>
                </div>
              )}

              {/* Invoice Form */}
              {panel === 'invoice' && (
                <div>
                  <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px' }}>
                    <strong>{entries.filter(e => e.status === 'unbilled' && e.billable).length}</strong> unbilled time entries ({unbilledHours.toFixed(1)}h = {fmt$(unbilledValue)}) will be included.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                    <div>
                      <Lbl>Due Date</Lbl>
                      <input type="date" value={invForm.due_date} style={inp(focused, 'idue')}
                        onFocus={() => setFocused('idue')} onBlur={() => setFocused(null)}
                        onChange={e => setInvForm(p => ({ ...p, due_date: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <Lbl>Notes</Lbl>
                    <textarea rows={2} value={invForm.notes} style={{ ...inp(focused, 'inotes'), resize: 'vertical' }}
                      onFocus={() => setFocused('inotes')} onBlur={() => setFocused(null)}
                      onChange={e => setInvForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                  <div style={{ borderTop: '1px solid #e9ecef', paddingTop: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '.04em' }}>Flat Fee Items</span>
                      <button onClick={addFlatItem} style={{ fontSize: '12px', color: GOLD, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>+ Add</button>
                    </div>
                    {invForm.flat_items.map((f, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <input placeholder="Description" value={f.description} style={inp(focused, `fd${idx}`)}
                          onFocus={() => setFocused(`fd${idx}`)} onBlur={() => setFocused(null)}
                          onChange={e => updateFlatItem(idx, 'description', e.target.value)} />
                        <input type="number" placeholder="Amount" value={f.amount} style={{ ...inp(focused, `fa${idx}`), width: '90px' }}
                          onFocus={() => setFocused(`fa${idx}`)} onBlur={() => setFocused(null)}
                          onChange={e => updateFlatItem(idx, 'amount', e.target.value)} />
                        <button onClick={() => removeFlatItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c53030', fontSize: '16px' }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Form */}
              {panel === 'payment' && (
                <div style={{ display: 'grid', gap: '14px' }}>
                  {invoice && (
                    <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '12px', fontSize: '13px' }}>
                      <div>Invoice: <strong>INV-{String(invoice.invoice_number).padStart(4,'0')}</strong></div>
                      <div>Total: <strong>{fmt$(invoice.total_amount)}</strong></div>
                    </div>
                  )}
                  <div>
                    <Lbl required>Amount Paid</Lbl>
                    <input type="number" step="0.01" value={payForm.amount_paid} style={inp(focused, 'pamt')}
                      onFocus={() => setFocused('pamt')} onBlur={() => setFocused(null)}
                      onChange={e => setPayForm(p => ({ ...p, amount_paid: e.target.value }))} />
                  </div>
                  <div>
                    <Lbl>Payment Method</Lbl>
                    <select value={payForm.payment_method} style={sel(focused, 'pmethod')}
                      onFocus={() => setFocused('pmethod')} onBlur={() => setFocused(null)}
                      onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}>
                      <option value="">Select…</option>
                      {['Check','Credit Card','ACH/Wire','Cash','Other'].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Trust Entry Form */}
              {panel === 'trust' && (
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div>
                    <Lbl required>Transaction Type</Lbl>
                    <select value={trustForm.transaction_type} style={sel(focused, 'ttype')}
                      onFocus={() => setFocused('ttype')} onBlur={() => setFocused(null)}
                      onChange={e => setTrustForm(p => ({ ...p, transaction_type: e.target.value }))}>
                      {TRUST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <Lbl required>Date</Lbl>
                      <input type="date" value={trustForm.date} style={inp(focused, 'trdate')}
                        onFocus={() => setFocused('trdate')} onBlur={() => setFocused(null)}
                        onChange={e => setTrustForm(p => ({ ...p, date: e.target.value }))} />
                    </div>
                    <div>
                      <Lbl required>Amount</Lbl>
                      <input type="number" step="0.01" value={trustForm.amount} style={inp(focused, 'tramt')}
                        onFocus={() => setFocused('tramt')} onBlur={() => setFocused(null)}
                        onChange={e => setTrustForm(p => ({ ...p, amount: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Lbl>Description</Lbl>
                    <input value={trustForm.description} style={inp(focused, 'trdesc')}
                      onFocus={() => setFocused('trdesc')} onBlur={() => setFocused(null)}
                      onChange={e => setTrustForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div>
                    <Lbl>Reference / Check Number</Lbl>
                    <input value={trustForm.reference_number} style={inp(focused, 'trref')}
                      onFocus={() => setFocused('trref')} onBlur={() => setFocused(null)}
                      onChange={e => setTrustForm(p => ({ ...p, reference_number: e.target.value }))} />
                  </div>
                </div>
              )}

              {/* Reconciliation Panel */}
              {panel === 'recon' && (
                <div>
                  <div style={{ background: '#fff8e1', border: '1px solid #fde68a', borderRadius: '6px', padding: '12px 14px', marginBottom: '16px', fontSize: '12px', color: '#92400e' }}>
                    Enter your actual IOLTA bank statement balance to check for discrepancies.
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <Lbl>Bank Statement Balance (IOLTA)</Lbl>
                    <input type="number" step="0.01" value={bankBal} placeholder="0.00" style={inp(focused, 'bank')}
                      onFocus={() => setFocused('bank')} onBlur={() => setFocused(null)}
                      onChange={e => setBankBal(e.target.value)} />
                  </div>
                  {recon && (
                    <>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Client Ledger (by matter)</div>
                        {recon.matters.map(m => (
                          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f3f5', fontSize: '13px' }}>
                            <span style={{ color: '#6c757d' }}>{m.matter_number} — {m.matter_name}</span>
                            <span style={{ fontWeight: '600' }}>{fmt$(m.current_balance)}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', fontWeight: '700', color: NAVY }}>
                          <span>Total Client Ledger</span>
                          <span>{fmt$(recon.total_client_ledger)}</span>
                        </div>
                      </div>
                      {bankBal !== '' && (() => {
                        const diff = Math.abs(Number(bankBal) - recon.total_client_ledger);
                        const ok   = diff < 0.01;
                        return (
                          <div style={{ padding: '14px', borderRadius: '8px', background: ok ? '#dcfce7' : '#fff5f5', border: `1px solid ${ok ? '#86efac' : '#fed7d7'}` }}>
                            <div style={{ fontWeight: '700', fontSize: '14px', color: ok ? '#166534' : '#c53030' }}>
                              {ok ? '✓ Reconciled' : '⚠ Discrepancy: ' + fmt$(diff)}
                            </div>
                            {!ok && <div style={{ fontSize: '12px', color: '#c53030', marginTop: '4px' }}>Review entries for missing or duplicate transactions.</div>}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e9ecef', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={closePanel} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #dee2e6', borderRadius: '5px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                Cancel
              </button>
              {panel !== 'recon' && (
                <button disabled={saving}
                  onClick={panel === 'time' ? saveTime : panel === 'invoice' ? generateInvoice : panel === 'payment' ? savePayment : saveTrust}
                  style={{ padding: '9px 22px', background: saving ? '#d4b878' : NAVY, border: 'none', borderRadius: '5px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Inter,sans-serif' }}>
                  {saving ? 'Saving…' : panel === 'invoice' ? 'Generate Invoice' : panel === 'payment' ? 'Record Payment' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '28px', right: '28px', background: toast.type === 'error' ? '#c53030' : '#276749', color: '#fff', padding: '12px 20px', borderRadius: '7px', fontSize: '14px', fontWeight: '500', zIndex: 400, boxShadow: '0 4px 16px rgba(0,0,0,.2)', animation: 'slideUp .2s ease' }}>
          {toast.msg}
        </div>
      )}
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Layout>
  );
}
