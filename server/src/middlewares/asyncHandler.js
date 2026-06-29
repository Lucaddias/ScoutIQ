/**
 * Wrapper para handlers assíncronos do Express.
 * Captura rejeições de Promises e as encaminha ao `errorHandler` global,
 * eliminando o `try/catch + next(err)` repetido em cada controller.
 * @module middlewares/asyncHandler
 */

'use strict';

/**
 * Envolve um handler async para que qualquer erro lançado seja passado a `next`.
 *
 * @example
 * router.get('/', asyncHandler(getAll));
 *
 * @param {import('express').RequestHandler} fn - Handler assíncrono.
 * @returns {import('express').RequestHandler} Handler com captura de erros.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { asyncHandler };
