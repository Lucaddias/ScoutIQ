/**
 * Módulo de Autenticação e Gestão de Sessões de Usuários.
 * Integra-se com o Supabase Auth e a tabela `profiles` para roles persistentes.
 * @module context/AuthContext
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

/**
 * Busca o perfil de um usuário na tabela profiles pelo seu UUID.
 * @param {string} userId
 * @returns {Promise<{role: string, name: string, email: string}|null>}
 */
async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

/**
 * Provedor de contexto de autenticação.
 * Roles são lidas da tabela `profiles` (fonte de verdade).
 * allUsers é carregado do Supabase, não do localStorage.
 */
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);

  /**
   * Carrega todos os perfis do banco (para o painel admin).
   */
  const loadAllUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .order('name', { ascending: true });
    if (!error && data) setAllUsers(data);
  }, []);

  /**
   * Constrói a sessão interna lendo a role da tabela profiles.
   * A tabela profiles é a fonte de verdade para roles.
   */
  const buildSession = useCallback(async (supaUser) => {
    if (!supaUser) return null;
    const profile = await fetchProfile(supaUser.id);
    const meta = supaUser.user_metadata || {};
    return {
      id:    supaUser.id,
      email: supaUser.email,
      name:  profile?.name || meta.name || supaUser.email?.split('@')[0]?.replace(/[._]/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 'Usuário',
      role:  profile?.role || meta.role || 'user',
    };
  }, []);

  /**
   * Inicializa a sessão ao montar e escuta eventos de autenticação.
   * Usa apenas onAuthStateChange (Supabase v2 dispara INITIAL_SESSION imediatamente),
   * evitando a dupla chamada paralela que dobrava o tempo de carregamento.
   */
  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (!settled) { settled = true; setLoading(false); }
    };

    // Timeout de segurança: projeto pausado ou rede lenta não travam a UI.
    const safetyTimer = setTimeout(finish, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (session?.user) {
            const s = await buildSession(session.user);
            setUser(s);
            // Carrega lista de usuários apenas para admins (evita query desnecessária)
            if (s?.role === 'admin') await loadAllUsers();
          } else {
            setUser(null);
            setAllUsers([]);
          }
        } catch (err) {
          console.error('Erro ao processar evento de autenticação:', err);
        } finally {
          clearTimeout(safetyTimer);
          finish();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [buildSession, loadAllUsers]);

  /**
   * Autentica um usuário usando e-mail e senha via Supabase Auth.
   */
  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      const session = await buildSession(data.user);
      setUser(session);
      if (session?.role === 'admin') await loadAllUsers();
      return { success: true, user: session };
    } catch {
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  };

  /**
   * Cadastra uma nova conta. O trigger no banco cria automaticamente o perfil.
   */
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
      if (error) return { success: false, error: error.message };
      if (data.user) {
        const session = await buildSession(data.user);
        setUser(session);
        if (session?.role === 'admin') await loadAllUsers();
        return { success: true, user: session };
      }
      return { success: true, needsConfirmation: true };
    } catch {
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  };

  /**
   * Encerra a sessão ativa.
   */
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAllUsers([]);
  };

  /**
   * Login de demonstração local (sem persistência no banco).
   * Role 'user' para não conceder privilégios administrativos ao visitante.
   */
  const loginAsGuest = () => {
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
   * Altera a role de qualquer usuário na tabela profiles (exclusivo para admins).
   * Persiste no banco e atualiza o estado local imediatamente.
   *
   * @param {string} userId - UUID do usuário alvo.
   * @param {string} newRole - Nova role ('user' | 'scout' | 'admin').
   */
  const setUserRole = async (userId, newRole) => {
    // Apenas admins podem chamar esta função
    if (!user || user.role !== 'admin') throw new Error('Acesso negado: requer permissão de administrador.');
    const VALID_ROLES = ['user', 'scout', 'admin'];
    if (!VALID_ROLES.includes(newRole)) throw new Error('Papel inválido.');

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('Erro ao alterar role:', error.message);
      throw error;
    }

    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));

    if (user.id === userId) {
      setUser(prev => ({ ...prev, role: newRole }));
      if (newRole !== 'admin') setAllUsers([]);
    }
  };

  /**
   * Permite que um usuário comum eleve-se para 'scout' (auto-upgrade).
   * Exclusivo para a transição user → scout; não pode ser usado para escalar a admin.
   *
   * @param {string} targetRole - Apenas 'scout' é aceito.
   */
  const upgradeRole = async (targetRole) => {
    if (!user) return;
    if (user.role !== 'user' || targetRole !== 'scout') {
      throw new Error('Escalação de privilégio não autorizada.');
    }
    // Rejeita sessões de visitante (ID local, sem registro no banco)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Requer sessão autenticada para alterar permissões.');

    const { error } = await supabase
      .from('profiles')
      .update({ role: targetRole })
      .eq('id', user.id);
    if (error) throw error;

    setUser(prev => ({ ...prev, role: targetRole }));
    setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: targetRole } : u));
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
