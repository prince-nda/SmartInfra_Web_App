import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="navbar-mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 20V9l8-6 8 6v11" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 20v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="1.4" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span className="navbar-title">SmartInfra</span>
        </Link>

        {user && user.role === 'admin' && (
          <nav className="navbar-links">
            <NavLink to="/admin/reports" className={({ isActive }) => (isActive ? 'active' : '')}>
              Reports
            </NavLink>
            <NavLink to="/admin/analytics" className={({ isActive }) => (isActive ? 'active' : '')}>
              Analytics
            </NavLink>
            <NavLink to="/admin/staff" className={({ isActive }) => (isActive ? 'active' : '')}>
              Staff
            </NavLink>
            {isSuperAdmin && (
              <NavLink to="/admin/audit-log" className={({ isActive }) => (isActive ? 'active' : '')}>
                Audit Log
              </NavLink>
            )}
          </nav>
        )}

        {user && user.role === 'citizen' && (
          <nav className="navbar-links">
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
              My reports
            </NavLink>
            <NavLink to="/reports/new" className={({ isActive }) => (isActive ? 'active' : '')}>
              New report
            </NavLink>
            <NavLink to="/notifications" className={({ isActive }) => (isActive ? 'active' : '')}>
              Notifications
            </NavLink>
          </nav>
        )}

        <div className="navbar-actions">
          <ThemeToggle />
          {user ? (
            <>
              <NavLink to="/profile" className="navbar-user mono">{user.full_name}</NavLink>
              <button className="btn btn-ghost" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn btn-ghost">Log in</NavLink>
              <NavLink to="/register" className="btn btn-primary">Get started</NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}