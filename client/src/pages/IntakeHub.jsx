import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const NAVY = '#1B2A4A';
const GOLD  = '#C9A84C';

const PRACTICE_AREAS = [
  'Federal Trademark (USPTO)',
  'Personal Injury - TX',
  'Personal Injury - GA',
  'Business Formation',
  'Contract Review and Drafting',
  'Estate Planning',
  'Government Contracting',
  'Family Law',
];

const PA_ICONS = {
  'Federal Trademark (USPTO)':   '®',
  'Personal Injury - TX':        '🚗',
  'Personal Injury - GA':        '🚗',
  'Business Formation':          '🏢',
  'Contract Review and Drafting':'📜',
  'Estate Planning':             '🏛️',
  'Government Contracting':      '🏛',
  'Family Law':                  '⚖️',
};

// ── Style helpers ────────────────────────────────────────────────────────────
const card = (extra = {}) => ({
  background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px',
  padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,.04)', marginBottom: '16px', ...extra,
});

const inputStyle = (isFocused, readOnly = false) => ({
  width: '100%', padding: '10px 12px', fontSize: '14px',
  border: `1.5px solid ${isFocused ? GOLD : '#dee2e6'}`,
  borderRadius: '5px', outline: 'none', fontFamily: 'Inter,sans-serif',
  color: '#1a1a2e', background: readOnly ? '#fffdf0' : '#fff',
  transition: 'border-color .15s', boxSizing: 'border-box',
});

const selectStyle = (isFocused) => ({
  ...inputStyle(isFocused),
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px',
});

const STATUS_BADGE = {
  Draft:    { bg: '#f1f5f9', color: '#64748b' },
  Complete: { bg: '#dcfce7', color: '#166534' },
  Pending:  { bg: '#fef3c7', color: '#92400e' },
};

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.Draft;
  return (
    <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '20px',
      fontSize: '11px', fontWeight: '600', background: s.bg, color: s.color }}>
      {status || 'Draft'}
    </span>
  );
}

// ── Edit Mode Components ──────────────────────────────────────────────────────

function SortableIntakeItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }}>
      {children(listeners, attributes)}
    </div>
  );
}

const SCRIPT_TYPE_COLORS = {
  intro:         { bg: '#dbeafe', color: '#1d4ed8' },
  section_title: { bg: '#f0fdf4', color: '#166534' },
  question:      { bg: '#f8f9fa', color: '#495057' },
  closing:       { bg: '#fef3c7', color: '#7c4a00' },
  sol_note:      { bg: '#fee2e2', color: '#9b2c2c' },
};

const GRIP_SVG = () => (
  <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
    {[[3,3],[9,3],[3,7],[9,7],[3,11],[9,11]].map(([cx,cy],i) => <circle key={i} cx={cx} cy={cy} r="1.5" fill="#adb5bd" />)}
  </svg>
);

function EditPanel({ templates, onClose, initialPracticeArea }) {
  const initialTemplate = initialPracticeArea
    ? (templates.find(t => t.practice_area === initialPracticeArea) || templates[0])
    : templates[0];
  const [selId,   setSelId]   = useState(initialTemplate?.id || null);
  const [scripts, setScripts] = useState([]);
  const [fields,  setFields]  = useState([]);
  const [tab,     setTab]     = useState('scripts');
  const [loading, setLoading] = useState(false);
  const [epToast, setEpToast] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor));
  const epShowToast = (msg, type='success') => { setEpToast({msg,type}); setTimeout(()=>setEpToast(null),2200); };

  const loadTemplate = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/intake/templates/${id}`);
      setScripts(data.scripts || []);
      setFields(data.fields   || []);
    } catch { epShowToast('Failed to load.','error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTemplate(selId); }, [selId]);

  const updateScriptText = (idx, val) => setScripts(ss => ss.map((s,i) => i===idx ? {...s,script_text:val} : s));
  const saveScript = async (s) => {
    try { await axios.put(`/api/intake/scripts/${s.id}`, { script_text: s.script_text }); epShowToast('Saved.'); }
    catch { epShowToast('Save failed.','error'); }
  };
  const addScript = async () => {
    try { const {data} = await axios.post(`/api/intake/templates/${selId}/scripts`, {script_type:'question',script_text:'',script_order:scripts.length}); setScripts(ss=>[...ss,data]); }
    catch { epShowToast('Failed.','error'); }
  };
  const deleteScript = async (id) => {
    try { await axios.delete(`/api/intake/scripts/${id}`); setScripts(ss=>ss.filter(s=>s.id!==id)); }
    catch { epShowToast('Failed.','error'); }
  };
  const handleScriptDragEnd = async ({active,over}) => {
    if (!over||active.id===over.id) return;
    const from=scripts.findIndex(s=>s.id===active.id); const to=scripts.findIndex(s=>s.id===over.id);
    if (from===-1||to===-1) return;
    const newS=arrayMove(scripts,from,to); setScripts(newS);
    try { await axios.put(`/api/intake/templates/${selId}/scripts/reorder`,{script_ids:newS.map(s=>s.id)}); }
    catch { epShowToast('Reorder failed.','error'); }
  };

  const updateField = (idx, key, val) => setFields(fs => fs.map((f,i) => i===idx ? {...f,[key]:val} : f));
  const saveField = async (f) => {
    try { await axios.put(`/api/intake/fields/${f.id}`,{field_label:f.field_label,field_type:f.field_type,is_required:f.is_required}); epShowToast('Saved.'); }
    catch { epShowToast('Save failed.','error'); }
  };
  const addField = async () => {
    try { const {data}=await axios.post(`/api/intake/templates/${selId}/fields`,{field_label:'New Field',field_type:'text',field_order:fields.length}); setFields(fs=>[...fs,data]); }
    catch { epShowToast('Failed.','error'); }
  };
  const deleteField = async (id) => {
    try { await axios.delete(`/api/intake/fields/${id}`); setFields(fs=>fs.filter(f=>f.id!==id)); }
    catch { epShowToast('Failed.','error'); }
  };
  const handleFieldDragEnd = async ({active,over}) => {
    if (!over||active.id===over.id) return;
    const from=fields.findIndex(f=>f.id===active.id); const to=fields.findIndex(f=>f.id===over.id);
    if (from===-1||to===-1) return;
    const newF=arrayMove(fields,from,to); setFields(newF);
    try { await axios.put(`/api/intake/templates/${selId}/fields/reorder`,{field_ids:newF.map(f=>f.id)}); }
    catch { epShowToast('Reorder failed.','error'); }
  };

  const selectedTemplate = templates.find(t=>t.id===selId);

  return (
    <>
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:500}} onClick={onClose} />
      <div style={{position:'fixed',top:0,right:0,bottom:0,width:'920px',background:'#fff',zIndex:501,display:'flex',flexDirection:'column',boxShadow:'-8px 0 40px rgba(0,0,0,.18)'}}>
        <div style={{padding:'14px 24px',borderBottom:'1px solid #e9ecef',display:'flex',alignItems:'center',justifyContent:'space-between',background:NAVY,color:'#fff',flexShrink:0}}>
          <span style={{fontSize:'16px',fontWeight:700,fontFamily:'Playfair Display,Georgia,serif'}}>Edit Intake Templates</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#fff',fontSize:'22px',cursor:'pointer',opacity:.7,lineHeight:1}}>×</button>
        </div>
        <div style={{display:'flex',flex:1,overflow:'hidden'}}>
          <div style={{width:'210px',borderRight:'1px solid #e9ecef',overflowY:'auto',flexShrink:0,background:'#f8f9fa'}}>
            {templates.map(t=>(
              <button key={t.id} onClick={()=>setSelId(t.id)}
                style={{width:'100%',textAlign:'left',padding:'11px 14px',background:t.id===selId?'#fff':'transparent',border:'none',borderLeft:t.id===selId?`3px solid ${GOLD}`:'3px solid transparent',cursor:'pointer',fontSize:'11px',fontWeight:t.id===selId?700:500,color:t.id===selId?NAVY:'#6c757d',lineHeight:'1.4'}}>
                {t.display_name||t.practice_area}
              </button>
            ))}
          </div>
          <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{display:'flex',borderBottom:'2px solid #e9ecef',padding:'0 20px',flexShrink:0}}>
              {['scripts','fields','preview'].map(t=>(
                <button key={t} onClick={()=>setTab(t)}
                  style={{padding:'10px 18px',fontSize:'13px',fontWeight:tab===t?700:500,color:tab===t?NAVY:'#6c757d',background:'none',border:'none',borderBottom:tab===t?`2px solid ${GOLD}`:'2px solid transparent',marginBottom:'-2px',cursor:'pointer',textTransform:'capitalize'}}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
              {loading ? (
                <div style={{textAlign:'center',padding:'40px',color:'#adb5bd'}}>Loading…</div>
              ) : tab==='scripts' ? (
                <>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                    <span style={{fontSize:'12px',color:'#6c757d'}}>{scripts.length} script blocks · drag to reorder · edits auto-save on blur</span>
                    <button onClick={addScript} style={{padding:'5px 12px',background:GOLD,border:'none',borderRadius:'4px',color:'#fff',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>+ Add Block</button>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleScriptDragEnd}>
                    <SortableContext items={scripts.map(s=>s.id)} strategy={verticalListSortingStrategy}>
                      {scripts.map((s,si)=>{
                        const tc=SCRIPT_TYPE_COLORS[s.script_type]||SCRIPT_TYPE_COLORS.question;
                        return (
                          <SortableIntakeItem key={s.id} id={s.id}>
                            {(listeners,attrs)=>(
                              <div style={{background:'#f8f9fa',border:'1px solid #e9ecef',borderRadius:'6px',padding:'10px 12px',marginBottom:'8px',display:'grid',gridTemplateColumns:'auto 1fr auto',gap:'8px',alignItems:'flex-start'}}>
                                <div {...listeners} {...attrs} style={{cursor:'grab',padding:'6px 2px',touchAction:'none',marginTop:'4px'}}><GRIP_SVG /></div>
                                <div>
                                  <span style={{display:'inline-block',fontSize:'10px',fontWeight:700,padding:'1px 6px',borderRadius:10,background:tc.bg,color:tc.color,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'6px'}}>{(s.script_type||'').replace('_',' ')}</span>
                                  <textarea value={s.script_text} onChange={e=>updateScriptText(si,e.target.value)} onBlur={()=>saveScript(scripts[si])}
                                    rows={s.script_type==='question'?2:s.script_type==='section_title'?1:4}
                                    style={{display:'block',width:'100%',padding:'7px 9px',fontSize:'12px',border:'1px solid #dee2e6',borderRadius:'4px',fontFamily:'Inter,sans-serif',resize:'vertical',boxSizing:'border-box'}} />
                                </div>
                                <button onClick={()=>deleteScript(s.id)} style={{background:'none',border:'none',color:'#ced4da',cursor:'pointer',fontSize:'18px',padding:'2px',marginTop:'22px'}} title="Delete">×</button>
                              </div>
                            )}
                          </SortableIntakeItem>
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                </>
              ) : tab==='fields' ? (
                <>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                    <span style={{fontSize:'12px',color:'#6c757d'}}>{fields.length} fields · drag to reorder · edits auto-save on blur</span>
                    <button onClick={addField} style={{padding:'5px 12px',background:GOLD,border:'none',borderRadius:'4px',color:'#fff',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>+ Add Field</button>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'auto 1fr auto auto auto auto',gap:'6px',alignItems:'center',padding:'6px 10px',fontSize:'10px',fontWeight:700,color:'#6c757d',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>
                    <div/><div>Label</div><div>Type</div><div>Req</div><div>Section</div><div/>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
                    <SortableContext items={fields.map(f=>f.id)} strategy={verticalListSortingStrategy}>
                      {fields.map((f,fi)=>(
                        <SortableIntakeItem key={f.id} id={f.id}>
                          {(listeners,attrs)=>(
                            <div style={{display:'grid',gridTemplateColumns:'auto 1fr auto auto auto auto',gap:'6px',alignItems:'center',padding:'7px 10px',background:'#f8f9fa',border:'1px solid #e9ecef',borderRadius:'5px',marginBottom:'5px'}}>
                              <div {...listeners} {...attrs} style={{cursor:'grab',touchAction:'none',padding:'2px'}}><GRIP_SVG /></div>
                              <input value={f.field_label} onChange={e=>updateField(fi,'field_label',e.target.value)} onBlur={()=>saveField(fields[fi])}
                                style={{padding:'5px 8px',fontSize:'12px',border:'1px solid #dee2e6',borderRadius:'4px',fontFamily:'Inter,sans-serif',width:'100%',boxSizing:'border-box'}} />
                              <select value={f.field_type} onChange={e=>updateField(fi,'field_type',e.target.value)} onBlur={()=>saveField(fields[fi])}
                                style={{padding:'5px',fontSize:'12px',border:'1px solid #dee2e6',borderRadius:'4px'}}>
                                {['text','textarea','date','select','tel','email','number'].map(t=><option key={t} value={t}>{t}</option>)}
                              </select>
                              <label style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',color:'#6c757d',cursor:'pointer',whiteSpace:'nowrap'}}>
                                <input type="checkbox" checked={!!f.is_required} onChange={e=>{updateField(fi,'is_required',e.target.checked);saveField({...fields[fi],is_required:e.target.checked});}} />
                              </label>
                              <span style={{fontSize:'10px',color:'#adb5bd',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'80px'}}>{f.field_section||'—'}</span>
                              <button onClick={()=>deleteField(f.id)} style={{background:'none',border:'none',color:'#ced4da',cursor:'pointer',fontSize:'18px',padding:'1px'}}>×</button>
                            </div>
                          )}
                        </SortableIntakeItem>
                      ))}
                    </SortableContext>
                  </DndContext>
                </>
              ) : (
                <div style={{fontSize:'13px',color:'#374151',lineHeight:'1.7'}}>
                  <div style={{fontWeight:700,color:NAVY,marginBottom:'12px',fontSize:'15px'}}>{selectedTemplate?.display_name||selectedTemplate?.practice_area}</div>
                  {scripts.map((s,i)=>{
                    if (s.script_type==='section_title') return <div key={i} style={{fontWeight:700,color:NAVY,marginTop:'14px',marginBottom:'6px',borderBottom:`1px solid ${GOLD}`,paddingBottom:'4px'}}>{s.script_text}</div>;
                    if (s.script_type==='question') {
                      let q=s.script_text,purpose='';
                      try{const p=JSON.parse(s.script_text);q=p.q||s.script_text;purpose=p.purpose||'';}catch{}
                      return <div key={i} style={{marginBottom:'8px',paddingLeft:'12px',borderLeft:'2px solid #e9ecef'}}><div>{q}</div>{purpose&&<div style={{fontSize:'11px',color:'#adb5bd',marginTop:'2px'}}>{purpose}</div>}</div>;
                    }
                    if (s.script_type==='intro'||s.script_type==='closing') return <div key={i} style={{background:'#f8f9fa',borderRadius:'6px',padding:'10px 12px',marginBottom:'10px',whiteSpace:'pre-wrap',fontSize:'12px'}}>{s.script_text}</div>;
                    return null;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        {epToast && <div style={{position:'absolute',bottom:'20px',right:'20px',background:epToast.type==='error'?'#c53030':'#276749',color:'#fff',padding:'10px 16px',borderRadius:'6px',fontSize:'13px',zIndex:10}}>{epToast.msg}</div>}
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function IntakeHub() {
  const { user } = useAuth();
  const [view,              setView]           = useState('grid'); // 'grid' | 'detail' | 'list'
  const [selectedArea,      setSelectedArea]   = useState(null);
  const [step,              setStep]           = useState('script'); // 'script' | 'form'
  const [script,            setScript]         = useState(null);
  const [formFields,        setFormFields]     = useState([]);
  const [formData,          setFormData]       = useState({});
  const [focused,           setFocused]        = useState(null);
  const [contacts,          setContacts]       = useState([]);
  const [intakes,           setIntakes]        = useState([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [useNewContact,     setUseNewContact]  = useState(false);
  const [newContact,        setNewContact]     = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [activeIntakeId,    setActiveIntakeId] = useState(null);
  const [saving,            setSaving]         = useState(false);
  const [exportGenerating,  setExportGenerating] = useState(null); // 'docx' | 'pdf' | null
  const [loading,           setLoading]        = useState(false);
  const [toast,             setToast]          = useState(null);
  const [editMode,          setEditMode]       = useState(false);
  const [editTemplates,     setEditTemplates]  = useState([]);
  const [convertModal,      setConvertModal]   = useState(false);
  const [convertOption,     setConvertOption]  = useState('existing_both'); // 'existing_both' | 'existing_contact_new_matter' | 'new_both'
  const [convertData,       setConvertData]    = useState({ contact_id:'', matter_id:'', matter_name:'', practice_area:'', sol_date:'' });
  const [allMatters,        setAllMatters]     = useState([]);
  const [converting,        setConverting]     = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadIntakes();
    axios.get('/api/contacts', { params: { type: 'client' } })
      .then(r => setContacts(r.data))
      .catch(() => {});
    if (user?.role === 'attorney') {
      axios.get('/api/intake/templates').then(r => setEditTemplates(r.data)).catch(() => {});
    }
  }, [user?.role]);

  const loadIntakes = () => {
    axios.get('/api/intake').then(r => setIntakes(r.data)).catch(() => {});
  };

  const reloadScript = async () => {
    if (!selectedArea) return;
    try {
      const { data } = await axios.get(`/api/intake/scripts/${encodeURIComponent(selectedArea)}`);
      setScript(data);
    } catch {}
  };

  const selectArea = async (area) => {
    setLoading(true);
    setSelectedArea(area);
    setFormData({});
    setActiveIntakeId(null);
    setSelectedContactId('');
    setUseNewContact(false);
    setNewContact({ first_name: '', last_name: '', email: '', phone: '' });
    try {
      const [sc, ff] = await Promise.all([
        axios.get(`/api/intake/scripts/${encodeURIComponent(area)}`),
        axios.get(`/api/intake/form-fields/${encodeURIComponent(area)}`),
      ]);
      setScript(sc.data);
      setFormFields(ff.data);
    } catch {
      showToast('Failed to load intake data.', 'error');
    } finally {
      setLoading(false);
    }
    setStep('script');
    setView('detail');
  };

  const handleFieldChange = (name, value) => {
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Auto-compute SOL deadline for PI matters
      if (name === 'accidentDate' && value) {
        const sol = new Date(value);
        sol.setFullYear(sol.getFullYear() + 2);
        updated.solDeadline = sol.toISOString().split('T')[0];
      }
      return updated;
    });
  };

  const saveIntake = async () => {
    if (!selectedContactId && !useNewContact) {
      showToast('Select or create a client contact first.', 'error');
      return;
    }
    if (useNewContact && (!newContact.first_name.trim() || !newContact.last_name.trim())) {
      showToast('New contact requires first and last name.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        practice_area:            selectedArea,
        form_data:                formData,
        conflict_check_completed: formData.conflictCheckCompleted || false,
        conflict_check_cleared:   formData.conflictCheckCleared   || false,
      };
      if (useNewContact) { payload.newContact = newContact; }
      else               { payload.contact_id = selectedContactId; }

      if (activeIntakeId) {
        await axios.put(`/api/intake/${activeIntakeId}`, payload);
        showToast('Intake updated.');
      } else {
        const r = await axios.post('/api/intake', payload);
        setActiveIntakeId(r.data.id);
        showToast('Intake saved.');
      }
      loadIntakes();
    } catch {
      showToast('Failed to save intake.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format) => {
    if (!activeIntakeId) {
      showToast('Save the intake first before exporting.', 'error');
      return;
    }
    setExportGenerating(format);
    try {
      const { data: result } = await axios.post('/api/doc-library/generate-intake', {
        intakeId: activeIntakeId,
        format,
      });
      showToast(`Intake summary generated — downloading…`);
      const { data: blob } = await axios.get(`/api/doc-library/download/${result.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.response?.data?.error || 'Export failed.', 'error');
    } finally {
      setExportGenerating(null);
    }
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      let contactId = convertData.contact_id || selectedContactId;

      if (convertOption === 'new_both') {
        // Create new contact from form data
        const { data: newC } = await axios.post('/api/contacts', {
          first_name: formData.clientFirstName || (formData.clientName?.split(' ')[0] || 'New'),
          last_name:  formData.clientLastName  || (formData.clientName?.split(' ').slice(1).join(' ') || 'Contact'),
          email:      formData.clientEmail || formData.email || null,
          phone:      formData.clientPhone || formData.phone || null,
          contact_type: 'client',
        });
        contactId = newC.id;
      }

      if (convertOption === 'existing_both' && convertData.matter_id) {
        // Just log activity linking intake to existing matter
        await axios.post('/api/activity', {
          event_type: 'intake_linked',
          description: `Intake #${activeIntakeId} linked to matter`,
          matter_id: convertData.matter_id,
          contact_id: contactId || null,
        });
        showToast('Intake linked to matter.');
      } else {
        // Create new matter
        const { data: numRes } = await axios.get('/api/matters/next-number');
        const { data: newM } = await axios.post('/api/matters', {
          matter_name:   convertData.matter_name || `${selectedArea} Matter`,
          matter_number: numRes.number,
          practice_area: convertData.practice_area || selectedArea,
          status:        'open',
          sol_date:      convertData.sol_date || null,
          client_id:     contactId || null,
          open_date:     new Date().toISOString().slice(0, 10),
        });
        await axios.post('/api/activity', {
          event_type: 'matter_created_from_intake',
          description: `Matter created from Intake #${activeIntakeId}`,
          matter_id: newM.id,
          contact_id: contactId || null,
        });
        showToast(`Matter "${newM.matter_name}" created!`);
      }

      setConvertModal(false);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create matter.', 'error');
    } finally {
      setConverting(false);
    }
  };

  const ConvertModal = () => !convertModal ? null : (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:500 }} onClick={() => setConvertModal(false)} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:520, maxWidth:'95vw', background:'#fff', borderRadius:'10px', boxShadow:'0 8px 40px rgba(0,0,0,.2)', zIndex:501, overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #e9ecef', background:NAVY }}>
          <h3 style={{ margin:0, fontSize:'16px', fontWeight:'600', color:'#fff' }}>Create Matter from Intake</h3>
          <p style={{ margin:'4px 0 0', fontSize:'12px', color:'rgba(255,255,255,.65)' }}>Choose how to link this intake to a matter and contact</p>
        </div>
        <div style={{ padding:'20px 24px' }}>
          {/* Option selector */}
          {[
            ['existing_both',                 'Link to existing contact + existing matter'],
            ['existing_contact_new_matter',   'Link to existing contact + create new matter'],
            ['new_both',                      'Create new contact & new matter from intake data'],
          ].map(([val, label]) => (
            <label key={val} style={{ display:'flex', alignItems:'flex-start', gap:'10px', marginBottom:'12px', cursor:'pointer' }}>
              <input type="radio" value={val} checked={convertOption===val} onChange={() => setConvertOption(val)}
                style={{ marginTop:'2px', accentColor:GOLD }} />
              <span style={{ fontSize:'13px', color:NAVY, fontWeight:convertOption===val?'600':'400' }}>{label}</span>
            </label>
          ))}

          <div style={{ borderTop:'1px solid #f1f3f5', marginTop:'4px', paddingTop:'16px', display:'grid', gap:'12px' }}>
            {/* Contact selector (not shown for new_both since auto-created) */}
            {convertOption !== 'new_both' && (
              <div>
                <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'4px' }}>
                  {convertOption === 'existing_both' ? 'Contact *' : 'Existing Contact'}
                </label>
                <select value={convertData.contact_id} onChange={e => setConvertData(p=>({...p,contact_id:e.target.value}))}
                  style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #dee2e6', borderRadius:'5px', fontSize:'13px', appearance:'none', outline:'none' }}>
                  <option value="">— Select contact —</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.company?` (${c.company})`:''}</option>)}
                </select>
              </div>
            )}
            {/* Existing matter selector (only for existing_both) */}
            {convertOption === 'existing_both' && (
              <div>
                <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'4px' }}>Existing Matter *</label>
                <select value={convertData.matter_id} onChange={e => setConvertData(p=>({...p,matter_id:e.target.value}))}
                  style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #dee2e6', borderRadius:'5px', fontSize:'13px', appearance:'none', outline:'none' }}>
                  <option value="">— Select matter —</option>
                  {allMatters.map(m => <option key={m.id} value={m.id}>{m.matter_number} — {m.matter_name}</option>)}
                </select>
              </div>
            )}
            {/* New matter fields */}
            {convertOption !== 'existing_both' && (
              <>
                <div>
                  <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'4px' }}>Matter Name *</label>
                  <input value={convertData.matter_name} onChange={e => setConvertData(p=>({...p,matter_name:e.target.value}))}
                    style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #dee2e6', borderRadius:'5px', fontSize:'13px', outline:'none', boxSizing:'border-box' }}
                    onFocus={e=>e.target.style.borderColor=GOLD} onBlur={e=>e.target.style.borderColor='#dee2e6'}
                    placeholder="e.g. Smith v. Acme Corp" />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                  <div>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'4px' }}>Practice Area</label>
                    <input value={convertData.practice_area} onChange={e => setConvertData(p=>({...p,practice_area:e.target.value}))}
                      style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #dee2e6', borderRadius:'5px', fontSize:'13px', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'4px' }}>SOL Date</label>
                    <input type="date" value={convertData.sol_date} onChange={e => setConvertData(p=>({...p,sol_date:e.target.value}))}
                      style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #dee2e6', borderRadius:'5px', fontSize:'13px', outline:'none', boxSizing:'border-box' }} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div style={{ padding:'14px 24px', borderTop:'1px solid #e9ecef', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
          <button onClick={() => setConvertModal(false)} style={{ padding:'8px 18px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'5px', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
          <button onClick={handleConvert} disabled={converting}
            style={{ padding:'8px 22px', background:converting?'#d4b878':GOLD, border:'none', borderRadius:'5px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:converting?'not-allowed':'pointer' }}>
            {converting ? 'Creating…' : 'Confirm'}
          </button>
        </div>
      </div>
    </>
  );

  const Toast = () => toast ? (
    <div style={{ position: 'fixed', bottom: '28px', right: '28px', zIndex: 400,
      background: toast.type === 'error' ? '#c53030' : '#276749', color: '#fff',
      padding: '12px 20px', borderRadius: '7px', fontSize: '14px', fontWeight: '500',
      boxShadow: '0 4px 16px rgba(0,0,0,.2)', animation: 'slideUp .2s ease' }}>
      {toast.message}
    </div>
  ) : null;

  // ── DETAIL VIEW ─────────────────────────────────────────────────────────────
  if (view === 'detail' && selectedArea) {
    return (
      <Layout>
        <div style={{ padding: '32px 40px', maxWidth: '1100px' }}>
          {/* Back + header */}
          <button onClick={() => { setView('grid'); setSelectedArea(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none',
              border: 'none', color: '#6c757d', fontSize: '13px', cursor: 'pointer',
              padding: '0 0 14px', fontFamily: 'Inter,sans-serif' }}
            onMouseEnter={e => e.currentTarget.style.color = NAVY}
            onMouseLeave={e => e.currentTarget.style.color = '#6c757d'}>
            ← Back to Intake Hub
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '600', color: NAVY,
                fontFamily: 'Playfair Display,Georgia,serif', margin: '0 0 4px' }}>
                {selectedArea} Intake
              </h1>
              <p style={{ color: '#6c757d', fontSize: '13px', margin: 0 }}>
                {PA_ICONS[selectedArea]} Complete the intake script, then fill in the form
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Step tabs */}
              <div style={{ display: 'flex', gap: '4px', background: '#f1f3f5', borderRadius: '8px', padding: '4px' }}>
                {[
                  { id: 'script', label: '📋 Intake Script' },
                  { id: 'form',   label: '📝 Intake Form' },
                ].map(t => (
                  <button key={t.id} onClick={() => setStep(t.id)} style={{
                    padding: '7px 16px', borderRadius: '6px', border: 'none', fontSize: '13px',
                    fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter,sans-serif',
                    transition: 'all .15s',
                    background: step === t.id ? '#fff' : 'transparent',
                    color:      step === t.id ? NAVY : '#6c757d',
                    boxShadow:  step === t.id ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                  }}>{t.label}</button>
                ))}
              </div>
              {user?.role === 'attorney' && editTemplates.length > 0 && (
                <button onClick={() => setEditMode(true)}
                  style={{ padding: '7px 14px', background: '#fff', border: `1px solid ${NAVY}`, borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: NAVY, fontFamily: 'Inter,sans-serif', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f2f5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit Script
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#adb5bd', fontSize: '14px' }}>
              Loading intake data…
            </div>
          )}

          {/* ── SCRIPT TAB ─────────────────────────────────────────── */}
          {!loading && step === 'script' && script && (
            <div>
              {/* SOL warning */}
              {script.solNote && (
                <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px',
                  padding: '14px 16px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#9b2c2c', margin: 0 }}>
                    ⚠️ {script.solNote}
                  </p>
                </div>
              )}

              {/* Opening script */}
              <div style={card({ borderLeft: `4px solid ${GOLD}` })}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: NAVY, margin: '0 0 12px' }}>
                  Opening Script
                </h3>
                <p style={{ fontSize: '13px', color: '#495057', lineHeight: '1.75',
                  whiteSpace: 'pre-line', margin: 0 }}>
                  {script.intro}
                </p>
              </div>

              {/* Question sections */}
              {script.sections?.map((section, si) => (
                <div key={si} style={card()}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: NAVY, margin: '0 0 14px' }}>
                    {section.title}
                  </h3>
                  {section.questions.map((q, qi) => (
                    <div key={qi} style={{ background: '#f8f9fa', borderRadius: '6px',
                      padding: '12px 14px', marginBottom: qi < section.questions.length - 1 ? '10px' : 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#212529',
                        margin: '0 0 4px', lineHeight: '1.5' }}>
                        Q{qi + 1}: {q.q}
                      </p>
                      <p style={{ fontSize: '11px', color: '#adb5bd', fontStyle: 'italic', margin: 0 }}>
                        Purpose: {q.purpose}
                      </p>
                    </div>
                  ))}
                </div>
              ))}

              {/* Closing script */}
              {script.closing && (
                <div style={card({ borderLeft: `4px solid ${NAVY}` })}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: NAVY, margin: '0 0 12px' }}>
                    Closing Script
                  </h3>
                  <p style={{ fontSize: '13px', color: '#495057', lineHeight: '1.75',
                    whiteSpace: 'pre-line', margin: 0 }}>
                    {script.closing}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => setStep('form')} style={{ padding: '10px 22px', background: GOLD,
                  border: 'none', borderRadius: '6px', color: '#fff', fontSize: '14px', fontWeight: '600',
                  cursor: 'pointer', fontFamily: 'Inter,sans-serif',
                  boxShadow: '0 2px 8px rgba(201,168,76,.35)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#b8943d'}
                  onMouseLeave={e => e.currentTarget.style.background = GOLD}>
                  Continue to Intake Form →
                </button>
              </div>
            </div>
          )}

          {/* ── FORM TAB ───────────────────────────────────────────── */}
          {!loading && step === 'form' && (
            <div>
              {/* Client selection */}
              <div style={card()}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: NAVY, margin: '0 0 14px' }}>Client</h3>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '14px' }}>
                  {[
                    { value: false, label: 'Existing contact' },
                    { value: true,  label: 'New contact' },
                  ].map(opt => (
                    <label key={String(opt.value)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px',
                        cursor: 'pointer', fontSize: '13px', color: '#495057' }}>
                      <input type="radio" checked={useNewContact === opt.value}
                        onChange={() => setUseNewContact(opt.value)}
                        style={{ accentColor: GOLD, cursor: 'pointer' }} />
                      {opt.label}
                    </label>
                  ))}
                </div>

                {!useNewContact ? (
                  <select value={selectedContactId}
                    onChange={e => setSelectedContactId(e.target.value)}
                    style={selectStyle(focused === '__contact')}
                    onFocus={() => setFocused('__contact')}
                    onBlur={() => setFocused(null)}>
                    <option value="">— Select existing client contact —</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}{c.email ? ` — ${c.email}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { name: 'first_name', label: 'First Name', type: 'text' },
                      { name: 'last_name',  label: 'Last Name',  type: 'text' },
                      { name: 'email',      label: 'Email',      type: 'email' },
                      { name: 'phone',      label: 'Phone',      type: 'tel' },
                    ].map(f => (
                      <div key={f.name}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '500',
                          color: '#555', marginBottom: '5px' }}>{f.label}</label>
                        <input type={f.type} value={newContact[f.name] || ''}
                          onChange={e => setNewContact(p => ({ ...p, [f.name]: e.target.value }))}
                          style={inputStyle(focused === `__nc_${f.name}`)}
                          onFocus={() => setFocused(`__nc_${f.name}`)}
                          onBlur={() => setFocused(null)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic form sections */}
              {formFields.map((section, si) => (
                <div key={si} style={card()}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: NAVY, margin: '0 0 14px' }}>
                    {section.section}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {section.fields.map(field => (
                      <div key={field.name}
                        style={{ gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '500',
                          color: '#555', marginBottom: '5px' }}>
                          {field.label}
                          {field.required && <span style={{ color: '#c53030', marginLeft: '3px' }}>*</span>}
                          {field.solField && (
                            <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: '700',
                              background: '#fee2e2', color: '#c53030', padding: '1px 6px',
                              borderRadius: '10px', letterSpacing: '.03em' }}>SOL</span>
                          )}
                        </label>

                        {field.type === 'textarea' ? (
                          <textarea rows={3} value={formData[field.name] || ''}
                            onChange={e => handleFieldChange(field.name, e.target.value)}
                            readOnly={field.readOnly}
                            style={{ ...inputStyle(focused === field.name, field.readOnly),
                              resize: 'vertical', minHeight: '72px' }}
                            onFocus={() => setFocused(field.name)}
                            onBlur={() => setFocused(null)} />

                        ) : field.type === 'select' ? (
                          <select value={formData[field.name] || ''}
                            onChange={e => handleFieldChange(field.name, e.target.value)}
                            style={selectStyle(focused === field.name)}
                            onFocus={() => setFocused(field.name)}
                            onBlur={() => setFocused(null)}>
                            <option value="">Select…</option>
                            {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>

                        ) : (
                          <input type={field.type || 'text'}
                            value={formData[field.name] || ''}
                            onChange={e => handleFieldChange(field.name, e.target.value)}
                            readOnly={field.readOnly}
                            placeholder={field.readOnly ? 'Auto-calculated' : ''}
                            style={inputStyle(focused === field.name, field.readOnly)}
                            onFocus={() => setFocused(field.name)}
                            onBlur={() => setFocused(null)} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Conflict check */}
              <div style={card({ borderLeft: `4px solid ${GOLD}` })}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: NAVY, margin: '0 0 8px' }}>
                  ⚠️ Conflict Check
                </h3>
                <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '14px' }}>
                  Before proceeding, confirm no conflict of interest exists. Check all parties against existing clients and matters.
                </p>
                <div style={{ display: 'flex', gap: '28px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', fontSize: '13px', color: '#495057' }}>
                    <input type="checkbox"
                      checked={formData.conflictCheckCompleted || false}
                      onChange={e => handleFieldChange('conflictCheckCompleted', e.target.checked)}
                      style={{ accentColor: GOLD, cursor: 'pointer' }} />
                    Conflict check completed
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', fontSize: '13px', color: '#166534', fontWeight: '600' }}>
                    <input type="checkbox"
                      checked={formData.conflictCheckCleared || false}
                      onChange={e => handleFieldChange('conflictCheckCleared', e.target.checked)}
                      style={{ accentColor: GOLD, cursor: 'pointer' }} />
                    Cleared — no conflicts identified
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <button onClick={saveIntake} disabled={saving}
                  style={{ padding: '10px 24px', background: saving ? '#2d4a7a' : NAVY, border: 'none',
                    borderRadius: '6px', color: '#fff', fontSize: '14px', fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Inter,sans-serif',
                    opacity: saving ? .8 : 1 }}>
                  {saving ? 'Saving…' : activeIntakeId ? 'Update Intake' : 'Save Intake'}
                </button>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!activeIntakeId && (
                    <span style={{ fontSize: '11px', color: '#adb5bd' }}>
                      Save intake first to export
                    </span>
                  )}
                  {[
                    { format: 'docx', label: '📄 Word (.docx)' },
                    { format: 'pdf',  label: '📋 PDF' },
                  ].map(({ format, label }) => {
                    const isGenerating = exportGenerating === format;
                    const isDisabled   = !activeIntakeId || !!exportGenerating;
                    return (
                      <button key={format}
                        onClick={() => handleExport(format)}
                        disabled={isDisabled}
                        style={{
                          padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '500',
                          fontFamily: 'Inter,sans-serif', transition: 'all .15s', cursor: isDisabled ? 'not-allowed' : 'pointer',
                          background: isDisabled ? '#f1f3f5' : '#fff',
                          border: `1px solid ${isDisabled ? '#dee2e6' : NAVY}`,
                          color: isDisabled ? '#adb5bd' : NAVY,
                          opacity: isDisabled ? .6 : 1,
                        }}
                        onMouseEnter={e => { if (!isDisabled) { e.currentTarget.style.background = NAVY; e.currentTarget.style.color = '#fff'; } }}
                        onMouseLeave={e => { if (!isDisabled) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = NAVY; } }}>
                        {isGenerating ? 'Generating…' : label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeIntakeId && (
                <div style={{ display:'flex', alignItems:'center', gap:'12px', marginTop:'10px', flexWrap:'wrap' }}>
                  <p style={{ fontSize: '12px', color: '#6c757d', margin:0 }}>
                    ✓ Intake #{activeIntakeId} saved.
                  </p>
                  <button
                    onClick={() => {
                      setConvertOption('existing_contact_new_matter');
                      setConvertData({
                        contact_id: selectedContactId || '',
                        matter_id: '',
                        matter_name: formData.clientName ? `${formData.clientName} — ${selectedArea}` : selectedArea || '',
                        practice_area: selectedArea || '',
                        sol_date: formData.solDeadline || '',
                      });
                      axios.get('/api/matters').then(r => setAllMatters(r.data)).catch(()=>{});
                      setConvertModal(true);
                    }}
                    style={{ padding:'6px 14px', background:GOLD, border:'none', borderRadius:'5px', color:'#fff', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
                    + Create Matter from Intake
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {editMode && editTemplates.length > 0 && (
          <EditPanel
            templates={editTemplates}
            initialPracticeArea={selectedArea}
            onClose={() => { setEditMode(false); reloadScript(); }}
          />
        )}
        <ConvertModal />
        <Toast />
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </Layout>
    );
  }

  // ── GRID / LIST VIEW ─────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ padding: '36px 40px', maxWidth: '1200px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '600', color: NAVY,
              fontFamily: 'Playfair Display,Georgia,serif', margin: '0 0 4px' }}>
              Intake Hub
            </h1>
            <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
              {view === 'list'
                ? `${intakes.length} saved intake${intakes.length !== 1 ? 's' : ''}`
                : 'Select a practice area to begin — script and intake form included'}
            </p>
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            {user?.role === 'attorney' && editTemplates.length > 0 && (
              <button onClick={() => setEditMode(true)}
                style={{ padding:'9px 16px', background:'#fff', border:`1px solid ${NAVY}`, borderRadius:'6px', fontSize:'13px', fontWeight:'600', cursor:'pointer', color:NAVY, fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:'6px' }}
                onMouseEnter={e=>e.currentTarget.style.background='#f0f2f5'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit Intake
              </button>
            )}
            <button onClick={() => setView(view === 'list' ? 'grid' : 'list')}
              style={{ padding: '9px 18px', background: '#f1f3f5', border: '1px solid #dee2e6',
                borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                fontFamily: 'Inter,sans-serif', color: '#495057' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e9ecef'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f1f3f5'; }}>
              {view === 'list' ? '← Practice Area Grid' : `View All Intakes (${intakes.length})`}
            </button>
          </div>
        </div>

        {/* ── LIST VIEW ─────────────────────────────────────────── */}
        {view === 'list' ? (
          <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px',
            overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            {intakes.length === 0 ? (
              <div style={{ padding: '80px 40px', textAlign: 'center', color: '#ced4da' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>No intakes saved yet</div>
                <div style={{ fontSize: '13px' }}>Select a practice area from the grid to start your first intake.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                    {['Client', 'Practice Area', 'Status', 'Conflict Check', 'Date Saved'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px',
                        fontWeight: '600', color: '#6c757d', letterSpacing: '.06em',
                        textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {intakes.map((row, i) => (
                    <tr key={row.id}
                      style={{ borderBottom: i < intakes.length - 1 ? '1px solid #f1f3f5' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 16px', fontWeight: '500', color: NAVY }}>
                        {row.first_name
                          ? `${row.first_name} ${row.last_name}`
                          : <span style={{ color: '#ced4da' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6c757d' }}>
                        {PA_ICONS[row.practice_area]} {row.practice_area}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={row.status} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                        {row.conflict_check_cleared
                          ? <span style={{ color: '#166534', fontWeight: '600' }}>✓ Cleared</span>
                          : row.conflict_check_completed
                          ? <span style={{ color: GOLD }}>Completed</span>
                          : <span style={{ color: '#ced4da' }}>Pending</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6c757d' }}>
                        {new Date(row.created_at).toLocaleDateString('en-US',
                          { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        ) : (
          /* ── GRID VIEW ─────────────────────────────────────────── */
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {PRACTICE_AREAS.map(area => (
                <button key={area} onClick={() => selectArea(area)}
                  style={{ textAlign: 'left', background: '#fff', border: '1px solid #e9ecef',
                    borderRadius: '10px', padding: '22px 20px', cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,.04)', transition: 'all .15s',
                    fontFamily: 'Inter,sans-serif' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = GOLD;
                    e.currentTarget.style.boxShadow = `0 4px 16px rgba(201,168,76,.2)`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e9ecef';
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.04)';
                    e.currentTarget.style.transform = 'none';
                  }}>
                  <div style={{ fontSize: '30px', marginBottom: '12px' }}>{PA_ICONS[area] || '⚖️'}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: NAVY,
                    marginBottom: '6px', lineHeight: '1.3' }}>{area}</div>
                  <div style={{ fontSize: '11px', color: '#adb5bd' }}>Script + intake form included</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {editMode && editTemplates.length > 0 && (
        <EditPanel templates={editTemplates} onClose={() => setEditMode(false)} />
      )}
      <Toast />
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Layout>
  );
}
