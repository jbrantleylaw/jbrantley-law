import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const s = {
  page: { minHeight: '100vh', background: '#f7f8fa', fontFamily: 'Georgia, serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 16px' },
  header: { width: '100%', maxWidth: 640, background: NAVY, color: '#fff', borderRadius: '8px 8px 0 0', padding: '20px 28px' },
  firm: { fontSize: 20, fontWeight: 700 },
  firmSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  card: { width: '100%', maxWidth: 640, background: '#fff', borderRadius: '0 0 8px 8px', boxShadow: '0 4px 24px rgba(0,0,0,.10)', padding: 32 },
  heading: { fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 4 },
  sub: { fontSize: 13, color: '#6c757d', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
  field: { display: 'flex', gap: 8, marginBottom: 6, fontSize: 13 },
  fieldLabel: { color: '#6c757d', minWidth: 120 },
  fieldVal: { color: '#222', fontWeight: 500 },
  tabRow: { display: 'flex', gap: 4, marginBottom: 16 },
  tab: (a) => ({ padding: '7px 16px', fontSize: 13, fontWeight: a ? 700 : 400, color: a ? NAVY : '#6c757d', background: a ? '#e8edf5' : '#f1f3f5', border: 'none', borderRadius: 6, cursor: 'pointer' }),
  input: { width: '100%', border: '1px solid #ced4da', borderRadius: 6, padding: '10px 14px', fontSize: 16, fontFamily: 'Georgia, serif', boxSizing: 'border-box', marginBottom: 12 },
  canvas: { border: '2px dashed #ced4da', borderRadius: 6, width: '100%', height: 120, cursor: 'crosshair', display: 'block', background: '#fafafa', marginBottom: 8 },
  btn: (color = NAVY, disabled = false) => ({
    background: disabled ? '#e9ecef' : color, color: disabled ? '#aaa' : '#fff',
    border: 'none', borderRadius: 6, padding: '12px 24px', fontSize: 14, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer', width: '100%', marginBottom: 8,
  }),
  btnDecline: { background: '#fff', color: '#9b2c2c', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' },
  legal: { fontSize: 11, color: '#aaa', lineHeight: 1.6, marginTop: 16 },
  status: (type) => {
    const m = { signed: ['#dcfce7','#166534'], declined: ['#fee2e2','#9b2c2c'], error: ['#fee2e2','#9b2c2c'] };
    const [bg, c] = m[type] || ['#e0f2fe','#1d4ed8'];
    return { background: bg, color: c, borderRadius: 8, padding: '20px 24px', textAlign: 'center', fontSize: 15, fontWeight: 600 };
  },
};

export default function SignDocument() {
  const { token } = useParams();
  const [doc, setDoc]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [sigMode, setSigMode] = useState('typed');
  const [typedSig, setTypedSig] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]   = useState(null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const canvasRef = useRef(null);
  const drawing   = useRef(false);

  useEffect(() => {
    axios.get(`/api/esignature/sign/${token}`)
      .then(r => { setDoc(r.data); setLoading(false); })
      .catch(() => { setDoc(null); setLoading(false); });
  }, [token]);

  // Canvas drawing
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.lineWidth = 2; ctx.strokeStyle = NAVY; ctx.lineCap = 'round';
    ctx.lineTo(x, y); ctx.stroke();
  };

  const endDraw = () => { drawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const getSignatureData = () => {
    if (sigMode === 'typed') return typedSig.trim();
    const canvas = canvasRef.current;
    return canvas.toDataURL('image/png');
  };

  const submit = async () => {
    const sigData = getSignatureData();
    if (!sigData) { alert('Please provide your signature.'); return; }
    setSubmitting(true);
    try {
      await axios.post(`/api/esignature/sign/${token}`, { signature_data: sigData, signature_type: sigMode });
      setResult('signed');
    } catch (err) {
      alert(err.response?.data?.error || 'Submission failed.');
    } finally { setSubmitting(false); }
  };

  const decline = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/esignature/sign/${token}`, { action: 'decline' });
      setResult('declined');
    } catch { alert('Error declining.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div style={{ ...s.page, justifyContent: 'center' }}><div style={{ color: '#6c757d' }}>Loading document…</div></div>;

  if (!doc) return (
    <div style={s.page}>
      <div style={s.header}><div style={s.firm}>J Brantley Law</div></div>
      <div style={s.card}><div style={s.status('error')}>This signing link is invalid or has expired.</div></div>
    </div>
  );

  if (result === 'signed') return (
    <div style={s.page}>
      <div style={s.header}><div style={s.firm}>J Brantley Law</div></div>
      <div style={s.card}>
        <div style={s.status('signed')}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
          Document Signed Successfully
          <div style={{ fontSize: 13, fontWeight: 400, marginTop: 8, opacity: 0.8 }}>Your signature has been recorded. J Brantley Law has been notified.</div>
        </div>
      </div>
    </div>
  );

  if (result === 'declined') return (
    <div style={s.page}>
      <div style={s.header}><div style={s.firm}>J Brantley Law</div></div>
      <div style={s.card}>
        <div style={s.status('declined')}>
          You have declined to sign this document.<br />
          <span style={{ fontSize: 13, fontWeight: 400 }}>J Brantley Law has been notified.</span>
        </div>
      </div>
    </div>
  );

  if (doc.already_completed) return (
    <div style={s.page}>
      <div style={s.header}><div style={s.firm}>J Brantley Law</div></div>
      <div style={s.card}>
        <div style={s.status(doc.status)}>This document has already been {doc.status}.</div>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.firm}>J Brantley Law</div>
        <div style={s.firmSub}>Jennifer N. Brantley, Esq. · 5900 Balcones Dr., #9008, Austin, TX 78731</div>
      </div>

      <div style={s.card}>
        <div style={s.heading}>Document Signature Request</div>
        <div style={s.sub}>Please review the information below and sign to indicate your agreement.</div>

        <div style={s.section}>
          <div style={s.sectionTitle}>Document</div>
          <div style={s.field}><span style={s.fieldLabel}>Name</span><span style={s.fieldVal}>{doc.document_name}</span></div>
          {doc.matter_number && <div style={s.field}><span style={s.fieldLabel}>Matter</span><span style={s.fieldVal}>{doc.matter_number} — {doc.matter_name}</span></div>}
          <div style={s.field}><span style={s.fieldLabel}>Recipient</span><span style={s.fieldVal}>{doc.recipient_name || doc.recipient_email}</span></div>
          <div style={s.field}><span style={s.fieldLabel}>Sent</span><span style={s.fieldVal}>{doc.sent_at ? new Date(doc.sent_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</span></div>
        </div>

        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#7c4a00', marginBottom: 24 }}>
          By signing below, you acknowledge that you have reviewed the document named above and agree to its terms. This electronic signature is legally binding.
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>Your Signature</div>

          <div style={s.tabRow}>
            <button style={s.tab(sigMode === 'typed')} onClick={() => setSigMode('typed')}>Type Signature</button>
            <button style={s.tab(sigMode === 'draw')}  onClick={() => setSigMode('draw')}>Draw Signature</button>
          </div>

          {sigMode === 'typed' ? (
            <input
              style={{ ...s.input, fontFamily: 'cursive', fontSize: 22, color: NAVY }}
              placeholder="Type your full name"
              value={typedSig}
              onChange={e => setTypedSig(e.target.value)}
            />
          ) : (
            <div>
              <canvas
                ref={canvasRef}
                width={576}
                height={120}
                style={s.canvas}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
              />
              <button onClick={clearCanvas} style={{ background: 'none', border: '1px solid #ced4da', borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer', color: '#6c757d', marginBottom: 12 }}>
                Clear
              </button>
            </div>
          )}
        </div>

        {!confirmDecline ? (
          <>
            <button style={s.btn(GOLD, submitting)} onClick={submit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Sign Document'}
            </button>
            <button style={s.btnDecline} onClick={() => setConfirmDecline(true)}>I Decline to Sign</button>
          </>
        ) : (
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 6, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#9b2c2c', marginBottom: 12 }}>Are you sure you want to decline?</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ ...s.btn('#9b2c2c', submitting), width: 'auto', padding: '9px 20px' }} onClick={decline} disabled={submitting}>Yes, Decline</button>
              <button style={{ ...s.btnDecline, width: 'auto', padding: '9px 20px' }} onClick={() => setConfirmDecline(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={s.legal}>
          This document is presented by J Brantley Law · Jennifer N. Brantley, Esq. · 5900 Balcones Dr., #9008, Austin, TX 78731 · (210) 742-2435. By clicking "Sign Document" you agree that your electronic signature is the legal equivalent of your handwritten signature. Your IP address and timestamp are recorded upon signing.
        </div>
      </div>
    </div>
  );
}
