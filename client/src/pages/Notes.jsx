import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}) : '—';

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matters, setMatters] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [filterMatter, setFilterMatter] = useState('');
  const [filterContact, setFilterContact] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ content:'', matter_id:'', contact_id:'' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);
  const [visible, setVis] = useState(false);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterMatter)  params.matter_id  = filterMatter;
      if (filterContact) params.contact_id = filterContact;
      const { data } = await axios.get('/api/notes', { params });
      setNotes(data);
    } catch { showToast('Failed to load notes.','error'); }
    finally { setLoading(false); }
  }, [filterMatter, filterContact]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  useEffect(() => {
    Promise.all([
      axios.get('/api/matters'),
      axios.get('/api/contacts'),
    ]).then(([m,c]) => { setMatters(m.data); setContacts(c.data); }).catch(()=>{});
  }, []);

  const openForm = () => {
    setForm({ content:'', matter_id:'', contact_id:'' });
    setFormOpen(true);
    setTimeout(() => setVis(true), 20);
  };

  const closeForm = () => {
    setVis(false);
    setTimeout(() => setFormOpen(false), 280);
  };

  const handleSave = async () => {
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      await axios.post('/api/notes', { content: form.content, matter_id: form.matter_id||null, contact_id: form.contact_id||null });
      closeForm();
      fetchNotes();
      showToast('Note saved.');
    } catch { showToast('Failed to save note.','error'); }
    finally { setSaving(false); }
  };

  const startEdit = (n) => {
    setEditId(n.id);
    setEditText(n.content);
    setDeleteId(null);
  };

  const saveEdit = async (id) => {
    setEditSaving(true);
    try {
      await axios.put(`/api/notes/${id}`, { content: editText });
      setEditId(null);
      fetchNotes();
      showToast('Note updated.');
    } catch { showToast('Failed to update note.','error'); }
    finally { setEditSaving(false); }
  };

  const deleteNote = async (id) => {
    try {
      await axios.delete(`/api/notes/${id}`);
      setDeleteId(null);
      setNotes(prev => prev.filter(n => n.id !== id));
      showToast('Note deleted.');
    } catch { showToast('Failed to delete note.','error'); }
  };

  const matterOptions = matters.map(m => ({ value: m.id, label: m.matter_name, sublabel: m.matter_number }));
  const contactOptions = contacts.map(c => ({ value: c.id, label: `${c.first_name} ${c.last_name}`.trim(), sublabel: c.company || c.email || '' }));

  return (
    <Layout>
      <div style={{ padding:'32px 40px', maxWidth:'900px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px' }}>
          <div>
            <h1 style={{ fontSize:'26px', fontWeight:'600', color:NAVY, fontFamily:'Playfair Display,Georgia,serif', margin:0 }}>Notes</h1>
            <p style={{ color:'#6c757d', fontSize:'14px', marginTop:'4px' }}>
              {loading ? 'Loading…' : `${notes.length} note${notes.length!==1?'s':''}`}
            </p>
          </div>
          <button onClick={openForm}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 20px', background:GOLD, border:'none', borderRadius:'6px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer', boxShadow:'0 2px 8px rgba(201,168,76,.35)' }}
            onMouseEnter={e=>e.currentTarget.style.background='#b8943d'} onMouseLeave={e=>e.currentTarget.style.background=GOLD}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Note
          </button>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
          <div style={{ minWidth:'220px', flex:1 }}>
            <SearchableSelect
              value={filterMatter}
              onChange={v => setFilterMatter(v)}
              options={matterOptions}
              placeholder="Filter by matter…"
            />
          </div>
          <div style={{ minWidth:'220px', flex:1 }}>
            <SearchableSelect
              value={filterContact}
              onChange={v => setFilterContact(v)}
              options={contactOptions}
              placeholder="Filter by contact…"
            />
          </div>
          {(filterMatter || filterContact) && (
            <button onClick={() => { setFilterMatter(''); setFilterContact(''); }}
              style={{ background:'none', border:'none', color:'#6c757d', fontSize:'13px', cursor:'pointer', textDecoration:'underline', padding:'0 4px' }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Notes list */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#adb5bd', fontSize:'14px' }}>Loading notes…</div>
        ) : notes.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 40px', background:'#fff', borderRadius:'10px', border:'1px solid #e9ecef' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dee2e6" strokeWidth="1.2" style={{ marginBottom:'16px' }}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            <h3 style={{ fontSize:'16px', fontWeight:'600', color:'#adb5bd', margin:'0 0 6px' }}>No notes yet</h3>
            <p style={{ color:'#ced4da', fontSize:'14px', margin:'0 0 20px' }}>Create your first note to keep track of important information.</p>
            <button onClick={openForm}
              style={{ padding:'9px 20px', background:GOLD, border:'none', borderRadius:'6px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>
              + New Note
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gap:'12px' }}>
            {notes.map(n => (
              <div key={n.id}
                style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'8px', padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                {editId === n.id ? (
                  <div>
                    <textarea value={editText} onChange={e=>setEditText(e.target.value)}
                      style={{ width:'100%', padding:'9px 12px', fontSize:'13px', border:`1.5px solid ${GOLD}`, borderRadius:'6px', outline:'none', resize:'vertical', minHeight:'80px', boxSizing:'border-box', fontFamily:'Inter,sans-serif' }}
                      autoFocus />
                    <div style={{ display:'flex', gap:'8px', marginTop:'8px', justifyContent:'flex-end' }}>
                      <button onClick={() => setEditId(null)} style={{ padding:'5px 12px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'4px', fontSize:'12px', cursor:'pointer' }}>Cancel</button>
                      <button onClick={() => saveEdit(n.id)} disabled={editSaving||!editText.trim()}
                        style={{ padding:'5px 14px', background:GOLD, border:'none', borderRadius:'4px', color:'#fff', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
                        {editSaving?'Saving…':'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize:'14px', color:'#212529', lineHeight:'1.6', whiteSpace:'pre-wrap', marginBottom:'10px' }}>{n.content}</div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
                      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                        {n.matter_name && (
                          <a href={`/matters/${n.matter_id}`}
                            style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'11px', color:NAVY, background:'#e8edf5', padding:'2px 8px', borderRadius:'12px', textDecoration:'none', fontWeight:'600' }}>
                            {n.matter_number} {n.matter_name}
                          </a>
                        )}
                        {n.contact_name?.trim() && (
                          <span style={{ fontSize:'11px', color:'#6c757d', background:'#f1f3f5', padding:'2px 8px', borderRadius:'12px' }}>{n.contact_name}</span>
                        )}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <span style={{ fontSize:'11px', color:'#adb5bd' }}>{n.author_name} · {fmtDate(n.created_at)}</span>
                        {(user?.role === 'attorney' || n.created_by === user?.id) && (
                          <>
                            {deleteId === n.id ? (
                              <span style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                                <span style={{ fontSize:'11px', color:'#c53030' }}>Delete?</span>
                                <button onClick={() => deleteNote(n.id)} style={{ padding:'2px 8px', background:'#c53030', border:'none', borderRadius:'3px', color:'#fff', fontSize:'11px', cursor:'pointer' }}>Yes</button>
                                <button onClick={() => setDeleteId(null)} style={{ padding:'2px 6px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'3px', fontSize:'11px', cursor:'pointer' }}>No</button>
                              </span>
                            ) : (
                              <>
                                <button onClick={() => startEdit(n)}
                                  style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'4px', padding:'3px 8px', cursor:'pointer', fontSize:'11px', color:'#6c757d' }}
                                  onMouseEnter={e=>{e.currentTarget.style.borderColor=NAVY;e.currentTarget.style.color=NAVY;}}
                                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#dee2e6';e.currentTarget.style.color='#6c757d';}}>
                                  Edit
                                </button>
                                <button onClick={() => setDeleteId(n.id)}
                                  style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'4px', padding:'3px 8px', cursor:'pointer', fontSize:'11px', color:'#6c757d' }}
                                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#c53030';e.currentTarget.style.color='#c53030';}}
                                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#dee2e6';e.currentTarget.style.color='#6c757d';}}>
                                  Delete
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Note Slide-in */}
      {formOpen && (
        <>
          <div onClick={closeForm} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:200, opacity:visible?1:0, transition:'opacity .25s' }} />
          <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'460px', background:'#fff', zIndex:201, display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,.15)', transform:visible?'translateX(0)':'translateX(100%)', transition:'transform .28s cubic-bezier(.4,0,.2,1)' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #e9ecef', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <h2 style={{ fontSize:'18px', fontWeight:'600', color:NAVY, margin:0 }}>New Note</h2>
              <button onClick={closeForm} style={{ background:'none', border:'none', cursor:'pointer', color:'#adb5bd', padding:'4px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'24px' }}>
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'5px' }}>Note <span style={{color:'#c0392b'}}>*</span></label>
                <textarea value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))}
                  placeholder="Write your note…"
                  autoFocus
                  style={{ width:'100%', padding:'10px 12px', fontSize:'13px', border:'1.5px solid #dee2e6', borderRadius:'5px', outline:'none', resize:'vertical', minHeight:'120px', boxSizing:'border-box', fontFamily:'Inter,sans-serif' }}
                  onFocus={e=>e.target.style.borderColor=GOLD} onBlur={e=>e.target.style.borderColor='#dee2e6'} />
              </div>
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'5px' }}>Linked Matter</label>
                <SearchableSelect value={form.matter_id} onChange={v=>setForm(p=>({...p,matter_id:v}))} options={matterOptions} placeholder="— None —" />
              </div>
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'5px' }}>Linked Contact</label>
                <SearchableSelect value={form.contact_id} onChange={v=>setForm(p=>({...p,contact_id:v}))} options={contactOptions} placeholder="— None —" />
              </div>
            </div>
            <div style={{ padding:'16px 24px', borderTop:'1px solid #e9ecef', display:'flex', gap:'10px', justifyContent:'flex-end', flexShrink:0 }}>
              <button onClick={closeForm} style={{ padding:'9px 20px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'5px', fontSize:'14px', cursor:'pointer', color:'#495057' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving||!form.content.trim()}
                style={{ padding:'9px 24px', background:saving?'#d4b878':GOLD, border:'none', borderRadius:'5px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:saving?'not-allowed':'pointer' }}>
                {saving?'Saving…':'Save Note'}
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
