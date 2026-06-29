/**
 * Middleware de autenticação por JWT.
 * Protege rotas exigindo um token Bearer válido no cabeçalho `Authorization`.
 * Substitui a verificação de sessão que antes era feita pelo Supabase Auth.
 * @module middlewares/auth
 */

'use strict';

const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

/**
 * Verifica o JWT enviado no cabeçalho `Authorization: Bearer <token>`.
 *
 * Em caso de sucesso, anexa os dados do usuário decodificados em `req.user`
 * (`{ id, email, role }`) para uso pelos controllers e pelo `requireRole`.
 * Em caso de falha (token ausente, malformado, expirado ou inválido), responde
 * com **401 Unauthorized** e interrompe a cadeia de middlewares.
 *
 * **Uso:** `router.get('/rota', verifyJWT, controller)`
 *
 * @param {import('express').Request}  req  - Requisição; espera o header Authorization.
 * @param {import('express').Response} res  - Resposta usada para retornar 401 em falha.
 * @param {import('express').NextFunction} next - Avança para o próximo middleware se válido.
 * @returns {void}
 */
function verifyJWT(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Token de autenticação ausente ou malformado.',
    });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: expired ? 'Sessão expirada. Faça login novamente.' : 'Token inválido.',
    });
  }
}

module.exports = { verifyJWT };
