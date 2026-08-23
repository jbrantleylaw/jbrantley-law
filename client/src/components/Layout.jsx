import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/axios';

const NAVY = '#1B2A4A';
const NAVY_DARK = '#131f36';
const GOLD = '#C9A84C';

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconGrid = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const IconBriefcase = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
  </svg>
);
const IconChecklist = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconFile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);
const IconScales = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3v18M3 7l4 8H3m14-8l4 8h-4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 15c0 1.1.9 2 2 2h2a2 2 0 002-2M15 15c0 1.1.9 2 2 2h2a2 2 0 002-2M5 7h14" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconBook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
  </svg>
);
const IconClipboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);
const IconScroll = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
  </svg>
);
const IconDollar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
);
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconUpload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IconDownload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const IconMessage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const IconPen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);
const IconBarChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconFlow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="6" height="5" rx="1"/><rect x="15" y="3" width="6" height="5" rx="1"/>
    <rect x="9" y="16" width="6" height="5" rx="1"/>
    <path d="M6 8v3a1 1 0 001 1h10a1 1 0 001-1V8M12 12v4"/>
  </svg>
);

const IconNote = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

// ── Nav structure ─────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: 'MAIN',
    attorneyOnly: false,
    items: [
      { to: '/dashboard', label: 'Home', icon: <IconGrid /> },
      { to: '/intake',    label: 'Intake Hub',     icon: <IconClipboard /> },
      { to: '/messages',  label: 'Messages',       icon: <IconMessage />, badge: 'unread' },
    ],
  },
  {
    label: 'RECORDS',
    attorneyOnly: false,
    items: [
      { to: '/contacts',    label: 'Contacts',         icon: <IconUsers /> },
      { to: '/matters',     label: 'Matters',          icon: <IconBriefcase /> },
      { to: '/documents',   label: 'Documents',        icon: <IconFile /> },
      { to: '/notes',       label: 'Notes',            icon: <IconNote /> },
      { to: '/doc-library', label: 'Document Library', icon: <IconScroll /> },
    ],
  },
  {
    label: 'BILLING',
    attorneyOnly: true,
    items: [
      { to: '/billing',           label: 'Billing & Invoices', icon: <IconDollar /> },
      { to: '/time-entries',      label: 'Time Entries',       icon: <IconClock /> },
      { to: '/billing?tab=trust', label: 'Trust Ledger',       icon: <IconShield />, isTrust: true },
    ],
  },
  {
    label: 'RESOURCES',
    attorneyOnly: false,
    items: [
      { to: '/calendar',    label: 'Calendar',          icon: <IconCalendar /> },
      { to: '/tasks',       label: 'Tasks',             icon: <IconChecklist /> },
      { to: '/workflows',   label: 'Workflow Templates', icon: <IconFlow /> },
      { to: '/playbook',    label: 'Staff Playbook',    icon: <IconBook /> },
      { to: '/esignature',  label: 'E-Signature',       icon: <IconPen /> },
    ],
  },
  {
    label: 'EXPORT',
    attorneyOnly: true,
    items: [
      { to: '/reports',   label: 'Reports',       icon: <IconBarChart /> },
      { to: '/pp-export', label: 'PP Export',     icon: <IconDownload /> },
      { to: '/pp-import', label: 'Import from PP', icon: <IconUpload /> },
    ],
  },
  {
    label: 'FIRM',
    attorneyOnly: true,
    items: [
      { to: '/settings', label: 'Settings', icon: <IconSettings /> },
    ],
  },
];

const navLinkStyle = ({ isActive }) => ({
  display: 'flex', alignItems: 'center', gap: '10px',
  padding: '9px 16px', borderRadius: '6px',
  borderLeft: `3px solid ${isActive ? GOLD : 'transparent'}`,
  paddingLeft: '13px',
  color: isActive ? GOLD : 'rgba(255,255,255,0.65)',
  background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
  textDecoration: 'none', fontSize: '14px',
  fontWeight: isActive ? '600' : '400',
  fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', cursor: 'pointer',
});

function TrustLink() {
  const location = useLocation();
  const isActive = location.pathname === '/billing' && location.search.includes('tab=trust');
  return (
    <NavLink to="/billing?tab=trust" style={{
      display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px',
      borderRadius: '6px', borderLeft: `3px solid ${isActive ? GOLD : 'transparent'}`,
      paddingLeft: '13px', color: isActive ? GOLD : 'rgba(255,255,255,0.65)',
      background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
      textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? '600' : '400',
      fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', cursor: 'pointer',
    }}>
      <IconShield />Trust Ledger
    </NavLink>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAttorney = user?.role === 'attorney';
  const [unread, setUnread] = useState(0);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [historyLen, setHistoryLen] = useState(1);
  const [notifCount,  setNotifCount]  = useState(0);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [notifList,   setNotifList]   = useState([]);
  const [notifLoaded, setNotifLoaded] = useState(false);

  useEffect(() => {
    setHistoryIdx(i => {
      const next = i + 1;
      setHistoryLen(next);
      return next;
    });
  }, [location.key]);

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    const fetchMsg = () => {
      axios.get('/api/messages/unread-count').then(r => setUnread(r.data.count || 0)).catch(() => {});
    };
    fetchMsg();
    const interval = setInterval(fetchMsg, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchCount = () => {
      axios.get('/api/notifications/count').then(r => setNotifCount(r.data.count || 0)).catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const openNotifs = async () => {
    setNotifOpen(o => !o);
    if (!notifLoaded) {
      try {
        const { data } = await axios.get('/api/notifications?limit=11&offset=0');
        const hasMore = data.length > 10;
        setNotifList(hasMore ? data.slice(0, 10) : data);
        setNotifHasMore(hasMore);
        setNotifOffset(0);
        setNotifLoaded(true);
      } catch {}
    }
  };

  const markRead = async (id) => {
    await axios.put(`/api/notifications/${id}/read`).catch(() => {});
    setNotifList(l => l.map(n => n.id === id ? { ...n, read: true } : n));
    setNotifCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await axios.put('/api/notifications/read-all').catch(() => {});
    setNotifList(l => l.map(n => ({ ...n, read: true })));
    setNotifCount(0);
  };

  const deleteNotif = async (id) => {
    const wasUnread = notifList.find(n => n.id === id && !n.read);
    await axios.delete(`/api/notifications/${id}`).catch(() => {});
    setNotifList(l => l.filter(n => n.id !== id));
    if (wasUnread) setNotifCount(c => Math.max(0, c - 1));
  };

  const fmtNotifTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1)  return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const [notifOffset, setNotifOffset] = useState(0);
  const [notifHasMore, setNotifHasMore] = useState(false);
  const [notifLoadingMore, setNotifLoadingMore] = useState(false);

  const NOTIF_ICONS = {
    new_message:       (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    document_viewed:   (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    document_signed:   (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
    document_declined: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    task_assigned:     (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
    task_due:          (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    sol_alert_30:      (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    sol_alert_60:      (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    intake_submitted:  (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z"/></svg>,
    matter_assigned:   (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
    info:              (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    success:           (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
    warning:           (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    error:             (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  };

  const NOTIF_COLORS = {
    new_message: '#0369a1', document_viewed: '#6c757d', document_signed: '#166534',
    document_declined: '#c53030', task_assigned: '#5B2D8E', task_due: '#92400e',
    sol_alert_30: '#c53030', sol_alert_60: '#c05621', intake_submitted: '#1B2A4A',
    matter_assigned: '#0369a1', info: '#0369a1', success: '#166534',
    warning: '#92400e', error: '#c53030',
  };

  const getNotifIcon = (type) => {
    const color = NOTIF_COLORS[type] || '#0369a1';
    const fn = NOTIF_ICONS[type] || NOTIF_ICONS.info;
    return (
      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {fn(color)}
      </div>
    );
  };

  const loadMoreNotifs = async () => {
    setNotifLoadingMore(true);
    try {
      const nextOffset = notifOffset + 10;
      const { data } = await axios.get(`/api/notifications?limit=11&offset=${nextOffset}`);
      const hasMore = data.length > 10;
      setNotifList(l => [...l, ...(hasMore ? data.slice(0, 10) : data)]);
      setNotifOffset(nextOffset);
      setNotifHasMore(hasMore);
    } catch {} finally { setNotifLoadingMore(false); }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <aside style={{ width: '240px', flexShrink: 0, background: NAVY_DARK, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconScales />
            <div>
              <div style={{ color: '#fff', fontFamily: 'Playfair Display, Georgia, serif', fontSize: '15px', fontWeight: '600', lineHeight: 1.2 }}>J Brantley Law</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', letterSpacing: '0.08em', marginTop: '2px' }}>CASE MANAGEMENT</div>
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <nav style={{ flex: 1, padding: '12px 12px 8px', display: 'flex', flexDirection: 'column' }}>
          {NAV_SECTIONS.map((section) => {
            if (section.attorneyOnly && !isAttorney) return null;
            return (
              <div key={section.label} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', padding: '10px 16px 4px', textTransform: 'uppercase' }}>
                  {section.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {section.items.map((item) => {
                    if (item.isTrust) return <TrustLink key="trust" />;
                    return (
                      <NavLink key={item.to} to={item.to} end={item.to === '/billing'} style={navLinkStyle}>
                        {item.icon}
                        {item.label}
                        {item.badge === 'unread' && unread > 0 && (
                          <span style={{ marginLeft: 'auto', background: GOLD, color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: '10px', fontWeight: '700', minWidth: 18, textAlign: 'center' }}>
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '16px 16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
              {user?.name?.charAt(0) ?? '?'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: '100%', padding: '7px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '5px', color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.35)'; e.target.style.color = 'rgba(255,255,255,0.8)'; }}
            onMouseLeave={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.color = 'rgba(255,255,255,0.5)'; }}>
            Sign Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, marginLeft: '240px', minHeight: '100vh', background: '#F7F8FA', overflowX: 'hidden' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 90, background: '#F7F8FA', display: 'flex', gap: '6px', padding: '10px 16px 6px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e9ecef' }}>
          {/* Back / Forward */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => { setHistoryIdx(i => i - 1); navigate(-1); }}
              disabled={historyIdx <= 1} title="Go back"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'28px', height:'28px', borderRadius:'50%', border:'1px solid #dee2e6', background:'#fff', cursor: historyIdx <= 1 ? 'not-allowed' : 'pointer', color: historyIdx <= 1 ? '#ced4da' : '#495057', transition:'all .15s' }}
              onMouseEnter={(e) => { if (historyIdx > 1) { e.currentTarget.style.borderColor=NAVY; e.currentTarget.style.color=NAVY; }}}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.color= historyIdx <= 1 ? '#ced4da' : '#495057'; }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button onClick={() => { setHistoryIdx(i => i + 1); navigate(1); }}
              disabled={historyIdx >= historyLen} title="Go forward"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'28px', height:'28px', borderRadius:'50%', border:'1px solid #dee2e6', background:'#fff', cursor: historyIdx >= historyLen ? 'not-allowed' : 'pointer', color: historyIdx >= historyLen ? '#ced4da' : '#495057', transition:'all .15s' }}
              onMouseEnter={(e) => { if (historyIdx < historyLen) { e.currentTarget.style.borderColor=NAVY; e.currentTarget.style.color=NAVY; }}}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.color= historyIdx >= historyLen ? '#ced4da' : '#495057'; }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button onClick={openNotifs} title="Notifications"
              style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', width:'34px', height:'34px', borderRadius:'50%', border:'1px solid #dee2e6', background:'#fff', cursor:'pointer', color:'#495057', transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=NAVY; e.currentTarget.style.color=NAVY; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.color='#495057'; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {notifCount > 0 && (
                <span style={{ position:'absolute', top:'-3px', right:'-3px', background:'#c53030', color:'#fff', borderRadius:'10px', fontSize:'9px', fontWeight:'700', minWidth:'16px', height:'16px', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px', lineHeight:1 }}>
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div style={{ position:'fixed', inset:0, zIndex:149 }} onClick={() => setNotifOpen(false)} />
                <div style={{ position:'absolute', top:'40px', right:0, width:'340px', background:'#fff', border:'1px solid #e9ecef', borderRadius:'10px', boxShadow:'0 8px 32px rgba(0,0,0,.14)', zIndex:150, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f3f5', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:'13px', fontWeight:'700', color:NAVY }}>Notifications</span>
                    {notifCount > 0 && (
                      <button onClick={markAllRead}
                        style={{ fontSize:'11px', color:GOLD, background:'none', border:'none', cursor:'pointer', fontWeight:'600', padding:0 }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight:'380px', overflowY:'auto' }}>
                    {notifList.length === 0 ? (
                      <div style={{ padding:'32px 16px', textAlign:'center', color:'#adb5bd', fontSize:'13px' }}>No notifications</div>
                    ) : notifList.map(n => (
                      <div key={n.id}
                        style={{ padding:'10px 16px', borderBottom:'1px solid #f8f9fa', background: n.read ? '#fff' : '#fffdf5', borderLeft: n.read ? '3px solid transparent' : `3px solid ${GOLD}`, display:'flex', gap:'10px', alignItems:'flex-start', transition:'background .1s' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#f8f9fa'}
                        onMouseLeave={e=>e.currentTarget.style.background=n.read?'#fff':'#fffdf5'}>
                        {getNotifIcon(n.type)}
                        <div style={{ flex:1, minWidth:0, cursor: n.link ? 'pointer' : 'default' }}
                          onClick={() => { if (n.link) { navigate(n.link); setNotifOpen(false); } if (!n.read) markRead(n.id); }}>
                          <div style={{ fontSize:'12px', fontWeight: n.read ? '400' : '600', color:NAVY, marginBottom:'2px' }}>{n.title}</div>
                          {n.body && <div style={{ fontSize:'11px', color:'#6c757d', lineHeight:'1.5', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.body}</div>}
                          <div style={{ fontSize:'10px', color:'#adb5bd', marginTop:'3px' }}>{fmtNotifTime(n.created_at)}</div>
                        </div>
                        <div style={{ display:'flex', gap:'4px', flexShrink:0 }}>
                          {!n.read && (
                            <button onClick={()=>markRead(n.id)} title="Mark read"
                              style={{ background:'none', border:'none', cursor:'pointer', color:'#adb5bd', fontSize:'11px', padding:'2px 4px' }}
                              onMouseEnter={e=>e.currentTarget.style.color=GOLD}
                              onMouseLeave={e=>e.currentTarget.style.color='#adb5bd'}>✓</button>
                          )}
                          <button onClick={()=>deleteNotif(n.id)} title="Dismiss"
                            style={{ background:'none', border:'none', cursor:'pointer', color:'#adb5bd', fontSize:'14px', padding:'0 4px', lineHeight:1 }}
                            onMouseEnter={e=>e.currentTarget.style.color='#c53030'}
                            onMouseLeave={e=>e.currentTarget.style.color='#adb5bd'}>×</button>
                        </div>
                      </div>
                    ))}
                    {notifHasMore && (
                      <div style={{ padding:'10px 16px', textAlign:'center', borderTop:'1px solid #f1f3f5' }}>
                        <button onClick={loadMoreNotifs} disabled={notifLoadingMore}
                          style={{ background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:GOLD, fontWeight:'600', padding:'4px 8px' }}
                          onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'}
                          onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>
                          {notifLoadingMore ? 'Loading…' : 'Load more'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
