import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../utils/axios';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const s = {
  page: { minHeight: '100vh', background: '#f7f8fa', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px' },
  header: { width: '100%', maxWidth: 680, background: NAVY, borderRadius: '8px 8px 0 0', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  firm: { color: '#fff', fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700 },
  firmSub: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  card: { width: '100%', maxWidth: 680, background: '#fff', borderRadius: '0 0 8px 8px', boxShadow: '0 4px 24px rgba(0,0,0,.10)', display: 'flex', flexDirection: 'column', minHeight: 480, maxHeight: '72vh' },
  info: { padding: '16px 20px', borderBottom: '1px solid #e9ecef', background: '#fafbfc' },
  subject: { fontSize: 15, fontWeight: 700, color: NAVY },
  subjectMeta: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  messages: { flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  bubble: (isClient) => ({
    maxWidth: '75%',
    alignSelf: isClient ? 'flex-end' : 'flex-start',
    background: isClient ? NAVY : '#f1f3f5',
    color: isClient ? '#fff' : '#222',
    borderRadius: isClient ? '12px 12px 0 12px' : '12px 12px 12px 0',
    padding: '10px 14px',
    fontSize: 13,
    lineHeight: 1.5,
  }),
  bubbleSender: (isClient) => ({ fontSize: 10, color: isClient ? 'rgba(255,255,255,0.55)' : '#aaa', marginBottom: 2, textAlign: isClient ? 'right' : 'left' }),
  bubbleTime: (isClient) => ({ fontSize: 10, color: isClient ? 'rgba(255,255,255,0.45)' : '#aaa', marginTop: 3, textAlign: isClient ? 'right' : 'left' }),
  compose: { padding: '12px 16px', borderTop: '1px solid #e9ecef', background: '#fff', borderRadius: '0 0 8px 8px' },
  nameRow: { display: 'flex', gap: 8, marginBottom: 8 },
  nameInput: { border: '1px solid #ced4da', borderRadius: 6, padding: '7px 10px', fontSize: 12, flex: 1 },
  composeRow: { display: 'flex', gap: 8 },
  textarea: { flex: 1, border: '1px solid #ced4da', borderRadius: 8, padding: '9px 12px', fontSize: 13, resize: 'none', fontFamily: 'Inter, sans-serif', minHeight: 56 },
  sendBtn: { background: GOLD, color: '#fff', border: 'none', borderRadius: 8, padding: '0 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  legal: { width: '100%', maxWidth: 680, marginTop: 12, fontSize: 11, color: '#aaa', textAlign: 'center' },
};

const fmtTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export default function MessagePortal() {
  const { token } = useParams();
  const [thread,    setThread]   = useState(null);
  const [messages,  setMessages] = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [reply,     setReply]    = useState('');
  const [name,      setName]     = useState('');
  const [sending,   setSending]  = useState(false);
  const [error,     setError]    = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    axios.get(`/api/messages/portal/${token}`)
      .then(r => { setThread(r.data.thread); setMessages(r.data.messages); setLoading(false); })
      .catch(() => { setError('This link is invalid or has expired.'); setLoading(false); });
  }, [token]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data } = await axios.post(`/api/messages/portal/${token}`, { body: reply.trim(), client_name: name || thread?.client_name || 'Client' });
      setMessages(prev => [...prev, data]);
      setReply('');
    } catch { alert('Send failed. Please try again.'); }
    setSending(false);
  };

  if (loading) return <div style={{ ...s.page, justifyContent: 'center', color: '#6c757d' }}>Loading…</div>;

  if (error) return (
    <div style={s.page}>
      <div style={s.header}><div style={s.firm}>J Brantley Law</div></div>
      <div style={{ ...s.card, padding: 32, textAlign: 'center', color: '#9b2c2c', fontSize: 14 }}>{error}</div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.firm}>J Brantley Law</div>
          <div style={s.firmSub}>Secure Client Message Portal</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          {thread?.matter_number && <div>{thread.matter_number}</div>}
          <div>jennifer N. Brantley, Esq.</div>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.info}>
          <div style={s.subject}>{thread?.subject}</div>
          <div style={s.subjectMeta}>
            {thread?.matter_name && <span>{thread.matter_name} · </span>}
            <span>Secure message from J Brantley Law</span>
          </div>
        </div>

        <div style={s.messages}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, margin: 'auto' }}>
              No messages yet. Use the box below to send your first message.
            </div>
          )}
          {messages.map(msg => {
            const isClient = msg.sender_type === 'client';
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isClient ? 'flex-end' : 'flex-start' }}>
                <div style={s.bubbleSender(isClient)}>{isClient ? (msg.sender_name || 'You') : (msg.user_name || 'J Brantley Law')}</div>
                <div style={s.bubble(isClient)}>{msg.body}</div>
                <div style={s.bubbleTime(isClient)}>{fmtTime(msg.sent_at)}</div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div style={s.compose}>
          {!thread?.client_name && (
            <div style={s.nameRow}>
              <input style={s.nameInput} placeholder="Your name (optional)" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          <div style={s.composeRow}>
            <textarea
              style={s.textarea}
              placeholder="Type your reply…"
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={2}
            />
            <button style={s.sendBtn} onClick={send} disabled={sending || !reply.trim()}>
              {sending ? '…' : '→'}
            </button>
          </div>
        </div>
      </div>

      <div style={s.legal}>
        This is a secure, confidential message from J Brantley Law. All communications are private and protected by attorney-client privilege. 5900 Balcones Dr., #9008, Austin, TX 78731 · (210) 742-2435
      </div>
    </div>
  );
}
