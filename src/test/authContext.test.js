import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Testes de Autenticação e Segurança do AuthContext (arquitetura JWT/Express).
//
// Cobrem:
//   1) Login/logout via API (token salvo/limpo, usuário populado).
//   2) Restauração de sessão a partir do token (GET /auth/me).
//   3) Escalonamento de privilégio — usuário comum/guest NUNCA vira admin.
//
// O cliente HTTP (lib/api.js) é mockado por completo; nenhum teste toca a rede.
// ---------------------------------------------------------------------------

// vi.hoisted cria os mocks antes do vi.mock (que é içado para o topo).
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

vi.mock('../lib/api.js', () => ({
  api: { get: mocks.get, post: mocks.post, put: mocks.put, patch: mocks.patch, del: mocks.del },
  getToken: mocks.getToken,
  setToken: mocks.setToken,
  clearToken: mocks.clearToken,
}));

import { AuthProvider, useAuth } from '../context/AuthContext.jsx';

// Wrapper sem JSX (mantém o arquivo como .js, igual aos demais testes).
const wrapper = ({ children }) => React.createElement(AuthProvider, null, children);
const renderAuth = () => renderHook(() => useAuth(), { wrapper });

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mocks.getToken.mockReturnValue(null); // sem sessão restaurada por padrão
});

// ---------------------------------------------------------------------------
// 1) Login / logout
// ---------------------------------------------------------------------------
describe('AuthContext — login/logout', () => {
  it('login_resolve: login() salva o token e seta o usuário', async () => {
    mocks.post.mockResolvedValue({
      token: 'jwt-abc',
      user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'user' },
    });

    const { result } = renderAuth();

    let res;
    await act(async () => { res = await result.current.login('a@b.com', 'secret'); });

    expect(res.success).toBe(true);
    expect(mocks.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'secret' });
    expect(mocks.setToken).toHaveBeenCalledWith('jwt-abc');
    expect(result.current.user).toMatchObject({ id: 'u1', email: 'a@b.com', role: 'user' });
  });

  it('login_erro: credenciais inválidas retornam success=false sem lançar', async () => {
    mocks.post.mockRejectedValue(new Error('E-mail ou senha incorretos.'));

    const { result } = renderAuth();

    let res;
    await act(async () => { res = await result.current.login('a@b.com', 'errada'); });

    expect(res.success).toBe(false);
    expect(res.error).toBe('E-mail ou senha incorretos.');
    expect(result.current.user).toBeNull();
  });

  it('logout: limpa o token e zera o usuário', async () => {
    const { result } = renderAuth();
    act(() => { result.current.loginAsGuest(); });

    await act(async () => { await result.current.logout(); });

    expect(mocks.clearToken).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2) Restauração de sessão
// ---------------------------------------------------------------------------
describe('AuthContext — restauração de sessão', () => {
  it('restaura_do_token: com token salvo, busca /auth/me e popula o usuário', async () => {
    mocks.getToken.mockReturnValue('jwt-existente');
    mocks.get.mockImplementation((path) =>
      path === '/auth/me'
        ? Promise.resolve({ user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'scout' } })
        : Promise.resolve({ users: [] })
    );

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.user?.role).toBe('scout'));
    expect(mocks.get).toHaveBeenCalledWith('/auth/me');
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
    expect(mocks.patch).not.toHaveBeenCalled();
  });

  it('upgradeRole_bloqueia_admin: usuário comum não pode se autopromover a admin', async () => {
    const { result } = renderAuth();
    act(() => { result.current.loginAsGuest(); }); // role 'user'

    await expect(result.current.upgradeRole('admin')).rejects.toThrow();
    expect(mocks.patch).not.toHaveBeenCalled();
  });

  it('upgradeRole_so_de_user: quem já é admin não passa pelo fluxo de autoupgrade', async () => {
    mocks.getToken.mockReturnValue('jwt-admin');
    mocks.get.mockImplementation((path) =>
      path === '/auth/me'
        ? Promise.resolve({ user: { id: 'u1', email: 'admin@b.com', name: 'Admin', role: 'admin' } })
        : Promise.resolve({ users: [] })
    );

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.user?.role).toBe('admin'));

    await expect(result.current.upgradeRole('scout')).rejects.toThrow();
  });

  it('setUserRole_admin_chama_api: admin altera papel via PATCH /users/:id/role', async () => {
    mocks.getToken.mockReturnValue('jwt-admin');
    mocks.get.mockImplementation((path) =>
      path === '/auth/me'
        ? Promise.resolve({ user: { id: 'admin1', email: 'admin@b.com', name: 'Admin', role: 'admin' } })
        : Promise.resolve({ users: [{ id: 'u2', email: 'x@y.com', name: 'X', role: 'user' }] })
    );
    mocks.patch.mockResolvedValue({ user: { id: 'u2', email: 'x@y.com', name: 'X', role: 'scout' } });

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.user?.role).toBe('admin'));

    await act(async () => { await result.current.setUserRole('u2', 'scout'); });

    expect(mocks.patch).toHaveBeenCalledWith('/users/u2/role', { role: 'scout' });
  });
});
