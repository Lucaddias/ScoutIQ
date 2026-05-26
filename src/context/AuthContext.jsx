/**
 * Módulo de Autenticação e Gestão de Sessões de Usuários.
 * Integra-se com o Supabase Auth e fornece fallback para sessões locais/guest.
 * @module context/AuthContext
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

/**
 * Representa uma sessão de usuário normalizada no ScoutIQ.
 * @typedef {Object} UserSession
 * @property {string} id - Identificador exclusivo do usuário (UUID do Supabase ou ID provisório).
 * @property {string} name - Nome de exibição do usuário.
 * @property {string} email - Endereço de e-mail do usuário.
 * @property {string} role - Nível de permissão/acesso do usuário ('user', 'admin').
 */

/**
 * Interface do valor do contexto de autenticação exposto pelo useAuth.
 * @typedef {Object} AuthContextProps
 * @property {UserSession|null} user - O usuário atualmente logado ou null.
 * @property {boolean} loading - Sinaliza se a sessão inicial ainda está sendo carregada do Supabase.
 * @property {UserSession[]} allUsers - Lista de todos os usuários registrados localmente (para fins de administração local).
 * @property {function(string, string): Promise<Object>} login - Autentica um usuário usando e-mail e senha.
 * @property {function(string, string, string): Promise<Object>} signup - Cadastra um novo usuário no Supabase.
 * @property {function(): Promise<void>} logout - Encerra a sessão ativa do usuário.
 * @property {function(string): Promise<void>} upgradeRole - Atualiza a role do próprio usuário no Supabase.
 * @property {function(string, string): void} setUserRole - Atualiza a role de outro usuário (salva localmente).
 * @property {function(): Object} loginAsGuest - Efetua login local sob uma conta convidada de teste (Admin).
 */

/**
 * Contexto de autenticação do React.
 * @type {React.Context<AuthContextProps|null>}
 */
const AuthContext = createContext(null);

/**
 * Chave de armazenamento local para a lista de auditoria de usuários.
 * @type {string}
 * @constant
 */
const USERS_KEY = 'scoutiq_users';

/**
 * Provedor de contexto de autenticação.
 * Controla o estado de login, persistência de usuários locais e sincronização com o Supabase.
 *
 * @param {Object} props - Propriedades do componente.
 * @param {React.ReactNode} props.children - Elementos filhos a serem renderizados.
 * @returns {JSX.Element} O componente Provider do React.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /*
   * PERSISTÊNCIA LOCAL (localStorage)
   * allUsers guarda todos os usuários que já fizeram login neste navegador.
   * É inicializado lendo o localStorage para sobreviver a recarregamentos de página.
   * O useEffect abaixo sincroniza a lista sempre que ela muda.
   */
  const [allUsers, setAllUsers] = useState(() => {
    const saved = localStorage.getItem(USERS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
  }, [allUsers]);

  /**
   * Converte o objeto bruto de usuário retornado pelo Supabase para o formato de sessão interna normalizado.
   *
   * @param {Object} supaUser - Objeto de usuário bruto retornado pelo Supabase Auth.
   * @returns {UserSession|null} Objeto contendo os dados do usuário normalizados ou null se supaUser não existir.
   */
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

  /**
   * Adiciona ou atualiza um usuário na lista de sessões locais registradas no localStorage.
   *
   * @param {UserSession} session - O objeto de sessão de usuário a ser sincronizado.
   */
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

  /**
   * Inicializa a sessão ao carregar o componente, recuperando a sessão atual do Supabase
   * e ouvindo eventos de mudança de autenticação (login, logout, token refresh).
   */
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

  /**
   * Autentica um usuário usando e-mail e senha via Supabase Auth.
   * Em caso de sucesso, atualiza o estado local e a lista persistente.
   *
   * @param {string} email - Endereço de e-mail do usuário.
   * @param {string} password - Senha de acesso do usuário.
   * @returns {Promise<Object>} Resultado da tentativa de login. Contém `success` (boolean), `user` (UserSession) ou `error` (string).
   */
  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      const session = buildSession(data.user);
      setUser(session);
      syncToUserList(session);
      return { success: true, user: session };
    } catch (err) {
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  };

  /**
   * Cadastra uma nova conta de usuário usando e-mail e senha no Supabase Auth.
   *
   * @param {string} email - Endereço de e-mail.
   * @param {string} password - Senha de acesso.
   * @param {string} name - Nome de exibição.
   * @returns {Promise<Object>} Resultado do cadastro. Contém `success` (boolean), `user` (UserSession) ou `needsConfirmation` (boolean).
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

  /**
   * Finaliza a sessão ativa do usuário no Supabase e redefine o estado interno.
   *
   * @returns {Promise<void>}
   */
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  /**
   * Efetua o login como convidado de demonstração (Guest Mode).
   * Cria e armazena uma sessão fictícia com privilégios de Admin.
   *
   * @returns {{success: boolean, user: UserSession}} Detalhes da sessão convidada criada.
   */
  const loginAsGuest = () => {
    const guestSession = {
      id: 'guest-' + Date.now(),
      name: 'Visitante (Demo)',
      email: 'demo@scoutiq.com',
      role: 'admin',
    };
    setUser(guestSession);
    syncToUserList(guestSession);
    return { success: true, user: guestSession };
  };

  /**
   * Eleva o nível de acesso (role) do próprio usuário logado no Supabase.
   *
   * @param {string} newRole - A nova role (ex: 'admin', 'user').
   * @returns {Promise<void>}
   */
  const upgradeRole = async (newRole) => {
    if (!user) return;
    try {
      const { error } = await supabase.auth.updateUser({ data: { role: newRole } });
      if (!error) {
        const updated = { ...user, role: newRole };
        setUser(updated);
        syncToUserList(updated);
      }
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
    }
  };

  /**
   * Altera a role de outro usuário específico (função exclusiva de administradores).
   * Salva as mudanças na lista local (allUsers) e, se o próprio usuário Admin estiver alterando a si mesmo,
   * atualiza também via Supabase.
   *
   * @param {string} userId - ID do usuário alvo.
   * @param {string} newRole - A nova role atribuída.
   */
  const setUserRole = (userId, newRole) => {
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
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
      loginAsGuest,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook customizado para consumir os dados e funções de autenticação do AuthProvider.
 * Deve ser usado obrigatoriamente dentro de uma árvore envelopada por AuthProvider.
 *
 * @returns {AuthContextProps} Um objeto contendo a sessão ativa e as funções de autenticação.
 * @throws {Error} Se o hook for invocado fora do componente AuthProvider.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
