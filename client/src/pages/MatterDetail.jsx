import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import TaskForm from '../components/TaskForm';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const NAVY = '#1B2A4A';
const GOLD  = '#C9A84C';

const STATUS_COLORS = {
  open:     { bg:'#dcfce7', color:'#166534' },
  closed:   { bg:'#f1f5f9', color:'#64748b' },
  pending:  { bg:'#fef3c7', color:'#92400e' },
  inactive: { bg:'#f1f5f9', color:'#9ca3af' },
  on_hold:  { bg:'#e0f2fe', color:'#0369a1' },
  archived: { bg:'#f1f5f9', color:'#9ca3af' },
};
const STATUS_LABEL = {
  open:'Open', closed:'Closed', pending:'Pending', inactive:'Inactive', on_hold:'On Hold', archived:'Archived',
};
const PRIORITY_MAP = {
  high:   { label:'High',   bg:'#fee2e2', color:'#c53030' },
  medium: { label:'Medium', bg:'#fef3c7', color:'#92400e' },
  low:    { label:'Low',    bg:'#f1f5f9', color:'#64748b' },
};
const TASK_STATUS_MAP = {
  not_started: { label:'Not Started', bg:'#f1f5f9', color:'#64748b' },
  in_progress: { label:'In Progress', bg:'#e8edf5', color:NAVY },
  completed:   { label:'Completed',   bg:'#dcfce7', color:'#166534' },
};
const FILE_ICONS = {
  'application/pdf':                  { label:'PDF', color:'#c53030' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label:'DOC', color:'#1B4F9B' },
  'application/msword':               { label:'DOC', color:'#1B4F9B' },
  'image/jpeg':                       { label:'IMG', color:'#276749' },
  'image/png':                        { label:'IMG', color:'#276749' },
};

const Badge = ({ map, val }) => {
  const t = map?.[val]; if (!t) return null;
  return <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', letterSpacing:'.04em', background:t.bg, color:t.color }}>{t.label || val}</span>;
};

const fmtDate = (d) => d ? new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
const fmtBytes = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`;
const today = () => new Date().toISOString().slice(0,10);

function SolBadge({ date }) {
  if (!date) return <span style={{color:'#ced4da'}}>—</span>;
  const d = new Date(date+'T12:00:00');
  const days = Math.ceil((d - new Date()) / 86400000);
  const color = days < 0 ? '#c53030' : days <= 30 ? '#c53030' : days <= 90 ? GOLD : '#166534';
  const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`;
  return (
    <span style={{ color, fontWeight:'600', fontSize:'13px' }}>
      {fmtDate(date)} <span style={{ fontSize:'11px' }}>({label})</span>
    </span>
  );
}

function WfGripIcon() {
  const dots = [[3,3],[9,3],[3,8],[9,8],[3,13],[9,13]];
  return <svg width="14" height="16" viewBox="0 0 14 16" fill="none">{dots.map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="1.5" fill="#ced4da"/>)}</svg>;
}

function SortableWfTask({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      {children(listeners, attributes)}
    </div>
  );
}

export default function MatterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [matter,       setMatter]      = useState(null);
  const [tasks,        setTasks]       = useState([]);
  const [docs,         setDocs]        = useState([]);
  const [sigs,         setSigs]        = useState([]);
  const [matterStaff,  setMatterStaff] = useState([]);
  const [workflows,    setWorkflows]   = useState([]);
  const [timeEntries,  setTimeEntries] = useState([]);
  const [allUsers,     setAllUsers]    = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [notes,        setNotes]       = useState([]);
  const [noteText,     setNoteText]    = useState('');
  const [noteSaving,   setNoteSaving]  = useState(false);
  const [loading,      setLoading]     = useState(true);
  const [activeTab,    setActiveTab]   = useState('tasks');
  const [taskForm,     setTaskForm]    = useState(false);
  const [editTask,     setEditTask]    = useState(null);
  const [delDoc,       setDelDoc]      = useState(null);
  const [toast,        setToast]       = useState(null);
  const [uploading,    setUploading]   = useState(false);
  const [delTask,      setDelTask]     = useState(null);
  const [sigModal,     setSigModal]    = useState(false);
  const [sigForm,      setSigForm]     = useState({ recipient_name: '', recipient_email: '', document_name: '' });
  const [sigSending,   setSigSending]  = useState(false);
  const [staffModal,   setStaffModal]  = useState(false);
  const [addStaffId,   setAddStaffId]  = useState('');
  const [wfTemplates,  setWfTemplates] = useState([]);
  const [teForm,       setTeForm]      = useState({ entry_date: '', hours: '', rate: '', description: '', billable: true });
  const [tePanel,      setTePanel]     = useState(false);
  const [teSaving,     setTeSaving]    = useState(false);
  const [teFocused,    setTeFocused]   = useState(null);

  const showToast = (message, type='success') => { setToast({message,type}); setTimeout(()=>setToast(null),3500); };

  const fetchActivity = useCallback(async () => {
    try {
      const [aRes, nRes] = await Promise.all([
        axios.get('/api/activity', { params: { matter_id: id } }),
        axios.get('/api/notes', { params: { matter_id: id } }),
      ]);
      setActivityFeed(aRes.data);
      setNotes(nRes.data);
    } catch {}
  }, [id]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, tRes, dRes, sRes, stRes, wRes, teRes, usersRes, wfTmpRes] = await Promise.all([
        axios.get(`/api/matters/${id}`),
        axios.get('/api/tasks', { params: { filter: 'all', matter_id: id } }),
        axios.get('/api/documents', { params: { matter_id: id } }),
        axios.get('/api/esignature/requests', { params: { matter_id: id } }),
        axios.get(`/api/matters/${id}/staff`),
        axios.get(`/api/workflows/matter/${id}`),
        axios.get('/api/time-entries', { params: { matter_id: id } }),
        axios.get('/api/users'),
        axios.get('/api/workflows/templates'),
      ]);
      setMatter(mRes.data);
      setTasks(tRes.data);
      setDocs(dRes.data);
      setSigs(sRes.data);
      setMatterStaff(stRes.data);
      setWorkflows(wRes.data);
      setTimeEntries(teRes.data);
      setAllUsers(usersRes.data);
      setWfTemplates(wfTmpRes.data);
      fetchActivity();
    } catch (err) {
      if (err.response?.status === 404) navigate('/matters');
      else showToast('Failed to load matter.', 'error');
    } finally { setLoading(false); }
  }, [id, navigate, fetchActivity]);

  const addStaff = async () => {
    if (!addStaffId) return;
    try {
      const { data } = await axios.post(`/api/matters/${id}/staff`, { user_id: Number(addStaffId) });
      setMatterStaff(data);
      setAddStaffId('');
      setStaffModal(false);
      showToast('Staff member added.');
    } catch { showToast('Failed to add staff.', 'error'); }
  };

  const removeStaff = async (userId) => {
    try {
      await axios.delete(`/api/matters/${id}/staff/${userId}`);
      setMatterStaff(prev => prev.filter(s => s.id !== userId));
      showToast('Staff member removed.');
    } catch { showToast('Failed to remove staff.', 'error'); }
  };

  const applyWorkflow = async (templateId) => {
    try {
      await axios.post(`/api/workflows/matter/${id}/from-template/${templateId}`);
      const { data } = await axios.get(`/api/workflows/matter/${id}`);
      setWorkflows(data);
      showToast('Workflow applied.');
    } catch { showToast('Failed to apply workflow.', 'error'); }
  };

  const toggleWfTask = async (taskId) => {
    try {
      await axios.patch(`/api/workflows/workflow-tasks/${taskId}/complete`);
      const { data } = await axios.get(`/api/workflows/matter/${id}`);
      setWorkflows(data);
    } catch { showToast('Failed to update task.', 'error'); }
  };

  const deleteWorkflow = async (wfId) => {
    try {
      await axios.delete(`/api/workflows/matter-workflows/${wfId}`);
      setWorkflows(prev => prev.filter(w => w.id !== wfId));
      showToast('Workflow removed.');
    } catch { showToast('Failed to remove workflow.', 'error'); }
  };

  const wfSensors = useSensors(useSensor(PointerSensor));

  const handleWfTasksDragEnd = async (wfId, phaseId, tasks, { active, over }) => {
    if (!over || active.id === over.id) return;
    const from = tasks.findIndex(t => t.id === active.id);
    const to   = tasks.findIndex(t => t.id === over.id);
    if (from === -1 || to === -1) return;
    const newTasks = arrayMove(tasks, from, to);
    setWorkflows(wfs => wfs.map(wf => {
      if (wf.id !== wfId) return wf;
      return { ...wf, phases: wf.phases.map(p => p.id === phaseId ? { ...p, tasks: newTasks } : p) };
    }));
    try {
      await axios.put('/api/workflows/matter-workflow-tasks/reorder', { task_ids: newTasks.map(t => t.id) });
    } catch { showToast('Reorder failed.', 'error'); }
  };

  const logTime = async () => {
    if (!teForm.hours || !teForm.description.trim()) return showToast('Hours and description required.', 'error');
    setTeSaving(true);
    try {
      await axios.post('/api/time-entries', {
        matter_id: id, ...teForm,
        hours: parseFloat(teForm.hours),
        rate: teForm.rate ? parseFloat(teForm.rate) : null,
        entry_date: teForm.entry_date || new Date().toISOString().slice(0,10),
      });
      const { data } = await axios.get('/api/time-entries', { params: { matter_id: id } });
      setTimeEntries(data);
      setTeForm({ entry_date:'', hours:'', rate:'', description:'', billable:true });
      setTePanel(false);
      showToast('Time logged.');
    } catch (err) { showToast(err.response?.data?.error || 'Failed to log time.', 'error'); }
    setTeSaving(false);
  };

  const fmtDate2 = (d) => d ? new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
  const fmtMoney = (n) => n != null ? `$${Number(n).toFixed(2)}` : '—';

  const changeMatterStatus = async (newStatus) => {
    try {
      await axios.patch(`/api/matters/${id}/status`, { status: newStatus });
      fetchAll();
      showToast(`Matter status updated to ${STATUS_LABEL[newStatus] || newStatus}.`);
    } catch { showToast('Failed to update status.', 'error'); }
  };

  const sendSignature = async () => {
    if (!sigForm.recipient_email || !sigForm.document_name) return;
    setSigSending(true);
    try {
      await axios.post('/api/esignature/send', {
        matter_id: id,
        document_name: sigForm.document_name,
        recipient_name: sigForm.recipient_name,
        recipient_email: sigForm.recipient_email,
      });
      setSigModal(false);
      setSigForm({ recipient_name: '', recipient_email: '', document_name: '' });
      fetchAll();
      showToast('Signature request sent.');
    } catch { showToast('Failed to send signature request.', 'error'); }
    setSigSending(false);
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCompleteTask = async (taskId) => {
    try { await axios.patch(`/api/tasks/${taskId}/complete`); fetchAll(); showToast('Task marked complete.'); }
    catch { showToast('Failed to update task.', 'error'); }
  };

  const handleDeleteTask = async (taskId) => {
    try { await axios.delete(`/api/tasks/${taskId}`); setDelTask(null); fetchAll(); showToast('Task deleted.'); }
    catch { showToast('Failed to delete task.', 'error'); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('matter_id', id);
    fd.append('document_name', file.name.replace(/\.[^.]+$/, ''));
    setUploading(true);
    try { await axios.post('/api/documents', fd, { headers:{'Content-Type':'multipart/form-data'} }); fetchAll(); showToast('Document uploaded.'); }
    catch (err) { showToast(err.response?.data?.error || 'Upload failed.', 'error'); }
    finally { setUploading(false); e.target.value=''; }
  };

  const handleDeleteDoc = async (docId) => {
    try { await axios.delete(`/api/documents/${docId}`); setDelDoc(null); fetchAll(); showToast('Document deleted.'); }
    catch { showToast('Failed to delete document.', 'error'); }
  };

  const sectionHead = (title, action) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
      <h2 style={{ fontSize:'16px', fontWeight:'600', color:NAVY, margin:0, fontFamily:'Playfair Display,Georgia,serif' }}>{title}</h2>
      {action}
    </div>
  );

  if (loading) return (
    <Layout>
      <div style={{ padding:'60px', textAlign:'center', color:'#adb5bd', fontSize:'14px' }}>Loading matter…</div>
    </Layout>
  );

  if (!matter) return null;

  const sc = STATUS_COLORS[matter.status] || {};
  const openTasks = tasks.filter(t => t.status !== 'completed');
  const doneTasks = tasks.filter(t => t.status === 'completed');

  return (
    <Layout>
      <div style={{ padding:'32px 40px', maxWidth:'1100px' }}>

        {/* Back */}
        <button onClick={()=>navigate('/matters')} style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none', color:'#6c757d', fontSize:'13px', cursor:'pointer', padding:'0 0 16px', fontFamily:'Inter,sans-serif' }}
          onMouseEnter={(e)=>e.currentTarget.style.color=NAVY} onMouseLeave={(e)=>e.currentTarget.style.color='#6c757d'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Matters
        </button>

        {/* Matter header */}
        <div style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'10px', padding:'24px 28px', marginBottom:'24px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'16px' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
                <span style={{ fontFamily:'monospace', fontSize:'13px', background:'#f0f2f5', padding:'3px 8px', borderRadius:'4px', color:'#495057', fontWeight:'600' }}>{matter.matter_number}</span>
                <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:sc.bg, color:sc.color }}>
                  {STATUS_LABEL[matter.status] || matter.status}
                </span>
              </div>
              <h1 style={{ fontSize:'24px', fontWeight:'600', color:NAVY, fontFamily:'Playfair Display,Georgia,serif', margin:'0 0 4px' }}>{matter.matter_name}</h1>
              {matter.client_name && <p style={{ color:'#6c757d', fontSize:'14px', margin:0 }}>{matter.client_name}</p>}
            </div>
            <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
              {matter.status === 'archived' ? (
                <button onClick={() => changeMatterStatus('open')} style={{ padding:'7px 14px', background:'#dcfce7', border:'1px solid #bbf7d0', borderRadius:'6px', color:'#166534', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                  ↺ Restore
                </button>
              ) : (
                <>
                  {matter.status !== 'closed' && (
                    <button onClick={() => changeMatterStatus('closed')} style={{ padding:'7px 14px', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:'6px', color:'#374151', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                      Close Matter
                    </button>
                  )}
                  {matter.status === 'closed' && (
                    <button onClick={() => changeMatterStatus('open')} style={{ padding:'7px 14px', background:'#dcfce7', border:'1px solid #bbf7d0', borderRadius:'6px', color:'#166534', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                      Re-Open
                    </button>
                  )}
                  <button onClick={() => changeMatterStatus('archived')} style={{ padding:'7px 14px', background:'#fff5f5', border:'1px solid #fed7d7', borderRadius:'6px', color:'#c53030', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                    Archive
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'16px', paddingTop:'16px', borderTop:'1px solid #f1f3f5' }}>
            {[
              { label:'Practice Area', value: matter.practice_area?.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) || '—' },
              { label:'Opened', value: fmtDate(matter.open_date) },
              { label:'SOL Date', value: <SolBadge date={matter.sol_date} /> },
              { label:'Court', value: matter.court || '—' },
              { label:'Opposing Counsel', value: matter.opposing_counsel || '—' },
            ].map(({label,value}) => (
              <div key={label}>
                <div style={{ fontSize:'11px', fontWeight:'600', color:'#6c757d', letterSpacing:'.04em', textTransform:'uppercase', marginBottom:'3px' }}>{label}</div>
                <div style={{ fontSize:'13px', color:'#212529' }}>{value}</div>
              </div>
            ))}
            <div style={{ gridColumn:'1 / -1' }}>
              <div style={{ fontSize:'11px', fontWeight:'600', color:'#6c757d', letterSpacing:'.04em', textTransform:'uppercase', marginBottom:'6px' }}>Staff Members</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', alignItems:'center' }}>
                {matterStaff.map(s => (
                  <span key={s.id} style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'#e8edf5', color:NAVY, borderRadius:'20px', fontSize:'12px', fontWeight:'600', padding:'3px 10px' }}>
                    {s.name}
                    <span style={{ fontSize:'10px', color:'#6c757d', fontWeight:'400', textTransform:'capitalize' }}>({s.role})</span>
                    <button onClick={()=>removeStaff(s.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#adb5bd', lineHeight:1, padding:'0 0 0 2px', fontSize:'14px' }}
                      onMouseEnter={e=>e.currentTarget.style.color='#c53030'}
                      onMouseLeave={e=>e.currentTarget.style.color='#adb5bd'}>×</button>
                  </span>
                ))}
                <button onClick={()=>setStaffModal(true)}
                  style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 10px', borderRadius:'20px', border:`1px dashed ${GOLD}`, background:'transparent', color:GOLD, fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
                  + Add Staff
                </button>
              </div>
            </div>
          </div>

          {matter.description && (
            <div style={{ marginTop:'16px', paddingTop:'16px', borderTop:'1px solid #f1f3f5' }}>
              <div style={{ fontSize:'11px', fontWeight:'600', color:'#6c757d', letterSpacing:'.04em', textTransform:'uppercase', marginBottom:'6px' }}>Description</div>
              <p style={{ fontSize:'13px', color:'#495057', margin:0, lineHeight:'1.6' }}>{matter.description}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #e9ecef', marginBottom:'20px', flexWrap:'wrap' }}>
          {[['tasks','Tasks'], ['documents','Documents'], ['notes','Notes'], ['esignatures','E-Signatures'], ['workflow','Workflow'], ['time','Time Entries'], ['activity','Activity']].map(([t,l]) => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding:'10px 20px', border:'none', background:'none', cursor:'pointer',
              fontSize:'13px', fontWeight: activeTab===t ? '700' : '400',
              color: activeTab===t ? NAVY : '#6c757d',
              borderBottom: `2px solid ${activeTab===t ? GOLD : 'transparent'}`,
              marginBottom:'-1px', fontFamily:'Inter,sans-serif', transition:'color .15s',
            }}>{l}</button>
          ))}
        </div>

        {/* Tasks section */}
        {activeTab === 'tasks' && <div style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'10px', padding:'22px 24px', marginBottom:'20px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          {sectionHead('Tasks',
            <button onClick={()=>{ setEditTask(null); setTaskForm(true); }}
              style={{ display:'flex', alignItems:'center', gap:'5px', padding:'7px 14px', background:GOLD, border:'none', borderRadius:'6px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}
              onMouseEnter={(e)=>e.currentTarget.style.background='#b8943d'} onMouseLeave={(e)=>e.currentTarget.style.background=GOLD}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Task
            </button>
          )}

          {tasks.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'#ced4da', fontSize:'14px' }}>No tasks linked to this matter.</div>
          ) : (
            <>
              {openTasks.length > 0 && (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px', marginBottom: doneTasks.length>0?'16px':0 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid #f1f3f5' }}>
                      {['','Task','Due','Priority','Status',''].map((h,i)=>(
                        <th key={i} style={{ padding:'7px 10px', textAlign:'left', fontSize:'10px', fontWeight:'600', color:'#6c757d', letterSpacing:'.06em', textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openTasks.map((t,i) => {
                      const isOver = t.due_date && t.due_date.slice(0,10) < today();
                      return (
                        <tr key={t.id} style={{ borderBottom: i<openTasks.length-1?'1px solid #f8f9fa':'none' }}
                          onMouseEnter={(e)=>e.currentTarget.style.background='#fafbfc'}
                          onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'10px 8px 10px 4px', width:'28px' }}>
                            <button onClick={()=>handleCompleteTask(t.id)} title="Mark complete"
                              style={{ width:'20px', height:'20px', borderRadius:'50%', border:`2px solid ${t.priority==='high'?'#c53030':t.priority==='medium'?GOLD:'#ced4da'}`, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} />
                          </td>
                          <td style={{ padding:'10px', fontWeight:'500', color:NAVY }}>{t.task_name}</td>
                          <td style={{ padding:'10px', whiteSpace:'nowrap', color: isOver?'#c53030':'#495057', fontWeight: isOver?'600':'400' }}>{fmtDate(t.due_date)}</td>
                          <td style={{ padding:'10px' }}><Badge map={PRIORITY_MAP} val={t.priority} /></td>
                          <td style={{ padding:'10px' }}><Badge map={TASK_STATUS_MAP} val={t.status} /></td>
                          <td style={{ padding:'10px', textAlign:'right', whiteSpace:'nowrap' }}>
                            {delTask === t.id ? (
                              <span style={{ display:'flex', gap:'6px', justifyContent:'flex-end', alignItems:'center' }}>
                                <span style={{fontSize:'11px',color:'#c53030'}}>Delete?</span>
                                <button onClick={()=>handleDeleteTask(t.id)} style={{padding:'2px 8px',background:'#c53030',border:'none',borderRadius:'3px',color:'#fff',fontSize:'11px',cursor:'pointer'}}>Yes</button>
                                <button onClick={()=>setDelTask(null)} style={{padding:'2px 6px',background:'transparent',border:'1px solid #dee2e6',borderRadius:'3px',fontSize:'11px',cursor:'pointer'}}>No</button>
                              </span>
                            ) : (
                              <span style={{ display:'flex', gap:'3px', justifyContent:'flex-end', opacity:0 }}
                                ref={el=>{ if(el){ el.closest('tr').addEventListener('mouseenter',()=>el.style.opacity=1); el.closest('tr').addEventListener('mouseleave',()=>el.style.opacity=0); }}}>
                                <button onClick={()=>{ setEditTask(t); setTaskForm(true); }} style={{background:'none',border:'1px solid #dee2e6',borderRadius:'4px',padding:'3px 6px',cursor:'pointer',color:'#6c757d',display:'flex',alignItems:'center'}}
                                  onMouseEnter={(e)=>{ e.currentTarget.style.borderColor=NAVY; e.currentTarget.style.color=NAVY; }}
                                  onMouseLeave={(e)=>{ e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.color='#6c757d'; }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button onClick={()=>setDelTask(t.id)} style={{background:'none',border:'1px solid #dee2e6',borderRadius:'4px',padding:'3px 6px',cursor:'pointer',color:'#6c757d',display:'flex',alignItems:'center'}}
                                  onMouseEnter={(e)=>{ e.currentTarget.style.borderColor='#c53030'; e.currentTarget.style.color='#c53030'; }}
                                  onMouseLeave={(e)=>{ e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.color='#6c757d'; }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                                </button>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {doneTasks.length > 0 && (
                <details style={{ marginTop: openTasks.length>0?'0':'4px' }}>
                  <summary style={{ fontSize:'12px', fontWeight:'600', color:'#6c757d', cursor:'pointer', padding:'6px 0', letterSpacing:'.04em', textTransform:'uppercase', userSelect:'none' }}>
                    {doneTasks.length} Completed Task{doneTasks.length!==1?'s':''}
                  </summary>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px', marginTop:'8px', opacity:'.7' }}>
                    <tbody>
                      {doneTasks.map((t,i) => (
                        <tr key={t.id} style={{ borderBottom: i<doneTasks.length-1?'1px solid #f8f9fa':'none' }}>
                          <td style={{ padding:'8px 4px', width:'28px' }}>
                            <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:'#dcfce7', border:'2px solid #166534', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                          </td>
                          <td style={{ padding:'8px 10px', color:'#adb5bd', textDecoration:'line-through' }}>{t.task_name}</td>
                          <td style={{ padding:'8px 10px', color:'#ced4da' }}>{fmtDate(t.due_date)}</td>
                          <td colSpan="3" />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
            </>
          )}
        </div>}

        {/* Documents section */}
        {activeTab === 'documents' && <div style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'10px', padding:'22px 24px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          {sectionHead('Documents',
            <label style={{ display:'flex', alignItems:'center', gap:'5px', padding:'7px 14px', background: uploading?'#d4b878':GOLD, border:'none', borderRadius:'6px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor: uploading?'not-allowed':'pointer', fontFamily:'Inter,sans-serif' }}
              onMouseEnter={(e)=>{ if(!uploading) e.currentTarget.style.background='#b8943d'; }}
              onMouseLeave={(e)=>{ e.currentTarget.style.background=uploading?'#d4b878':GOLD; }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
              {uploading ? 'Uploading…' : 'Upload'}
              <input type="file" accept=".pdf,.docx,.doc,.jpg,.jpeg,.png" onChange={handleUpload} style={{ display:'none' }} disabled={uploading} />
            </label>
          )}

          {docs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'#ced4da', fontSize:'14px' }}>No documents for this matter yet.</div>
          ) : (
            <div style={{ display:'grid', gap:'8px' }}>
              {docs.map(doc => {
                const fi = FILE_ICONS[doc.file_type] || { label:'FILE', color:'#6c757d' };
                const isDel = delDoc === doc.id;
                return (
                  <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', border:'1px solid #f1f3f5', borderRadius:'6px', background:'#fafbfc' }}
                    onMouseEnter={(e)=>e.currentTarget.style.background='#f1f3f5'}
                    onMouseLeave={(e)=>e.currentTarget.style.background='#fafbfc'}>
                    <div style={{ width:'36px', height:'36px', background:'#fff', border:'1px solid #e9ecef', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontFamily:'monospace', fontSize:'9px', fontWeight:'700', color:fi.color }}>{fi.label}</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:'500', color:NAVY, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.document_name}</div>
                      <div style={{ fontSize:'11px', color:'#6c757d', marginTop:'1px' }}>
                        {fmtBytes(doc.file_size)} · {fmtDate(doc.uploaded_at)} · {doc.uploaded_by_name || '—'}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'6px', alignItems:'center', flexShrink:0 }}>
                      {isDel ? (
                        <>
                          <span style={{fontSize:'11px',color:'#c53030'}}>Delete?</span>
                          <button onClick={()=>handleDeleteDoc(doc.id)} style={{padding:'3px 8px',background:'#c53030',border:'none',borderRadius:'3px',color:'#fff',fontSize:'11px',cursor:'pointer'}}>Yes</button>
                          <button onClick={()=>setDelDoc(null)} style={{padding:'3px 6px',background:'transparent',border:'1px solid #dee2e6',borderRadius:'3px',fontSize:'11px',cursor:'pointer'}}>No</button>
                        </>
                      ) : (
                        <>
                          <button onClick={()=>window.open(`/api/documents/${doc.id}/download`,'_blank')}
                            style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'4px', padding:'5px 8px', cursor:'pointer', color:'#6c757d', display:'flex', alignItems:'center' }}
                            onMouseEnter={(e)=>{ e.currentTarget.style.borderColor=NAVY; e.currentTarget.style.color=NAVY; }}
                            onMouseLeave={(e)=>{ e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.color='#6c757d'; }}
                            title="Download">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          </button>
                          {user?.role === 'attorney' && (
                            <button onClick={()=>setDelDoc(doc.id)}
                              style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'4px', padding:'5px 8px', cursor:'pointer', color:'#6c757d', display:'flex', alignItems:'center' }}
                              onMouseEnter={(e)=>{ e.currentTarget.style.borderColor='#c53030'; e.currentTarget.style.color='#c53030'; }}
                              onMouseLeave={(e)=>{ e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.color='#6c757d'; }}
                              title="Delete">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>}

        {/* E-Signatures section */}
        {activeTab === 'esignatures' && (
          <div style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'10px', padding:'22px 24px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
            {sectionHead('E-Signatures',
              <button onClick={() => setSigModal(true)} style={{ display:'flex', alignItems:'center', gap:'5px', padding:'7px 14px', background:GOLD, border:'none', borderRadius:'6px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}
                onMouseEnter={e=>e.currentTarget.style.background='#b8943d'} onMouseLeave={e=>e.currentTarget.style.background=GOLD}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Send for Signature
              </button>
            )}
            {sigs.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', color:'#ced4da', fontSize:'14px' }}>No signature requests for this matter yet.</div>
            ) : (
              <div style={{ display:'grid', gap:'8px' }}>
                {sigs.map(sig => {
                  const statusColor = sig.status === 'signed' ? '#166534' : sig.status === 'declined' ? '#c53030' : '#92400e';
                  const statusBg = sig.status === 'signed' ? '#dcfce7' : sig.status === 'declined' ? '#fff5f5' : '#fef3c7';
                  return (
                    <div key={sig.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', border:'1px solid #f1f3f5', borderRadius:'6px', background:'#fafbfc' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'13px', fontWeight:'500', color:NAVY }}>{sig.document_name}</div>
                        <div style={{ fontSize:'11px', color:'#6c757d', marginTop:'2px' }}>
                          {sig.recipient_name || sig.recipient_email} · {fmtDate(sig.created_at)}
                        </div>
                      </div>
                      <span style={{ fontSize:'11px', fontWeight:'700', background:statusBg, color:statusColor, padding:'3px 10px', borderRadius:'12px', whiteSpace:'nowrap', textTransform:'capitalize' }}>
                        {sig.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Send Signature Modal */}
      {sigModal && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:400 }} onClick={() => setSigModal(false)} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:440, background:'#fff', borderRadius:'10px', boxShadow:'0 8px 40px rgba(0,0,0,.18)', zIndex:500, padding:28 }}>
            <div style={{ fontSize:'15px', fontWeight:'700', color:NAVY, marginBottom:16 }}>Send Document for Signature</div>
            <label style={{ fontSize:'12px', fontWeight:'600', color:'#555', display:'block', marginBottom:4 }}>Document Name *</label>
            <input style={{ width:'100%', border:'1px solid #ced4da', borderRadius:6, padding:'9px 12px', fontSize:13, boxSizing:'border-box', marginBottom:12 }}
              value={sigForm.document_name} placeholder="e.g. Engagement Letter"
              onChange={e => setSigForm(p => ({ ...p, document_name: e.target.value }))} />
            <label style={{ fontSize:'12px', fontWeight:'600', color:'#555', display:'block', marginBottom:4 }}>Recipient Name</label>
            <input style={{ width:'100%', border:'1px solid #ced4da', borderRadius:6, padding:'9px 12px', fontSize:13, boxSizing:'border-box', marginBottom:12 }}
              value={sigForm.recipient_name} placeholder="Client name"
              onChange={e => setSigForm(p => ({ ...p, recipient_name: e.target.value }))} />
            <label style={{ fontSize:'12px', fontWeight:'600', color:'#555', display:'block', marginBottom:4 }}>Recipient Email *</label>
            <input type="email" style={{ width:'100%', border:'1px solid #ced4da', borderRadius:6, padding:'9px 12px', fontSize:13, boxSizing:'border-box', marginBottom:16 }}
              value={sigForm.recipient_email} placeholder="client@email.com"
              onChange={e => setSigForm(p => ({ ...p, recipient_email: e.target.value }))} />
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button style={{ background:'#fff', color:'#555', border:'1px solid #ced4da', borderRadius:6, padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer' }} onClick={() => setSigModal(false)}>Cancel</button>
              <button style={{ background:NAVY, color:'#fff', border:'none', borderRadius:6, padding:'9px 18px', fontSize:13, fontWeight:600, cursor:sigSending?'not-allowed':'pointer', opacity:sigSending?.7:1 }}
                onClick={sendSignature} disabled={sigSending || !sigForm.recipient_email || !sigForm.document_name}>
                {sigSending ? 'Sending…' : 'Send Link'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Workflow tab */}
      {activeTab === 'workflow' && (
        <div style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'10px', padding:'22px 24px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          {sectionHead('Workflow',
            wfTemplates.length > 0 ? (
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <select defaultValue="" onChange={e=>{ if(e.target.value) applyWorkflow(e.target.value); e.target.value=''; }}
                  style={{ padding:'7px 12px', border:'1px solid #dee2e6', borderRadius:'6px', fontSize:'12px', color:'#495057', cursor:'pointer' }}>
                  <option value="" disabled>Apply template…</option>
                  {wfTemplates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            ) : null
          )}
          {workflows.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'#ced4da', fontSize:'14px' }}>
              No workflows on this matter.
              {wfTemplates.length === 0 && <span> Create templates in <a href="/workflows" style={{ color:GOLD }}>Workflow Templates</a>.</span>}
            </div>
          ) : (
            <div style={{ display:'grid', gap:'16px' }}>
              {workflows.map(wf => {
                const allTasks = wf.phases.flatMap(p=>p.tasks);
                const done = allTasks.filter(t=>t.completed_at).length;
                const pct = allTasks.length ? Math.round(done/allTasks.length*100) : 0;
                return (
                  <div key={wf.id} style={{ border:'1px solid #e9ecef', borderRadius:'8px', overflow:'hidden' }}>
                    <div style={{ background:'#f8f9fa', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontSize:'14px', fontWeight:'600', color:NAVY }}>{wf.name}</div>
                        <div style={{ fontSize:'11px', color:'#6c757d', marginTop:'2px' }}>{done}/{allTasks.length} tasks complete ({pct}%)</div>
                      </div>
                      <button onClick={()=>deleteWorkflow(wf.id)}
                        style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'4px', padding:'4px 8px', cursor:'pointer', color:'#c53030', fontSize:'11px' }}>
                        Remove
                      </button>
                    </div>
                    <div style={{ background:'#e9ecef', height:'4px' }}>
                      <div style={{ background:GOLD, height:'4px', width:`${pct}%`, transition:'width .3s' }} />
                    </div>
                    {wf.phases.map((phase,pi) => (
                      <div key={pi} style={{ padding:'12px 16px', borderTop: pi>0?'1px solid #f1f3f5':'none' }}>
                        <div style={{ fontSize:'11px', fontWeight:'700', color:'#6c757d', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'8px' }}>{phase.name}</div>
                        <DndContext sensors={wfSensors} collisionDetection={closestCenter} onDragEnd={(e) => handleWfTasksDragEnd(wf.id, phase.id, phase.tasks, e)}>
                          <SortableContext items={phase.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                            {phase.tasks.map(task => (
                              <SortableWfTask key={task.id} id={task.id}>
                                {(gripListeners, gripAttrs) => (
                                  <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'5px 0', borderBottom:'1px solid #f8f9fa' }}>
                                    <div {...gripListeners} {...gripAttrs} style={{ cursor:'grab', padding:'2px', touchAction:'none', flexShrink:0 }}><WfGripIcon /></div>
                                    <button onClick={()=>toggleWfTask(task.id)}
                                      style={{ width:'18px', height:'18px', borderRadius:'50%', border:`2px solid ${task.completed_at?'#166534':GOLD}`, background:task.completed_at?'#166534':'transparent', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                      {task.completed_at && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                    </button>
                                    <span style={{ fontSize:'13px', color: task.completed_at?'#adb5bd':NAVY, textDecoration:task.completed_at?'line-through':'none' }}>{task.name}</span>
                                    {task.due_date && <span style={{ marginLeft:'auto', fontSize:'11px', color:'#adb5bd' }}>{fmtDate2(task.due_date)}</span>}
                                  </div>
                                )}
                              </SortableWfTask>
                            ))}
                          </SortableContext>
                        </DndContext>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Time Entries tab */}
      {activeTab === 'time' && (
        <div style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'10px', padding:'22px 24px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          {sectionHead('Time Entries',
            <button onClick={()=>{ setTeForm({ entry_date: new Date().toISOString().slice(0,10), hours:'', rate:'', description:'', billable:true }); setTePanel(true); }}
              style={{ display:'flex', alignItems:'center', gap:'5px', padding:'7px 14px', background:GOLD, border:'none', borderRadius:'6px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}
              onMouseEnter={e=>e.currentTarget.style.background='#b8943d'} onMouseLeave={e=>e.currentTarget.style.background=GOLD}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Log Time
            </button>
          )}
          {timeEntries.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'#ced4da', fontSize:'14px' }}>No time entries for this matter yet.</div>
          ) : (
            <>
              <div style={{ display:'flex', gap:'16px', marginBottom:'14px', paddingBottom:'14px', borderBottom:'1px solid #f1f3f5' }}>
                <div>
                  <span style={{ fontSize:'11px', fontWeight:'700', color:'#6c757d', textTransform:'uppercase', letterSpacing:'.06em' }}>Total Hours</span>
                  <div style={{ fontSize:'18px', fontWeight:'700', color:NAVY }}>{timeEntries.reduce((s,e)=>s+Number(e.hours||0),0).toFixed(2)}</div>
                </div>
                <div>
                  <span style={{ fontSize:'11px', fontWeight:'700', color:'#6c757d', textTransform:'uppercase', letterSpacing:'.06em' }}>Billed Value</span>
                  <div style={{ fontSize:'18px', fontWeight:'700', color:NAVY }}>{fmtMoney(timeEntries.filter(e=>e.billable).reduce((s,e)=>s+(Number(e.hours||0)*Number(e.rate||0)),0))}</div>
                </div>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #f1f3f5' }}>
                    {['Date','Description','Hours','Rate','Billable','Status'].map(h=>(
                      <th key={h} style={{ padding:'6px 8px', textAlign:'left', fontSize:'10px', fontWeight:'700', color:'#6c757d', letterSpacing:'.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map((e,i) => (
                    <tr key={e.id} style={{ borderBottom:i<timeEntries.length-1?'1px solid #f8f9fa':'none' }}>
                      <td style={{ padding:'8px', whiteSpace:'nowrap', color:'#495057' }}>{fmtDate2(e.entry_date)}</td>
                      <td style={{ padding:'8px', color:NAVY, fontWeight:'500' }}>{e.description}</td>
                      <td style={{ padding:'8px', fontWeight:'600', color:NAVY }}>{Number(e.hours).toFixed(2)}</td>
                      <td style={{ padding:'8px', color:'#6c757d' }}>{e.rate ? fmtMoney(e.rate)+'/hr' : '—'}</td>
                      <td style={{ padding:'8px' }}>
                        <span style={{ fontSize:'11px', fontWeight:'600', padding:'2px 7px', borderRadius:'12px', background:e.billable?'#dcfce7':'#f1f5f9', color:e.billable?'#166534':'#64748b' }}>
                          {e.billable?'Billable':'Non-Bill'}
                        </span>
                      </td>
                      <td style={{ padding:'8px' }}>
                        <span style={{ fontSize:'11px', fontWeight:'600', padding:'2px 7px', borderRadius:'12px', background:e.invoiced?'#e8edf5':'#fef3c7', color:e.invoiced?NAVY:'#92400e' }}>
                          {e.invoiced?'Invoiced':'Unbilled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Notes tab */}
      {activeTab === 'notes' && (
        <div style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'10px', padding:'22px 24px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          {sectionHead('Notes', null)}
          <div style={{ marginBottom:'16px' }}>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add a note…"
              style={{ width:'100%', padding:'10px 12px', fontSize:'13px', border:'1.5px solid #dee2e6', borderRadius:'6px', outline:'none', resize:'vertical', minHeight:'80px', boxSizing:'border-box', fontFamily:'Inter,sans-serif' }}
              onFocus={e=>e.target.style.borderColor=GOLD} onBlur={e=>e.target.style.borderColor='#dee2e6'}
            />
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'8px' }}>
              <button
                disabled={!noteText.trim() || noteSaving}
                onClick={async () => {
                  setNoteSaving(true);
                  try {
                    await axios.post('/api/notes', { content: noteText, matter_id: id });
                    setNoteText('');
                    fetchActivity();
                  } catch { showToast('Failed to save note.','error'); }
                  finally { setNoteSaving(false); }
                }}
                style={{ padding:'7px 18px', background:noteSaving?'#d4b878':GOLD, border:'none', borderRadius:'5px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:noteSaving||!noteText.trim()?'not-allowed':'pointer', opacity:!noteText.trim()?'.5':'1' }}>
                {noteSaving ? 'Saving…' : 'Add Note'}
              </button>
            </div>
          </div>
          {notes.length === 0 ? (
            <div style={{ textAlign:'center', padding:'24px 0', color:'#ced4da', fontSize:'13px' }}>No notes yet.</div>
          ) : (
            <div style={{ display:'grid', gap:'10px' }}>
              {notes.map(n => (
                <div key={n.id} style={{ padding:'12px 14px', border:'1px solid #f1f3f5', borderRadius:'6px', background:'#fafbfc' }}>
                  <div style={{ fontSize:'13px', color:NAVY, lineHeight:'1.6', whiteSpace:'pre-wrap' }}>{n.content}</div>
                  <div style={{ fontSize:'11px', color:'#adb5bd', marginTop:'6px' }}>
                    {n.author_name || '—'} · {new Date(n.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity tab */}
      {activeTab === 'activity' && (
        <div style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'10px', padding:'22px 24px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          {sectionHead('Activity Feed', null)}
          {activityFeed.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'#ced4da', fontSize:'13px' }}>No activity recorded yet.</div>
          ) : (
            <div style={{ display:'grid', gap:'0' }}>
              {activityFeed.map((ev, i) => {
                const icon = {
                  task_created:'✓', task_completed:'✓', document_uploaded:'📄', document_signed:'✍',
                  time_entry_added:'⏱', esignature_sent:'✉', note_added:'📝',
                }[ev.event_type] || '•';
                const color = {
                  task_completed:'#166534', document_signed:'#1B4F9B', esignature_sent:NAVY,
                }[ev.event_type] || '#6c757d';
                return (
                  <div key={ev.id} style={{ display:'flex', gap:'12px', paddingBottom:'14px', marginBottom:'14px', borderBottom: i < activityFeed.length-1 ? '1px solid #f1f3f5' : 'none' }}>
                    <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', flexShrink:0 }}>{icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', color:NAVY, fontWeight:'500' }}>{ev.description || ev.event_type.replace(/_/g,' ')}</div>
                      <div style={{ fontSize:'11px', color:'#adb5bd', marginTop:'2px' }}>
                        {ev.actor_name && <span>{ev.actor_name} · </span>}
                        {new Date(ev.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {staffModal && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:400 }} onClick={()=>setStaffModal(false)} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:380, background:'#fff', borderRadius:'10px', boxShadow:'0 8px 40px rgba(0,0,0,.18)', zIndex:500, padding:24 }}>
            <div style={{ fontSize:'15px', fontWeight:'700', color:NAVY, marginBottom:14 }}>Add Staff to Matter</div>
            <select value={addStaffId} onChange={e=>setAddStaffId(e.target.value)}
              style={{ width:'100%', border:'1px solid #dee2e6', borderRadius:6, padding:'9px 12px', fontSize:13, boxSizing:'border-box', marginBottom:14, appearance:'none' }}>
              <option value="">— Select staff member —</option>
              {allUsers.filter(u => !matterStaff.find(s=>s.id===u.id)).map(u=>(
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>setStaffModal(false)} style={{ background:'#fff', color:'#555', border:'1px solid #dee2e6', borderRadius:6, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancel</button>
              <button onClick={addStaff} disabled={!addStaffId} style={{ background:NAVY, color:'#fff', border:'none', borderRadius:6, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:addStaffId?'pointer':'not-allowed', opacity:addStaffId?1:.5 }}>Add</button>
            </div>
          </div>
        </>
      )}

      {/* Log Time Panel */}
      {tePanel && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:400 }} onClick={()=>setTePanel(false)} />
          <div style={{ position:'fixed', top:0, right:0, bottom:0, width:380, background:'#fff', zIndex:401, display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,.15)' }}>
            <div style={{ padding:'18px 22px', borderBottom:'1px solid #e9ecef', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <h3 style={{ fontSize:'15px', fontWeight:'600', color:NAVY, margin:0 }}>Log Time</h3>
              <button onClick={()=>setTePanel(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#adb5bd', fontSize:'20px' }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'20px 22px' }}>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#555', marginBottom:'4px' }}>Date</label>
                <input type="date" value={teForm.entry_date} onChange={e=>setTeForm(f=>({...f,entry_date:e.target.value}))}
                  onFocus={()=>setTeFocused('date')} onBlur={()=>setTeFocused(null)}
                  style={{ width:'100%', padding:'9px 12px', fontSize:'13px', border:`1.5px solid ${teFocused==='date'?GOLD:'#dee2e6'}`, borderRadius:'5px', outline:'none', boxSizing:'border-box' }} />
              </div>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#555', marginBottom:'4px' }}>Hours *</label>
                <input type="number" min="0.1" step="0.25" value={teForm.hours} onChange={e=>setTeForm(f=>({...f,hours:e.target.value}))}
                  onFocus={()=>setTeFocused('hours')} onBlur={()=>setTeFocused(null)}
                  placeholder="0.00"
                  style={{ width:'100%', padding:'9px 12px', fontSize:'13px', border:`1.5px solid ${teFocused==='hours'?GOLD:'#dee2e6'}`, borderRadius:'5px', outline:'none', boxSizing:'border-box' }} />
              </div>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#555', marginBottom:'4px' }}>Description *</label>
                <textarea value={teForm.description} onChange={e=>setTeForm(f=>({...f,description:e.target.value}))}
                  onFocus={()=>setTeFocused('desc')} onBlur={()=>setTeFocused(null)}
                  placeholder="Work performed…"
                  style={{ width:'100%', padding:'9px 12px', fontSize:'13px', border:`1.5px solid ${teFocused==='desc'?GOLD:'#dee2e6'}`, borderRadius:'5px', outline:'none', resize:'vertical', minHeight:'72px', boxSizing:'border-box' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
                <div>
                  <label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#555', marginBottom:'4px' }}>Rate ($/hr)</label>
                  <input type="number" min="0" step="0.01" value={teForm.rate} onChange={e=>setTeForm(f=>({...f,rate:e.target.value}))}
                    placeholder="250.00"
                    style={{ width:'100%', padding:'9px 12px', fontSize:'13px', border:'1.5px solid #dee2e6', borderRadius:'5px', outline:'none', boxSizing:'border-box' }} />
                </div>
                <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:'1px' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:'7px', cursor:'pointer', fontSize:'13px', color:'#495057' }}>
                    <input type="checkbox" checked={teForm.billable} onChange={e=>setTeForm(f=>({...f,billable:e.target.checked}))}
                      style={{ width:'15px', height:'15px', accentColor:GOLD }} />
                    Billable
                  </label>
                </div>
              </div>
            </div>
            <div style={{ padding:'14px 22px', borderTop:'1px solid #e9ecef', display:'flex', gap:'8px', justifyContent:'flex-end', flexShrink:0 }}>
              <button onClick={()=>setTePanel(false)} style={{ padding:'8px 16px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'5px', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
              <button onClick={logTime} disabled={teSaving}
                style={{ padding:'8px 18px', background:teSaving?'#d4b878':GOLD, border:'none', borderRadius:'5px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:teSaving?'not-allowed':'pointer' }}>
                {teSaving ? 'Saving…' : 'Log Entry'}
              </button>
            </div>
          </div>
        </>
      )}

      <TaskForm
        isOpen={taskForm}
        task={editTask ? { ...editTask, matter_id: editTask.matter_id ?? id } : null}
        onClose={()=>{ setTaskForm(false); setEditTask(null); }}
        onSaved={(_,action)=>{ fetchAll(); showToast(`Task ${action==='created'?'added':'updated'}.`); }}
        defaultMatterId={id}
      />

      {toast && (
        <div style={{ position:'fixed', bottom:'28px', right:'28px', background:toast.type==='error'?'#c53030':'#276749', color:'#fff', padding:'12px 20px', borderRadius:'7px', fontSize:'14px', fontWeight:'500', zIndex:400, boxShadow:'0 4px 16px rgba(0,0,0,.2)', animation:'slideUp .2s ease' }}>
          {toast.message}
        </div>
      )}
      <style>{`@keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </Layout>
  );
}
