import { createContext, useContext, useEffect, useState } from 'react';
import { adminApi, authApi } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  // Impersonation state
  const [impersonation, setImpersonation] = useState(() => {
    const savedAdminToken = sessionStorage.getItem('original_admin_token');
    const savedAdminUser = sessionStorage.getItem('original_admin_user');
    if (savedAdminToken && savedAdminUser) {
      try {
        return {
          isImpersonating: true,
          adminToken: savedAdminToken,
          adminUser: JSON.parse(savedAdminUser),
        };
      } catch (e) {
        return { isImpersonating: false, adminToken: null, adminUser: null };
      }
    }
    return { isImpersonating: false, adminToken: null, adminUser: null };
  });

  // Verify token on mount or token change
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('access_token');
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const me = await authApi.getMe();
        setUser(me);
      } catch (err) {
        console.error('Failed to load user profile:', err);
        localStorage.removeItem('access_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('access_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const adminLogin = async (email, password) => {
    const res = await authApi.adminLogin({ email, password });
    localStorage.setItem('access_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (fullName, email, password) => {
    return await authApi.register({ full_name: fullName, email, password });
  };

  const impersonateCustomer = async (targetUser) => {
    // Save current superadmin session
    const currentAdminToken = localStorage.getItem('access_token');
    sessionStorage.setItem('original_admin_token', currentAdminToken);
    sessionStorage.setItem('original_admin_user', JSON.stringify(user));

    // Request impersonation token from backend
    const res = await adminApi.impersonate(targetUser.id);
    localStorage.setItem('access_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);

    setImpersonation({
      isImpersonating: true,
      adminToken: currentAdminToken,
      adminUser: user,
    });

    return res.user;
  };

  const exitImpersonation = () => {
    const savedAdminToken = sessionStorage.getItem('original_admin_token');
    const savedAdminUser = sessionStorage.getItem('original_admin_user');

    if (savedAdminToken && savedAdminUser) {
      localStorage.setItem('access_token', savedAdminToken);
      setToken(savedAdminToken);
      setUser(JSON.parse(savedAdminUser));
    }

    sessionStorage.removeItem('original_admin_token');
    sessionStorage.removeItem('original_admin_user');

    setImpersonation({
      isImpersonating: false,
      adminToken: null,
      adminUser: null,
    });
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('original_admin_token');
    sessionStorage.removeItem('original_admin_user');
    setToken(null);
    setUser(null);
    setImpersonation({ isImpersonating: false, adminToken: null, adminUser: null });
  };

  const isSuperadmin = Boolean(user && (user.is_superuser || user.role === 'superadmin'));

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isSuperadmin,
        impersonation,
        login,
        adminLogin,
        register,
        impersonateCustomer,
        exitImpersonation,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
