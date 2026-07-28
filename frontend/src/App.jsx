import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useInactivityLogout } from './hooks/useInactivityLogout';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp';
import ForgotPassword from './pages/ForgotPassword';
import ForceChangePassword from './pages/ForceChangePassword';
import Dashboard from './pages/Dashboard';
import NewReport from './pages/NewReport';
import ReportDetail from './pages/ReportDetail';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import AdminReports from './pages/admin/AdminReports';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminStaff from './pages/admin/AdminStaff';
import AdminAuditLog from './pages/admin/AdminAuditLog';

function RoleHome() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  if (!user) return <LandingPage />;
  if (user.must_change_password) return <Navigate to="/force-change-password" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin/reports' : '/dashboard'} replace />;
}

function RequireLogin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  useInactivityLogout();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<RoleHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/force-change-password" element={<RequireLogin><ForceChangePassword /></RequireLogin>} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/reports/new" element={<ProtectedRoute><NewReport /></ProtectedRoute>} />
        <Route path="/reports/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        <Route path="/admin" element={<Navigate to="/admin/reports" replace />} />
        <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
        <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
        <Route path="/admin/staff" element={<AdminRoute><AdminStaff /></AdminRoute>} />
        <Route path="/admin/audit-log" element={<SuperAdminRoute><AdminAuditLog /></SuperAdminRoute>} />

        <Route path="*" element={<RoleHome />} />
      </Routes>
    </>
  );
}