import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import MatterForm from '../components/MatterForm';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const STATUS_MAP = {
  open:     { label: 'Open',     bg: '#dcfce7', color: '#166534' },
  pending:  { label: 'Pending',  bg: '#fef3c7', color: '#92400e' },
  closed:   { label: 'Closed',   bg: '#f3f4f6', color: '#374151' },
  inactive: { label: 'Inactive', bg: '#f1f5f9', color: '#64748b' },
  on_hold:  { label: 'On Hold',  bg: '#e0f2fe', color: '#0369a1' },
  archived: { label: 'Archived', bg: '#f1f5f9', color: '#9ca3af' },
};

const STATUS_TABS = [
  { val: 'all',      label: 'All' },
  { val: 'open',     label: 'Open' },
  { val: 'pending',  label: 'Pending' },
  { val: 'closed',   label: 'Closed' },
  { val: 'on_hold',  label: 'On Hold' },
  { val: 'archived', label: 'Archived' },
];

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status];
  if (!s) return null;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
      fontSize: '11px', fontWeight: '600', letterSpacing: '0.04em',
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
};

const SolDate = ({ date }) => {
  if (!date) return <span style={{ color: '#ced4da' }}>—</span>;
  const sol = new Date(date);
  const days = Math.ceil((sol - new Date()) / 86400000);
  const fmt = sol.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let color = '#495057';
  let tag = null;

  if (days < 0) {
    color = '#c53030';
    tag = { text: `${Math.abs(days)}d overdue`, bg: '#fff5f5' };
  } else if (days <= 30) {
    color = '#c05621';
    tag = { text: `${days}d left`, bg: '#fffaf0' };
  } else if (days <= 90) {
    color = '#b7791f';
    tag = { text: `${days}d left`, bg: '#fffff0' };
  }

  return (
    <div>
      <span style={{ color, fontWeight: days <= 30 ? '600' : '400' }}>{fmt}</span>
      {tag && (
        <span style={{
          display: 'inline-block', marginLeft: '6px', fontSize: '10px', fontWeight: '700',
          background: tag.bg, color, padding: '1px 6px', borderRadius: '10px',
          letterSpacing: '0.04em',
        }}>
          {tag.text}
        </span>
      )}
    </div>
  );
};

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);

const PRACTICE_AREAS = [
  'Personal Injury','Criminal Defense','Family Law','Estate Planning / Probate',
  'Real Estate','Business / Corporate','Civil Litigation','Employment Law',
  'Immigration','Bankruptcy','Workers Compensation','Social Security Disability','Other',
];

export default function Matters() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [matters, setMatters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [areaFilter, setAreaFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (searchParams.get('new') === 'true') { setEditing(null); setFormOpen(true); }
  }, []);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const searchTimer = useRef(null);

  const fetchMatters = useCallback(async (s, st, a) => {
    setLoading(true);
    try {
      const params = {};
      if (s)  params.search        = s;
      if (st && st !== 'all') params.status = st;
      if (a)  params.practice_area = a;
      const { data } = await axios.get('/api/matters', { params });
      setMatters(data);
    } catch {
      showToast('Failed to load matters.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatters('', 'all', ''); }, [fetchMatters]);

  useEffect(() => {
    const close = () => setMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchMatters(val, statusTab, areaFilter), 300);
  };

  const handleAreaChange = (e) => {
    const val = e.target.value;
    setAreaFilter(val);
    fetchMatters(search, statusTab, val);
  };

  const clearFilters = () => {
    setSearch(''); setAreaFilter('');
    fetchMatters('', statusTab, '');
  };

  const changeStatus = async (id, newStatus) => {
    try {
      await axios.patch(`/api/matters/${id}/status`, { status: newStatus });
      setMenuOpen(null);
      fetchMatters(search, statusTab, areaFilter);
      showToast(`Matter status updated to ${STATUS_MAP[newStatus]?.label || newStatus}.`);
    } catch {
      showToast('Failed to update matter status.', 'error');
    }
  };

  const openMenu = (e, matter) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuOpen({ id: matter.id, matter, top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaved = (_, action) => {
    fetchMatters(search, statusTab, areaFilter);
    showToast(`Matter ${action === 'created' ? 'created' : 'updated'} successfully.`);
  };

  const openAdd   = () => { setEditing(null); setFormOpen(true); };
  const openEdit  = (m) => { setEditing(m);   setFormOpen(true); };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await axios.delete(`/api/matters/${id}`);
      setDeleteId(null);
      fetchMatters(search, statusTab, areaFilter);
      showToast('Matter deleted.');
    } catch {
      showToast('Failed to delete matter.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = search || areaFilter;
  const openCount  = matters.filter((m) => m.status === 'open').length;
  const solSoon    = matters.filter((m) => {
    if (!m.sol_date) return false;
    return Math.ceil((new Date(m.sol_date) - new Date()) / 86400000) <= 30;
  }).length;

  return (
    <Layout>
      <div style={{ padding: '36px 40px', maxWidth: '1300px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '600', color: NAVY, fontFamily: 'Playfair Display, Georgia, serif', margin: 0 }}>
              Matters
            </h1>
            <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '4px' }}>
              {loading ? 'Loading…' : `${matters.length} matter${matters.length !== 1 ? 's' : ''}${hasFilters ? ' found' : ''}`}
              {!loading && !hasFilters && openCount > 0 && (
                <span style={{ marginLeft: '10px', color: '#166534', fontWeight: '500' }}>
                  · {openCount} open
                </span>
              )}
              {!loading && solSoon > 0 && (
                <span style={{ marginLeft: '10px', color: '#c05621', fontWeight: '500' }}>
                  · {solSoon} SOL within 30 days
                </span>
              )}
            </p>
          </div>
          <button
            onClick={openAdd}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px', background: GOLD, border: 'none',
              borderRadius: '6px', color: '#fff', fontSize: '14px', fontWeight: '600',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              boxShadow: '0 2px 8px rgba(201,168,76,0.35)', transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#b8943d'}
            onMouseLeave={(e) => e.currentTarget.style.background = GOLD}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Matter
          </button>
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e9ecef', marginBottom: '20px', flexWrap: 'wrap' }}>
          {STATUS_TABS.map(({ val, label }) => (
            <button key={val} onClick={() => { setStatusTab(val); fetchMatters(search, val, areaFilter); }} style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: statusTab === val ? '700' : '400',
              color: statusTab === val ? NAVY : '#6c757d',
              borderBottom: `2px solid ${statusTab === val ? NAVY : 'transparent'}`,
              marginBottom: '-1px', fontFamily: 'Inter, sans-serif', transition: 'color .15s',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '340px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }}>
              <IconSearch />
            </span>
            <input value={search} onChange={handleSearchChange}
              placeholder="Search matter #, name, or client…"
              style={{
                width: '100%', padding: '9px 12px 9px 38px', border: '1.5px solid #dee2e6',
                borderRadius: '6px', fontSize: '14px', fontFamily: 'Inter, sans-serif',
                outline: 'none', background: '#fff', boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = GOLD}
              onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
            />
          </div>

          {[
            {
              value: areaFilter, onChange: handleAreaChange,
              options: [{ value: '', label: 'All Practice Areas' }, ...PRACTICE_AREAS.map((a) => ({ value: a, label: a }))],
            },
          ].map((sel, i) => (
            <select key={i} value={sel.value} onChange={sel.onChange} style={{
              padding: '9px 36px 9px 12px', border: '1.5px solid #dee2e6',
              borderRadius: '6px', fontSize: '14px', fontFamily: 'Inter, sans-serif',
              background: '#fff', cursor: 'pointer', outline: 'none', appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
            }}>
              {sel.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}

          {hasFilters && (
            <button onClick={clearFilters} style={{
              background: 'none', border: 'none', color: '#6c757d', fontSize: '13px',
              cursor: 'pointer', textDecoration: 'underline', padding: '0 4px',
            }}>Clear filters</button>
          )}
        </div>

        {/* Table */}
        <div style={{
          background: '#fff', borderRadius: '10px', border: '1px solid #e9ecef',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '80px', textAlign: 'center', color: '#adb5bd', fontSize: '14px' }}>
              Loading matters…
            </div>
          ) : matters.length === 0 ? (
            <div style={{ padding: '80px 40px', textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dee2e6" strokeWidth="1.2" style={{ marginBottom: '16px' }}>
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
              </svg>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#adb5bd', margin: '0 0 6px' }}>
                {hasFilters ? 'No matters match your search' : 'No matters yet'}
              </h3>
              <p style={{ fontSize: '14px', color: '#ced4da', margin: '0 0 20px' }}>
                {hasFilters ? 'Try adjusting your filters.' : 'Create your first matter to get started.'}
              </p>
              {!hasFilters && (
                <button onClick={openAdd} style={{
                  padding: '9px 20px', background: GOLD, border: 'none', borderRadius: '6px',
                  color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  + New Matter
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                  {['Matter #', 'Matter Name', 'Client', 'Practice Area', 'Status', 'SOL Date', ''].map((h) => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left',
                      fontSize: '11px', fontWeight: '600', color: '#6c757d',
                      letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matters.map((m, i) => {
                  const isConfirming = deleteId === m.id;
                  return (
                    <tr key={m.id} style={{
                      borderBottom: i < matters.length - 1 ? '1px solid #f1f3f5' : 'none',
                      background: isConfirming ? '#fff5f5' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                      onMouseEnter={(e) => { if (!isConfirming) e.currentTarget.style.background = '#fafbfc'; }}
                      onMouseLeave={(e) => { if (!isConfirming) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                        <span onClick={() => navigate(`/matters/${m.id}`)} style={{
                          fontFamily: 'monospace', fontSize: '13px', fontWeight: '600',
                          color: NAVY, letterSpacing: '0.04em',
                          background: '#f0f2f5', padding: '2px 8px', borderRadius: '4px',
                          cursor: 'pointer', textDecoration: 'none',
                        }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#e8edf5'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#f0f2f5'}
                        >
                          {m.matter_number}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', fontWeight: '500', color: '#1a1a2e', maxWidth: '220px' }}>
                        <div onClick={() => navigate(`/matters/${m.id}`)} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = NAVY}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#1a1a2e'}
                        >
                          {m.matter_name}
                        </div>
                        {m.description && (
                          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '13px 16px', color: '#495057', whiteSpace: 'nowrap' }}>
                        {m.client_name || <span style={{ color: '#ced4da' }}>—</span>}
                      </td>
                      <td style={{ padding: '13px 16px', color: '#6c757d', fontSize: '13px' }}>
                        {m.practice_area || <span style={{ color: '#ced4da' }}>—</span>}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <StatusBadge status={m.status} />
                      </td>
                      <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                        <SolDate date={m.sol_date} />
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {isConfirming ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '13px', color: '#c53030' }}>Delete this matter?</span>
                            <button onClick={() => handleDelete(m.id)} disabled={deleting} style={{
                              padding: '4px 12px', background: '#c53030', border: 'none',
                              borderRadius: '4px', color: '#fff', fontSize: '12px',
                              fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                            }}>
                              {deleting ? '…' : 'Delete'}
                            </button>
                            <button onClick={() => setDeleteId(null)} style={{
                              padding: '4px 10px', background: 'transparent',
                              border: '1px solid #dee2e6', borderRadius: '4px',
                              fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                            }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', opacity: 0 }}
                            ref={(el) => {
                              if (el) {
                                el.closest('tr').addEventListener('mouseenter', () => el.style.opacity = 1);
                                el.closest('tr').addEventListener('mouseleave', () => el.style.opacity = 0);
                              }
                            }}
                          >
                            <button onClick={() => openEdit(m)} title="Edit" style={{
                              background: 'none', border: '1px solid #dee2e6', borderRadius: '5px',
                              padding: '5px 8px', cursor: 'pointer', color: '#6c757d',
                              display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                            }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.color = NAVY; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.color = '#6c757d'; }}
                            >
                              <IconEdit />
                            </button>
                            <button onClick={(e) => openMenu(e, m)} title="More options" style={{
                              background: 'none', border: '1px solid #dee2e6', borderRadius: '5px',
                              padding: '5px 8px', cursor: 'pointer', color: '#6c757d',
                              display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                              fontWeight: '700', fontSize: '14px', letterSpacing: '2px',
                            }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.color = NAVY; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.color = '#6c757d'; }}
                            >
                              ⋯
                            </button>
                            <button onClick={() => setDeleteId(m.id)} title="Delete" style={{
                              background: 'none', border: '1px solid #dee2e6', borderRadius: '5px',
                              padding: '5px 8px', cursor: 'pointer', color: '#6c757d',
                              display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                            }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#c53030'; e.currentTarget.style.color = '#c53030'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.color = '#6c757d'; }}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Three-dot dropdown */}
      {menuOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', top: menuOpen.top, right: menuOpen.right, background: '#fff', border: '1px solid #e9ecef', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,.12)', zIndex: 1000, minWidth: '180px', overflow: 'hidden' }}>
          {menuOpen.matter.status !== 'open' && (
            <button onClick={() => changeStatus(menuOpen.id, 'open')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', fontSize: '13px', color: '#166534', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              ↺ Re-Open Matter
            </button>
          )}
          {menuOpen.matter.status !== 'pending' && menuOpen.matter.status !== 'closed' && (
            <button onClick={() => changeStatus(menuOpen.id, 'pending')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', fontSize: '13px', color: '#92400e', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              Set Pending
            </button>
          )}
          {menuOpen.matter.status !== 'on_hold' && (
            <button onClick={() => changeStatus(menuOpen.id, 'on_hold')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', fontSize: '13px', color: '#0369a1', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              Put On Hold
            </button>
          )}
          {menuOpen.matter.status !== 'closed' && (
            <button onClick={() => changeStatus(menuOpen.id, 'closed')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', fontSize: '13px', color: '#374151', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              ✕ Close Matter
            </button>
          )}
          {menuOpen.matter.status !== 'archived' && (
            <button onClick={() => changeStatus(menuOpen.id, 'archived')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', fontSize: '13px', color: '#c53030', cursor: 'pointer', fontFamily: 'Inter, sans-serif', borderTop: '1px solid #f1f3f5' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              Archive
            </button>
          )}
        </div>
      )}

      <MatterForm
        isOpen={formOpen}
        matter={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={handleSaved}
      />

      {toast && (
        <div style={{
          position: 'fixed', bottom: '28px', right: '28px',
          background: toast.type === 'error' ? '#c53030' : '#276749',
          color: '#fff', padding: '12px 20px', borderRadius: '7px',
          fontSize: '14px', fontWeight: '500', zIndex: 400,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', animation: 'slideUp 0.2s ease',
        }}>
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Layout>
  );
}
