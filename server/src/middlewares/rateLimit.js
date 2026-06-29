/**
 * Rate limiters da aplicação.
 * Limita a frequência de requisições para mitigar abuso (ex: força bruta no login).
 * @module middlewares/rateLimit
 */

'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Limitador para as rotas de autenticação (login/register).
 * Janela de 15 minutos com no máximo 20 tentativas por IP — suficiente para uso
 * normal, mas freia ataques de força bruta de senha.
 * @type {import('express').RequestHandler}
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    statusCode: 429,
    message: 'Muitas tentativas. Tente novamente em alguns minutos.',
  },
});

module.exports = { authLimiter };
