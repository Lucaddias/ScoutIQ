import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

const USERS_KEY = 'scoutiq_users';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState(() => {
    const saved = localStorage.getItem(USERS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Persist user list to localStorage (for admin panel)
  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
  }, [allUsers]);

  // Build session object from Supabase user
  const buildSession = (supaUser) => {
    if (!supaUser) return null;
    const meta = supaUser.user_metadata || {};
    return {
      id: supaUser.id,
      name: meta.name || supaUser.email?.split('@')[0]?.replace(/[._]/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 'Usuário',
      email: supaUser.email,
      role: meta.role || 'user',
    };
  };

  // Sync user to allUsers list
  const syncToUserList = (session) => {
    if (!session) return;
    setAllUsers(prev => {
      const exists = prev.find(u => u.id === session.id);
      if (exists) {
        return prev.map(u => u.id === session.id ? { ...u, ...session } : u);
      }
      return [...prev, session];
    });
  };

  // Initialize: restore session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const s = buildSession(session.user);
          setUser(s);
          syncToUserList(s);
        }
      } catch (err) {
        console.error('Erro ao restaurar sessão:', err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const s = buildSession(session.user);
          setUser(s);
          syncToUserList(s);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Login with email + password
  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const session = buildSession(data.user);
      setUser(session);
      syncToUserList(session);
      return { success: true, user: session };
    } catch (err) {
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  };

  // Sign up with email + password + name
  const signup = async (email, password, name) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            role: 'user',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // If email confirmation is disabled, user is logged in immediately
      if (data.user) {
        const session = buildSession(data.user);
        setUser(session);
        syncToUserList(session);
        return { success: true, user: session };
      }

      return { success: true, needsConfirmation: true };
    } catch (err) {
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  };

  // Logout
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Upgrade own role (e.g., user → scout)
  const upgradeRole = async (newRole) => {
    if (!user) return;
    try {
      const { error } = await supabase.auth.updateUser({
        data: { role: newRole },
      });

      if (!error) {
        const updated = { ...user, role: newRole };
        setUser(updated);
        syncToUserList(updated);
      }
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
    }
  };

  // Admin: set another user's role (stored locally since we can't use admin API from frontend)
  const setUserRole = (userId, newRole) => {
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));

    // If changing own role, also update via Supabase
    if (user && user.id === userId) {
      upgradeRole(newRole);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      allUsers,
      login,
      signup,
      logout,
      upgradeRole,
      setUserRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
