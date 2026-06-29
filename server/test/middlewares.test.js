/**
 * Testes unitários dos middlewares de segurança: verifyJWT e requireRole.
 * São puros (não tocam banco nem rede) — exercitam diretamente (req, res, next).
 */

'use strict';

process.env.JWT_SECRET = 'test-secret-123';

const jwt = require('jsonwebtoken');
const { verifyJWT } = require('../src/middlewares/auth');
const { requireRole } = require('../src/middlewares/roles');

/** Cria um objeto `res` falso que registra status e corpo. */
function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

const sign = (payload, opts) => jwt.sign(payload, process.env.JWT_SECRET, opts);

describe('verifyJWT', () => {
  it('401 quando não há header Authorization', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    verifyJWT(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401 quando o esquema não é Bearer', () => {
    const req = { headers: { authorization: 'Basic abc' } };
    const res = mockRes();
    const next = jest.fn();

    verifyJWT(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401 quando o token é inválido', () => {
    const req = { headers: { authorization: 'Bearer token.invalido' } };
    const res = mockRes();
    const next = jest.fn();

    verifyJWT(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401 e mensagem de expiração quando o token expirou', () => {
    const token = sign({ sub: 'u1', email: 'a@b.com', role: 'user' }, { expiresIn: '-1s' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    verifyJWT(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/expirada/i);
  });

  it('chama next e popula req.user quando o token é válido', () => {
    const token = sign({ sub: 'u1', email: 'a@b.com', role: 'admin' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    verifyJWT(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'u1', email: 'a@b.com', role: 'admin' });
  });
});

describe('requireRole', () => {
  it('401 quando não há usuário autenticado (verifyJWT não rodou)', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    requireRole('admin')(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('403 quando a role não está na lista permitida', () => {
    const req = { user: { id: 'u1', role: 'user' } };
    const res = mockRes();
    const next = jest.fn();

    requireRole('scout', 'admin')(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next quando a role é permitida', () => {
    const req = { user: { id: 'u1', role: 'scout' } };
    const res = mockRes();
    const next = jest.fn();

    requireRole('scout', 'admin')(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
