import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const DOC_TYPES = ['Pleading','Contract','Correspondence','Evidence','Client Document','Court Order','Discovery','Medical Record','Financial Record','Other'];

const fmtSize = (b) => { if(!b) return '—'; if(b<1024) return b+'B'; if(b<1048576) return (b/1024).toFixed(1)+'KB'; return (b/1048576).toFixed(1)+'MB'; };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';

const FileIcon = ({ mime }) => {
  const c = mime?.includes('pdf') ? '#c53030' : mime?.includes('word') ? '#1B4FBE' : mime?.includes('image') ? '#0E7B4A' : '#6c757d';
  const t = mime?.includes('pdf') ? 'PDF' : mime?.includes('word') ? 'DOC' : mime?.includes('image') ? 'IMG' : 'FILE';
  return <span style={{ fontFamily:'monospace', fontSize:'10px', fontWeight:'700', color:c, background:`${c}15`, padding:'2px 5px', borderRadius:'3px', letterSpacing:'.04em' }}>{t}</span>;
};

export default function Documents() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [docs,     setDocs]   = useState([]);
  const [matters,  setMat]    = useState([]);
  const [loading,  setLoad]   = useState(true);
  const [filter,   setFilt]   = useState('');
  const [search,   setSearch] = useState('');
  const [formOpen, setForm]   = useState(false);
  const [deleteId, setDel]    = useState(null);
  const [toast,    setToast]  = useState(null);
  const [uploading,setUp]     = useState(false);
  const [uploadForm, setUF]   = useState({ document_name:'', document_type:'', matter_id:'' });
  const [uploadErr,  setUE]   = useState('');
  const [visible,  setVis]    = useState(false);
  const [focused,  setFoc]    = useState(null);
  const [folders,  setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null); // null = All, 'matter' = by matter, folder id = specific folder
  const [folderForm, setFolderForm] = useState(false);
  const [folderName, setFolderName] = useState('');
  const fileRef = useRef(null);
  const searchTimer = useRef(null);

  const fetch = useCallback(async (m, s, folderId) => {
    setLoad(true);
    try {
      const params = {};
      if (m)        params.matter_id = m;
      if (s)        params.search    = s;
      if (folderId && folderId !== 'matter') params.folder_id = folderId;
      const { data } = await axios.get('/api/documents', { params });
      setDocs(data);
    } catch { showToast('Failed to load documents.', 'error'); }
    finally { setLoad(false); }
  }, []);

  const fetchFolders = useCallback(() => {
    axios.get('/api/documents/folders').then(({data})=>setFolders(data)).catch(()=>{});
  }, []);

  useEffect(() => { fetch(filter, search, activeFolder); }, [fetch, filter, activeFolder]);
  useEffect(() => { axios.get('/api/matters').then(({data})=>setMat(data)).catch(()=>{}); fetchFolders(); }, [fetchFolders]);

  const handleSearchChange = (e) => {
    const v = e.target.value; setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetch(filter, v), 300);
  };

  const showToast = (msg, type='success') => { setToast({message:msg,type}); setTimeout(()=>setToast(null), 3500); };

  const openForm = () => { setUF({ document_name:'', document_type:'', matter_id:'' }); setUE(''); setVis(false); setForm(true); setTimeout(()=>setVis(true), 30); };

  useEffect(() => {
    if (searchParams.get('upload') === 'true') openForm();
  }, []);
  const closeForm = () => { setVis(false); setTimeout(()=>setForm(false), 280); if(fileRef.current) fileRef.current.value=''; };

  const handleUpload = async (e) => {
    e.preventDefault(); setUE('');
    if (!uploadForm.document_name.trim()) return setUE('Document name is required.');
    if (!fileRef.current?.files[0]) return setUE('Please select a file.');
    setUp(true);
    try {
      const fd = new FormData();
      fd.append('file', fileRef.current.files[0]);
      fd.append('document_name', uploadForm.document_name.trim());
      if (uploadForm.document_type) fd.append('document_type', uploadForm.document_type);
      if (uploadForm.matter_id)     fd.append('matter_id',     uploadForm.matter_id);
      await axios.post('/api/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      closeForm(); fetch(filter, search); showToast('Document uploaded successfully.');
    } catch (err) { setUE(err.response?.data?.error || 'Upload failed. Please try again.'); }
    finally { setUp(false); }
  };

  const handleDownload = (id) => { window.open(`/api/documents/${id}/download`, '_blank'); };

  const handleDelete = async (id) => {
    try { await axios.delete(`/api/documents/${id}`); setDel(null); fetch(filter, search); showToast('Document deleted.'); }
    catch (err) { showToast(err.response?.data?.error || 'Failed to delete.', 'error'); }
  };

  const fld = (f) => ({ width:'100%', padding:'10px 12px', fontSize:'14px', border:`1.5px solid ${focused===f?GOLD:'#dee2e6'}`, borderRadius:'5px', outline:'none', fontFamily:'Inter,sans-serif', color:'#1a1a2e', background:'#fff', transition:'border-color .15s', boxSizing:'border-box' });
  const s = (f) => ({ ...fld(f), appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center', paddingRight:'32px' });

  const createFolder = async () => {
    if (!folderName.trim()) return;
    try {
      await axios.post('/api/documents/folders', { name: folderName.trim() });
      setFolderName(''); setFolderForm(false);
      fetchFolders();
      showToast('Folder created.');
    } catch { showToast('Failed to create folder.', 'error'); }
  };

  const deleteFolder = async (fId) => {
    try {
      await axios.delete(`/api/documents/folders/${fId}`);
      if (activeFolder === fId) setActiveFolder(null);
      fetchFolders();
      showToast('Folder deleted.');
    } catch { showToast('Failed to delete folder.', 'error'); }
  };

  const sideItem = (label, value, icon) => {
    const active = activeFolder === value;
    return (
      <button onClick={() => { setActiveFolder(value); setFilt(''); }} style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', textAlign:'left', padding:'7px 12px', borderRadius:'6px', border:'none', background:active?'#e8edf5':'transparent', color:active?NAVY:'#495057', fontSize:'13px', fontWeight:active?'600':'400', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
        {icon}
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
      </button>
    );
  };

  return (
    <Layout>
      <div style={{ display:'flex', height:'100%', minHeight:'100vh' }}>
        {/* Folder Sidebar */}
        <div style={{ width:'220px', flexShrink:0, borderRight:'1px solid #e9ecef', padding:'24px 12px', background:'#fafbfc', minHeight:'100vh' }}>
          <div style={{ fontSize:'10px', fontWeight:'700', color:'#adb5bd', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'8px', paddingLeft:'12px' }}>Documents</div>
          {sideItem('All Documents', null,
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
          )}
          {sideItem('By Matter', 'matter',
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
          )}

          <div style={{ fontSize:'10px', fontWeight:'700', color:'#adb5bd', letterSpacing:'.08em', textTransform:'uppercase', margin:'16px 0 6px', paddingLeft:'12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            Folders
            <button onClick={() => setFolderForm(true)} style={{ background:'none', border:'none', cursor:'pointer', color:GOLD, padding:'0', fontSize:'16px', lineHeight:1 }} title="New folder">+</button>
          </div>
          {folderForm && (
            <div style={{ padding:'6px 4px', marginBottom:'6px' }}>
              <input value={folderName} onChange={e=>setFolderName(e.target.value)}
                placeholder="Folder name…" autoFocus
                onKeyDown={e=>{ if(e.key==='Enter') createFolder(); if(e.key==='Escape') { setFolderForm(false); setFolderName(''); } }}
                style={{ width:'100%', padding:'6px 8px', border:'1.5px solid '+GOLD, borderRadius:'4px', fontSize:'12px', outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif' }} />
              <div style={{ display:'flex', gap:'4px', marginTop:'4px' }}>
                <button onClick={createFolder} style={{ flex:1, padding:'4px', background:GOLD, border:'none', borderRadius:'3px', color:'#fff', fontSize:'11px', cursor:'pointer' }}>Add</button>
                <button onClick={() => { setFolderForm(false); setFolderName(''); }} style={{ flex:1, padding:'4px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'3px', fontSize:'11px', cursor:'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
          {folders.length === 0 && !folderForm && (
            <div style={{ paddingLeft:'12px', fontSize:'12px', color:'#ced4da' }}>No folders yet</div>
          )}
          {folders.map(f => {
            const active = activeFolder === f.id;
            return (
              <div key={f.id} style={{ display:'flex', alignItems:'center', gap:'2px' }}>
                <button onClick={() => { setActiveFolder(f.id); setFilt(''); }} style={{ flex:1, display:'flex', alignItems:'center', gap:'8px', textAlign:'left', padding:'6px 12px', borderRadius:'6px', border:'none', background:active?'#e8edf5':'transparent', color:active?NAVY:'#495057', fontSize:'12px', fontWeight:active?'600':'400', cursor:'pointer', fontFamily:'Inter,sans-serif', overflow:'hidden' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</span>
                </button>
                {user?.role === 'attorney' && (
                  <button onClick={() => deleteFolder(f.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ced4da', padding:'4px', flexShrink:0, fontSize:'14px' }}
                    onMouseEnter={e=>e.currentTarget.style.color='#c53030'} onMouseLeave={e=>e.currentTarget.style.color='#ced4da'} title="Delete folder">×</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Main content */}
        <div style={{ flex:1, padding:'36px 40px', minWidth:0 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px' }}>
          <div>
            <h1 style={{ fontSize:'26px', fontWeight:'600', color:NAVY, fontFamily:'Playfair Display,Georgia,serif', margin:'0 0 4px' }}>Documents</h1>
            <p style={{ color:'#6c757d', fontSize:'14px', margin:0 }}>{loading?'Loading…':`${docs.length} document${docs.length!==1?'s':''}`}</p>
          </div>
          <button onClick={openForm} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 20px', background:GOLD, border:'none', borderRadius:'6px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif', boxShadow:'0 2px 8px rgba(201,168,76,.35)' }}
            onMouseEnter={(e)=>e.currentTarget.style.background='#b8943d'} onMouseLeave={(e)=>e.currentTarget.style.background=GOLD}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Upload Document
          </button>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative', flex:'1', minWidth:'200px', maxWidth:'320px' }}>
            <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#adb5bd' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input value={search} onChange={handleSearchChange} placeholder="Search by document name…"
              style={{ width:'100%', padding:'9px 12px 9px 38px', border:'1.5px solid #dee2e6', borderRadius:'6px', fontSize:'14px', fontFamily:'Inter,sans-serif', outline:'none', background:'#fff', boxSizing:'border-box' }}
              onFocus={(e)=>e.target.style.borderColor=GOLD} onBlur={(e)=>e.target.style.borderColor='#dee2e6'} />
          </div>
          <select value={filter} onChange={(e)=>{setFilt(e.target.value);fetch(e.target.value,search);}} style={{ padding:'9px 36px 9px 12px', border:'1.5px solid #dee2e6', borderRadius:'6px', fontSize:'14px', fontFamily:'Inter,sans-serif', background:'#fff', cursor:'pointer', outline:'none', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center' }}>
            <option value="">All Matters</option>
            {matters.map((m) => <option key={m.id} value={m.id}>{m.matter_number}: {m.matter_name}</option>)}
          </select>
          {(filter||search) && <button onClick={()=>{setFilt('');setSearch('');fetch('','');}} style={{ background:'none', border:'none', color:'#6c757d', fontSize:'13px', cursor:'pointer', textDecoration:'underline' }}>Clear</button>}
        </div>

        {/* By-matter grouped view */}
        {activeFolder === 'matter' && (
          <div style={{ display:'grid', gap:'16px' }}>
            {matters.map(m => {
              const mDocs = docs.filter(d => d.matter_id === m.id);
              if (mDocs.length === 0) return null;
              return (
                <div key={m.id} style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'8px', overflow:'hidden' }}>
                  <div style={{ padding:'10px 16px', background:'#f8f9fa', borderBottom:'1px solid #e9ecef', display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontFamily:'monospace', fontSize:'11px', background:'#e8edf5', padding:'2px 6px', borderRadius:'3px', color:NAVY, fontWeight:'600' }}>{m.matter_number}</span>
                    <span style={{ fontSize:'13px', fontWeight:'600', color:NAVY }}>{m.matter_name}</span>
                    <span style={{ fontSize:'11px', color:'#adb5bd', marginLeft:'auto' }}>{mDocs.length} doc{mDocs.length!==1?'s':''}</span>
                  </div>
                  <div style={{ display:'grid', gap:'4px', padding:'8px' }}>
                    {mDocs.map(d => (
                      <div key={d.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', borderRadius:'5px', background:'#fafbfc' }}>
                        <FileIcon mime={d.mime_type} />
                        <span style={{ flex:1, fontSize:'13px', fontWeight:'500', color:NAVY, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.document_name}</span>
                        <span style={{ fontSize:'11px', color:'#adb5bd' }}>{fmtDate(d.created_at)}</span>
                        <button onClick={() => handleDownload(d.id)} style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'4px', padding:'3px 7px', cursor:'pointer', fontSize:'12px', color:'#6c757d' }}>↓</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {docs.filter(d=>!d.matter_id).length > 0 && (
              <div style={{ background:'#fff', border:'1px solid #e9ecef', borderRadius:'8px', overflow:'hidden' }}>
                <div style={{ padding:'10px 16px', background:'#f8f9fa', borderBottom:'1px solid #e9ecef', fontSize:'13px', fontWeight:'600', color:'#6c757d' }}>No Matter Linked</div>
                <div style={{ display:'grid', gap:'4px', padding:'8px' }}>
                  {docs.filter(d=>!d.matter_id).map(d => (
                    <div key={d.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', borderRadius:'5px', background:'#fafbfc' }}>
                      <FileIcon mime={d.mime_type} />
                      <span style={{ flex:1, fontSize:'13px', fontWeight:'500', color:NAVY, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.document_name}</span>
                      <button onClick={() => handleDownload(d.id)} style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'4px', padding:'3px 7px', cursor:'pointer', fontSize:'12px', color:'#6c757d' }}>↓</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        {activeFolder !== 'matter' && <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #e9ecef', boxShadow:'0 1px 4px rgba(0,0,0,.04)', overflow:'hidden' }}>
          {loading ? (
            <div style={{ padding:'80px', textAlign:'center', color:'#adb5bd', fontSize:'14px' }}>Loading documents…</div>
          ) : docs.length === 0 ? (
            <div style={{ padding:'80px 40px', textAlign:'center' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#dee2e6" strokeWidth="1.2" style={{ marginBottom:'14px' }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <h3 style={{ fontSize:'15px', fontWeight:'600', color:'#adb5bd', margin:'0 0 6px' }}>No documents yet</h3>
              <p style={{ fontSize:'14px', color:'#ced4da', margin:'0 0 16px' }}>{(filter||search)?'Try adjusting your filters.':'Upload your first document to get started.'}</p>
              {!filter && !search && <button onClick={openForm} style={{ padding:'9px 20px', background:GOLD, border:'none', borderRadius:'6px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Upload Document</button>}
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
              <thead>
                <tr style={{ background:'#f8f9fa', borderBottom:'1px solid #e9ecef' }}>
                  {['Type','Document Name','Matter','Size','Uploaded By','Date',''].map((h,i) => (
                    <th key={i} style={{ padding:'11px 16px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:'#6c757d', letterSpacing:'.06em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((d, i) => {
                  const isDel = deleteId === d.id;
                  return (
                    <tr key={d.id} style={{ borderBottom:i<docs.length-1?'1px solid #f1f3f5':'none', background:isDel?'#fff5f5':'transparent', transition:'background .1s' }}
                      onMouseEnter={(e)=>{ if(!isDel) e.currentTarget.style.background='#fafbfc'; }}
                      onMouseLeave={(e)=>{ e.currentTarget.style.background=isDel?'#fff5f5':'transparent'; }}>
                      <td style={{ padding:'13px 16px' }}><FileIcon mime={d.mime_type} /></td>
                      <td style={{ padding:'13px 16px', fontWeight:'500', color:NAVY }}>
                        <div>{d.document_name}</div>
                        {d.document_type && <div style={{ fontSize:'12px', color:'#6c757d', marginTop:'2px' }}>{d.document_type}</div>}
                      </td>
                      <td style={{ padding:'13px 16px', fontSize:'13px' }}>
                        {d.matter_number ? <span style={{ fontFamily:'monospace', fontSize:'12px', background:'#f0f2f5', padding:'2px 6px', borderRadius:'3px', color:NAVY }}>{d.matter_number}</span> : <span style={{color:'#ced4da'}}>—</span>}
                      </td>
                      <td style={{ padding:'13px 16px', fontSize:'13px', color:'#6c757d', whiteSpace:'nowrap' }}>{fmtSize(d.file_size)}</td>
                      <td style={{ padding:'13px 16px', fontSize:'13px', color:'#6c757d' }}>{d.uploaded_by_name||'—'}</td>
                      <td style={{ padding:'13px 16px', fontSize:'13px', color:'#6c757d', whiteSpace:'nowrap' }}>{fmtDate(d.created_at)}</td>
                      <td style={{ padding:'13px 16px', textAlign:'right', whiteSpace:'nowrap' }}>
                        {isDel ? (
                          <div style={{ display:'flex', alignItems:'center', gap:'8px', justifyContent:'flex-end' }}>
                            <span style={{ fontSize:'12px', color:'#c53030' }}>Delete permanently?</span>
                            <button onClick={()=>handleDelete(d.id)} style={{ padding:'3px 10px', background:'#c53030', border:'none', borderRadius:'4px', color:'#fff', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Delete</button>
                            <button onClick={()=>setDel(null)} style={{ padding:'3px 8px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'4px', fontSize:'12px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display:'flex', gap:'4px', justifyContent:'flex-end', opacity:0 }}
                            ref={(el)=>{ if(el){ el.closest('tr').addEventListener('mouseenter',()=>el.style.opacity=1); el.closest('tr').addEventListener('mouseleave',()=>el.style.opacity=0); } }}>
                            <button onClick={()=>handleDownload(d.id)} title="Download" style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'5px', padding:'4px 7px', cursor:'pointer', color:'#6c757d', display:'flex', alignItems:'center' }}
                              onMouseEnter={(e)=>{ e.currentTarget.style.borderColor=NAVY; e.currentTarget.style.color=NAVY; }}
                              onMouseLeave={(e)=>{ e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.color='#6c757d'; }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </button>
                            {user?.role === 'attorney' && (
                              <button onClick={()=>setDel(d.id)} title="Delete" style={{ background:'none', border:'1px solid #dee2e6', borderRadius:'5px', padding:'4px 7px', cursor:'pointer', color:'#6c757d', display:'flex', alignItems:'center' }}
                                onMouseEnter={(e)=>{ e.currentTarget.style.borderColor='#c53030'; e.currentTarget.style.color='#c53030'; }}
                                onMouseLeave={(e)=>{ e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.color='#6c757d'; }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>}
        </div> {/* end main content */}
      </div> {/* end flex wrapper */}

      {/* Upload slide-over */}
      {formOpen && (
        <>
          <div onClick={closeForm} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:200, opacity:visible?1:0, transition:'opacity .25s' }} />
          <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'440px', background:'#fff', zIndex:201, display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,.15)', transform:visible?'translateX(0)':'translateX(100%)', transition:'transform .28s cubic-bezier(.4,0,.2,1)' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #e9ecef', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <h2 style={{ fontSize:'18px', fontWeight:'600', color:NAVY, margin:0 }}>Upload Document</h2>
              <button onClick={closeForm} style={{ background:'none', border:'none', cursor:'pointer', color:'#adb5bd', padding:'4px', display:'flex' }}
                onMouseEnter={(e)=>e.currentTarget.style.color='#495057'} onMouseLeave={(e)=>e.currentTarget.style.color='#adb5bd'}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleUpload} style={{ flex:1, overflowY:'auto', padding:'24px' }}>
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block', fontSize:'12px', fontWeight:'500', color:'#555', marginBottom:'5px' }}>Document Name <span style={{color:'#c0392b'}}>*</span></label>
                <input value={uploadForm.document_name} onChange={(e)=>setUF(f=>({...f,document_name:e.target.value}))}
                  onFocus={()=>setFoc('dn')} onBlur={()=>setFoc(null)} style={fld('dn')} placeholder="e.g. Motion to Dismiss" required />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'16px' }}>
                <div>
                  <label style={{ display:'block', fontSize:'12px', fontWeight:'500', color:'#555', marginBottom:'5px' }}>Document Type</label>
                  <select value={uploadForm.document_type} onChange={(e)=>setUF(f=>({...f,document_type:e.target.value}))}
                    onFocus={()=>setFoc('dt')} onBlur={()=>setFoc(null)} style={s('dt')}>
                    <option value="">— Select type —</option>
                    {DOC_TYPES.map((t)=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'12px', fontWeight:'500', color:'#555', marginBottom:'5px' }}>Linked Matter</label>
                  <select value={uploadForm.matter_id} onChange={(e)=>setUF(f=>({...f,matter_id:e.target.value}))}
                    onFocus={()=>setFoc('dm')} onBlur={()=>setFoc(null)} style={s('dm')}>
                    <option value="">— None —</option>
                    {matters.map((m)=><option key={m.id} value={m.id}>{m.matter_number}: {m.matter_name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:'8px' }}>
                <label style={{ display:'block', fontSize:'12px', fontWeight:'500', color:'#555', marginBottom:'5px' }}>File <span style={{color:'#c0392b'}}>*</span></label>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #dee2e6', borderRadius:'5px', fontSize:'13px', fontFamily:'Inter,sans-serif', background:'#fff', cursor:'pointer', boxSizing:'border-box' }} />
                <p style={{ fontSize:'12px', color:'#adb5bd', margin:'6px 0 0' }}>PDF, DOCX, JPG, PNG — max 25 MB</p>
              </div>
              {uploadErr && <div style={{ background:'#fff5f5', border:'1px solid #fed7d7', color:'#c53030', borderRadius:'5px', padding:'10px 12px', fontSize:'13px', marginTop:'12px' }}>{uploadErr}</div>}
            </form>
            <div style={{ padding:'16px 24px', borderTop:'1px solid #e9ecef', display:'flex', gap:'10px', justifyContent:'flex-end', flexShrink:0 }}>
              <button type="button" onClick={closeForm} style={{ padding:'9px 20px', background:'transparent', border:'1px solid #dee2e6', borderRadius:'5px', fontSize:'14px', cursor:'pointer', fontFamily:'Inter,sans-serif', color:'#495057' }}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading} style={{ padding:'9px 24px', background:uploading?'#d4b878':GOLD, border:'none', borderRadius:'5px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:uploading?'not-allowed':'pointer', fontFamily:'Inter,sans-serif' }}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        </>
      )}

      {toast && <div style={{ position:'fixed', bottom:'28px', right:'28px', background:toast.type==='error'?'#c53030':'#276749', color:'#fff', padding:'12px 20px', borderRadius:'7px', fontSize:'14px', fontWeight:'500', zIndex:400, boxShadow:'0 4px 16px rgba(0,0,0,.2)', animation:'slideUp .2s ease' }}>{toast.message}</div>}
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Layout>
  );
}
