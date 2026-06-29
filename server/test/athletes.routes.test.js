/**
 * Testes de integração das rotas de atletas — foco no enforcement de roles.
 * Supabase mockado; tokens JWT reais assinados por role.
 */

'use strict';

process.env.JWT_SECRET = 'test-secret-123';

jest.mock('../src/config/supabase');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { _push, _reset } = require('../src/config/supabase');

const tokenFor = (role) =>
  jwt.sign({ sub: `id-${role}`, email: `${role}@b.com`, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

const USER = tokenFor('user');
const SCOUT = tokenFor('scout');
const ADMIN = tokenFor('admin');

beforeEach(() => _reset());

describe('GET /api/athletes', () => {
  it('401 sem token', async () => {
    const res = await request(app).get('/api/athletes');
    expect(res.status).toBe(401);
  });

  it('200 para qualquer usuário autenticado', async () => {
    _push({ data: [{ id: 'a1', name: 'Atleta' }], error: null });
    const res = await request(app).get('/api/athletes').set('Authorization', `Bearer ${USER}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });
});

describe('POST /api/athletes (escrita: scout, admin)', () => {
  it('403 para role user', async () => {
    const res = await request(app).post('/api/athletes').set('Authorization', `Bearer ${USER}`).send({ name: 'X' });
    expect(res.status).toBe(403);
  });

  it('400 sem nome (scout)', async () => {
    const res = await request(app).post('/api/athletes').set('Authorization', `Bearer ${SCOUT}`).send({ position: 'ATA' });
    expect(res.status).toBe(400);
  });

  it('201 criando como scout', async () => {
    _push({ data: { id: 'USR-1', name: 'Novo Atleta', position: 'ATA' }, error: null });
    const res = await request(app).post('/api/athletes').set('Authorization', `Bearer ${SCOUT}`).send({ name: 'Novo Atleta', position: 'ATA' });
    expect(res.status).toBe(201);
    expect(res.body.athlete.id).toBe('USR-1');
  });
});

describe('DELETE /api/athletes/:id (somente admin)', () => {
  it('403 para scout', async () => {
    const res = await request(app).delete('/api/athletes/USR-1').set('Authorization', `Bearer ${SCOUT}`);
    expect(res.status).toBe(403);
  });

  it('200 para admin', async () => {
    _push({ data: { id: 'USR-1' }, error: null });
    const res = await request(app).delete('/api/athletes/USR-1').set('Authorization', `Bearer ${ADMIN}`);
    expect(res.status).toBe(200);
  });

  it('404 quando o atleta não existe (admin)', async () => {
    _push({ data: null, error: null });
    const res = await request(app).delete('/api/athletes/inexistente').set('Authorization', `Bearer ${ADMIN}`);
    expect(res.status).toBe(404);
  });
});
