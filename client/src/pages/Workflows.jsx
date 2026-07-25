import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const NAVY = '#1B2A4A';
const GOLD  = '#C9A84C';

const PRACTICE_AREAS = [
  'Personal Injury','Criminal Defense','Family Law','Estate Planning / Probate',
  'Real Estate','Business / Corporate','Civil Litigation','Employment Law',
  'Immigration','Bankruptcy','Workers Compensation','Social Security Disability','Other',
];

const MASTER_TEMPLATES = [
  {
    name: 'Personal Injury — New Case',
    description: 'Standard intake through settlement workflow for PI matters.',
    practice_area: 'Personal Injury',
    phases: [
      { name: 'Intake & Investigation', tasks: [
        { name: 'Obtain signed fee agreement', days_offset: 0 },
        { name: 'Request medical records', days_offset: 2 },
        { name: 'Order police / incident report', days_offset: 2 },
        { name: 'Photograph injuries and scene', days_offset: 3 },
        { name: 'Send preservation letter to defendant', days_offset: 5 },
      ]},
      { name: 'Medical Treatment Phase', tasks: [
        { name: 'Set up treatment tracker', days_offset: 7 },
        { name: 'Follow up on medical records monthly', days_offset: 30 },
        { name: 'Confirm client has reached MMI', days_offset: 90 },
      ]},
      { name: 'Demand & Negotiation', tasks: [
        { name: 'Compile full medical record packet', days_offset: 100 },
        { name: 'Draft and send demand letter', days_offset: 110 },
        { name: 'Log insurance response', days_offset: 140 },
        { name: 'Negotiate settlement', days_offset: 150 },
      ]},
      { name: 'Resolution', tasks: [
        { name: 'Obtain client approval on settlement', days_offset: 160 },
        { name: 'Draft settlement agreement / release', days_offset: 162 },
        { name: 'Receive and deposit settlement check', days_offset: 175 },
        { name: 'Pay liens and disburse to client', days_offset: 185 },
        { name: 'Close matter file', days_offset: 190 },
      ]},
    ],
  },
  {
    name: 'Criminal Defense — Misdemeanor',
    description: 'Arraignment through disposition for misdemeanor cases.',
    practice_area: 'Criminal Defense',
    phases: [
      { name: 'Engagement', tasks: [
        { name: 'Execute fee agreement', days_offset: 0 },
        { name: 'File notice of appearance', days_offset: 1 },
        { name: 'Request discovery packet', days_offset: 2 },
      ]},
      { name: 'Case Preparation', tasks: [
        { name: 'Review police report and evidence', days_offset: 5 },
        { name: 'Interview client re: facts', days_offset: 7 },
        { name: 'Research applicable defenses', days_offset: 10 },
        { name: 'Identify and contact witnesses', days_offset: 14 },
      ]},
      { name: 'Pre-Trial', tasks: [
        { name: 'Attend arraignment', days_offset: 14 },
        { name: 'File pre-trial motions', days_offset: 21 },
        { name: 'Attend pre-trial conference', days_offset: 30 },
        { name: 'Evaluate plea offer with client', days_offset: 35 },
      ]},
      { name: 'Disposition', tasks: [
        { name: 'Plea or trial', days_offset: 45 },
        { name: 'Sentencing hearing (if applicable)', days_offset: 60 },
        { name: 'Advise client on probation/conditions', days_offset: 62 },
        { name: 'Close matter', days_offset: 65 },
      ]},
    ],
  },
  {
    name: 'Estate Planning — Will Package',
    description: 'Initial consultation through document execution for basic estate plan.',
    practice_area: 'Estate Planning / Probate',
    phases: [
      { name: 'Consultation & Information Gathering', tasks: [
        { name: 'Conduct initial consultation', days_offset: 0 },
        { name: 'Send estate planning questionnaire', days_offset: 1 },
        { name: 'Receive completed questionnaire', days_offset: 7 },
      ]},
      { name: 'Drafting', tasks: [
        { name: 'Draft Last Will & Testament', days_offset: 10 },
        { name: 'Draft Durable Power of Attorney', days_offset: 10 },
        { name: 'Draft Medical Power of Attorney', days_offset: 10 },
        { name: 'Draft Directive to Physicians (Living Will)', days_offset: 11 },
        { name: 'Send draft package to client for review', days_offset: 12 },
      ]},
      { name: 'Execution', tasks: [
        { name: 'Receive client revisions', days_offset: 17 },
        { name: 'Finalize all documents', days_offset: 19 },
        { name: 'Schedule execution ceremony', days_offset: 20 },
        { name: 'Execute documents with witnesses/notary', days_offset: 25 },
        { name: 'Provide certified copies to client', days_offset: 25 },
        { name: 'Close matter and archive originals', days_offset: 26 },
      ]},
    ],
  },
  {
    name: 'Family Law — Uncontested Divorce',
    description: 'Filing through final decree for uncontested divorce matters.',
    practice_area: 'Family Law',
    phases: [
      { name: 'Intake', tasks: [
        { name: 'Execute engagement letter', days_offset: 0 },
        { name: 'Gather client financial information', days_offset: 2 },
        { name: 'Confirm ground for divorce and residency', days_offset: 3 },
      ]},
      { name: 'Drafting & Filing', tasks: [
        { name: 'Draft Original Petition for Divorce', days_offset: 5 },
        { name: 'File petition and pay filing fee', days_offset: 7 },
        { name: 'Serve respondent or obtain waiver', days_offset: 9 },
        { name: 'Draft Marital Settlement Agreement', days_offset: 14 },
      ]},
      { name: 'Waiting Period & Finalization', tasks: [
        { name: 'Track 60-day waiting period', days_offset: 10 },
        { name: 'Draft Agreed Final Decree of Divorce', days_offset: 65 },
        { name: 'Submit proposed decree to court', days_offset: 67 },
        { name: 'Attend prove-up hearing', days_offset: 75 },
        { name: 'Obtain signed final decree', days_offset: 76 },
        { name: 'Provide certified copies to client', days_offset: 77 },
        { name: 'Close matter', days_offset: 78 },
      ]},
    ],
  },
  {
    name: 'Real Estate — Residential Closing',
    description: 'Contract through closing for residential real estate transaction.',
    practice_area: 'Real Estate',
    phases: [
      { name: 'Contract Review', tasks: [
        { name: 'Review purchase contract', days_offset: 0 },
        { name: 'Advise client on contingencies and deadlines', days_offset: 1 },
        { name: 'Execute engagement letter', days_offset: 1 },
      ]},
      { name: 'Due Diligence', tasks: [
        { name: 'Order title search', days_offset: 2 },
        { name: 'Review title commitment', days_offset: 10 },
        { name: 'Clear title objections', days_offset: 14 },
        { name: 'Coordinate survey', days_offset: 5 },
        { name: 'Review inspection reports', days_offset: 12 },
      ]},
      { name: 'Closing Preparation', tasks: [
        { name: 'Prepare closing documents', days_offset: 25 },
        { name: 'Confirm payoff amounts', days_offset: 27 },
        { name: 'Review final HUD / ALTA settlement statement', days_offset: 28 },
        { name: 'Coordinate with lender on closing conditions', days_offset: 28 },
      ]},
      { name: 'Closing & Post-Close', tasks: [
        { name: 'Attend closing and execute documents', days_offset: 30 },
        { name: 'Record deed and deed of trust', days_offset: 31 },
        { name: 'Disburse proceeds', days_offset: 31 },
        { name: 'Deliver title policy to client', days_offset: 45 },
        { name: 'Close matter', days_offset: 46 },
      ]},
    ],
  },
];

function GripIcon() {
  const dots = [[3,3],[9,3],[3,8],[9,8],[3,13],[9,13]];
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
      {dots.map(([cx,cy], i) => <circle key={i} cx={cx} cy={cy} r="1.5" fill="#adb5bd" />)}
    </svg>
  );
}

function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      {children(listeners, attributes)}
    </div>
  );
}

const fieldStyle = (focused) => ({
  width: '100%', padding: '9px 12px', fontSize: '14px',
  border: `1.5px solid ${focused ? GOLD : '#dee2e6'}`,
  borderRadius: '5px', outline: 'none', fontFamily: 'Inter, sans-serif',
  color: '#1a1a2e', background: '#fff', boxSizing: 'border-box',
});
const labelStyle = { display:'block', fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'5px' };

export default function Workflows() {
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [seeding,   setSeeding]   = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [delId,     setDelId]     = useState(null);
  const [toast,     setToast]     = useState(null);
  const [focused,   setFocused]   = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/workflows');
      setTemplates(data);
    } catch { showToast('Failed to load templates.','error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const seedMasters = async () => {
    setSeeding(true);
    try {
      const res = await axios.post('/api/workflows/seed');
      if (res.data.error) {
        showToast(res.data.error, 'error');
      } else if (res.data.templates) {
        setTemplates(res.data.templates);
        showToast('5 workflow templates loaded successfully.');
      } else {
        await load();
        showToast(res.data.message || 'Templates ready.');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Seed failed — check server logs.', 'error');
    }
    setSeeding(false);
  };

  const deleteTemplate = async (id) => {
    try {
      await axios.delete(`/api/workflows/templates/${id}`);
      setDelId(null);
      setTemplates(ts => ts.filter(t => t.id !== id));
      showToast('Template deleted.');
    } catch { showToast('Failed to delete.','error'); }
  };

  const EMPTY_TEMPLATE = { name:'', description:'', practice_area:'', phases:[] };
  const [form, setForm] = useState(EMPTY_TEMPLATE);

  const sensors = useSensors(useSensor(PointerSensor));

  const openNew = () => { setForm(EMPTY_TEMPLATE); setEditing('new'); };
  const openEdit = (t) => {
    setForm({
      name: t.name, description: t.description||'', practice_area: t.practice_area||'',
      phases: t.phases.map((p,pi) => ({
        id: p.id, _id: p.id?.toString() || `phase-${pi}`, name: p.name,
        tasks: p.tasks.map((tk,ti) => ({
          id: tk.id, _id: tk.id?.toString() || `task-${pi}-${ti}`,
          name: tk.name, description: tk.description||'', days_offset: tk.days_offset||0,
        })),
      })),
    });
    setEditing(t.id);
  };

  const addPhase = () => setForm(f => ({ ...f, phases: [...f.phases, { _id:`new-${Date.now()}`, name:'', tasks:[] }] }));
  const removePhase = (pi) => setForm(f => ({ ...f, phases: f.phases.filter((_,i)=>i!==pi) }));
  const setPhase = (pi, val) => setForm(f => { const ps=[...f.phases]; ps[pi]={...ps[pi],name:val}; return {...f,phases:ps}; });
  const addTask = (pi) => setForm(f => { const ps=[...f.phases]; ps[pi]={...ps[pi],tasks:[...ps[pi].tasks,{_id:`new-${Date.now()}-${pi}`,name:'',description:'',days_offset:0}]}; return {...f,phases:ps}; });
  const removeTask = (pi,ti) => setForm(f => { const ps=[...f.phases]; ps[pi]={...ps[pi],tasks:ps[pi].tasks.filter((_,i)=>i!==ti)}; return {...f,phases:ps}; });
  const setTask = (pi,ti,field,val) => setForm(f => { const ps=[...f.phases]; const ts=[...ps[pi].tasks]; ts[ti]={...ts[ti],[field]:val}; ps[pi]={...ps[pi],tasks:ts}; return {...f,phases:ps}; });

  const handlePhasesDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = form.phases.findIndex(p => p._id === active.id);
    const to   = form.phases.findIndex(p => p._id === over.id);
    if (from === -1 || to === -1) return;
    const newPhases = arrayMove(form.phases, from, to);
    setForm(f => ({ ...f, phases: newPhases }));
    if (editing !== 'new') {
      const phaseIds = newPhases.filter(p => p.id).map(p => p.id);
      if (phaseIds.length > 0) axios.put('/api/workflows/phases/reorder', { phase_ids: phaseIds }).catch(() => showToast('Reorder failed.','error'));
    }
  };

  const handleTasksDragEnd = (pi, { active, over }) => {
    if (!over || active.id === over.id) return;
    const phase = form.phases[pi];
    const from = phase.tasks.findIndex(t => t._id === active.id);
    const to   = phase.tasks.findIndex(t => t._id === over.id);
    if (from === -1 || to === -1) return;
    const newTasks = arrayMove(phase.tasks, from, to);
    setForm(f => { const ps=[...f.phases]; ps[pi]={...ps[pi],tasks:newTasks}; return {...f,phases:ps}; });
    if (editing !== 'new' && phase.id) {
      const taskIds = newTasks.filter(t => t.id).map(t => t.id);
      if (taskIds.length > 0) axios.put(`/api/workflows/phases/${phase.id}/tasks/reorder`, { task_ids: taskIds }).catch(() => showToast('Reorder failed.','error'));
    }
  };

  const saveForm = async () => {
    if (!form.name.trim()) return showToast('Template name is required.','error');
    try {
      if (editing === 'new') {
        await axios.post('/api/workflows/templates', form);
        showToast('Template created.');
      } else {
        await axios.put(`/api/workflows/templates/${editing}`, form);
        showToast('Template updated.');
      }
      setEditing(null);
      load();
    } catch { showToast('Failed to save.','error'); }
  };

  return (
    <Layout>
      <div style={{ padding:'32px 40px', maxWidth:'1000px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
          <div>
            <h1 style={{ fontSize:'24px', fontWeight:'600', color:NAVY, fontFamily:'Playfair Display,Georgia,serif', margin:0 }}>Workflow Templates</h1>
            <p style={{ color:'#6c757d', fontSize:'13px', margin:'4px 0 0' }}>Reusable phase/task workflows you can apply to any matter.</p>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            {templates.length === 0 && !loading && (
              <button onClick={seedMasters} disabled={seeding}
                style={{ padding:'8px 16px', background:'#f0f2f5', border:'1px solid #dee2e6', borderRadius:'6px', fontSize:'13px', fontWeight:'600', cursor:'pointer', color:NAVY }}>
                {seeding ? 'Loading…' : 'Load Master Templates'}
              </button>
            )}
            <button onClick={openNew}
              style={{ padding:'8px 16px', background:GOLD, border:'none', borderRadius:'6px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
              + New Template
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#adb5bd' }}>Loading…</div>
        ) : templates.length === 0 ? (
          <div style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'10px', padding:'48px', textAlign:'center' }}>
            <p style={{ color:'#6c757d', marginBottom:'16px' }}>No workflow templates yet.</p>
            <button onClick={seedMasters} disabled={seeding}
              style={{ padding:'10px 20px', background:NAVY, border:'none', borderRadius:'6px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
              {seeding ? 'Loading…' : 'Load 5 Master Templates'}
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gap:'12px' }}>
            {templates.map(t => (
              <div key={t.id} style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'10px', padding:'20px 24px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'10px' }}>
                  <div>
                    <div style={{ fontSize:'15px', fontWeight:'600', color:NAVY }}>{t.name}</div>
                    {t.practice_area && <div style={{ fontSize:'12px', color:GOLD, fontWeight:'600', marginTop:'2px' }}>{t.practice_area}</div>}
                    {t.description && <div style={{ fontSize:'13px', color:'#6c757d', marginTop:'4px' }}>{t.description}</div>}
                  </div>
                  <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                    <button onClick={()=>openEdit(t)}
                      style={{ padding:'5px 12px', background:'#f0f2f5', border:'1px solid #dee2e6', borderRadius:'5px', fontSize:'12px', fontWeight:'600', cursor:'pointer', color:NAVY }}>
                      Edit
                    </button>
                    {delId === t.id ? (
                      <span style={{ display:'flex', gap:'4px', alignItems:'center' }}>
                        <span style={{ fontSize:'11px', color:'#c53030' }}>Delete?</span>
                        <button onClick={()=>deleteTemplate(t.id)} style={{ padding:'4px 8px', background:'#c53030', border:'none', borderRadius:'4px', color:'#fff', fontSize:'11px', cursor:'pointer' }}>Yes</button>
                        <button onClick={()=>setDelId(null)} style={{ padding:'4px 7px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'4px', fontSize:'11px', cursor:'pointer' }}>No</button>
                      </span>
                    ) : (
                      <button onClick={()=>setDelId(t.id)}
                        style={{ padding:'5px 10px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'5px', fontSize:'12px', cursor:'pointer', color:'#c53030' }}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {t.phases.map((p,pi) => (
                    <div key={pi} style={{ background:'#f8f9fa', border:'1px solid #e9ecef', borderRadius:'6px', padding:'6px 12px', fontSize:'12px', color:'#495057' }}>
                      <span style={{ fontWeight:'600' }}>{p.name}</span>
                      <span style={{ color:'#adb5bd', marginLeft:'6px' }}>{p.tasks?.length || 0} tasks</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {editing !== null && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:300 }} onClick={()=>setEditing(null)} />
          <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'580px', background:'#fff', zIndex:301, display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,.15)', overflowY:'auto' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #e9ecef', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'#fff', zIndex:10 }}>
              <h2 style={{ fontSize:'17px', fontWeight:'600', color:NAVY, margin:0 }}>{editing==='new'?'New Template':'Edit Template'}</h2>
              <button onClick={()=>setEditing(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#adb5bd', fontSize:'20px', lineHeight:1 }}>×</button>
            </div>

            <div style={{ flex:1, padding:'24px', overflowY:'auto' }}>
              <div style={{ marginBottom:'14px' }}>
                <label style={labelStyle}>Template Name *</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                  onFocus={()=>setFocused('name')} onBlur={()=>setFocused(null)}
                  style={fieldStyle(focused==='name')} placeholder="e.g. Personal Injury — New Case" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'14px' }}>
                <div>
                  <label style={labelStyle}>Practice Area</label>
                  <select value={form.practice_area} onChange={e=>setForm(f=>({...f,practice_area:e.target.value}))}
                    style={{ ...fieldStyle(false), appearance:'none' }}>
                    <option value="">— Any —</option>
                    {PRACTICE_AREAS.map(a=><option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                    style={fieldStyle(false)} placeholder="Short description" />
                </div>
              </div>

              <div style={{ borderTop:'1px solid #f1f3f5', paddingTop:'16px', marginBottom:'8px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                  <span style={{ fontSize:'13px', fontWeight:'700', color:NAVY }}>Phases & Tasks</span>
                  <button onClick={addPhase} style={{ padding:'5px 12px', background:GOLD, border:'none', borderRadius:'5px', color:'#fff', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>+ Add Phase</button>
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePhasesDragEnd}>
                  <SortableContext items={form.phases.map(p => p._id || '')} strategy={verticalListSortingStrategy}>
                    {form.phases.map((phase, pi) => (
                      <SortableItem key={phase._id || pi} id={phase._id || `phase-${pi}`}>
                        {(gripListeners, gripAttrs) => (
                          <div style={{ background:'#f8f9fa', border:'1px solid #e9ecef', borderRadius:'8px', padding:'14px', marginBottom:'10px' }}>
                            <div style={{ display:'flex', gap:'8px', marginBottom:'10px', alignItems:'center' }}>
                              <div {...gripListeners} {...gripAttrs} style={{ cursor:'grab', padding:'4px 2px', touchAction:'none', flexShrink:0 }}><GripIcon /></div>
                              <input value={phase.name} onChange={e=>setPhase(pi,e.target.value)}
                                style={{ ...fieldStyle(false), flex:1 }} placeholder={`Phase ${pi+1} name`} />
                              <button onClick={()=>removePhase(pi)} style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'5px', color:'#c53030', cursor:'pointer', padding:'0 8px', fontSize:'16px', lineHeight:1 }}>×</button>
                            </div>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleTasksDragEnd(pi, e)}>
                              <SortableContext items={phase.tasks.map(t => t._id || '')} strategy={verticalListSortingStrategy}>
                                {phase.tasks.map((task, ti) => (
                                  <SortableItem key={task._id || ti} id={task._id || `task-${pi}-${ti}`}>
                                    {(tListeners, tAttrs) => (
                                      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:'6px', marginBottom:'6px', alignItems:'center' }}>
                                        <div {...tListeners} {...tAttrs} style={{ cursor:'grab', padding:'4px 2px', touchAction:'none' }}><GripIcon /></div>
                                        <input value={task.name} onChange={e=>setTask(pi,ti,'name',e.target.value)}
                                          style={{ ...fieldStyle(false), fontSize:'13px' }} placeholder="Task name" />
                                        <input type="number" min="0" value={task.days_offset} onChange={e=>setTask(pi,ti,'days_offset',parseInt(e.target.value)||0)}
                                          style={{ ...fieldStyle(false), width:'70px', fontSize:'13px' }} title="Days from matter open" />
                                        <button onClick={()=>removeTask(pi,ti)} style={{ background:'none', border:'none', cursor:'pointer', color:'#adb5bd', fontSize:'16px', padding:'0 4px' }}>×</button>
                                      </div>
                                    )}
                                  </SortableItem>
                                ))}
                              </SortableContext>
                            </DndContext>
                            <button onClick={()=>addTask(pi)} style={{ fontSize:'12px', color:NAVY, background:'none', border:'1px dashed #dee2e6', borderRadius:'4px', padding:'4px 10px', cursor:'pointer', marginTop:'4px' }}>+ task</button>
                          </div>
                        )}
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
                {form.phases.length === 0 && <div style={{ textAlign:'center', color:'#adb5bd', fontSize:'13px', padding:'16px 0' }}>No phases yet. Add a phase to get started.</div>}
              </div>
            </div>

            <div style={{ padding:'16px 24px', borderTop:'1px solid #e9ecef', display:'flex', gap:'10px', justifyContent:'flex-end', background:'#fff', position:'sticky', bottom:0 }}>
              <button onClick={()=>setEditing(null)} style={{ padding:'9px 18px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'5px', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
              <button onClick={saveForm} style={{ padding:'9px 22px', background:NAVY, border:'none', borderRadius:'5px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
                {editing==='new' ? 'Create Template' : 'Save Changes'}
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
