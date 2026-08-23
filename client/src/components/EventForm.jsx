import { useState, useEffect, useRef } from 'react';
import axios from '../utils/axios';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const EVENT_TYPES = [
  { v:'court_date',      l:'Court Date' },
  { v:'deadline',        l:'Deadline' },
  { v:'client_meeting',  l:'Client Meeting' },
  { v:'internal',        l:'Internal' },
  { v:'other',           l:'Other' },
];
const REMINDERS = [
  { v:'',       l:'No reminder' },
  { v:'1_day',  l:'1 day before' },
  { v:'3_days', l:'3 days before' },
  { v:'1_week', l:'1 week before' },
];

const EMPTY = { title:'', event_type:'other', matter_id:'', event_date:'', start_time:'', end_time:'', location:'', assigned_to:'', reminder:'', notes:'' };

const fld = (f) => ({ width:'100%', padding:'10px 12px', fontSize:'14px', border:`1.5px solid ${f?GOLD:'#dee2e6'}`, borderRadius:'5px', outline:'none', fontFamily:'Inter,sans-serif', color:'#1a1a2e', background:'#fff', transition:'border-color .15s', boxSizing:'border-box' });
const sel = (f) => ({ ...fld(f), appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center', paddingRight:'32px' });
const lbl = { display:'block', fontSize:'12px', fontWeight:'500', color:'#555', marginBottom:'5px' };
const row = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'16px' };

export default function EventForm({ isOpen, event, defaultDate, onClose, onSaved }) {
  const [form, setForm]   = useState(EMPTY);
  const [focused, setFoc] = useState(null);
  const [saving, setSav]  = useState(false);
  const [error, setErr]   = useState('');
  const [visible, setVis] = useState(false);
  const [matters, setMat] = useState([]);
  const [users,   setUsr] = useState([]);
  const ref = useRef(null);
  const isEdit = !!event;

  useEffect(() => {
    if (isOpen) {
      setErr('');
      if (event) {
        setForm({ ...EMPTY, ...event,
          event_date:  event.event_date?.slice(0,10)||'',
          start_time:  event.start_time?.slice(0,5)||'',
          end_time:    event.end_time?.slice(0,5)||'',
          matter_id:   event.matter_id??'',
          assigned_to: event.assigned_to??'',
        });
      } else {
        setForm({ ...EMPTY, event_date: defaultDate||'' });
      }
      Promise.all([axios.get('/api/matters'), axios.get('/api/users')])
        .then(([m,u]) => { setMat(m.data); setUsr(u.data); }).catch(() => {});
      setTimeout(() => { setVis(true); ref.current?.focus(); }, 30);
    } else { setVis(false); }
  }, [isOpen, event, defaultDate]);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setErr(''); setSav(true);
    const payload = { ...form, matter_id: form.matter_id||null, assigned_to: form.assigned_to||null,
      start_time: form.start_time||null, end_time: form.end_time||null };
    try {
      if (isEdit) { const { data } = await axios.put(`/api/events/${event.id}`, payload); onSaved(data, 'updated'); }
      else        { const { data } = await axios.post('/api/events', payload); onSaved(data, 'created'); }
      onClose();
    } catch (err) { setErr(err.response?.data?.error || 'Failed to save event.'); }
    finally { setSav(false); }
  };

  if (!isOpen && !visible) return null;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:200, opacity:visible?1:0, transition:'opacity .25s' }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'480px', background:'#fff', zIndex:201, display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,.15)', transform:visible?'translateX(0)':'translateX(100%)', transition:'transform .28s cubic-bezier(.4,0,.2,1)' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #e9ecef', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <h2 style={{ fontSize:'18px', fontWeight:'600', color:NAVY, margin:0 }}>{isEdit ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#adb5bd', padding:'4px', display:'flex' }}
            onMouseEnter={(e)=>e.currentTarget.style.color='#495057'} onMouseLeave={(e)=>e.currentTarget.style.color='#adb5bd'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex:1, overflowY:'auto', padding:'24px' }}>
          {/* Type / Title */}
          <div style={row}>
            <div>
              <label style={lbl}>Event Type <span style={{color:'#c0392b'}}>*</span></label>
              <select value={form.event_type} onChange={set('event_type')} onFocus={()=>setFoc('et')} onBlur={()=>setFoc(null)} style={sel(focused==='et')}>
                {EVENT_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Date <span style={{color:'#c0392b'}}>*</span></label>
              <input type="date" value={form.event_date} onChange={set('event_date')} onFocus={()=>setFoc('ed')} onBlur={()=>setFoc(null)} style={fld(focused==='ed')} required />
            </div>
          </div>

          <div style={{ marginBottom:'16px' }}>
            <label style={lbl}>Title <span style={{color:'#c0392b'}}>*</span></label>
            <input ref={ref} value={form.title} onChange={set('title')} onFocus={()=>setFoc('t')} onBlur={()=>setFoc(null)}
              style={fld(focused==='t')} placeholder="Event title" required />
          </div>

          {/* Start / End time */}
          <div style={row}>
            <div>
              <label style={lbl}>Start Time</label>
              <input type="time" value={form.start_time} onChange={set('start_time')} onFocus={()=>setFoc('st')} onBlur={()=>setFoc(null)} style={fld(focused==='st')} />
            </div>
            <div>
              <label style={lbl}>End Time</label>
              <input type="time" value={form.end_time} onChange={set('end_time')} onFocus={()=>setFoc('en')} onBlur={()=>setFoc(null)} style={fld(focused==='en')} />
            </div>
          </div>

          {/* Matter / Assigned */}
          <div style={row}>
            <div>
              <label style={lbl}>Linked Matter</label>
              <select value={form.matter_id} onChange={set('matter_id')} onFocus={()=>setFoc('m')} onBlur={()=>setFoc(null)} style={sel(focused==='m')}>
                <option value="">— None —</option>
                {matters.map((m) => <option key={m.id} value={m.id}>{m.matter_number}: {m.matter_name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Assigned To</label>
              <select value={form.assigned_to} onChange={set('assigned_to')} onFocus={()=>setFoc('a')} onBlur={()=>setFoc(null)} style={sel(focused==='a')}>
                <option value="">— Anyone —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {/* Location / Reminder */}
          <div style={row}>
            <div>
              <label style={lbl}>Location / Video Link</label>
              <input value={form.location} onChange={set('location')} onFocus={()=>setFoc('l')} onBlur={()=>setFoc(null)} style={fld(focused==='l')} placeholder="Address or meeting URL" />
            </div>
            <div>
              <label style={lbl}>Reminder</label>
              <select value={form.reminder} onChange={set('reminder')} onFocus={()=>setFoc('r')} onBlur={()=>setFoc(null)} style={sel(focused==='r')}>
                {REMINDERS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom:'8px' }}>
            <label style={lbl}>Notes</label>
            <textarea value={form.notes} onChange={set('notes')} onFocus={()=>setFoc('n')} onBlur={()=>setFoc(null)}
              style={{ ...fld(focused==='n'), resize:'vertical', minHeight:'72px' }} placeholder="Additional notes…" />
          </div>

          {error && <div style={{ background:'#fff5f5', border:'1px solid #fed7d7', color:'#c53030', borderRadius:'5px', padding:'10px 12px', fontSize:'13px', marginTop:'12px' }}>{error}</div>}
        </form>

        <div style={{ padding:'16px 24px', borderTop:'1px solid #e9ecef', display:'flex', gap:'10px', justifyContent:'flex-end', flexShrink:0 }}>
          <button type="button" onClick={onClose} style={{ padding:'9px 20px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'5px', fontSize:'14px', cursor:'pointer', fontFamily:'Inter,sans-serif', color:'#495057' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding:'9px 24px', background:saving?'#d4b878':GOLD, border:'none', borderRadius:'5px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:saving?'not-allowed':'pointer', fontFamily:'Inter,sans-serif' }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Event'}
          </button>
        </div>
      </div>
    </>
  );
}
