/**
 * Controller do módulo Hello World.
 * Contém toda a lógica de negócio das rotas `/api/hello`.
 * Os controllers são funções puras que processam a requisição e enviam uma resposta,
 * separando a lógica das definições de rota.
 * @module controllers/helloController
 */

'use strict';

/**
 * Responde com uma mensagem de boas-vindas genérica no formato JSON.
 *
 * **Endpoint:** `GET /api/hello`
 *
 * **Resposta de exemplo:**
 * ```json
 * {
 *   "status": "success",
 *   "message": "Hello World! O servidor Express está funcionando.",
 *   "timestamp": "2026-05-26T22:00:00.000Z",
 *   "server": "ScoutIQ API",
 *   "version": "1.0.0"
 * }
 * ```
 *
 * @param {import('express').Request}  req - Objeto de requisição do Express.
 * @param {import('express').Response} res - Objeto de resposta do Express.
 * @returns {void}
 */
function helloWorld(req, res) {
  res.status(200).json({
    status: 'success',
    message: 'Hello World! O servidor Express está funcionando.',
    timestamp: new Date().toISOString(),
    server: 'ScoutIQ API',
    version: '1.0.0',
  });
}

/**
 * Responde com uma saudação personalizada baseada no parâmetro `:name` da URL.
 *
 * **Endpoint:** `GET /api/hello/:name`
 *
 * **Exemplo de requisição:** `GET /api/hello/ScoutIQ`
 *
 * **Resposta de exemplo:**
 * ```json
 * {
 *   "status": "success",
 *   "message": "Hello, ScoutIQ! Bem-vindo ao servidor Express.",
 *   "name": "ScoutIQ",
 *   "timestamp": "2026-05-26T22:00:00.000Z"
 * }
 * ```
 *
 * @param {import('express').Request}  req - Objeto de requisição do Express.
 * @param {import('express').Response} res - Objeto de resposta do Express.
 * @returns {void}
 */
function helloName(req, res) {
  const { name } = req.params;

  // Sanitização simples: remove caracteres não alfanuméricos
  const safeName = name.replace(/[^a-zA-Z0-9À-ÿ\s_-]/g, '').trim() || 'Visitante';

  res.status(200).json({
    status: 'success',
    message: `Hello, ${safeName}! Bem-vindo ao servidor Express.`,
    name: safeName,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Retorna informações sobre o status da API (health check).
 *
 * **Endpoint:** `GET /api/hello/status`
 *
 * **Resposta de exemplo:**
 * ```json
 * {
 *   "status": "success",
 *   "api": "online",
 *   "uptime": 123.45,
 *   "environment": "development",
 *   "timestamp": "2026-05-26T22:00:00.000Z"
 * }
 * ```
 *
 * @param {import('express').Request}  req - Objeto de requisição do Express.
 * @param {import('express').Response} res - Objeto de resposta do Express.
 * @returns {void}
 */
function healthCheck(req, res) {
  res.status(200).json({
    status: 'success',
    api: 'online',
    uptime: Math.round(process.uptime() * 100) / 100,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
}

module.exports = { helloWorld, helloName, healthCheck };
