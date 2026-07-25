import { createContext, useContext, useEffect, useState } from 'react';
import { loginUser, fetchCurrentUser } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('smartinfra-token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetchCurrentUser()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('smartinfra-token');
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { token, user: loggedInUser } = await loginUser({ email, password });
    localStorage.setItem('smartinfra-token', token);
    setUser(loggedInUser);
    return loggedInUser;
  }

  function logout() {
    localStorage.removeItem('smartinfra-token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading, isAdmin: user?.role === 'admin', isSuperAdmin: !!user?.is_super_admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}