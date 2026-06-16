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
   *
   * IMPORTANTE: o callback NÃO pode ser async nem dar `await` em outras chamadas
   * do Supabase. O auth-js segura um lock interno enquanto dispara o evento; awaitar
   * uma query (ex.: profiles) dentro do callback exige o mesmo lock → deadlock, que
   * trava o signInWithPassword (botão fica em "Aguarde..." para sempre).
   * Por isso, o trabalho pesado (buildSession/loadAllUsers) é adiado com setTimeout(0),
   * executando fora do lock. Ref: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
   */
  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (!settled) { settled = true; setLoading(false); }
    };

    // Timeout de segurança: projeto pausado ou rede lenta não travam a UI.
    const safetyTimer = setTimeout(finish, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          // Sessão rápida síncrona via JWT metadata (não bloqueia o lock do auth-js).
          const meta = session.user.user_metadata || {};
          setUser({
            id:    session.user.id,
            email: session.user.email,
            name:  meta.name || session.user.email?.split('@')[0]?.replace(/[._]/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 'Usuário',
            role:  meta.role || 'user',
          });

          // Trabalho pesado adiado para FORA do lock — busca a role real em profiles.
          setTimeout(async () => {
            try {
              const s = await buildSession(session.user);
              if (s) setUser(s);
              if (s?.role === 'admin') await loadAllUsers();
            } catch (err) {
              console.error('Erro ao processar evento de autenticação:', err);
            }
          }, 0);
        } else {
          setUser(null);
          setAllUsers([]);
        }

        clearTimeout(safetyTimer);
        finish();
      }
    );

    return () => subscription.unsubscribe();
  }, [buildSession, loadAllUsers]);

  /**
   * Autentica um usuário usando e-mail e senha via Supabase Auth.
   * Usa metadados do JWT para sessão imediata; onAuthStateChange busca a role
   * real da tabela profiles em background sem bloquear a navegação.
   */
  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      // Sessão rápida via JWT metadata — evita round-trip extra ao banco
      const u = data.user;
      const meta = u.user_metadata || {};
      const quickSession = {
        id:    u.id,
        email: u.email,
        name:  meta.name || u.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        role:  meta.role || 'user',
      };
      setUser(quickSession);
      // onAuthStateChange dispara em background e atualiza a role real via profiles
      return { success: true, user: quickSession };
    } catch {
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  };

  /**
   * Cadastra uma nova conta. O trigger no banco cria automaticamente o perfil.
   */
  const signup = async (email, password, name) => {
    try {
      const displayName = name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: displayName, role: 'user' } },
      });
      if (error) return { success: false, error: error.message };
      if (data.user) {
        const quickSession = {
          id:    data.user.id,
          email: data.user.email,
          name:  displayName,
          role:  'user',
        };
        setUser(quickSession);
        return { success: true, user: quickSession };
      }
      return { success: true, needsConfirmation: true };
    } catch {
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  };

  /**
   * Encerra a sessão ativa.
   *
   * Tenta revogar a sessão no servidor, mas NÃO deixa uma falha de rede
   * (ex.: "Failed to fetch") impedir o logout local. Sem essa garantia, o
   * supabase-js retorna o erro sem remover a sessão do localStorage, então
   * a UI volta ao login mas o F5 restaura a sessão antiga (usuário "preso").
   */
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch (err) {
      console.warn('signOut no servidor falhou; limpando sessão localmente.', err);
      // Fallback offline: remove a sessão persistida do supabase-js do localStorage.
      try {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
          .forEach((k) => window.localStorage.removeItem(k));
      } catch { /* ambiente sem localStorage */ }
    }
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
