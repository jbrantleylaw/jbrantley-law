import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAVY = '#1B2A4A';
const NAVY_DARK = '#131f36';
const GOLD = '#C9A84C';
const GOLD_HOVER = '#b8943d';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%',
    padding: '12px 14px',
    fontSize: '15px',
    border: `1.5px solid ${focusedField === field ? GOLD : '#dee2e6'}`,
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'Inter, sans-serif',
    color: '#1a1a2e',
    background: '#fff',
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* Left panel — branding */}
      <div style={{
        width: '42%',
        background: `linear-gradient(160deg, ${NAVY_DARK} 0%, ${NAVY} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* subtle texture overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(201,168,76,0.08) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />

        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Scales icon */}
          <div style={{ marginBottom: '28px' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v18M3 7l4 8H3m14-8l4 8h-4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 15c0 1.1.9 2 2 2h2a2 2 0 002-2M15 15c0 1.1.9 2 2 2h2a2 2 0 002-2M5 7h14" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h1 style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: '32px',
            fontWeight: '600',
            color: '#ffffff',
            letterSpacing: '0.02em',
            lineHeight: '1.2',
            marginBottom: '12px',
          }}>
            J Brantley Law
          </h1>

          {/* Gold divider */}
          <div style={{
            width: '64px',
            height: '2px',
            background: GOLD,
            margin: '0 auto 20px',
            borderRadius: '2px',
          }} />

          <p style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '13px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: '400',
          }}>
            Case Management Portal
          </p>
        </div>

        {/* Bottom mark */}
        <div style={{
          position: 'absolute',
          bottom: '32px',
          color: 'rgba(255,255,255,0.2)',
          fontSize: '11px',
          letterSpacing: '0.06em',
        }}>
          CONFIDENTIAL — AUTHORIZED USERS ONLY
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F7F8FA',
        padding: '40px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
        }}>
          <h2 style={{
            fontSize: '26px',
            fontWeight: '600',
            color: NAVY,
            marginBottom: '6px',
          }}>
            Welcome back
          </h2>
          <p style={{
            color: '#6c757d',
            fontSize: '14px',
            marginBottom: '36px',
          }}>
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: '#444',
                marginBottom: '6px',
                letterSpacing: '0.01em',
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="you@jbrantleylaw.com"
                required
                autoComplete="email"
                style={inputStyle('email')}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: '#444',
                marginBottom: '6px',
                letterSpacing: '0.01em',
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  style={{ ...inputStyle('password'), paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6c757d',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#fff5f5',
                border: '1px solid #fed7d7',
                color: '#c53030',
                borderRadius: '6px',
                padding: '10px 14px',
                fontSize: '13px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading ? '#d4b878' : GOLD,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.02em',
                transition: 'background 0.2s, transform 0.1s',
              }}
              onMouseEnter={(e) => { if (!loading) e.target.style.background = GOLD_HOVER; }}
              onMouseLeave={(e) => { if (!loading) e.target.style.background = GOLD; }}
              onMouseDown={(e) => { if (!loading) e.target.style.transform = 'scale(0.99)'; }}
              onMouseUp={(e) => { e.target.style.transform = 'scale(1)'; }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
