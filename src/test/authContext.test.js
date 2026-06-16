import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Testes de Autenticação e Segurança do AuthContext.
//
// Cobrem três frentes que não tinham rede de testes:
//   1) Anti-deadlock  — o callback do onAuthStateChange precisa ser SÍNCRONO,
//      senão o signInWithPassword trava ("Aguarde..." infinito).
//   2) Logout robusto — a sessão local precisa ser limpa mesmo se a rede falhar,
//      senão o usuário fica "preso" (F5 volta logado).
//   3) Escalonamento de privilégio — usuário comum/guest NUNCA pode virar admin.
//
// O cliente Supabase é mockado por completo; nenhum teste toca a rede.
// ---------------------------------------------------------------------------

// vi.hoisted cria os mocks antes do vi.mock (que é içado para o topo).
const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
}));

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    from: mocks.from,
  },
}));

import { AuthProvider, useAuth } from '../context/AuthContext.jsx';

// Wrapper sem JSX (mantém o arquivo como .js, igual aos demais testes).
const wrapper = ({ children }) => React.createElement(AuthProvider, null, children);
const renderAuth = () => renderHook(() => useAuth(), { wrapper });

// Resultado configurável que o construtor de query do Supabase devolve.
let profileResult;   // o que .single() resolve (fetchProfile)
let allUsersResult;  // o que .order() resolve (loadAllUsers)
let authCallback;    // callback registrado em onAuthStateChange

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();

  profileResult = { id: 'u1', email: 'a@b.com', name: 'A', role: 'user' };
  allUsersResult = [];

  // Builder encadeável que serve para select().eq().single(),
  // select().order() e update().eq() (este último é "awaitado" direto).
  mocks.from.mockImplementation(() => {
    const qb = {};
    qb.select = vi.fn(() => qb);
    qb.insert = vi.fn(() => qb);
    qb.update = vi.fn(() => qb);
    qb.delete = vi.fn(() => qb);
    qb.eq = vi.fn(() => qb);
    qb.order = vi.fn(() => Promise.resolve({ data: allUsersResult, error: null }));
    qb.single = vi.fn(() => Promise.resolve({ data: profileResult, error: null }));
    // Torna o builder "awaitable" (update().eq() resolve sem erro).
    qb.then = (resolve) => resolve({ data: null, error: null });
    return qb;
  });

  // Captura o callback de auth; não dispara nada sozinho (controlado por teste).
  mocks.onAuthStateChange.mockImplementation((cb) => {
    authCallback = cb;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });

  mocks.getSession.mockResolvedValue({ data: { session: null } });
});

// ---------------------------------------------------------------------------
// 1) Anti-deadlock
// ---------------------------------------------------------------------------
describe('AuthContext — anti-deadlock', () => {
  it('callback_sincrono: o handler do onAuthStateChange NÃO é async (evita deadlock do lock do auth-js)', () => {
    renderAuth();

    expect(mocks.onAuthStateChange).toHaveBeenCalled();
    const cb = mocks.onAuthStateChange.mock.calls[0][0];
    // Se alguém regredir para `async (event, session) => ...`, o lock interno
    // trava o signInWithPassword. Este teste falha nesse caso.
    expect(cb.constructor.name).not.toBe('AsyncFunction');
    expect(cb.constructor.name).toBe('Function');
  });

  it('login_resolve: login() retorna sucesso e seta o usuário sem travar', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com', user_metadata: { name: 'A', role: 'user' } } },
      error: null,
    });

    const { result } = renderAuth();

    let res;
    await act(async () => { res = await result.current.login('a@b.com', 'secret'); });

    expect(res.success).toBe(true);
    expect(result.current.user).toMatchObject({ id: 'u1', email: 'a@b.com', role: 'user' });
  });

  it('login_erro: credenciais inválidas retornam success=false sem lançar', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    const { result } = renderAuth();

    let res;
    await act(async () => { res = await result.current.login('a@b.com', 'errada'); });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Invalid login credentials');
    expect(result.current.user).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2) Logout robusto
// ---------------------------------------------------------------------------
describe('AuthContext — logout robusto', () => {
  it('logout_offline: limpa a sessão do localStorage mesmo quando a rede falha', async () => {
    // Sessão persistida (formato do supabase-js: sb-<ref>-auth-token).
    window.localStorage.setItem(
      'sb-kcsqrzppvqpfqtkowpjw-auth-token',
      JSON.stringify({ access_token: 'x' })
    );
    // signOut falha (ex.: "Failed to fetch").
    mocks.signOut.mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderAuth();
    act(() => { result.current.loginAsGuest(); });

    await act(async () => { await result.current.logout(); });

    expect(window.localStorage.getItem('sb-kcsqrzppvqpfqtkowpjw-auth-token')).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('logout_ok: caminho feliz usa scope=local e zera o usuário', async () => {
    mocks.signOut.mockResolvedValue({ error: null });

    const { result } = renderAuth();
    act(() => { result.current.loginAsGuest(); });

    await act(async () => { await result.current.logout(); });

    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(result.current.user).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3) Escalonamento de privilégio
// ---------------------------------------------------------------------------
describe('AuthContext — segurança de papéis (anti-escalonamento)', () => {
  it('guest_e_user: login de visitante recebe role "user", nunca admin', () => {
    const { result } = renderAuth();

    let session;
    act(() => { session = result.current.loginAsGuest(); });

    expect(session.user.role).toBe('user');
    expect(result.current.user.role).toBe('user');
  });

  it('setUserRole_nega_nao_admin: usuário sem papel admin não consegue alterar papéis', async () => {
    const { result } = renderAuth();
    act(() => { result.current.loginAsGuest(); }); // role 'user'

    await expect(
      result.current.setUserRole('alvo-id', 'admin')
    ).rejects.toThrow(/Acesso negado/);
  });

  it('upgradeRole_bloqueia_admin: usuário comum não pode se autopromover a admin', async () => {
    const { result } = renderAuth();
    act(() => { result.current.loginAsGuest(); }); // role 'user'

    // Só user->scout é permitido; qualquer alvo != 'scout' deve ser rejeitado.
    await expect(result.current.upgradeRole('admin')).rejects.toThrow();
  });

  it('upgradeRole_so_de_user: quem já é admin não passa pelo fluxo de autoupgrade', async () => {
    // Injeta uma sessão cujo perfil no banco é admin.
    profileResult = { id: 'u1', email: 'admin@b.com', name: 'Admin', role: 'admin' };
    const { result } = renderAuth();

    await act(async () => {
      authCallback('SIGNED_IN', { user: { id: 'u1', email: 'admin@b.com', user_metadata: {} } });
    });
    await waitFor(() => expect(result.current.user?.role).toBe('admin'));

    await expect(result.current.upgradeRole('scout')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 4) profiles é a fonte de verdade do papel
// ---------------------------------------------------------------------------
describe('AuthContext — profiles como fonte de verdade', () => {
  it('role_vem_de_profiles: o papel do banco sobrescreve o metadata do JWT', async () => {
    // Metadata diz 'user', mas a tabela profiles diz 'admin' → deve valer 'admin'.
    profileResult = { id: 'u1', email: 'a@b.com', name: 'A', role: 'admin' };

    const { result } = renderAuth();

    await act(async () => {
      authCallback('SIGNED_IN', {
        user: { id: 'u1', email: 'a@b.com', user_metadata: { role: 'user' } },
      });
    });

    await waitFor(() => expect(result.current.user?.role).toBe('admin'));
  });
});
