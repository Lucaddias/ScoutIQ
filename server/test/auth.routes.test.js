/**
 * Testes de integração das rotas de autenticação via supertest.
 * O cliente Supabase é mockado (config/__mocks__/supabase.js); o JWT é real.
 */

'use strict';

process.env.JWT_SECRET = 'test-secret-123';

jest.mock('../src/config/supabase');

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const { _push, _reset } = require('../src/config/supabase');

beforeEach(() => _reset());

describe('POST /api/auth/register', () => {
  it('400 com e-mail inválido', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'naoeumail', password: '123456' });
    expect(res.status).toBe(400);
  });

  it('400 com senha curta', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('201 e retorna token + usuário quando válido', async () => {
    _push({ data: { id: 'u1', email: 'novo@b.com', name: 'Novo', role: 'user' }, error: null });

    const res = await request(app).post('/api/auth/register').send({ email: 'novo@b.com', password: '123456', name: 'Novo' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ email: 'novo@b.com', role: 'user' });
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('409 quando o e-mail já existe (constraint 23505)', async () => {
    _push({ data: null, error: { code: '23505', message: 'duplicate key' } });

    const res = await request(app).post('/api/auth/register').send({ email: 'existe@b.com', password: '123456' });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('400 sem e-mail/senha', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('401 quando o usuário não existe', async () => {
    _push({ data: null, error: null });
    const res = await request(app).post('/api/auth/login').send({ email: 'x@y.com', password: '123456' });
    expect(res.status).toBe(401);
  });

  it('200 e token quando a senha confere', async () => {
    const password_hash = bcrypt.hashSync('123456', 10);
    _push({ data: { id: 'u1', email: 'a@b.com', name: 'A', role: 'scout', password_hash }, error: null });

    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('scout');
  });

  it('401 quando a senha está errada', async () => {
    const password_hash = bcrypt.hashSync('senha-certa', 10);
    _push({ data: { id: 'u1', email: 'a@b.com', name: 'A', role: 'user', password_hash }, error: null });

    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'errada' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('401 sem token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('200 com token válido', async () => {
    // obtém um token real via login mockado
    const password_hash = bcrypt.hashSync('123456', 10);
    _push({ data: { id: 'u1', email: 'a@b.com', name: 'A', role: 'admin', password_hash }, error: null });
    const login = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: '123456' });
    const token = login.body.token;

    _push({ data: { id: 'u1', email: 'a@b.com', name: 'A', role: 'admin' }, error: null });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 'u1', role: 'admin' });
  });
});
