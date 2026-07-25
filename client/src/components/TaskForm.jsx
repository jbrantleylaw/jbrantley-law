import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const PRIORITIES  = [{ v:'high',   l:'High' },   { v:'medium', l:'Medium' }, { v:'low', l:'Low' }];
const STATUSES    = [{ v:'not_started', l:'Not Started' }, { v:'in_progress', l:'In Progress' }, { v:'completed', l:'Completed' }];
const RECURRINGS  = [{ v:'none', l:'None' }, { v:'daily', l:'Daily' }, { v:'weekly', l:'Weekly' }, { v:'monthly', l:'Monthly' }];

const EMPTY = { task_name:'', matter_id:'', assigned_to:'', due_date:'', priority:'medium', status:'not_started', recurring:'none', notes:'' };

const fld  = (f) => ({ width:'100%', padding:'10px 12px', fontSize:'14px', border:`1.5px solid ${f ? GOLD : '#dee2e6'}`, borderRadius:'5px', outline:'none', fontFamily:'Inter,sans-serif', color:'#1a1a2e', background:'#fff', transition:'border-color .15s', boxSizing:'border-box' });
const sel  = (f) => ({ ...fld(f), appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center', paddingRight:'32px' });
const lbl  = { display:'block', fontSize:'12px', fontWeight:'500', color:'#555', marginBottom:'5px' };
const row  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'16px' };

export default function TaskForm({ isOpen, task, onClose, onSaved, defaultMatterId }) {
  const [form, setForm]   = useState(EMPTY);
  const [focused, setFoc] = useState(null);
  const [saving, setSav]  = useState(false);
  const [error, setErr]   = useState('');
  const [visible, setVis] = useState(false);
  const [matters, setMat] = useState([]);
  const [users,   setUsr] = useState([]);
  const ref = useRef(null);
  const isEdit = !!task;

  useEffect(() => {
    if (isOpen) {
      setErr('');
      setForm(task ? { ...EMPTY, ...task, due_date: task.due_date?.slice(0,10)||'', matter_id: task.matter_id??'', assigned_to: task.assigned_to??'' } : { ...EMPTY, matter_id: defaultMatterId||'' });
      Promise.all([
        axios.get('/api/matters', { params: { status: 'open' } }),
        axios.get('/api/users'),
      ]).then(([m, u]) => { setMat(m.data); setUsr(u.data); }).catch(() => {});
      setTimeout(() => { setVis(true); ref.current?.focus(); }, 30);
    } else { setVis(false); }
  }, [isOpen, task]);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setErr(''); setSav(true);
    const payload = { ...form, matter_id: form.matter_id||null, assigned_to: form.assigned_to||null, due_date: form.due_date||null };
    try {
      if (isEdit) { const { data } = await axios.put(`/api/tasks/${task.id}`, payload); onSaved(data, 'updated'); }
      else        { const { data } = await axios.post('/api/tasks', payload); onSaved(data, 'created'); }
      onClose();
    } catch (err) { setErr(err.response?.data?.error || 'Failed to save task.'); }
    finally { setSav(false); }
  };

  if (!isOpen && !visible) return null;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:200, opacity:visible?1:0, transition:'opacity .25s' }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'460px', background:'#fff', zIndex:201, display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,.15)', transform:visible?'translateX(0)':'translateX(100%)', transition:'transform .28s cubic-bezier(.4,0,.2,1)' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #e9ecef', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <h2 style={{ fontSize:'18px', fontWeight:'600', color:NAVY, margin:0 }}>{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#adb5bd', padding:'4px', display:'flex' }}
            onMouseEnter={(e)=>e.currentTarget.style.color='#495057'} onMouseLeave={(e)=>e.currentTarget.style.color='#adb5bd'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex:1, overflowY:'auto', padding:'24px' }}>
          {/* Task name */}
          <div style={{ marginBottom:'16px' }}>
            <label style={lbl}>Task Name <span style={{color:'#c0392b'}}>*</span></label>
            <input ref={ref} value={form.task_name} onChange={set('task_name')}
              onFocus={()=>setFoc('n')} onBlur={()=>setFoc(null)}
              style={fld(focused==='n')} placeholder="What needs to be done?" required />
          </div>

          {/* Matter / Assigned to */}
          <div style={row}>
            <div>
              <label style={lbl}>Linked Matter</label>
              <SearchableSelect
                value={form.matter_id}
                onChange={(v) => setForm(p=>({...p, matter_id:v}))}
                options={matters.map(m=>({ value:m.id, label:m.matter_name, sublabel:m.matter_number }))}
                placeholder="— None —"
              />
            </div>
            <div>
              <label style={lbl}>Assigned To</label>
              <SearchableSelect
                value={form.assigned_to}
                onChange={(v) => setForm(p=>({...p, assigned_to:v}))}
                options={users.map(u=>({ value:u.id, label:u.name }))}
                placeholder="— Unassigned —"
              />
            </div>
          </div>

          {/* Due date / Priority */}
          <div style={row}>
            <div>
              <label style={lbl}>Due Date</label>
              <input type="date" value={form.due_date} onChange={set('due_date')} onFocus={()=>setFoc('d')} onBlur={()=>setFoc(null)} style={fld(focused==='d')} />
            </div>
            <div>
              <label style={lbl}>Priority</label>
              <select value={form.priority} onChange={set('priority')} onFocus={()=>setFoc('p')} onBlur={()=>setFoc(null)} style={sel(focused==='p')}>
                {PRIORITIES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
          </div>

          {/* Status / Recurring */}
          <div style={row}>
            <div>
              <label style={lbl}>Status</label>
              <select value={form.status} onChange={set('status')} onFocus={()=>setFoc('s')} onBlur={()=>setFoc(null)} style={sel(focused==='s')}>
                {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Recurring</label>
              <select value={form.recurring} onChange={set('recurring')} onFocus={()=>setFoc('r')} onBlur={()=>setFoc(null)} style={sel(focused==='r')}>
                {RECURRINGS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom:'8px' }}>
            <label style={lbl}>Notes</label>
            <textarea value={form.notes} onChange={set('notes')} onFocus={()=>setFoc('nt')} onBlur={()=>setFoc(null)}
              style={{ ...fld(focused==='nt'), resize:'vertical', minHeight:'80px' }} placeholder="Additional notes…" />
          </div>

          {error && <div style={{ background:'#fff5f5', border:'1px solid #fed7d7', color:'#c53030', borderRadius:'5px', padding:'10px 12px', fontSize:'13px', marginTop:'12px' }}>{error}</div>}
        </form>

        {/* Footer */}
        <div style={{ padding:'16px 24px', borderTop:'1px solid #e9ecef', display:'flex', gap:'10px', justifyContent:'flex-end', flexShrink:0 }}>
          <button type="button" onClick={onClose} style={{ padding:'9px 20px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'5px', fontSize:'14px', cursor:'pointer', fontFamily:'Inter,sans-serif', color:'#495057' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding:'9px 24px', background:saving?'#d4b878':GOLD, border:'none', borderRadius:'5px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:saving?'not-allowed':'pointer', fontFamily:'Inter,sans-serif' }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Task'}
          </button>
        </div>
      </div>
    </>
  );
}
