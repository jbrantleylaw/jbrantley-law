import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const NAVY = '#1B2A4A';
const GOLD  = '#C9A84C';

// ─── helpers ────────────────────────────────────────────────────────────────

const daysUntil = (date) => Math.ceil((new Date(date) - new Date()) / 86400000);

const fmtDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

const STATUS_MAP = {
  open:     { label: 'Open',     bg: '#dcfce7', color: '#166534' },
  pending:  { label: 'Pending',  bg: '#fef3c7', color: '#92400e' },
  closed:   { label: 'Closed',   bg: '#f3f4f6', color: '#374151' },
  inactive: { label: 'Inactive', bg: '#f1f5f9', color: '#64748b' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status];
  if (!s) return null;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: '20px',
      fontSize: '11px', fontWeight: '600', letterSpacing: '0.04em',
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
};

// ─── stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accentColor, icon, urgent }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '10px', padding: '22px 24px',
      border: '1px solid #e9ecef', borderLeft: `4px solid ${accentColor}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
    }}>
      <div>
        <div style={{
          fontSize: '11px', fontWeight: '600', color: '#6c757d',
          letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '10px',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '34px', fontWeight: '700', lineHeight: 1,
          color: urgent && value > 0 ? '#c53030' : NAVY,
        }}>
          {value ?? '—'}
        </div>
        {sub && (
          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '6px' }}>{sub}</div>
        )}
      </div>
      <div style={{ color: urgent && value > 0 ? '#c53030' : accentColor, opacity: 0.75, flexShrink: 0 }}>
        {icon}
      </div>
    </div>
  );
}

// ─── SOL row ────────────────────────────────────────────────────────────────

function SolRow({ matter }) {
  const days = daysUntil(matter.sol_date);
  let rowBg = 'transparent', textColor = '#495057', tagBg, tagColor, tagText;

  if (days < 0) {
    rowBg = '#fff5f5'; textColor = '#c53030';
    tagBg = '#c53030'; tagColor = '#fff'; tagText = `${Math.abs(days)}d OVERDUE`;
  } else if (days <= 7) {
    rowBg = '#fff8f0'; textColor = '#c05621';
    tagBg = '#c05621'; tagColor = '#fff'; tagText = `${days}d left`;
  } else if (days <= 30) {
    rowBg = '#fffaf0'; textColor = '#b7791f';
    tagBg = '#fef3c7'; tagColor = '#92400e'; tagText = `${days}d left`;
  } else if (days <= 90) {
    tagBg = '#f0fdf4'; tagColor = '#166534'; tagText = `${days}d left`;
  }

  return (
    <tr style={{
      background: rowBg,
      borderBottom: '1px solid #f1f3f5',
      transition: 'background 0.1s',
    }}
      onMouseEnter={(e) => { if (!rowBg) e.currentTarget.style.background = '#fafbfc'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = rowBg; }}
    >
      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
        <span style={{
          fontFamily: 'monospace', fontSize: '12px', fontWeight: '600',
          color: NAVY, background: '#f0f2f5', padding: '2px 7px', borderRadius: '4px',
        }}>
          {matter.matter_number}
        </span>
      </td>
      <td style={{ padding: '11px 16px', maxWidth: '200px' }}>
        <div style={{ fontWeight: '500', color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {matter.matter_name}
        </div>
        {matter.client_name && (
          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '1px' }}>{matter.client_name}</div>
        )}
      </td>
      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#6c757d', whiteSpace: 'nowrap' }}>
        {matter.practice_area || '—'}
      </td>
      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
        <div style={{ fontWeight: days <= 30 ? '600' : '400', color: textColor, fontSize: '13px' }}>
          {fmtDate(matter.sol_date)}
        </div>
      </td>
      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
        {tagText && (
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
            fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em',
            background: tagBg, color: tagColor,
          }}>
            {tagText}
          </span>
        )}
      </td>
      <td style={{ padding: '11px 16px' }}>
        <StatusBadge status={matter.status} />
      </td>
    </tr>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  useEffect(() => {
    axios.get('/api/dashboard')
      .then(({ data }) => setData(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const stats    = data?.stats    ?? {};
  const solList  = data?.sol_deadlines  ?? [];
  const recent   = data?.recent_matters ?? [];
  const breakdown = (() => {
    const map = {};
    (data?.status_breakdown ?? []).forEach((r) => { map[r.status] = parseInt(r.count, 10); });
    return map;
  })();
  const totalMatters = Object.values(breakdown).reduce((s, n) => s + n, 0);

  const urgentSol = solList.filter((m) => daysUntil(m.sol_date) <= 30);

  return (
    <Layout>
      <div style={{ padding: '36px 40px', maxWidth: '1300px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{
            fontSize: '26px', fontWeight: '600', color: NAVY,
            fontFamily: 'Playfair Display, Georgia, serif', margin: '0 0 4px',
          }}>
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>{today}</p>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{
                height: '110px', background: '#fff', borderRadius: '10px',
                border: '1px solid #e9ecef', borderLeft: '4px solid #e9ecef',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : error ? (
          <div style={{
            background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030',
            borderRadius: '8px', padding: '20px 24px', fontSize: '14px',
          }}>
            Unable to load dashboard data. Please refresh the page.
          </div>
        ) : (
          <>
            {/* ── Stat cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
              <StatCard
                label="Open Matters"
                value={parseInt(stats.open_matters ?? 0)}
                sub={parseInt(stats.pending_matters ?? 0) > 0 ? `+${stats.pending_matters} pending` : 'No pending'}
                accentColor={NAVY}
                icon={
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                  </svg>
                }
              />
              <StatCard
                label="SOL Due ≤ 30 Days"
                value={parseInt(stats.sol_due_30 ?? 0)}
                sub={
                  parseInt(stats.sol_overdue ?? 0) > 0
                    ? `${stats.sol_overdue} already overdue`
                    : 'None overdue'
                }
                accentColor={parseInt(stats.sol_due_30) > 0 ? '#c53030' : '#166534'}
                urgent
                icon={
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                }
              />
              <StatCard
                label="Opened This Month"
                value={parseInt(stats.opened_this_month ?? 0)}
                sub={`${parseInt(stats.total_matters ?? 0)} matters total`}
                accentColor={GOLD}
                icon={
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
                  </svg>
                }
              />
              <StatCard
                label="Total Contacts"
                value={parseInt(stats.total_contacts ?? 0)}
                sub="Clients, counsel & more"
                accentColor="#5B2D8E"
                icon={
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                }
              />
            </div>

            {/* ── Main grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

              {/* Left: SOL Deadlines */}
              <div style={{
                background: '#fff', borderRadius: '10px', border: '1px solid #e9ecef',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
              }}>
                <div style={{
                  padding: '18px 20px', borderBottom: '1px solid #e9ecef',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: '600', color: NAVY, margin: 0 }}>
                      SOL Deadlines
                    </h2>
                    {urgentSol.length > 0 && (
                      <span style={{
                        background: '#fff5f5', color: '#c53030', border: '1px solid #fed7d7',
                        fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px',
                      }}>
                        {urgentSol.length} urgent
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => navigate('/matters')}
                    style={{
                      background: 'none', border: 'none', color: GOLD, fontSize: '13px',
                      fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      padding: '4px 8px', borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fef9ec'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    View all →
                  </button>
                </div>

                {solList.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dee2e6" strokeWidth="1.2" style={{ marginBottom: '12px' }}>
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <p style={{ color: '#adb5bd', fontSize: '14px', margin: 0 }}>
                      No active SOL deadlines tracked
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          {['Matter #', 'Name / Client', 'Practice Area', 'SOL Date', 'Countdown', 'Status'].map((h) => (
                            <th key={h} style={{
                              padding: '9px 16px', textAlign: 'left', whiteSpace: 'nowrap',
                              fontSize: '10px', fontWeight: '600', color: '#6c757d',
                              letterSpacing: '0.07em', textTransform: 'uppercase',
                              borderBottom: '1px solid #e9ecef',
                            }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {solList.map((m) => <SolRow key={m.id} matter={m} />)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Recent Matters */}
                <div style={{
                  background: '#fff', borderRadius: '10px', border: '1px solid #e9ecef',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '16px 20px', borderBottom: '1px solid #e9ecef',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <h2 style={{ fontSize: '15px', fontWeight: '600', color: NAVY, margin: 0 }}>
                      Recent Matters
                    </h2>
                    <button onClick={() => navigate('/matters')} style={{
                      background: 'none', border: 'none', color: GOLD, fontSize: '13px',
                      fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      padding: '4px 8px', borderRadius: '4px',
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fef9ec'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      View all →
                    </button>
                  </div>

                  {recent.length === 0 ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                      <p style={{ color: '#adb5bd', fontSize: '13px', margin: 0 }}>No matters yet</p>
                    </div>
                  ) : (
                    <div>
                      {recent.map((m, i) => (
                        <div
                          key={m.id}
                          onClick={() => navigate('/matters')}
                          style={{
                            padding: '13px 20px',
                            borderBottom: i < recent.length - 1 ? '1px solid #f1f3f5' : 'none',
                            cursor: 'pointer', transition: 'background 0.1s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#fafbfc'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ overflow: 'hidden', flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                                <span style={{
                                  fontFamily: 'monospace', fontSize: '11px', fontWeight: '600',
                                  color: '#6c757d', background: '#f0f2f5',
                                  padding: '1px 6px', borderRadius: '3px', flexShrink: 0,
                                }}>
                                  {m.matter_number}
                                </span>
                              </div>
                              <div style={{
                                fontSize: '13px', fontWeight: '500', color: NAVY,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {m.matter_name}
                              </div>
                              {m.client_name && (
                                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '1px' }}>
                                  {m.client_name}
                                </div>
                              )}
                            </div>
                            <StatusBadge status={m.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Overview */}
                {totalMatters > 0 && (
                  <div style={{
                    background: '#fff', borderRadius: '10px', border: '1px solid #e9ecef',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '18px 20px',
                  }}>
                    <h2 style={{ fontSize: '15px', fontWeight: '600', color: NAVY, margin: '0 0 16px' }}>
                      Matter Status
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {Object.entries(STATUS_MAP).map(([key, { label, bg, color }]) => {
                        const count = breakdown[key] ?? 0;
                        const pct = totalMatters ? Math.round((count / totalMatters) * 100) : 0;
                        return (
                          <div key={key}>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between',
                              fontSize: '12px', marginBottom: '4px',
                            }}>
                              <span style={{ fontWeight: '500', color: '#495057' }}>{label}</span>
                              <span style={{ color: '#6c757d' }}>{count} <span style={{ color: '#adb5bd' }}>({pct}%)</span></span>
                            </div>
                            <div style={{ height: '6px', background: '#f1f3f5', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${pct}%`,
                                background: color, borderRadius: '3px',
                                transition: 'width 0.6s ease',
                                minWidth: count > 0 ? '4px' : '0',
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </Layout>
  );
}
