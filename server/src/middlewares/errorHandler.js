/**
 * Middleware de tratamento global de erros.
 * Captura qualquer erro propagado via `next(error)` em rotas ou middlewares
 * anteriores e retorna uma resposta JSON padronizada ao cliente.
 * @module middlewares/errorHandler
 */

'use strict';

const { nodeEnv } = require('../config/env');

/**
 * Middleware de 4 argumentos obrigatórios reconhecido pelo Express como handler de erros.
 * Deve ser registrado **após** todas as rotas no `app.js` para capturar erros de qualquer camada.
 *
 * Resposta JSON padrão:
 * ```json
 * {
 *   "status": "error",
 *   "statusCode": 500,
 *   "message": "Mensagem do erro",
 *   "stack": "..." // apenas em desenvolvimento
 * }
 * ```
 *
 * @param {Error} err - O objeto de erro capturado.
 * @param {import('express').Request}  req  - Objeto de requisição.
 * @param {import('express').Response} res  - Objeto de resposta.
 * @param {import('express').NextFunction} next - Função next (obrigatória para o Express reconhecer como error handler).
 * @returns {void}
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Usa o código de status do erro se disponível, caso contrário 500
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Erro interno do servidor';

  // Em desenvolvimento, exibe o stack trace para facilitar o debug
  const response = {
    status: 'error',
    statusCode,
    message,
    ...(nodeEnv === 'development' && { stack: err.stack }),
  };

  console.error(`[ERROR] ${statusCode} — ${message}`);
  if (nodeEnv === 'development') {
    console.error(err.stack);
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
