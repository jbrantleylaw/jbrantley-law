import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import ContactForm from '../components/ContactForm';

const NAVY = '#1B2A4A';
const GOLD = '#C9A84C';

const TYPE_MAP = {
  client:            { label: 'Client',           bg: '#1B2A4A', color: '#fff' },
  opposing_counsel:  { label: 'Opposing Counsel', bg: '#7B1C1C', color: '#fff' },
  expert:            { label: 'Expert Witness',   bg: '#5B2D8E', color: '#fff' },
  vendor:            { label: 'Vendor',           bg: '#2D5016', color: '#fff' },
  witness:           { label: 'Witness',          bg: '#1A5F6B', color: '#fff' },
  other:             { label: 'Other',            bg: '#e9ecef', color: '#495057' },
};

const TypeBadge = ({ type }) => {
  const t = TYPE_MAP[type];
  if (!t) return null;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px', borderRadius: '20px',
      fontSize: '11px', fontWeight: '600', letterSpacing: '0.04em',
      background: t.bg, color: t.color, whiteSpace: 'nowrap',
    }}>
      {t.label}
    </span>
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

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const searchTimer = useRef(null);

  const fetchContacts = useCallback(async (s, t, sf = 'all') => {
    setLoading(true);
    try {
      const params = {};
      if (s) params.search = s;
      if (t) params.type = t;
      if (sf && sf !== 'all') params.status = sf;
      const { data } = await axios.get('/api/contacts', { params });
      setContacts(data);
    } catch {
      showToast('Failed to load contacts.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts('', '', 'all'); }, [fetchContacts]);

  useEffect(() => {
    const close = () => setMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchContacts(val, typeFilter, statusFilter), 300);
  };

  const handleTypeChange = (e) => {
    const val = e.target.value;
    setTypeFilter(val);
    fetchContacts(search, val, statusFilter);
  };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
    fetchContacts('', '', statusFilter);
  };

  const changeStatus = async (id, newStatus) => {
    try {
      await axios.patch(`/api/contacts/${id}/status`, { status: newStatus });
      setMenuOpen(null);
      fetchContacts(search, typeFilter, statusFilter);
      const label = newStatus === 'active' ? 'restored to active' : newStatus === 'closed' ? 'closed' : 'archived';
      showToast(`Contact ${label}.`);
    } catch {
      showToast('Failed to update contact status.', 'error');
    }
  };

  const openMenu = (e, contact) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuOpen({ id: contact.id, contact, top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaved = (contact, action) => {
    fetchContacts(search, typeFilter, statusFilter);
    showToast(`Contact ${action === 'created' ? 'added' : 'updated'} successfully.`);
  };

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (c) => { setEditing(c); setFormOpen(true); };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await axios.delete(`/api/contacts/${id}`);
      setDeleteId(null);
      fetchContacts(search, typeFilter, statusFilter);
      showToast('Contact deleted.');
    } catch {
      showToast('Failed to delete contact.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = search || typeFilter;
  const deleteTarget = contacts.find((c) => c.id === deleteId);

  return (
    <Layout>
      <div style={{ padding: '36px 40px', maxWidth: '1200px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '600', color: NAVY, fontFamily: 'Playfair Display, Georgia, serif', margin: 0 }}>
              Contacts
            </h1>
            <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '4px' }}>
              {loading ? 'Loading…' : `${contacts.length} contact${contacts.length !== 1 ? 's' : ''}${hasFilters ? ' found' : ''}`}
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Contact
          </button>
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e9ecef', marginBottom: '20px' }}>
          {[['all', 'All'], ['active', 'Active'], ['closed', 'Closed'], ['archived', 'Archived']].map(([val, label]) => (
            <button key={val} onClick={() => { setStatusFilter(val); fetchContacts(search, typeFilter, val); }} style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: statusFilter === val ? '700' : '400',
              color: statusFilter === val ? NAVY : '#6c757d',
              borderBottom: `2px solid ${statusFilter === val ? NAVY : 'transparent'}`,
              marginBottom: '-1px', fontFamily: 'Inter, sans-serif', transition: 'color .15s',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{
          display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '360px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }}>
              <IconSearch />
            </span>
            <input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name, company, email…"
              style={{
                width: '100%', padding: '9px 12px 9px 38px',
                border: '1.5px solid #dee2e6', borderRadius: '6px',
                fontSize: '14px', fontFamily: 'Inter, sans-serif',
                outline: 'none', background: '#fff', boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = GOLD}
              onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
            />
          </div>

          <select
            value={typeFilter}
            onChange={handleTypeChange}
            style={{
              padding: '9px 36px 9px 12px', border: '1.5px solid #dee2e6',
              borderRadius: '6px', fontSize: '14px', fontFamily: 'Inter, sans-serif',
              background: '#fff', cursor: 'pointer', outline: 'none',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236c757d\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
            }}
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_MAP).map(([val, { label }]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          {hasFilters && (
            <button onClick={clearFilters} style={{
              background: 'none', border: 'none', color: '#6c757d', fontSize: '13px',
              cursor: 'pointer', textDecoration: 'underline', padding: '0 4px',
            }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{
          background: '#fff', borderRadius: '10px',
          border: '1px solid #e9ecef',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '80px', textAlign: 'center', color: '#adb5bd', fontSize: '14px' }}>
              Loading contacts…
            </div>
          ) : contacts.length === 0 ? (
            <div style={{ padding: '80px 40px', textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dee2e6" strokeWidth="1.2" style={{ marginBottom: '16px' }}>
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#adb5bd', margin: '0 0 6px' }}>
                {hasFilters ? 'No contacts match your search' : 'No contacts yet'}
              </h3>
              <p style={{ fontSize: '14px', color: '#ced4da', margin: '0 0 20px' }}>
                {hasFilters ? 'Try adjusting your filters.' : 'Add your first contact to get started.'}
              </p>
              {!hasFilters && (
                <button onClick={openAdd} style={{
                  padding: '9px 20px', background: GOLD, border: 'none', borderRadius: '6px',
                  color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  + Add Contact
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                  {['Name', 'Status', 'Type', 'Company', 'Phone', 'Email', ''].map((h) => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left',
                      fontSize: '11px', fontWeight: '600', color: '#6c757d',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => {
                  const isConfirming = deleteId === c.id;
                  const isClosed = (c.status || 'active') === 'closed';
                  const isArchived = (c.status || 'active') === 'archived';
                  const muted = isClosed || isArchived;
                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: i < contacts.length - 1 ? '1px solid #f1f3f5' : 'none',
                        background: isConfirming ? '#fff5f5' : 'transparent',
                        opacity: muted ? 0.65 : 1,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => { if (!isConfirming) e.currentTarget.style.background = '#fafbfc'; }}
                      onMouseLeave={(e) => { if (!isConfirming) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '13px 16px', fontWeight: '500', color: muted ? '#6c757d' : NAVY, whiteSpace: 'nowrap' }}>
                        {c.last_name}, {c.first_name}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        {isClosed ? (
                          <span style={{ fontSize: '11px', fontWeight: '600', background: '#f1f3f5', color: '#6c757d', padding: '2px 8px', borderRadius: '12px' }}>Closed</span>
                        ) : isArchived ? (
                          <span style={{ fontSize: '11px', fontWeight: '600', background: '#f1f3f5', color: '#9ca3af', padding: '2px 8px', borderRadius: '12px' }}>Archived</span>
                        ) : (
                          <span style={{ fontSize: '11px', fontWeight: '600', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px' }}>Active</span>
                        )}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <TypeBadge type={c.contact_type} />
                      </td>
                      <td style={{ padding: '13px 16px', color: '#495057' }}>
                        {c.company || <span style={{ color: '#ced4da' }}>—</span>}
                      </td>
                      <td style={{ padding: '13px 16px', color: '#495057', whiteSpace: 'nowrap' }}>
                        {c.phone || <span style={{ color: '#ced4da' }}>—</span>}
                      </td>
                      <td style={{ padding: '13px 16px', color: '#495057' }}>
                        {c.email ? (
                          <a href={`mailto:${c.email}`} style={{ color: NAVY, textDecoration: 'none' }}
                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
                            {c.email}
                          </a>
                        ) : <span style={{ color: '#ced4da' }}>—</span>}
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {isConfirming ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '13px', color: '#c53030' }}>
                              Delete {c.first_name} {c.last_name}?
                            </span>
                            <button onClick={() => handleDelete(c.id)} disabled={deleting} style={{
                              padding: '4px 12px', background: '#c53030', border: 'none',
                              borderRadius: '4px', color: '#fff', fontSize: '12px', fontWeight: '600',
                              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
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
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', opacity: 0 }} className="row-actions"
                            ref={(el) => {
                              if (el) {
                                el.closest('tr').addEventListener('mouseenter', () => el.style.opacity = 1);
                                el.closest('tr').addEventListener('mouseleave', () => el.style.opacity = 0);
                              }
                            }}
                          >
                            <button onClick={() => openEdit(c)} title="Edit" style={{
                              background: 'none', border: '1px solid #dee2e6', borderRadius: '5px',
                              padding: '5px 8px', cursor: 'pointer', color: '#6c757d',
                              display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                            }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.color = NAVY; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.color = '#6c757d'; }}
                            >
                              <IconEdit />
                            </button>
                            <button onClick={(e) => openMenu(e, c)} title="More options" style={{
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
                            <button onClick={() => setDeleteId(c.id)} title="Delete" style={{
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
          style={{ position: 'fixed', top: menuOpen.top, right: menuOpen.right, background: '#fff', border: '1px solid #e9ecef', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,.12)', zIndex: 1000, minWidth: '170px', overflow: 'hidden' }}>
          {(menuOpen.contact.status || 'active') !== 'active' && (
            <button onClick={() => changeStatus(menuOpen.id, 'active')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', fontSize: '13px', color: '#166534', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              ↺ Restore to Active
            </button>
          )}
          {(menuOpen.contact.status || 'active') !== 'closed' && (
            <button onClick={() => changeStatus(menuOpen.id, 'closed')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', fontSize: '13px', color: '#495057', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              ✕ Close Contact
            </button>
          )}
          {(menuOpen.contact.status || 'active') !== 'archived' && (
            <button onClick={() => changeStatus(menuOpen.id, 'archived')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', fontSize: '13px', color: '#c53030', cursor: 'pointer', fontFamily: 'Inter, sans-serif', borderTop: '1px solid #f1f3f5' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              Archive
            </button>
          )}
        </div>
      )}

      {/* Add/Edit form */}
      <ContactForm
        isOpen={formOpen}
        contact={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={handleSaved}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '28px', right: '28px',
          background: toast.type === 'error' ? '#c53030' : '#276749',
          color: '#fff', padding: '12px 20px', borderRadius: '7px',
          fontSize: '14px', fontWeight: '500', zIndex: 400,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          animation: 'slideUp 0.2s ease',
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
