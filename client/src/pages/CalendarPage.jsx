import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import EventForm from '../components/EventForm';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const EVENT_COLORS = {
  court_date:     { bg:'#fee2e2', color:'#c53030', border:'#c53030' },
  deadline:       { bg:'#fee2e2', color:'#c53030', border:'#c53030' },
  sol:            { bg:'#fee2e2', color:'#c53030', border:'#c53030' },
  client_meeting: { bg:'#fef3c7', color:'#92400e', border:GOLD },
  internal:       { bg:'#e8edf5', color:NAVY,      border:NAVY },
  other:          { bg:'#f1f5f9', color:'#475569',  border:'#94a3b8' },
  calendly:       { bg:'#e0f2f2', color:'#1a6b6b', border:'#2E8B8B' },
};

const EVENT_LABELS = {
  court_date:     'Court',
  deadline:       'Deadline',
  sol:            'SOL',
  client_meeting: 'Meeting',
  internal:       'Internal',
  other:          'Event',
};

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const isoDate = (d) => d.toISOString().slice(0,10);
const addDays  = (d, n) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };
const startOfWeek = (d) => { const r = new Date(d); r.setDate(r.getDate()-r.getDay()); return r; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth   = (d) => new Date(d.getFullYear(), d.getMonth()+1, 0);

function eColor(type) { return EVENT_COLORS[type] || EVENT_COLORS.other; }

function EventPill({ ev, onClick }) {
  const c = eColor(ev.event_type);
  return (
    <div onClick={(e)=>{ e.stopPropagation(); onClick(ev); }}
      style={{ background:c.bg, color:c.color, borderLeft:`3px solid ${c.border}`, borderRadius:'3px',
        fontSize:'11px', fontWeight:'600', padding:'2px 5px', marginBottom:'2px', cursor:ev.is_virtual?'default':'pointer',
        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:'1.4' }}
      title={ev.title}>
      {ev.title}
    </div>
  );
}

// ── Month View ──────────────────────────────────────────────────────────────
function MonthView({ events, cursor, onDayClick, onEventClick }) {
  const firstDay = startOfMonth(cursor);
  const lastDay  = endOfMonth(cursor);
  const startGrid = startOfWeek(firstDay);
  const cells = [];
  for (let i=0; i<42; i++) cells.push(addDays(startGrid, i));

  const byDate = {};
  events.forEach(ev => {
    const k = ev.event_date?.slice(0,10);
    if (k) (byDate[k] = byDate[k]||[]).push(ev);
  });

  const todayStr = isoDate(new Date());

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      {/* Day headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid #e9ecef' }}>
        {DAYS.map(d => (
          <div key={d} style={{ padding:'8px 0', textAlign:'center', fontSize:'12px', fontWeight:'600',
            color:'#6c757d', letterSpacing:'.04em', textTransform:'uppercase' }}>{d}</div>
        ))}
      </div>
      {/* 6-row grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gridTemplateRows:'repeat(6,1fr)', flex:1, borderLeft:'1px solid #e9ecef' }}>
        {cells.map((day, i) => {
          const ds = isoDate(day);
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = ds === todayStr;
          const dayEvs = byDate[ds] || [];
          return (
            <div key={i} onClick={()=>onDayClick(ds)}
              style={{ borderRight:'1px solid #e9ecef', borderBottom:'1px solid #e9ecef', padding:'6px 6px 4px',
                background: isToday ? '#f0f4ff' : inMonth ? '#fff' : '#f8f9fa',
                cursor:'pointer', minHeight:'90px', overflow:'hidden' }}
              onMouseEnter={(e)=>{ if (!isToday) e.currentTarget.style.background = inMonth ? '#fafbfc' : '#f3f4f6'; }}
              onMouseLeave={(e)=>{ e.currentTarget.style.background = isToday ? '#f0f4ff' : inMonth ? '#fff' : '#f8f9fa'; }}>
              <div style={{ fontSize:'13px', fontWeight: isToday?'700':'400',
                color: isToday?'#fff':'#495057', opacity: inMonth?1:.4,
                background: isToday?NAVY:'transparent', width:'22px', height:'22px', borderRadius:'50%',
                display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'4px' }}>
                {day.getDate()}
              </div>
              {dayEvs.slice(0,3).map((ev,j) => <EventPill key={j} ev={ev} onClick={onEventClick} />)}
              {dayEvs.length>3 && <div style={{ fontSize:'10px', color:'#6c757d', paddingLeft:'4px' }}>+{dayEvs.length-3} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ───────────────────────────────────────────────────────────────
function WeekView({ events, cursor, onDayClick, onEventClick }) {
  const weekStart = startOfWeek(cursor);
  const days = Array.from({length:7}, (_,i) => addDays(weekStart, i));
  const todayStr = isoDate(new Date());

  const byDate = {};
  events.forEach(ev => {
    const k = ev.event_date?.slice(0,10);
    if (k) (byDate[k] = byDate[k]||[]).push(ev);
  });

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid #e9ecef', borderLeft:'1px solid #e9ecef' }}>
        {days.map((day,i) => {
          const ds = isoDate(day);
          const isToday = ds === todayStr;
          const dayEvs = byDate[ds] || [];
          return (
            <div key={i} onClick={()=>onDayClick(ds)}
              style={{ borderRight:'1px solid #e9ecef', padding:'10px 8px', cursor:'pointer',
                background: isToday ? '#f0f4ff' : '#fff', minHeight:'140px' }}
              onMouseEnter={(e)=>{ if(!isToday) e.currentTarget.style.background='#fafbfc'; }}
              onMouseLeave={(e)=>{ e.currentTarget.style.background = isToday?'#f0f4ff':'#fff'; }}>
              <div style={{ marginBottom:'8px', textAlign:'center' }}>
                <div style={{ fontSize:'11px', fontWeight:'600', color:'#6c757d', letterSpacing:'.04em', textTransform:'uppercase' }}>{DAYS[day.getDay()]}</div>
                <div style={{ fontSize:'22px', fontWeight: isToday?'700':'300', color: isToday?NAVY:'#495057',
                  background: isToday?'#e8edf5':'transparent', borderRadius:'50%', width:'34px', height:'34px',
                  display:'flex', alignItems:'center', justifyContent:'center', margin:'2px auto 0' }}>
                  {day.getDate()}
                </div>
              </div>
              {dayEvs.map((ev,j) => <EventPill key={j} ev={ev} onClick={onEventClick} />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── List View (upcoming 30 days) ─────────────────────────────────────────────
function ListView({ events, onEventClick }) {
  const sorted = [...events].sort((a,b) => (a.event_date||'').localeCompare(b.event_date||''));
  const groups = {};
  sorted.forEach(ev => {
    const k = ev.event_date?.slice(0,10) || 'unknown';
    (groups[k] = groups[k]||[]).push(ev);
  });
  const dates = Object.keys(groups).sort();
  const todayStr = isoDate(new Date());

  if (dates.length === 0) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', color:'#adb5bd' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dee2e6" strokeWidth="1.2" style={{marginBottom:'12px'}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <div style={{fontSize:'15px',fontWeight:'600',color:'#adb5bd',marginBottom:'4px'}}>No events in this period</div>
        <div style={{fontSize:'13px',color:'#ced4da'}}>Click a day or Add Event to get started.</div>
      </div>
    );
  }

  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      {dates.map(dateStr => {
        const date = new Date(dateStr+'T12:00:00');
        const isToday = dateStr === todayStr;
        const label = isToday ? 'Today' :
          date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
        return (
          <div key={dateStr} style={{ marginBottom:'2px' }}>
            <div style={{ padding:'10px 20px 6px', fontSize:'12px', fontWeight:'700', color: isToday?NAVY:'#6c757d',
              letterSpacing:'.06em', textTransform:'uppercase', background: isToday?'#e8edf5':'#f8f9fa',
              borderBottom:'1px solid #e9ecef', borderTop:'1px solid #e9ecef' }}>
              {label}
            </div>
            {groups[dateStr].map((ev,i) => {
              const c = eColor(ev.event_type);
              return (
                <div key={i} onClick={()=>!ev.is_virtual && onEventClick(ev)}
                  style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 20px',
                    borderBottom:'1px solid #f1f3f5', background:'#fff',
                    cursor: ev.is_virtual?'default':'pointer' }}
                  onMouseEnter={(e)=>{ if(!ev.is_virtual) e.currentTarget.style.background='#f8f9fa'; }}
                  onMouseLeave={(e)=>{ e.currentTarget.style.background='#fff'; }}>
                  <div style={{ width:'4px', height:'40px', background:c.border, borderRadius:'2px', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'14px', fontWeight:'600', color:NAVY, marginBottom:'2px' }}>{ev.title}</div>
                    <div style={{ display:'flex', gap:'12px', fontSize:'12px', color:'#6c757d' }}>
                      {ev.start_time && <span>{ev.start_time?.slice(0,5)}{ev.end_time ? ` – ${ev.end_time?.slice(0,5)}` : ''}</span>}
                      {ev.matter_number && <span style={{fontFamily:'monospace',background:'#f0f2f5',padding:'1px 5px',borderRadius:'3px'}}>{ev.matter_number}</span>}
                      {ev.location && <span>{ev.location}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize:'11px', fontWeight:'600', background:c.bg, color:c.color,
                    padding:'3px 8px', borderRadius:'20px', whiteSpace:'nowrap' }}>
                    {EVENT_LABELS[ev.event_type]||'Event'}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Main CalendarPage ────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [searchParams] = useSearchParams();
  const [view,      setView]    = useState('month');
  const [cursor,    setCursor]  = useState(new Date());
  const [events,    setEvents]  = useState([]);
  const [loading,   setLoading] = useState(true);
  const [formOpen,  setForm]    = useState(false);
  const [editing,   setEdit]    = useState(null);
  const [defDate,   setDefDate] = useState('');
  const [toast,     setToast]   = useState(null);
  const [calendlyEvents, setCalendlyEvents] = useState([]);
  const [syncing,   setSyncing] = useState(false);

  useEffect(() => {
    if (searchParams.get('new') === 'true') { setEdit(null); setDefDate(isoDate(new Date())); setForm(true); }
  }, []);

  const showToast = (message, type='success') => { setToast({message,type}); setTimeout(()=>setToast(null),3500); };

  const fetchEvents = useCallback(async (v, cur) => {
    setLoading(true);
    let start, end;
    if (v === 'month') {
      const s = startOfMonth(cur); s.setDate(s.getDate() - s.getDay());
      const e = endOfMonth(cur);   e.setDate(e.getDate() + (6 - e.getDay()));
      start = isoDate(s); end = isoDate(e);
    } else if (v === 'week') {
      const s = startOfWeek(cur);
      start = isoDate(s); end = isoDate(addDays(s,6));
    } else {
      start = isoDate(cur); end = isoDate(addDays(cur, 30));
    }
    try {
      const { data } = await axios.get('/api/events', { params: { start, end } });
      setEvents(data);
    } catch { showToast('Failed to load events.', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(view, cursor); }, [fetchEvents, view, cursor]);

  // Merge Calendly events into calendar display format
  const allEvents = [
    ...events,
    ...calendlyEvents.map(ce => ({
      id: `cal-${ce.id}`,
      title: `📅 ${ce.invitee_name || ce.invitee_email || 'Calendly'}`,
      event_date: ce.start_time?.slice(0, 10),
      start_time: ce.start_time ? new Date(ce.start_time).toTimeString().slice(0, 5) : null,
      end_time:   ce.end_time   ? new Date(ce.end_time).toTimeString().slice(0, 5)   : null,
      event_type: 'calendly',
      location:   ce.invitee_email || '',
      is_virtual: true,
    })),
  ];

  const syncCalendly = async () => {
    setSyncing(true);
    try {
      const { data: result } = await axios.post('/api/calendly/sync');
      // Re-fetch stored Calendly events for current view range
      const { data: stored } = await axios.get('/api/calendly/events');
      setCalendlyEvents(stored);
      showToast(`Calendly synced: ${result.synced} event${result.synced !== 1 ? 's' : ''} updated.`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Calendly sync failed.';
      showToast(msg, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const navPrev = () => {
    if (view==='month') setCursor(c => new Date(c.getFullYear(), c.getMonth()-1, 1));
    else if (view==='week') setCursor(c => addDays(c,-7));
    else setCursor(c => addDays(c,-30));
  };
  const navNext = () => {
    if (view==='month') setCursor(c => new Date(c.getFullYear(), c.getMonth()+1, 1));
    else if (view==='week') setCursor(c => addDays(c,7));
    else setCursor(c => addDays(c,30));
  };
  const navToday = () => setCursor(new Date());

  const getTitle = () => {
    if (view==='month') return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view==='week') {
      const ws = startOfWeek(cursor);
      const we = addDays(ws,6);
      if (ws.getMonth()===we.getMonth()) return `${MONTHS[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`;
      return `${MONTHS[ws.getMonth()]} ${ws.getDate()} – ${MONTHS[we.getMonth()]} ${we.getDate()}, ${ws.getFullYear()}`;
    }
    return `Next 30 Days from ${cursor.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
  };

  const handleDayClick = (ds) => { setEdit(null); setDefDate(ds); setForm(true); };
  const handleEventClick = (ev) => { if (!ev.is_virtual) { setEdit(ev); setDefDate(''); setForm(true); } };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try { await axios.delete(`/api/events/${id}`); fetchEvents(view,cursor); showToast('Event deleted.'); setForm(false); }
    catch { showToast('Failed to delete event.', 'error'); }
  };

  const VIEW_BTNS = [
    { id:'month', label:'Month' },
    { id:'week',  label:'Week' },
    { id:'list',  label:'List' },
  ];

  return (
    <Layout>
      <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 0px)', padding:'0' }}>
        {/* Toolbar */}
        <div style={{ padding:'20px 32px 16px', borderBottom:'1px solid #e9ecef', display:'flex', alignItems:'center', gap:'16px', flexShrink:0, background:'#fff' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:'600', color:NAVY, fontFamily:'Playfair Display,Georgia,serif', margin:'0 0 2px' }}>Calendar</h1>
            <p style={{ color:'#6c757d', fontSize:'13px', margin:0 }}>{getTitle()}</p>
          </div>

          {/* Navigation */}
          <div style={{ display:'flex', gap:'4px', marginLeft:'auto' }}>
            <button onClick={navToday} style={{ padding:'7px 14px', background:'#f1f3f5', border:'1px solid #dee2e6', borderRadius:'6px', fontSize:'13px', fontWeight:'500', cursor:'pointer', fontFamily:'Inter,sans-serif', color:'#495057' }}>Today</button>
            <button onClick={navPrev} style={{ padding:'7px 10px', background:'#f1f3f5', border:'1px solid #dee2e6', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', color:'#495057' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button onClick={navNext} style={{ padding:'7px 10px', background:'#f1f3f5', border:'1px solid #dee2e6', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', color:'#495057' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* View toggle */}
          <div style={{ display:'flex', gap:'2px', background:'#f1f3f5', borderRadius:'8px', padding:'3px' }}>
            {VIEW_BTNS.map(b => (
              <button key={b.id} onClick={()=>setView(b.id)} style={{
                padding:'6px 14px', borderRadius:'6px', border:'none', fontSize:'13px', fontWeight:'500',
                cursor:'pointer', fontFamily:'Inter,sans-serif', transition:'all .15s',
                background: view===b.id ? '#fff' : 'transparent',
                color: view===b.id ? NAVY : '#6c757d',
                boxShadow: view===b.id ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
              }}>{b.label}</button>
            ))}
          </div>

          {/* Sync Calendly */}
          <button onClick={syncCalendly} disabled={syncing}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 16px', background: syncing ? '#e9ecef' : '#e0f2f2', border:'1px solid #2E8B8B', borderRadius:'6px', color: syncing ? '#aaa' : '#1a6b6b', fontSize:'13px', fontWeight:'600', cursor: syncing ? 'not-allowed' : 'pointer', fontFamily:'Inter,sans-serif' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            {syncing ? 'Syncing…' : 'Sync Calendly'}
          </button>

          {/* Add event */}
          <button onClick={()=>{ setEdit(null); setDefDate(isoDate(new Date())); setForm(true); }}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 18px', background:GOLD, border:'none', borderRadius:'6px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif', boxShadow:'0 2px 8px rgba(201,168,76,.35)' }}
            onMouseEnter={(e)=>e.currentTarget.style.background='#b8943d'}
            onMouseLeave={(e)=>e.currentTarget.style.background=GOLD}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Event
          </button>
        </div>

        {/* Legend */}
        <div style={{ padding:'8px 32px', borderBottom:'1px solid #f1f3f5', display:'flex', gap:'16px', flexShrink:0, background:'#fafbfc' }}>
          {[
            { label:'Court / Deadline / SOL', color:'#c53030', bg:'#fee2e2' },
            { label:'Client Meeting', color:'#92400e', bg:'#fef3c7' },
            { label:'Internal', color:NAVY, bg:'#e8edf5' },
            { label:'Other', color:'#475569', bg:'#f1f5f9' },
          { label:'Calendly', color:'#1a6b6b', bg:'#e0f2f2' },
          ].map(l => (
            <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', color:'#6c757d' }}>
              <div style={{ width:'10px', height:'10px', borderRadius:'2px', background:l.bg, border:`1.5px solid ${l.color}` }} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Calendar body */}
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', background:'#fff' }}>
          {loading ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#adb5bd', fontSize:'14px' }}>Loading calendar…</div>
          ) : view==='month' ? (
            <MonthView events={allEvents} cursor={cursor} onDayClick={handleDayClick} onEventClick={handleEventClick} />
          ) : view==='week' ? (
            <WeekView events={allEvents} cursor={cursor} onDayClick={handleDayClick} onEventClick={handleEventClick} />
          ) : (
            <ListView events={allEvents} onEventClick={handleEventClick} />
          )}
        </div>
      </div>

      <EventForm
        isOpen={formOpen}
        event={editing}
        defaultDate={defDate}
        onClose={()=>{ setForm(false); setEdit(null); setDefDate(''); }}
        onSaved={(_,action)=>{ fetchEvents(view,cursor); showToast(`Event ${action==='created'?'added':'updated'}.`); }}
      />

      {/* Delete button shown inside EventForm via a portal-like trick is complex; instead expose via editing state */}
      {formOpen && editing && !editing.is_virtual && (
        <div style={{ position:'fixed', bottom:'80px', right:'28px', zIndex:210 }}>
          <button onClick={()=>handleDelete(editing.id)}
            style={{ padding:'8px 16px', background:'#fff', border:'1px solid #fee2e2', borderRadius:'6px', color:'#c53030', fontSize:'13px', fontWeight:'500', cursor:'pointer', fontFamily:'Inter,sans-serif', boxShadow:'0 2px 8px rgba(0,0,0,.12)' }}
            onMouseEnter={(e)=>{ e.currentTarget.style.background='#fee2e2'; }}
            onMouseLeave={(e)=>{ e.currentTarget.style.background='#fff'; }}>
            Delete Event
          </button>
        </div>
      )}

      {toast && (
        <div style={{ position:'fixed', bottom:'28px', right:'28px', background:toast.type==='error'?'#c53030':'#276749', color:'#fff', padding:'12px 20px', borderRadius:'7px', fontSize:'14px', fontWeight:'500', zIndex:400, boxShadow:'0 4px 16px rgba(0,0,0,.2)', animation:'slideUp .2s ease' }}>
          {toast.message}
        </div>
      )}
      <style>{`@keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </Layout>
  );
}
