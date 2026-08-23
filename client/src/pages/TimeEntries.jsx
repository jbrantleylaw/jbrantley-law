import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../utils/axios';
import Layout from '../components/Layout';

const NAVY = '#1B2A4A';
const GOLD  = '#C9A84C';

const fmtDate = (d) => d ? new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
const fmtMoney = (n) => n != null ? `$${Number(n).toFixed(2)}` : '—';
const fmtHours = (h) => h != null ? `${Number(h).toFixed(2)} hrs` : '—';

const fieldStyle = { padding:'9px 12px', fontSize:'13px', border:'1.5px solid #dee2e6', borderRadius:'5px', outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box' };
const labelSt = { display:'block', fontSize:'11px', fontWeight:'600', color:'#555', marginBottom:'4px' };

const EMPTY_FORM = { matter_id:'', entry_date:'', hours:'', rate:'', description:'', billable:true };

export default function TimeEntries() {
  const [searchParams] = useSearchParams();
  const [entries, setEntries]   = useState([]);
  const [matters, setMatters]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ matter_id:'', billable:'', invoiced:'', start_date:'', end_date:'' });
  const [form,    setForm]      = useState(EMPTY_FORM);
  const [editId,  setEditId]    = useState(null);
  const [delId,   setDelId]     = useState(null);
  const [panel,   setPanel]     = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [toast,   setToast]     = useState(null);
  const [focused, setFocused]   = useState(null);

  useEffect(() => {
    if (searchParams.get('new') === 'true') openNew();
  }, []);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.matter_id)  params.matter_id  = filters.matter_id;
      if (filters.billable !== '') params.billable = filters.billable;
      if (filters.invoiced !== '') params.invoiced = filters.invoiced;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date)   params.end_date   = filters.end_date;
      const { data } = await axios.get('/api/time-entries', { params });
      setEntries(data);
    } catch { showToast('Failed to load entries.','error'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    axios.get('/api/matters').then(r => setMatters(r.data)).catch(()=>{});
  }, []);

  const openNew = () => {
    setForm({ ...EMPTY_FORM, entry_date: new Date().toISOString().slice(0,10) });
    setEditId(null);
    setPanel(true);
  };

  const openEdit = (e) => {
    setForm({
      matter_id: e.matter_id ?? '',
      entry_date: e.entry_date?.slice(0,10) ?? '',
      hours: e.hours ?? '',
      rate: e.rate ?? '',
      description: e.description ?? '',
      billable: e.billable ?? true,
    });
    setEditId(e.id);
    setPanel(true);
  };

  const save = async () => {
    const hours = parseFloat(form.hours);
    if (!form.hours || isNaN(hours) || hours <= 0) return showToast('Enter a valid number of hours.','error');
    if (!form.description.trim()) return showToast('Description is required.','error');
    setSaving(true);
    try {
      const payload = {
        matter_id:   form.matter_id ? parseInt(form.matter_id, 10) : null,
        entry_date:  form.entry_date,
        hours,
        rate:        form.rate ? parseFloat(form.rate) : null,
        description: form.description.trim(),
        billable:    form.billable,
      };
      if (editId) { await axios.put(`/api/time-entries/${editId}`, payload); showToast('Entry updated.'); }
      else        { await axios.post('/api/time-entries', payload); showToast('Entry added.'); }
      setPanel(false);
      load();
    } catch (err) { showToast(err.response?.data?.error || 'Failed to save.','error'); }
    setSaving(false);
  };

  const del = async (id) => {
    try { await axios.delete(`/api/time-entries/${id}`); setDelId(null); load(); showToast('Entry deleted.'); }
    catch { showToast('Failed to delete.','error'); }
  };

  const totalHours  = entries.reduce((s,e) => s + Number(e.hours||0), 0);
  const totalBilled = entries.filter(e=>e.billable).reduce((s,e) => s + (Number(e.hours||0) * Number(e.rate||0)), 0);
  const unbilled    = entries.filter(e=>e.billable && !e.invoiced);

  const fld = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <Layout>
      <div style={{ padding:'32px 40px', maxWidth:'1100px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
          <div>
            <h1 style={{ fontSize:'24px', fontWeight:'600', color:NAVY, fontFamily:'Playfair Display,Georgia,serif', margin:0 }}>Time Entries</h1>
            <p style={{ color:'#6c757d', fontSize:'13px', margin:'4px 0 0' }}>Track billable and non-billable time across all matters.</p>
          </div>
          <button onClick={openNew}
            style={{ padding:'9px 18px', background:GOLD, border:'none', borderRadius:'6px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
            + Log Time
          </button>
        </div>

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px', marginBottom:'20px' }}>
          {[
            { label:'Total Hours', value: fmtHours(totalHours) },
            { label:'Billed Value', value: fmtMoney(totalBilled) },
            { label:'Unbilled Entries', value: unbilled.length },
          ].map(c => (
            <div key={c.label} style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'8px', padding:'16px 20px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'#6c757d', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'4px' }}>{c.label}</div>
              <div style={{ fontSize:'22px', fontWeight:'700', color:NAVY }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'8px', padding:'16px 20px', marginBottom:'16px', display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:'1 1 160px' }}>
            <label style={labelSt}>Matter</label>
            <select value={filters.matter_id} onChange={e=>setFilters(f=>({...f,matter_id:e.target.value}))}
              style={{ ...fieldStyle, width:'100%', appearance:'none' }}>
              <option value="">All Matters</option>
              {matters.map(m=><option key={m.id} value={m.id}>{m.matter_number} — {m.matter_name}</option>)}
            </select>
          </div>
          <div style={{ flex:'0 1 120px' }}>
            <label style={labelSt}>Billable</label>
            <select value={filters.billable} onChange={e=>setFilters(f=>({...f,billable:e.target.value}))}
              style={{ ...fieldStyle, width:'100%', appearance:'none' }}>
              <option value="">All</option>
              <option value="true">Billable</option>
              <option value="false">Non-Billable</option>
            </select>
          </div>
          <div style={{ flex:'0 1 120px' }}>
            <label style={labelSt}>Invoice Status</label>
            <select value={filters.invoiced} onChange={e=>setFilters(f=>({...f,invoiced:e.target.value}))}
              style={{ ...fieldStyle, width:'100%', appearance:'none' }}>
              <option value="">All</option>
              <option value="false">Unbilled</option>
              <option value="true">Invoiced</option>
            </select>
          </div>
          <div style={{ flex:'0 1 130px' }}>
            <label style={labelSt}>From</label>
            <input type="date" value={filters.start_date} onChange={e=>setFilters(f=>({...f,start_date:e.target.value}))} style={{ ...fieldStyle, width:'100%' }} />
          </div>
          <div style={{ flex:'0 1 130px' }}>
            <label style={labelSt}>To</label>
            <input type="date" value={filters.end_date} onChange={e=>setFilters(f=>({...f,end_date:e.target.value}))} style={{ ...fieldStyle, width:'100%' }} />
          </div>
          <button onClick={()=>setFilters({ matter_id:'', billable:'', invoiced:'', start_date:'', end_date:'' })}
            style={{ padding:'9px 14px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'5px', fontSize:'12px', cursor:'pointer', color:'#6c757d' }}>
            Clear
          </button>
        </div>

        {/* Table */}
        <div style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'10px', boxShadow:'0 1px 4px rgba(0,0,0,.04)', overflow:'hidden' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#adb5bd' }}>Loading…</div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px', color:'#adb5bd', fontSize:'14px' }}>No time entries found.</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #e9ecef', background:'#f8f9fa' }}>
                  {['Date','Matter','Description','Staff','Hours','Rate','Billable','Status',''].map(h=>(
                    <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:'10px', fontWeight:'700', color:'#6c757d', letterSpacing:'.06em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e,i) => (
                  <tr key={e.id} style={{ borderBottom: i<entries.length-1?'1px solid #f1f3f5':'none' }}
                    onMouseEnter={el=>el.currentTarget.style.background='#fafbfc'}
                    onMouseLeave={el=>el.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px 12px', whiteSpace:'nowrap', color:'#495057' }}>{fmtDate(e.entry_date)}</td>
                    <td style={{ padding:'10px 12px', maxWidth:'160px' }}>
                      {e.matter_number ? (
                        <span style={{ fontSize:'11px', fontFamily:'monospace', background:'#f0f2f5', padding:'2px 6px', borderRadius:'3px', color:'#495057' }}>{e.matter_number}</span>
                      ) : <span style={{ color:'#ced4da' }}>—</span>}
                    </td>
                    <td style={{ padding:'10px 12px', color:NAVY, fontWeight:'500', maxWidth:'220px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</td>
                    <td style={{ padding:'10px 12px', color:'#6c757d', whiteSpace:'nowrap' }}>{e.staff_name||'—'}</td>
                    <td style={{ padding:'10px 12px', fontWeight:'600', color:NAVY, whiteSpace:'nowrap' }}>{fmtHours(e.hours)}</td>
                    <td style={{ padding:'10px 12px', color:'#495057', whiteSpace:'nowrap' }}>{e.rate ? fmtMoney(e.rate)+'/hr' : '—'}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'12px', background:e.billable?'#dcfce7':'#f1f5f9', color:e.billable?'#166534':'#64748b' }}>
                        {e.billable?'Billable':'Non-Bill'}
                      </span>
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'12px', background:e.invoiced?'#e8edf5':'#fef3c7', color:e.invoiced?NAVY:'#92400e' }}>
                        {e.invoiced?'Invoiced':'Unbilled'}
                      </span>
                    </td>
                    <td style={{ padding:'10px 12px', textAlign:'right', whiteSpace:'nowrap' }}>
                      {delId === e.id ? (
                        <span style={{ display:'flex', gap:'4px', justifyContent:'flex-end', alignItems:'center' }}>
                          <span style={{ fontSize:'11px', color:'#c53030' }}>Delete?</span>
                          <button onClick={()=>del(e.id)} style={{ padding:'2px 8px', background:'#c53030', border:'none', borderRadius:'3px', color:'#fff', fontSize:'11px', cursor:'pointer' }}>Yes</button>
                          <button onClick={()=>setDelId(null)} style={{ padding:'2px 6px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'3px', fontSize:'11px', cursor:'pointer' }}>No</button>
                        </span>
                      ) : (
                        <span style={{ display:'flex', gap:'4px', justifyContent:'flex-end' }}>
                          <button onClick={()=>openEdit(e)}
                            style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'4px', padding:'3px 8px', cursor:'pointer', fontSize:'11px', color:'#6c757d' }}
                            onMouseEnter={el=>{el.currentTarget.style.borderColor=NAVY;el.currentTarget.style.color=NAVY;}}
                            onMouseLeave={el=>{el.currentTarget.style.borderColor='#dee2e6';el.currentTarget.style.color='#6c757d';}}>
                            Edit
                          </button>
                          {!e.invoiced && (
                            <button onClick={()=>setDelId(e.id)}
                              style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'4px', padding:'3px 8px', cursor:'pointer', fontSize:'11px', color:'#6c757d' }}
                              onMouseEnter={el=>{el.currentTarget.style.borderColor='#c53030';el.currentTarget.style.color='#c53030';}}
                              onMouseLeave={el=>{el.currentTarget.style.borderColor='#dee2e6';el.currentTarget.style.color='#6c757d';}}>
                              ✕
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Log Time Panel */}
      {panel && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:300 }} onClick={()=>setPanel(false)} />
          <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'420px', background:'#fff', zIndex:301, display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,.15)' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #e9ecef', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <h2 style={{ fontSize:'16px', fontWeight:'600', color:NAVY, margin:0 }}>{editId?'Edit Time Entry':'Log Time'}</h2>
              <button onClick={()=>setPanel(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#adb5bd', fontSize:'20px' }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'24px' }}>
              <div style={{ marginBottom:'14px' }}>
                <label style={labelSt}>Matter</label>
                <select value={form.matter_id} onChange={fld('matter_id')}
                  onFocus={()=>setFocused('matter')} onBlur={()=>setFocused(null)}
                  style={{ ...fieldStyle, width:'100%', border:`1.5px solid ${focused==='matter'?GOLD:'#dee2e6'}`, appearance:'none' }}>
                  <option value="">— No matter —</option>
                  {matters.map(m=><option key={m.id} value={m.id}>{m.matter_number} — {m.matter_name}</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'14px' }}>
                <div>
                  <label style={labelSt}>Date *</label>
                  <input type="date" value={form.entry_date} onChange={fld('entry_date')}
                    onFocus={()=>setFocused('date')} onBlur={()=>setFocused(null)}
                    style={{ ...fieldStyle, width:'100%', border:`1.5px solid ${focused==='date'?GOLD:'#dee2e6'}` }} />
                </div>
                <div>
                  <label style={labelSt}>Hours *</label>
                  <input type="number" min="0.1" step="0.25" value={form.hours} onChange={fld('hours')}
                    onFocus={()=>setFocused('hours')} onBlur={()=>setFocused(null)}
                    placeholder="0.00"
                    style={{ ...fieldStyle, width:'100%', border:`1.5px solid ${focused==='hours'?GOLD:'#dee2e6'}` }} />
                </div>
              </div>
              <div style={{ marginBottom:'14px' }}>
                <label style={labelSt}>Description *</label>
                <textarea value={form.description} onChange={fld('description')}
                  onFocus={()=>setFocused('desc')} onBlur={()=>setFocused(null)}
                  placeholder="What work was performed?"
                  style={{ ...fieldStyle, width:'100%', border:`1.5px solid ${focused==='desc'?GOLD:'#dee2e6'}`, resize:'vertical', minHeight:'80px' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                <div>
                  <label style={labelSt}>Rate ($/hr)</label>
                  <input type="number" min="0" step="0.01" value={form.rate} onChange={fld('rate')}
                    onFocus={()=>setFocused('rate')} onBlur={()=>setFocused(null)}
                    placeholder="250.00"
                    style={{ ...fieldStyle, width:'100%', border:`1.5px solid ${focused==='rate'?GOLD:'#dee2e6'}` }} />
                </div>
                <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:'1px' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'13px', color:'#495057', fontWeight:'500' }}>
                    <input type="checkbox" checked={form.billable} onChange={e=>setForm(f=>({...f,billable:e.target.checked}))}
                      style={{ width:'16px', height:'16px', accentColor:GOLD }} />
                    Billable
                  </label>
                </div>
              </div>
            </div>
            <div style={{ padding:'16px 24px', borderTop:'1px solid #e9ecef', display:'flex', gap:'10px', justifyContent:'flex-end', flexShrink:0 }}>
              <button onClick={()=>setPanel(false)} style={{ padding:'9px 18px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'5px', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving}
                style={{ padding:'9px 22px', background:saving?'#d4b878':GOLD, border:'none', borderRadius:'5px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:saving?'not-allowed':'pointer' }}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Log Entry'}
              </button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div style={{ position:'fixed', bottom:'28px', right:'28px', background:toast.type==='error'?'#c53030':'#276749', color:'#fff', padding:'12px 20px', borderRadius:'7px', fontSize:'14px', fontWeight:'500', zIndex:400, boxShadow:'0 4px 16px rgba(0,0,0,.2)' }}>
          {toast.msg}
        </div>
      )}
    </Layout>
  );
}
