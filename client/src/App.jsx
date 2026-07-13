import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login        from './pages/Login';
import SetPassword  from './pages/SetPassword';
import Dashboard    from './pages/Dashboard';
import Contacts     from './pages/Contacts';
import Matters      from './pages/Matters';
import MatterDetail from './pages/MatterDetail';
import Tasks        from './pages/Tasks';
import CalendarPage from './pages/CalendarPage';
import Documents    from './pages/Documents';
import StaffPlaybook from './pages/StaffPlaybook';
import IntakeHub        from './pages/IntakeHub';
import DocumentLibrary  from './pages/DocumentLibrary';
import Billing          from './pages/Billing';
import PPExport         from './pages/PPExport';
import Settings         from './pages/Settings';
import PPImport         from './pages/PPImport';
import Reports          from './pages/Reports';
import ESignature       from './pages/ESignature';
import Messages         from './pages/Messages';
import SignDocument     from './pages/SignDocument';
import MessagePortal    from './pages/MessagePortal';
import Workflows        from './pages/Workflows';
import TimeEntries      from './pages/TimeEntries';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#1B2A4A', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
      Loading…
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/set-password" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"
        element={user && !user.must_change_password ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      {/* First-login gate */}
      <Route path="/set-password"
        element={
          !user                       ? <Navigate to="/login"     replace /> :
          !user.must_change_password  ? <Navigate to="/dashboard" replace /> :
          <SetPassword />
        }
      />

      {/* Protected */}
      <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/contacts"     element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
      <Route path="/matters"      element={<ProtectedRoute><Matters /></ProtectedRoute>} />
      <Route path="/matters/:id"  element={<ProtectedRoute><MatterDetail /></ProtectedRoute>} />
      <Route path="/tasks"        element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/calendar"     element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/documents"    element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/intake"       element={<ProtectedRoute><IntakeHub /></ProtectedRoute>} />
      <Route path="/doc-library"  element={<ProtectedRoute><DocumentLibrary /></ProtectedRoute>} />
      <Route path="/playbook"     element={<ProtectedRoute><StaffPlaybook /></ProtectedRoute>} />
      <Route path="/billing"      element={<ProtectedRoute><Billing /></ProtectedRoute>} />
      <Route path="/pp-export"    element={<ProtectedRoute><PPExport /></ProtectedRoute>} />
      <Route path="/settings"     element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/pp-import"    element={<ProtectedRoute><PPImport /></ProtectedRoute>} />
      <Route path="/reports"      element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/esignature"   element={<ProtectedRoute><ESignature /></ProtectedRoute>} />
      <Route path="/messages"      element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/workflows"     element={<ProtectedRoute><Workflows /></ProtectedRoute>} />
      <Route path="/time-entries"  element={<ProtectedRoute><TimeEntries /></ProtectedRoute>} />

      {/* Public routes — no auth */}
      <Route path="/sign/:token"              element={<SignDocument />} />
      <Route path="/portal/messages/:token"   element={<MessagePortal />} />

      <Route path="*" element={
        <Navigate to={!user ? '/login' : user.must_change_password ? '/set-password' : '/dashboard'} replace />
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
