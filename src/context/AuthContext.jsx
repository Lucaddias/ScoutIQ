/**
 * Módulo de Autenticação e Gestão de Sessões de Usuários.
 * Fala exclusivamente com a API Express (JWT). O Supabase não é mais acessado
 * pelo navegador — o token é guardado no localStorage e enviado em cada requisição.
 * @module context/AuthContext
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setToken, clearToken, getToken } from '../lib/api.js';

const AuthContext = createContext(null);

/**
 * Provedor de contexto de autenticação.
 * A sessão é reconstruída a partir do JWT salvo (via `GET /auth/me`).
 * allUsers é carregado da API (apenas para admins).
 */
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);

  /**
   * Carrega todos os perfis do servidor (apenas admin tem permissão).
   */
  const loadAllUsers = useCallback(async () => {
    try {
      const { users } = await api.get('/users');
      setAllUsers(users || []);
    } catch {
      setAllUsers([]);
    }
  }, []);

  /**
   * Restaura a sessão ao montar: se houver token salvo, busca o usuário em `/auth/me`.
   * Também escuta o evento `scoutiq:unauthorized` (disparado pelo api.js em 401)
   * para derrubar a sessão automaticamente quando o token expira/é inválido.
   */
  useEffect(() => {
    let active = true;

    (async () => {
      if (!getToken()) { setLoading(false); return; }
      try {
        const { user: me } = await api.get('/auth/me');
        if (!active) return;
        setUser(me);
        if (me?.role === 'admin') await loadAllUsers();
      } catch {
        clearToken();
      } finally {
        if (active) setLoading(false);
      }
    })();

    const onUnauthorized = () => { setUser(null); setAllUsers([]); };
    window.addEventListener('scoutiq:unauthorized', onUnauthorized);

    return () => {
      active = false;
      window.removeEventListener('scoutiq:unauthorized', onUnauthorized);
    };
  }, [loadAllUsers]);

  /**
   * Autentica via `POST /auth/login`. Persiste o token e popula a sessão.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  const login = async (email, password) => {
    try {
      const { token, user: u } = await api.post('/auth/login', { email, password });
      setToken(token);
      setUser(u);
      if (u?.role === 'admin') loadAllUsers();
      return { success: true, user: u };
    } catch (err) {
      return { success: false, error: err.message || 'Erro de conexão. Tente novamente.' };
    }
  };

  /**
   * Cadastra uma nova conta via `POST /auth/register` e já autentica.
   *
   * @param {string} email
   * @param {string} password
   * @param {string} [name]
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  const signup = async (email, password, name) => {
    try {
      const { token, user: u } = await api.post('/auth/register', { email, password, name });
      setToken(token);
      setUser(u);
      return { success: true, user: u };
    } catch (err) {
      return { success: false, error: err.message || 'Erro de conexão. Tente novamente.' };
    }
  };

  /**
   * Encerra a sessão: remove o token e limpa o estado local.
   */
  const logout = async () => {
    clearToken();
    setUser(null);
    setAllUsers([]);
  };

  /**
   * Login de demonstração local (sem token; não acessa o servidor).
   * Role 'user' para não conceder privilégios administrativos ao visitante.
   */
  const loginAsGuest = () => {
    clearToken();
    const guestSession = {
      id:    'guest-' + Date.now(),
      name:  'Visitante (Demo)',
      email: 'demo@scoutiq.com',
      role:  'user',
    };
    setUser(guestSession);
    return { success: true, user: guestSession };
  };

  /**
   * Altera a role de qualquer usuário (exclusivo para admins) via API.
   *
   * @param {string} userId - UUID do usuário alvo.
   * @param {string} newRole - Nova role ('user' | 'scout' | 'admin').
   */
  const setUserRole = async (userId, newRole) => {
    if (!user || user.role !== 'admin') throw new Error('Acesso negado: requer permissão de administrador.');
    const { user: updated } = await api.patch(`/users/${userId}/role`, { role: newRole });

    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: updated.role } : u));

    if (user.id === userId) {
      setUser(prev => ({ ...prev, role: updated.role }));
      if (updated.role !== 'admin') setAllUsers([]);
    }
  };

  /**
   * Permite que um usuário comum eleve-se para 'scout' (auto-upgrade) via API.
   *
   * @param {string} targetRole - Apenas 'scout' é aceito.
   */
  const upgradeRole = async (targetRole) => {
    if (!user) return;
    if (user.role !== 'user' || targetRole !== 'scout') {
      throw new Error('Escalação de privilégio não autorizada.');
    }
    const { user: updated } = await api.patch('/users/me/upgrade');
    setUser(prev => ({ ...prev, role: updated.role }));
    setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: updated.role } : u));
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
      loginAsGuest,
      loadAllUsers,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para consumir o AuthContext.
 * @returns {Object} Contexto de autenticação.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
