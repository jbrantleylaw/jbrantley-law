import { useState, useEffect, useCallback } from 'react';
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

const today = () => new Date().toISOString().slice(0,10);

const Badge = ({ map, val }) => {
  const t = map[val]; if (!t) return null;
  return <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', letterSpacing:'.04em', background:t.bg, color:t.color, whiteSpace:'nowrap' }}>{t.label}</span>;
};

export default function Tasks() {
  const { user } = useAuth();
  const [tasks,    setTasks]   = useState([]);
  const [filter,   setFilter]  = useState('my_tasks');
  const [loading,  setLoad]    = useState(true);
  const [formOpen, setForm]    = useState(false);
  const [editing,  setEdit]    = useState(null);
  const [deleteId, setDel]     = useState(null);
  const [toast,    setToast]   = useState(null);

  const TABS = [
    { id:'my_tasks',      label:'My Tasks' },
    { id:'all',           label:'All Tasks', attorneyOnly: true },
    { id:'overdue',       label:'Overdue' },
    { id:'due_today',     label:'Due Today' },
    { id:'due_this_week', label:'Due This Week' },
    { id:'completed',     label:'Completed' },
  ];

  const fetch = useCallback(async (f) => {
    setLoad(true);
    try { const { data } = await axios.get('/api/tasks', { params: { filter: f } }); setTasks(data); }
    catch { showToast('Failed to load tasks.', 'error'); }
    finally { setLoad(false); }
  }, []);

  useEffect(() => { fetch(filter); }, [fetch, filter]);

  const showToast = (message, type='success') => { setToast({ message, type }); setTimeout(()=>setToast(null), 3500); };

  const handleComplete = async (id) => {
    try { await axios.patch(`/api/tasks/${id}/complete`); fetch(filter); showToast('Task marked complete.'); }
    catch { showToast('Failed to update task.', 'error'); }
  };

  const handleDelete = async (id) => {
    try { await axios.delete(`/api/tasks/${id}`); setDel(null); fetch(filter); showToast('Task deleted.'); }
    catch { showToast('Failed to delete task.', 'error'); }
  };

  const rowStyle = (t) => {
    const td = today();
    const isOverdue  = t.due_date && t.due_date.slice(0,10) < td && t.status !== 'completed';
    const isDueToday = t.due_date && t.due_date.slice(0,10) === td && t.status !== 'completed';
    return {
      borderLeft: isOverdue ? '3px solid #c53030' : isDueToday ? `3px solid ${GOLD}` : '3px solid transparent',
      background: isOverdue ? '#fff9f9' : isDueToday ? '#fffdf0' : 'transparent',
    };
  };

  const fmtDate = (d) => d ? new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';

  return (
    <Layout>
      <div style={{ padding:'36px 40px', maxWidth:'1200px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px' }}>
          <div>
            <h1 style={{ fontSize:'26px', fontWeight:'600', color:NAVY, fontFamily:'Playfair Display,Georgia,serif', margin:'0 0 4px' }}>Tasks</h1>
            <p style={{ color:'#6c757d', fontSize:'14px', margin:0 }}>{loading ? 'Loading…' : `${tasks.length} task${tasks.length!==1?'s':''}`}</p>
          </div>
          <button onClick={()=>{ setEdit(null); setForm(true); }} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 20px', background:GOLD, border:'none', borderRadius:'6px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif', boxShadow:'0 2px 8px rgba(201,168,76,.35)' }}
            onMouseEnter={(e)=>e.currentTarget.style.background='#b8943d'} onMouseLeave={(e)=>e.currentTarget.style.background=GOLD}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Task
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:'4px', marginBottom:'20px', background:'#f1f3f5', borderRadius:'8px', padding:'4px', width:'fit-content' }}>
          {TABS.filter(t => !t.attorneyOnly || user?.role === 'attorney').map((t) => (
            <button key={t.id} onClick={()=>setFilter(t.id)} style={{
              padding:'7px 16px', borderRadius:'6px', border:'none', fontSize:'13px', fontWeight:'500',
              cursor:'pointer', fontFamily:'Inter,sans-serif', transition:'all .15s',
              background: filter===t.id ? '#fff' : 'transparent',
              color: filter===t.id ? NAVY : '#6c757d',
              boxShadow: filter===t.id ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
            }}>
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
                  {['','Task','Matter','Assigned','Due Date','Priority','Status',''].map((h,i) => (
                    <th key={i} style={{ padding:'11px 14px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:'#6c757d', letterSpacing:'.06em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, i) => {
                  const style = rowStyle(t);
                  const isDel = deleteId === t.id;
                  const done  = t.status === 'completed';
                  return (
                    <tr key={t.id} style={{ ...style, borderBottom: i<tasks.length-1?'1px solid #f1f3f5':'none', transition:'background .1s' }}
                      onMouseEnter={(e)=>{ if (!isDel && !style.background) e.currentTarget.style.background='#fafbfc'; }}
                      onMouseLeave={(e)=>{ e.currentTarget.style.background=style.background||'transparent'; }}>
                      {/* Complete circle */}
                      <td style={{ padding:'12px 8px 12px 16px', width:'32px' }}>
                        {!done && (
                          <button onClick={()=>handleComplete(t.id)} title="Mark complete" style={{ width:'22px', height:'22px', borderRadius:'50%', border:`2px solid ${t.priority==='high'?'#c53030':t.priority==='medium'?'#C9A84C':'#ced4da'}`, background:'transparent', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}
                            onMouseEnter={(e)=>{ e.currentTarget.style.background=t.priority==='high'?'#fee2e2':t.priority==='medium'?'#fef3c7':'#f1f5f9'; }}
                            onMouseLeave={(e)=>{ e.currentTarget.style.background='transparent'; }} />
                        )}
                        {done && (
                          <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:'#dcfce7', border:'2px solid #166534', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </td>
                      <td style={{ padding:'12px 14px', fontWeight:'500', color: done?'#adb5bd':NAVY, textDecoration: done?'line-through':'none' }}>{t.task_name}</td>
                      <td style={{ padding:'12px 14px', fontSize:'13px', color:'#6c757d' }}>
                        {t.matter_number ? <span style={{ fontFamily:'monospace', fontSize:'12px', background:'#f0f2f5', padding:'2px 6px', borderRadius:'3px' }}>{t.matter_number}</span> : <span style={{color:'#ced4da'}}>—</span>}
                      </td>
                      <td style={{ padding:'12px 14px', fontSize:'13px', color:'#6c757d' }}>{t.assigned_name||<span style={{color:'#ced4da'}}>—</span>}</td>
                      <td style={{ padding:'12px 14px', whiteSpace:'nowrap', fontSize:'13px', fontWeight: t.due_date&&t.due_date.slice(0,10)<=today()&&!done?'600':'400', color: t.due_date&&t.due_date.slice(0,10)<today()&&!done?'#c53030':t.due_date&&t.due_date.slice(0,10)===today()&&!done?GOLD:'#495057' }}>{fmtDate(t.due_date)}</td>
                      <td style={{ padding:'12px 14px' }}><Badge map={PRIORITY_MAP} val={t.priority} /></td>
                      <td style={{ padding:'12px 14px' }}><Badge map={STATUS_MAP} val={t.status} /></td>
                      <td style={{ padding:'12px 14px', textAlign:'right', whiteSpace:'nowrap' }}>
                        {isDel ? (
                          <div style={{ display:'flex', alignItems:'center', gap:'8px', justifyContent:'flex-end' }}>
                            <span style={{ fontSize:'12px', color:'#c53030' }}>Delete?</span>
                            <button onClick={()=>handleDelete(t.id)} style={{ padding:'3px 10px', background:'#c53030', border:'none', borderRadius:'4px', color:'#fff', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Yes</button>
                            <button onClick={()=>setDel(null)} style={{ padding:'3px 8px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'4px', fontSize:'12px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>No</button>
                          </div>
                        ) : (
                          <div style={{ display:'flex', gap:'4px', justifyContent:'flex-end', opacity:0 }}
                            ref={(el)=>{ if(el){ el.closest('tr').addEventListener('mouseenter',()=>el.style.opacity=1); el.closest('tr').addEventListener('mouseleave',()=>el.style.opacity=0); } }}>
                            <button onClick={()=>{ setEdit(t); setForm(true); }} style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'5px', padding:'4px 7px', cursor:'pointer', color:'#6c757d', display:'flex', alignItems:'center' }}
                              onMouseEnter={(e)=>{ e.currentTarget.style.borderColor=NAVY; e.currentTarget.style.color=NAVY; }}
                              onMouseLeave={(e)=>{ e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.color='#6c757d'; }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button onClick={()=>setDel(t.id)} style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'5px', padding:'4px 7px', cursor:'pointer', color:'#6c757d', display:'flex', alignItems:'center' }}
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

      <TaskForm isOpen={formOpen} task={editing}
        onClose={()=>{ setForm(false); setEdit(null); }}
        onSaved={(_,action)=>{ fetch(filter); showToast(`Task ${action==='created'?'added':'updated'}.`); }} />

      {toast && (
        <div style={{ position:'fixed', bottom:'28px', right:'28px', background:toast.type==='error'?'#c53030':'#276749', color:'#fff', padding:'12px 20px', borderRadius:'7px', fontSize:'14px', fontWeight:'500', zIndex:400, boxShadow:'0 4px 16px rgba(0,0,0,.2)', animation:'slideUp .2s ease' }}>
          {toast.message}
        </div>
      )}
      <style>{`@keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </Layout>
  );
}
