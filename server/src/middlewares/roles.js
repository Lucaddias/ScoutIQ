/**
 * Middleware de autorização por papel (role).
 * Restringe o acesso a uma rota com base na role do usuário autenticado.
 * Deve ser usado SEMPRE depois do `verifyJWT`, que popula `req.user`.
 * @module middlewares/roles
 */

'use strict';

/**
 * Fábrica de middleware que libera a rota apenas para as roles informadas.
 *
 * **Uso:** `router.delete('/:id', verifyJWT, requireRole('admin'), controller)`
 *
 * Responde **401** se não houver usuário autenticado (verifyJWT não rodou antes)
 * e **403** se a role do usuário não estiver na lista de permitidas.
 *
 * @param {...string} roles - Papéis autorizados (ex: 'admin', 'scout').
 * @returns {import('express').RequestHandler} Middleware de verificação de role.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Não autenticado.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: 'Acesso negado: permissão insuficiente para este recurso.',
      });
    }

    return next();
  };
}

module.exports = { requireRole };
