import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';
const TEAL = '#2E8B8B';

const s = {
  page: { display: 'flex', height: '100vh', fontFamily: 'Inter, sans-serif' },
  sidebar: { width: 280, flexShrink: 0, background: '#f8f9fa', borderRight: '1px solid #e9ecef', display: 'flex', flexDirection: 'column' },
  sidebarHead: { padding: '20px 16px 12px', borderBottom: '1px solid #e9ecef' },
  sidebarTitle: { fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 },
  filterRow: { display: 'flex', gap: 4 },
  filterBtn: (a) => ({ padding: '5px 12px', fontSize: 12, fontWeight: a ? 700 : 400, color: a ? NAVY : '#6c757d', background: a ? '#e8edf5' : 'transparent', border: 'none', borderRadius: 20, cursor: 'pointer' }),
  threadList: { flex: 1, overflowY: 'auto' },
  thread: (active, unread) => ({
    padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f3f5',
    background: active ? '#e8edf5' : unread ? '#fffbeb' : 'transparent',
    borderLeft: `3px solid ${active ? GOLD : unread ? GOLD : 'transparent'}`,
  }),
  threadSubject: (unread) => ({ fontSize: 13, fontWeight: unread ? 700 : 500, color: NAVY, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
  threadMeta: { fontSize: 11, color: '#6c757d', display: 'flex', justifyContent: 'space-between' },
  threadBadge: { background: GOLD, color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700, marginLeft: 4 },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  mainHead: { padding: '16px 24px', borderBottom: '1px solid #e9ecef', background: '#fff', flexShrink: 0 },
  mainTitle: { fontSize: 16, fontWeight: 700, color: NAVY },
  mainMeta: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  messages: { flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 },
  bubble: (isMe, isClient) => ({
    maxWidth: '72%',
    alignSelf: isMe ? 'flex-end' : 'flex-start',
    background: isMe ? NAVY : isClient ? '#e0f2f2' : '#f1f3f5',
    color: isMe ? '#fff' : '#222',
    borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0',
    padding: '10px 14px',
    fontSize: 13,
    lineHeight: 1.5,
  }),
  bubbleMeta: (isMe) => ({ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.6)' : '#aaa', marginTop: 4, textAlign: isMe ? 'right' : 'left' }),
  compose: { padding: '12px 20px', borderTop: '1px solid #e9ecef', background: '#fff', flexShrink: 0 },
  composeRow: { display: 'flex', gap: 10, alignItems: 'flex-end' },
  textarea: { flex: 1, border: '1px solid #ced4da', borderRadius: 8, padding: '10px 14px', fontSize: 13, resize: 'none', fontFamily: 'Inter, sans-serif', minHeight: 60, maxHeight: 140 },
  btn: (color = NAVY) => ({ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-end' }),
  newBtn: { background: GOLD, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 400 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 480, background: '#fff', borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,.18)', zIndex: 500, padding: 28 },
  label: { fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 },
  input: { width: '100%', border: '1px solid #ced4da', borderRadius: 6, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box', marginBottom: 14 },
  select: { width: '100%', border: '1px solid #ced4da', borderRadius: 6, padding: '9px 12px', fontSize: 13, marginBottom: 14 },
  empty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 14, flexDirection: 'column', gap: 8 },
  portalLink: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#166534', marginTop: 4, wordBreak: 'break-all' },
};

const APP_URL = window.location.origin;
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' }) : '';

export default function Messages() {
  const { user } = useAuth();
  const isAttorney = user?.role === 'attorney';
  const [searchParams] = useSearchParams();

  const [threads,       setThreads]      = useState([]);
  const [activeThread,  setActive]        = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [filter,        setFilter]        = useState('all');
  const [compose,       setCompose]       = useState('');
  const [sending,       setSending]       = useState(false);
  const [newModal,      setNewModal]      = useState(false);
  const [matters,       setMatters]       = useState([]);
  const [newForm,       setNewForm]       = useState({ subject: '', thread_type: 'internal', matter_id: '', client_email: '', client_name: '' });
  const [creating,      setCreating]      = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (searchParams.get('new') === 'true') setNewModal(true);
  }, []);

  const loadThreads = () => {
    const params = filter !== 'all' ? { thread_type: filter } : {};
    axios.get('/api/messages/threads', { params }).then(r => setThreads(r.data)).catch(() => {});
  };

  useEffect(loadThreads, [filter]);

  useEffect(() => {
    axios.get('/api/billing/matters').then(r => setMatters(r.data)).catch(() => {});
  }, []);

  const openThread = async (thread) => {
    setActive(thread);
    try {
      const { data } = await axios.get(`/api/messages/threads/${thread.id}/messages`);
      setMessages(data);
      loadThreads(); // refresh unread counts
    } catch {}
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!compose.trim() || !activeThread) return;
    setSending(true);
    try {
      const { data } = await axios.post(`/api/messages/threads/${activeThread.id}/messages`, { body: compose.trim() });
      setMessages(prev => [...prev, data]);
      setCompose('');
      loadThreads();
    } catch {}
    setSending(false);
  };

  const createThread = async () => {
    if (!newForm.subject.trim()) return;
    setCreating(true);
    try {
      const { data } = await axios.post('/api/messages/threads', newForm);
      setNewModal(false);
      setNewForm({ subject: '', thread_type: 'internal', matter_id: '', client_email: '', client_name: '' });
      loadThreads();
      openThread(data);
    } catch {}
    setCreating(false);
  };

  const filteredThreads = threads.filter(t => {
    if (filter === 'internal') return t.thread_type === 'internal';
    if (filter === 'client')   return t.thread_type === 'client';
    return true;
  });

  const portalUrl = (thread) => thread.secure_token ? `${APP_URL}/portal/messages/${thread.secure_token}` : null;

  return (
    <div style={s.page}>
      {/* Thread list sidebar */}
      <div style={s.sidebar}>
        <div style={s.sidebarHead}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={s.sidebarTitle}>Messages</div>
            <button style={s.newBtn} onClick={() => setNewModal(true)}>+ New</button>
          </div>
          <div style={s.filterRow}>
            {['all','internal','client'].map(f => (
              <button key={f} style={s.filterBtn(filter === f)} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'internal' ? 'Internal' : 'Client'}
              </button>
            ))}
          </div>
        </div>

        <div style={s.threadList}>
          {filteredThreads.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>No threads yet.</div>
          )}
          {filteredThreads.map(t => {
            const unread = Number(t.unread_count) > 0;
            const isActive = activeThread?.id === t.id;
            return (
              <div key={t.id} style={s.thread(isActive, unread)} onClick={() => openThread(t)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.threadSubject(unread)}>{t.subject}</div>
                  </div>
                  {unread && <span style={s.threadBadge}>{t.unread_count}</span>}
                </div>
                <div style={s.threadMeta}>
                  <span>{t.thread_type === 'client' ? `Client: ${t.client_name || t.client_email || '—'}` : t.matter_number || 'Internal'}</span>
                  <span>{t.last_message_at ? new Date(t.last_message_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main message view */}
      <div style={s.main}>
        {!activeThread ? (
          <div style={s.empty}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Select a thread or start a new conversation
          </div>
        ) : (
          <>
            <div style={s.mainHead}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={s.mainTitle}>{activeThread.subject}</div>
                  <div style={s.mainMeta}>
                    {activeThread.matter_number && <span>{activeThread.matter_number} · </span>}
                    {activeThread.thread_type === 'client'
                      ? <span style={{ color: TEAL }}>Client thread · {activeThread.client_name || activeThread.client_email}</span>
                      : <span>Internal thread</span>}
                  </div>
                </div>
                {activeThread.thread_type === 'client' && portalUrl(activeThread) && (
                  <div>
                    <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 4 }}>Client portal link:</div>
                    <div style={s.portalLink}>{portalUrl(activeThread)}</div>
                  </div>
                )}
              </div>
            </div>

            <div style={s.messages}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, margin: 'auto' }}>No messages yet. Send the first message.</div>
              )}
              {messages.map(msg => {
                const isMe = msg.sender_id === user?.id;
                const isClient = msg.sender_type === 'client';
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    {!isMe && <div style={{ fontSize: 11, fontWeight: 600, color: isClient ? TEAL : '#6c757d', marginBottom: 3 }}>{msg.sender_name || 'Client'}</div>}
                    <div style={s.bubble(isMe, isClient)}>{msg.body}</div>
                    <div style={s.bubbleMeta(isMe)}>{fmtTime(msg.sent_at)}</div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div style={s.compose}>
              <div style={s.composeRow}>
                <textarea
                  style={s.textarea}
                  placeholder="Type a message…"
                  value={compose}
                  onChange={e => setCompose(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  rows={2}
                />
                <button style={s.btn(NAVY)} onClick={sendMessage} disabled={sending || !compose.trim()}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Enter to send · Shift+Enter for new line</div>
            </div>
          </>
        )}
      </div>

      {/* New thread modal */}
      {newModal && (
        <>
          <div style={s.overlay} onClick={() => setNewModal(false)} />
          <div style={s.modal}>
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 16 }}>New Thread</div>

            <label style={s.label}>Subject *</label>
            <input style={s.input} value={newForm.subject} onChange={e => setNewForm(p => ({ ...p, subject: e.target.value }))} placeholder="Thread subject" />

            <label style={s.label}>Type</label>
            <select style={s.select} value={newForm.thread_type} onChange={e => setNewForm(p => ({ ...p, thread_type: e.target.value }))}>
              <option value="internal">Internal (staff only)</option>
              <option value="client">Client thread</option>
            </select>

            <label style={s.label}>Linked Matter</label>
            <select style={s.select} value={newForm.matter_id} onChange={e => setNewForm(p => ({ ...p, matter_id: e.target.value }))}>
              <option value="">— None —</option>
              {matters.map(m => <option key={m.id} value={m.id}>{m.matter_number} — {m.matter_name}</option>)}
            </select>

            {newForm.thread_type === 'client' && (
              <>
                <label style={s.label}>Client Name</label>
                <input style={s.input} value={newForm.client_name} onChange={e => setNewForm(p => ({ ...p, client_name: e.target.value }))} />
                <label style={s.label}>Client Email</label>
                <input style={s.input} type="email" value={newForm.client_email} onChange={e => setNewForm(p => ({ ...p, client_email: e.target.value }))} />
                <div style={{ background: '#e0f2fe', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#1d4ed8', marginBottom: 14 }}>
                  A secure portal link will be generated. Share it with the client to let them view and reply to messages without logging in.
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={{ background: '#fff', color: '#555', border: '1px solid #ced4da', borderRadius: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => setNewModal(false)}>Cancel</button>
              <button style={s.btn(NAVY)} onClick={createThread} disabled={creating || !newForm.subject.trim()}>
                {creating ? 'Creating…' : 'Create Thread'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
