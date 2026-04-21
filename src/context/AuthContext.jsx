import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

/*
 * CONTEXTO DE AUTENTICAÇÃO (React Context API)
 * createContext cria o "canal" pelo qual todos os componentes filhos podem
 * acessar o usuário logado e as funções de login/logout sem precisar de props.
 * É o equivalente ao Redux, mas focado apenas em autenticação.
 */
const AuthContext = createContext(null);

const USERS_KEY = 'scoutiq_users';

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

  /*
   * buildSession — converte o objeto bruto do Supabase para o formato interno
   * Normaliza os metadados (nome, role) e garante um fallback para cada campo.
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

  /*
   * syncToUserList — mantém a lista de todos os usuários atualizada.
   * Se o usuário já existe na lista, atualiza seus dados; senão, adiciona.
   * Usado tanto no login quanto no cadastro para manter o painel Admin em dia.
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

  /*
   * INICIALIZAÇÃO DA SESSÃO (useEffect no mount)
   * Ao carregar a app, tenta restaurar a sessão ativa do Supabase.
   * onAuthStateChange escuta mudanças em tempo real (login, logout, refresh de token)
   * e mantém o estado React sincronizado com o Supabase automaticamente.
   * O cleanup (subscription.unsubscribe) evita memory leaks ao desmontar o Provider.
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

  /*
   * login — autentica com email e senha via Supabase.
   * Retorna { success, user } ou { success: false, error } para o componente tratar.
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

  /*
   * signup — cria nova conta no Supabase com nome e role padrão 'user'.
   * Se confirmação de email estiver ativa, retorna needsConfirmation: true
   * para o componente exibir a mensagem correta ao usuário.
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

  /* logout — encerra a sessão no Supabase e limpa o estado local. */
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  /*
   * loginAsGuest — modo demo sem Supabase.
   * Cria uma sessão local com role 'admin' para que o visitante possa
   * explorar todas as funcionalidades da plataforma sem criar conta.
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

  /*
   * upgradeRole — permite que o próprio usuário suba seu nível de acesso.
   * Atualiza os metadados no Supabase e reflete a mudança no estado local.
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

  /*
   * setUserRole — função exclusiva do Admin para alterar o papel de outro usuário.
   * Como não temos acesso à API admin do Supabase no frontend, a mudança é
   * armazenada apenas localmente (localStorage via allUsers).
   * Se o admin alterar o próprio papel, também atualiza via Supabase.
   */
  const setUserRole = (userId, newRole) => {
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    if (user && user.id === userId) {
      upgradeRole(newRole);
    }
  };

  /*
   * PROVIDER — expõe todas as funções e o estado do usuário para a árvore de componentes.
   * Qualquer componente que chamar useAuth() terá acesso a esses valores.
   */
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

/*
 * useAuth — hook customizado que encapsula useContext(AuthContext).
 * Lança um erro claro se usado fora do AuthProvider, facilitando o debug.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
