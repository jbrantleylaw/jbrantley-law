import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import TaskForm from '../components/TaskForm';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const PRIORITY_MAP = {
  high:   { label:'High',   bg:'#fee2e2', color:'#c53030' },
  medium: { label:'Medium', bg:'#fef3c7', color:'#92400e' },
  low:    { label:'Low',    bg:'#f1f5f9', color:'#64748b' },
};
const STATUS_MAP = {
  not_started: { label:'Not Started', bg:'#f1f5f9', color:'#64748b' },
  in_progress: { label:'In Progress', bg:'#e8edf5', color:NAVY },
  completed:   { label:'Completed',   bg:'#dcfce7', color:'#166534' },
};

const todayStr = () => new Date().toISOString().slice(0,10);
const fmtDate  = (d) => d ? new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
const fmtTs    = (d) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}) : '—';

const Badge = ({ map, val }) => {
  const t = map[val]; if (!t) return null;
  return <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', letterSpacing:'.04em', background:t.bg, color:t.color, whiteSpace:'nowrap' }}>{t.label}</span>;
};

const VisBadge = ({ vis }) => {
  if (!vis || vis === 'all') return null;
  const cfg = vis === 'private'
    ? { label:'Private', bg:'#f5f0ff', color:'#6b46c1' }
    : { label:'Assigned', bg:'#eff6ff', color:'#2563eb' };
  return <span style={{ display:'inline-block', padding:'1px 7px', borderRadius:'20px', fontSize:'10px', fontWeight:'600', background:cfg.bg, color:cfg.color, marginLeft:'6px', verticalAlign:'middle' }}>{cfg.label}</span>;
};

// ── Bulk-add modal ────────────────────────────────────────────────────────────

const EMPTY_ROW = () => ({ task_name:'', matter_id:'', assigned_to:'', due_date:'', priority:'medium', visibility:'all' });
const VIS_PILLS = [
  { v:'private',  l:'Private' },
  { v:'assigned', l:'Assigned' },
  { v:'all',      l:'All' },
];
const inp = { padding:'8px 9px', fontSize:'13px', border:'1.5px solid #dee2e6', borderRadius:'5px', outline:'none', fontFamily:'Inter,sans-serif', width:'100%', boxSizing:'border-box' };

function BulkModal({ isOpen, onClose, onSaved, matters, users }) {
  const [rows,    setRows]   = useState([EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()]);
  const [saving,  setSaving] = useState(false);
  const [error,   setError]  = useState('');
  const [visible, setVis]    = useState(false);

  useEffect(() => {
    if (isOpen) { setRows([EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()]); setError(''); setTimeout(()=>setVis(true),30); }
    else setVis(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key==='Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  const setRow = (i, f, v) => setRows(p => p.map((r, idx) => idx===i ? {...r,[f]:v} : r));
  const addRow = () => { if (rows.length < 20) setRows(p=>[...p, EMPTY_ROW()]); };
  const rmRow  = (i) => { if (rows.length > 1) setRows(p=>p.filter((_,idx)=>idx!==i)); };

  const handleSave = async () => {
    const valid = rows.filter(r => r.task_name.trim());
    if (!valid.length) { setError('Add at least one task name.'); return; }
    setSaving(true); setError('');
    try {
      const { data } = await axios.post('/api/tasks/bulk', { tasks: valid });
      onSaved(data);
      onClose();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save tasks.'); }
    finally { setSaving(false); }
  };

  if (!isOpen && !visible) return null;
  const validCount = rows.filter(r=>r.task_name.trim()).length;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:300, opacity:visible?1:0, transition:'opacity .2s' }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'860px', maxWidth:'100vw', background:'#fff', zIndex:301, display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,.18)', transform:visible?'translateX(0)':'translateX(100%)', transition:'transform .28s cubic-bezier(.4,0,.2,1)' }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #e9ecef', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <h2 style={{ fontSize:'18px', fontWeight:'600', color:NAVY, margin:'0 0 2px' }}>Add Tasks</h2>
            <p style={{ margin:0, fontSize:'12px', color:'#6c757d' }}>Up to 20 tasks. Rows with no task name are skipped.</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#adb5bd', padding:'4px', display:'flex' }}
            onMouseEnter={(e)=>e.currentTarget.style.color='#495057'} onMouseLeave={(e)=>e.currentTarget.style.color='#adb5bd'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 190px 160px 130px 90px 162px 28px', gap:'8px', marginBottom:'6px' }}>
            {['Task Name *','Matter','Assigned To','Due Date','Priority','Visibility',''].map((h,i)=>(
              <div key={i} style={{ fontSize:'10px', fontWeight:'700', color:'#6c757d', letterSpacing:'.07em', textTransform:'uppercase', padding:'0 2px' }}>{h}</div>
            ))}
          </div>
          {rows.map((r,i)=>(
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 190px 160px 130px 90px 162px 28px', gap:'8px', marginBottom:'8px', alignItems:'center' }}>
              <input value={r.task_name} onChange={(e)=>setRow(i,'task_name',e.target.value)} placeholder={`Task ${i+1}…`}
                style={inp} onFocus={(e)=>e.target.style.borderColor=GOLD} onBlur={(e)=>e.target.style.borderColor='#dee2e6'} />
              <select value={r.matter_id} onChange={(e)=>setRow(i,'matter_id',e.target.value)} style={inp}
                onFocus={(e)=>e.target.style.borderColor=GOLD} onBlur={(e)=>e.target.style.borderColor='#dee2e6'}>
                <option value="">— None —</option>
                {matters.map(m=><option key={m.id} value={m.id}>{m.matter_number}: {m.matter_name}</option>)}
              </select>
              <select value={r.assigned_to} onChange={(e)=>setRow(i,'assigned_to',e.target.value)} style={inp}
                onFocus={(e)=>e.target.style.borderColor=GOLD} onBlur={(e)=>e.target.style.borderColor='#dee2e6'}>
                <option value="">— Unassigned —</option>
                {users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <input type="date" value={r.due_date} onChange={(e)=>setRow(i,'due_date',e.target.value)}
                style={inp} onFocus={(e)=>e.target.style.borderColor=GOLD} onBlur={(e)=>e.target.style.borderColor='#dee2e6'} />
              <select value={r.priority} onChange={(e)=>setRow(i,'priority',e.target.value)} style={inp}
                onFocus={(e)=>e.target.style.borderColor=GOLD} onBlur={(e)=>e.target.style.borderColor='#dee2e6'}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <div style={{ display:'flex', gap:'3px' }}>
                {VIS_PILLS.map(p=>(
                  <button key={p.v} onClick={()=>setRow(i,'visibility',p.v)} title={p.v==='private'?'Only Me':p.v==='assigned'?'Assigned + Me':'All Staff'}
                    style={{ flex:1, padding:'6px 4px', fontSize:'11px', fontWeight:'600', border:`1.5px solid ${r.visibility===p.v?NAVY:'#dee2e6'}`, borderRadius:'4px', background:r.visibility===p.v?NAVY:'transparent', color:r.visibility===p.v?'#fff':'#6c757d', cursor:'pointer', fontFamily:'Inter,sans-serif', transition:'all .1s' }}>
                    {p.l}
                  </button>
                ))}
              </div>
              <button onClick={()=>rmRow(i)} disabled={rows.length===1}
                style={{ background:'none', border:'none', cursor:rows.length===1?'not-allowed':'pointer', color:'#ced4da', padding:'4px', display:'flex', alignItems:'center' }}
                onMouseEnter={(e)=>{ if(rows.length>1) e.currentTarget.style.color='#c53030'; }}
                onMouseLeave={(e)=>e.currentTarget.style.color='#ced4da'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
          {rows.length < 20 && (
            <button onClick={addRow} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px', background:'transparent', border:'1.5px dashed #ced4da', borderRadius:'5px', color:'#6c757d', fontSize:'13px', cursor:'pointer', fontFamily:'Inter,sans-serif', marginTop:'6px' }}
              onMouseEnter={(e)=>{ e.currentTarget.style.borderColor=NAVY; e.currentTarget.style.color=NAVY; }}
              onMouseLeave={(e)=>{ e.currentTarget.style.borderColor='#ced4da'; e.currentTarget.style.color='#6c757d'; }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Row
            </button>
          )}
          {error && <div style={{ background:'#fff5f5', border:'1px solid #fed7d7', color:'#c53030', borderRadius:'5px', padding:'10px 12px', fontSize:'13px', marginTop:'14px' }}>{error}</div>}
        </div>

        <div style={{ padding:'14px 24px', borderTop:'1px solid #e9ecef', display:'flex', gap:'10px', justifyContent:'flex-end', flexShrink:0 }}>
          <button onClick={onClose} style={{ padding:'9px 20px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'5px', fontSize:'14px', cursor:'pointer', fontFamily:'Inter,sans-serif', color:'#495057' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding:'9px 24px', background:saving?'#d4b878':GOLD, border:'none', borderRadius:'5px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:saving?'not-allowed':'pointer', fontFamily:'Inter,sans-serif' }}>
            {saving ? 'Saving…' : `Save ${validCount || 'All'} Task${validCount!==1?'s':''}`}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Task detail drawer ────────────────────────────────────────────────────────

const VIS_LABELS = { private:'Private — Only Me', assigned:'Assigned + Me', all:'All Staff' };

function TaskDrawer({ task, onClose, onSaved, onEdit }) {
  const [visible,  setVis]     = useState(false);
  const [status,   setStatus]  = useState('');
  const [updating, setUpdating]= useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (task) { setStatus(task.status); setTimeout(()=>setVis(true),10); }
    else setVis(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  useEffect(() => {
    if (!task) return;
    const onKey   = (e) => { if (e.key==='Escape') onClose(); };
    const onClick = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click',   onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick); };
  }, [task, onClose]);

  const changeStatus = async (s) => {
    setStatus(s); setUpdating(true);
    try {
      const { data } = await axios.put(`/api/tasks/${task.id}`, {
        task_name: task.task_name, matter_id: task.matter_id, assigned_to: task.assigned_to,
        due_date: task.due_date?.slice(0,10)||null, priority: task.priority,
        status: s, recurring: task.recurring||'none', notes: task.notes,
      });
      onSaved(data);
    } catch { setStatus(task.status); }
    finally { setUpdating(false); }
  };

  const complete = async () => {
    try { const { data } = await axios.patch(`/api/tasks/${task.id}/complete`); onSaved(data); }
    catch {}
  };

  if (!task) return null;
  const isDone = status === 'completed';
  const td = todayStr();
  const overdue = task.due_date && task.due_date.slice(0,10) < td && !isDone;

  return (
    <div ref={panelRef} style={{ position:'fixed', top:0, right:0, bottom:0, width:'420px', background:'#fff', zIndex:151, display:'flex', flexDirection:'column', boxShadow:'-6px 0 28px rgba(0,0,0,.13)', borderLeft:'1px solid #e9ecef', transform:visible?'translateX(0)':'translateX(100%)', transition:'transform .25s cubic-bezier(.4,0,.2,1)' }}>
      {/* Header */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #e9ecef', display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexShrink:0, background:NAVY }}>
        <h2 style={{ fontSize:'15px', fontWeight:'600', color:'#fff', margin:0, lineHeight:'1.45', flex:1, paddingRight:'12px' }}>{task.task_name}</h2>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,.15)', border:'none', cursor:'pointer', color:'#fff', padding:'4px 5px', borderRadius:'4px', display:'flex', flexShrink:0 }}
          onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,.28)'} onMouseLeave={(e)=>e.currentTarget.style.background='rgba(255,255,255,.15)'}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>
        {/* Status */}
        <div style={{ marginBottom:'16px' }}>
          <div style={{ fontSize:'10px', fontWeight:'700', color:'#6c757d', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:'5px' }}>Status</div>
          <select value={status} onChange={(e)=>changeStatus(e.target.value)} disabled={updating}
            style={{ padding:'8px 12px', fontSize:'13px', border:'1.5px solid #dee2e6', borderRadius:'5px', outline:'none', fontFamily:'Inter,sans-serif', width:'100%', background:'#fff', cursor:'pointer' }}>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'16px' }}>
          <div>
            <div style={{ fontSize:'10px', fontWeight:'700', color:'#6c757d', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:'5px' }}>Priority</div>
            <Badge map={PRIORITY_MAP} val={task.priority} />
          </div>
          <div>
            <div style={{ fontSize:'10px', fontWeight:'700', color:'#6c757d', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:'5px' }}>Visibility</div>
            <span style={{ fontSize:'13px', color:'#495057' }}>{VIS_LABELS[task.visibility]||'All Staff'}</span>
          </div>
          <div>
            <div style={{ fontSize:'10px', fontWeight:'700', color:'#6c757d', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:'5px' }}>Due Date</div>
            <span style={{ fontSize:'13px', color:overdue?'#c53030':'#495057', fontWeight:overdue?'600':'400' }}>{fmtDate(task.due_date)}</span>
          </div>
          <div>
            <div style={{ fontSize:'10px', fontWeight:'700', color:'#6c757d', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:'5px' }}>Assigned To</div>
            <span style={{ fontSize:'13px', color:'#495057' }}>{task.assigned_name||'—'}</span>
          </div>
        </div>

        {/* Matter */}
        {task.matter_name && (
          <div style={{ marginBottom:'16px', padding:'12px', background:'#f8f9fa', borderRadius:'6px', border:'1px solid #e9ecef' }}>
            <div style={{ fontSize:'10px', fontWeight:'700', color:'#6c757d', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:'4px' }}>Matter</div>
            <div style={{ fontSize:'13px', color:NAVY, fontWeight:'500' }}>{task.matter_name}</div>
            {task.matter_number && <div style={{ fontSize:'11px', color:'#6c757d', fontFamily:'monospace', marginTop:'2px' }}>{task.matter_number}</div>}
          </div>
        )}

        {/* Notes */}
        {task.notes && (
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'10px', fontWeight:'700', color:'#6c757d', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:'5px' }}>Notes</div>
            <div style={{ fontSize:'13px', color:'#495057', lineHeight:'1.6', background:'#f8f9fa', padding:'12px', borderRadius:'6px', border:'1px solid #e9ecef', whiteSpace:'pre-wrap' }}>{task.notes}</div>
          </div>
        )}

        {/* Meta */}
        <div style={{ borderTop:'1px solid #f1f3f5', paddingTop:'12px', display:'flex', flexDirection:'column', gap:'3px' }}>
          {task.created_by_name && <div style={{ fontSize:'12px', color:'#adb5bd' }}>Created by {task.created_by_name}</div>}
          {task.created_at     && <div style={{ fontSize:'12px', color:'#adb5bd' }}>Added {fmtTs(task.created_at)}</div>}
          {task.completed_at   && <div style={{ fontSize:'12px', color:'#166534' }}>Completed {fmtTs(task.completed_at)}</div>}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding:'12px 20px', borderTop:'1px solid #e9ecef', display:'flex', gap:'8px', flexShrink:0 }}>
        {!isDone && (
          <button onClick={complete} style={{ flex:1, padding:'9px', background:GOLD, border:'none', borderRadius:'5px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}
            onMouseEnter={(e)=>e.currentTarget.style.background='#b8943d'} onMouseLeave={(e)=>e.currentTarget.style.background=GOLD}>
            Mark Complete
          </button>
        )}
        <button onClick={()=>onEdit(task)} style={{ flex:1, padding:'9px', background:'transparent', border:`1.5px solid ${NAVY}`, borderRadius:'5px', color:NAVY, fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}
          onMouseEnter={(e)=>{ e.currentTarget.style.background=NAVY; e.currentTarget.style.color='#fff'; }}
          onMouseLeave={(e)=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color=NAVY; }}>
          Edit Task
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Tasks() {
  const { user } = useAuth();
  const [tasks,   setTasks]   = useState([]);
  const [filter,  setFilter]  = useState('my_tasks');
  const [loading, setLoad]    = useState(true);
  const [formOpen,setForm]    = useState(false);
  const [editing, setEdit]    = useState(null);
  const [deleteId,setDel]     = useState(null);
  const [toast,   setToast]   = useState(null);
  const [bulkOpen,setBulk]    = useState(false);
  const [detail,  setDetail]  = useState(null);
  const [matters, setMatters] = useState([]);
  const [users,   setUsers]   = useState([]);

  const TABS = [
    { id:'my_tasks',      label:'My Tasks' },
    { id:'all',           label:'All Tasks', attorneyOnly: true },
    { id:'overdue',       label:'Overdue' },
    { id:'due_today',     label:'Due Today' },
    { id:'due_this_week', label:'Due This Week' },
    { id:'completed',     label:'Completed' },
  ];

  const showToast = (message, type='success') => { setToast({ message, type }); setTimeout(()=>setToast(null), 3500); };

  const loadTask = useCallback(async (id) => {
    try { const { data } = await axios.get(`/api/tasks/${id}`); setDetail(data); } catch {}
  }, []);

  const fetchTasks = useCallback(async (f) => {
    setLoad(true);
    try { const { data } = await axios.get('/api/tasks', { params: { filter: f } }); setTasks(data); }
    catch { showToast('Failed to load tasks.', 'error'); }
    finally { setLoad(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Promise.all([
      axios.get('/api/matters', { params: { status:'open' } }),
      axios.get('/api/users'),
    ]).then(([m, u]) => { setMatters(m.data); setUsers(u.data); }).catch(()=>{});
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('detail');
    if (id) loadTask(id);
  }, [loadTask]);

  useEffect(() => { fetchTasks(filter); }, [fetchTasks, filter]);

  const openDetail = (t, e) => {
    if (e) e.stopPropagation();
    setDetail(t);
    const url = new URL(window.location);
    url.searchParams.set('detail', t.id);
    window.history.pushState({}, '', url);
  };

  const closeDetail = useCallback(() => {
    setDetail(null);
    const url = new URL(window.location);
    url.searchParams.delete('detail');
    window.history.pushState({}, '', url);
  }, []);

  const handleComplete = async (id, e) => {
    e.stopPropagation();
    try { await axios.patch(`/api/tasks/${id}/complete`); fetchTasks(filter); showToast('Task marked complete.'); }
    catch { showToast('Failed to update task.', 'error'); }
  };

  const handleDelete = async (id) => {
    try { await axios.delete(`/api/tasks/${id}`); setDel(null); fetchTasks(filter); showToast('Task deleted.'); }
    catch { showToast('Failed to delete task.', 'error'); }
  };

  const rowStyle = (t) => {
    const td = todayStr();
    const isOverdue  = t.due_date && t.due_date.slice(0,10) < td && t.status !== 'completed';
    const isDueToday = t.due_date && t.due_date.slice(0,10) === td && t.status !== 'completed';
    return {
      borderLeft: isOverdue ? '3px solid #c53030' : isDueToday ? `3px solid ${GOLD}` : '3px solid transparent',
      background: isOverdue ? '#fff9f9' : isDueToday ? '#fffdf0' : 'transparent',
    };
  };

  return (
    <Layout>
      <div style={{ padding:'36px 40px', maxWidth:'1200px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px' }}>
          <div>
            <h1 style={{ fontSize:'26px', fontWeight:'600', color:NAVY, fontFamily:'Playfair Display,Georgia,serif', margin:'0 0 4px' }}>Tasks</h1>
            <p style={{ color:'#6c757d', fontSize:'14px', margin:0 }}>{loading ? 'Loading…' : `${tasks.length} task${tasks.length!==1?'s':''}`}</p>
          </div>
          <button onClick={()=>setBulk(true)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 20px', background:GOLD, border:'none', borderRadius:'6px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif', boxShadow:'0 2px 8px rgba(201,168,76,.35)' }}
            onMouseEnter={(e)=>e.currentTarget.style.background='#b8943d'} onMouseLeave={(e)=>e.currentTarget.style.background=GOLD}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Tasks
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:'4px', marginBottom:'20px', background:'#f1f3f5', borderRadius:'8px', padding:'4px', width:'fit-content' }}>
          {TABS.filter(t=>!t.attorneyOnly||user?.role==='attorney').map((t)=>(
            <button key={t.id} onClick={()=>setFilter(t.id)} style={{ padding:'7px 16px', borderRadius:'6px', border:'none', fontSize:'13px', fontWeight:'500', cursor:'pointer', fontFamily:'Inter,sans-serif', transition:'all .15s', background:filter===t.id?'#fff':'transparent', color:filter===t.id?NAVY:'#6c757d', boxShadow:filter===t.id?'0 1px 4px rgba(0,0,0,.1)':'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #e9ecef', boxShadow:'0 1px 4px rgba(0,0,0,.04)', overflow:'hidden' }}>
          {loading ? (
            <div style={{ padding:'80px', textAlign:'center', color:'#adb5bd', fontSize:'14px' }}>Loading tasks…</div>
          ) : tasks.length === 0 ? (
            <div style={{ padding:'80px 40px', textAlign:'center' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#dee2e6" strokeWidth="1.2" style={{ marginBottom:'14px' }}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              <h3 style={{ fontSize:'15px', fontWeight:'600', color:'#adb5bd', margin:'0 0 6px' }}>No tasks here</h3>
              <p style={{ fontSize:'14px', color:'#ced4da', margin:0 }}>Try a different filter or add a new task.</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
              <thead>
                <tr style={{ background:'#f8f9fa', borderBottom:'1px solid #e9ecef' }}>
                  {['','Task','Matter','Assigned','Due Date','Priority','Status',''].map((h,i)=>(
                    <th key={i} style={{ padding:'11px 14px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:'#6c757d', letterSpacing:'.06em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((t,i)=>{
                  const rs   = rowStyle(t);
                  const isDel = deleteId === t.id;
                  const done  = t.status === 'completed';
                  const isActive = detail?.id === t.id;
                  return (
                    <tr key={t.id} onClick={(e)=>{ if(!isDel) openDetail(t, e); }}
                      style={{ ...rs, borderBottom:i<tasks.length-1?'1px solid #f1f3f5':'none', transition:'background .1s', cursor:'pointer', outline: isActive?`2px solid ${GOLD}`:'none', outlineOffset:'-2px' }}
                      onMouseEnter={(e)=>{ if(!isDel && !rs.background && !isActive) e.currentTarget.style.background='#fafbfc'; }}
                      onMouseLeave={(e)=>{ e.currentTarget.style.background=rs.background||'transparent'; }}>
                      {/* Complete circle */}
                      <td style={{ padding:'12px 8px 12px 16px', width:'32px' }} onClick={(e)=>e.stopPropagation()}>
                        {!done ? (
                          <button onClick={(e)=>handleComplete(t.id,e)} title="Mark complete"
                            style={{ width:'22px', height:'22px', borderRadius:'50%', border:`2px solid ${t.priority==='high'?'#c53030':t.priority==='medium'?GOLD:'#ced4da'}`, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}
                            onMouseEnter={(e)=>{ e.currentTarget.style.background=t.priority==='high'?'#fee2e2':t.priority==='medium'?'#fef3c7':'#f1f5f9'; }}
                            onMouseLeave={(e)=>{ e.currentTarget.style.background='transparent'; }} />
                        ) : (
                          <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:'#dcfce7', border:'2px solid #166534', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </td>
                      <td style={{ padding:'12px 14px', fontWeight:'500', color:done?'#adb5bd':NAVY, textDecoration:done?'line-through':'none' }}>
                        {t.task_name}<VisBadge vis={t.visibility} />
                      </td>
                      <td style={{ padding:'12px 14px', fontSize:'13px', color:'#6c757d' }}>
                        {t.matter_number ? <span style={{ fontFamily:'monospace', fontSize:'12px', background:'#f0f2f5', padding:'2px 6px', borderRadius:'3px' }}>{t.matter_number}</span> : <span style={{color:'#ced4da'}}>—</span>}
                      </td>
                      <td style={{ padding:'12px 14px', fontSize:'13px', color:'#6c757d' }}>{t.assigned_name||<span style={{color:'#ced4da'}}>—</span>}</td>
                      <td style={{ padding:'12px 14px', whiteSpace:'nowrap', fontSize:'13px', fontWeight:t.due_date&&t.due_date.slice(0,10)<=todayStr()&&!done?'600':'400', color:t.due_date&&t.due_date.slice(0,10)<todayStr()&&!done?'#c53030':t.due_date&&t.due_date.slice(0,10)===todayStr()&&!done?GOLD:'#495057' }}>{fmtDate(t.due_date)}</td>
                      <td style={{ padding:'12px 14px' }}><Badge map={PRIORITY_MAP} val={t.priority} /></td>
                      <td style={{ padding:'12px 14px' }}><Badge map={STATUS_MAP} val={t.status} /></td>
                      <td style={{ padding:'12px 14px', textAlign:'right', whiteSpace:'nowrap' }} onClick={(e)=>e.stopPropagation()}>
                        {isDel ? (
                          <div style={{ display:'flex', alignItems:'center', gap:'8px', justifyContent:'flex-end' }}>
                            <span style={{ fontSize:'12px', color:'#c53030' }}>Delete?</span>
                            <button onClick={()=>handleDelete(t.id)} style={{ padding:'3px 10px', background:'#c53030', border:'none', borderRadius:'4px', color:'#fff', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Yes</button>
                            <button onClick={()=>setDel(null)} style={{ padding:'3px 8px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'4px', fontSize:'12px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>No</button>
                          </div>
                        ) : (
                          <div style={{ display:'flex', gap:'4px', justifyContent:'flex-end', opacity:0 }}
                            ref={(el)=>{ if(el){ el.closest('tr').addEventListener('mouseenter',()=>el.style.opacity=1); el.closest('tr').addEventListener('mouseleave',()=>el.style.opacity=0); } }}>
                            <button onClick={(e)=>{ e.stopPropagation(); setEdit(t); setForm(true); }} style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'5px', padding:'4px 7px', cursor:'pointer', color:'#6c757d', display:'flex', alignItems:'center' }}
                              onMouseEnter={(e)=>{ e.currentTarget.style.borderColor=NAVY; e.currentTarget.style.color=NAVY; }}
                              onMouseLeave={(e)=>{ e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.color='#6c757d'; }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button onClick={(e)=>{ e.stopPropagation(); setDel(t.id); }} style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'5px', padding:'4px 7px', cursor:'pointer', color:'#6c757d', display:'flex', alignItems:'center' }}
                              onMouseEnter={(e)=>{ e.currentTarget.style.borderColor='#c53030'; e.currentTarget.style.color='#c53030'; }}
                              onMouseLeave={(e)=>{ e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.color='#6c757d'; }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                            </button>
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
      </div>

      <BulkModal isOpen={bulkOpen} matters={matters} users={users}
        onClose={()=>setBulk(false)}
        onSaved={(data)=>{ fetchTasks(filter); showToast(`${data.created} task${data.created!==1?'s':''} added.`); }} />

      <TaskDrawer task={detail} onClose={closeDetail}
        onSaved={(data)=>{ fetchTasks(filter); setDetail(data); showToast('Task updated.'); }}
        onEdit={(t)=>{ closeDetail(); setEdit(t); setForm(true); }} />

      <TaskForm isOpen={formOpen} task={editing}
        onClose={()=>{ setForm(false); setEdit(null); }}
        onSaved={(_,action)=>{ fetchTasks(filter); showToast(`Task ${action==='created'?'added':'updated'}.`); }} />

      {toast && (
        <div style={{ position:'fixed', bottom:'28px', right:'28px', background:toast.type==='error'?'#c53030':'#276749', color:'#fff', padding:'12px 20px', borderRadius:'7px', fontSize:'14px', fontWeight:'500', zIndex:400, boxShadow:'0 4px 16px rgba(0,0,0,.2)', animation:'slideUp .2s ease' }}>
          {toast.message}
        </div>
      )}
      <style>{`@keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </Layout>
  );
}
