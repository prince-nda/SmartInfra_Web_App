import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/force-change-password" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}