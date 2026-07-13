import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const NAVY      = '#1B2A4A';
const NAVY_DARK = '#131f36';
const GOLD      = '#C9A84C';

const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const CheckIcon = ({ ok }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ok ? '#166534' : '#adb5bd'} strokeWidth="2.5">
    {ok
      ? <polyline points="20 6 9 17 4 12"/>
      : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
  </svg>
);

export default function SetPassword() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword]   = useState('');
  const [confirm,  setConfirm]    = useState('');
  const [showPw,   setShowPw]     = useState(false);
  const [showCf,   setShowCf]     = useState(false);
  const [focused,  setFocused]    = useState(null);
  const [saving,   setSaving]     = useState(false);
  const [error,    setError]      = useState('');

  const longEnough = password.length >= 8;
  const hasUpper   = /[A-Z]/.test(password);
  const hasNumber  = /[0-9]/.test(password);
  const matches    = password.length > 0 && password === confirm;
  const canSubmit  = longEnough && matches && !saving;

  const inputStyle = (field) => ({
    width: '100%', padding: '12px 44px 12px 14px', fontSize: '15px',
    border: `1.5px solid ${focused === field ? GOLD : '#dee2e6'}`,
    borderRadius: '6px', outline: 'none', transition: 'border-color 0.2s',
    fontFamily: 'Inter, sans-serif', color: '#1a1a2e', background: '#fff',
    boxSizing: 'border-box',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSaving(true);
    try {
      const { data } = await axios.put('/api/auth/change-password', { new_password: password });
      localStorage.setItem('jbl_token', data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setUser(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* Left panel */}
      <div style={{
        width: '42%', flexShrink: 0,
        background: `linear-gradient(160deg, ${NAVY_DARK} 0%, ${NAVY} 100%)`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px 48px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(201,168,76,0.08) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: '28px' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v18M3 7l4 8H3m14-8l4 8h-4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 15c0 1.1.9 2 2 2h2a2 2 0 002-2M15 15c0 1.1.9 2 2 2h2a2 2 0 002-2M5 7h14" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{
            fontFamily: 'Playfair Display, Georgia, serif', fontSize: '32px', fontWeight: '600',
            color: '#fff', letterSpacing: '0.02em', lineHeight: 1.2, marginBottom: '12px',
          }}>
            J Brantley Law
          </h1>
          <div style={{ width: '64px', height: '2px', background: GOLD, margin: '0 auto 20px', borderRadius: '2px' }} />
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Account Setup
          </p>
        </div>
        <div style={{ position: 'absolute', bottom: '32px', color: 'rgba(255,255,255,0.2)', fontSize: '11px', letterSpacing: '0.06em' }}>
          CONFIDENTIAL — AUTHORIZED USERS ONLY
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F8FA', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Welcome */}
          <div style={{
            background: `${GOLD}18`, border: `1px solid ${GOLD}40`,
            borderRadius: '8px', padding: '14px 16px', marginBottom: '28px',
            display: 'flex', alignItems: 'flex-start', gap: '10px',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: NAVY, marginBottom: '2px' }}>
                Welcome, {user?.name?.split(' ')[0]}
              </div>
              <div style={{ fontSize: '13px', color: '#6c757d', lineHeight: 1.5 }}>
                Please set a permanent password to secure your account before continuing.
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: '26px', fontWeight: '600', color: NAVY, margin: '0 0 6px' }}>
            Set your password
          </h2>
          <p style={{ color: '#6c757d', fontSize: '14px', margin: '0 0 28px' }}>
            You'll use this to sign in going forward.
          </p>

          <form onSubmit={handleSubmit}>
            {/* New password */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('pw')}
                  onBlur={() => setFocused(null)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  style={inputStyle('pw')}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} tabIndex={-1} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d',
                  display: 'flex', alignItems: 'center', padding: '4px',
                }}>
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCf ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onFocus={() => setFocused('cf')}
                  onBlur={() => setFocused(null)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  style={inputStyle('cf')}
                />
                <button type="button" onClick={() => setShowCf(!showCf)} tabIndex={-1} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d',
                  display: 'flex', alignItems: 'center', padding: '4px',
                }}>
                  <EyeIcon open={showCf} />
                </button>
              </div>
            </div>

            {/* Requirements */}
            {password.length > 0 && (
              <div style={{
                background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px',
                padding: '12px 14px', marginBottom: '20px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', marginBottom: '8px', letterSpacing: '0.04em' }}>
                  PASSWORD REQUIREMENTS
                </div>
                {[
                  { ok: longEnough, text: 'At least 8 characters' },
                  { ok: hasUpper,   text: 'One uppercase letter' },
                  { ok: hasNumber,  text: 'One number' },
                  { ok: matches,    text: 'Passwords match' },
                ].map(({ ok, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <CheckIcon ok={ok} />
                    <span style={{ fontSize: '13px', color: ok ? '#166534' : '#6c757d' }}>{text}</span>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div style={{
                background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030',
                borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '18px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                width: '100%', padding: '13px',
                background: canSubmit ? GOLD : '#e9ecef',
                color: canSubmit ? '#fff' : '#adb5bd',
                border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '600',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                fontFamily: 'Inter, sans-serif', letterSpacing: '0.02em',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { if (canSubmit) e.target.style.background = '#b8943d'; }}
              onMouseLeave={(e) => { if (canSubmit) e.target.style.background = GOLD; }}
            >
              {saving ? 'Setting password…' : 'Set Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
