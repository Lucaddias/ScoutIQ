/**
 * Middleware de configuração do CORS (Cross-Origin Resource Sharing).
 * Permite que o front-end React (rodando em outra porta ou domínio)
 * faça requisições para este servidor Express sem ser bloqueado pelo browser.
 * @module middlewares/cors
 */

'use strict';

const cors = require('cors');
const { clientUrl, nodeEnv } = require('../config/env');

/**
 * Origens permitidas para acessar a API.
 * Em desenvolvimento, libera o servidor local do Vite.
 * Em produção, deve apontar para o domínio real do front-end.
 * @type {string[]}
 */
const allowedOrigins = [clientUrl];

/**
 * Opções de configuração passadas ao módulo `cors`.
 * @type {import('cors').CorsOptions}
 */
const corsOptions = {
  /** Verifica se a origem da requisição está na lista de permitidas */
  origin: (origin, callback) => {
    // Permite requisições sem Origin (ex: ferramentas como curl, Postman, SSR)
    if (!origin) return callback(null, true);

    // Em desenvolvimento, libera qualquer localhost/127.0.0.1 (o Vite pode usar
    // portas diferentes). Em produção, apenas as origens da lista.
    const isLocalhostDev =
      nodeEnv === 'development' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (allowedOrigins.includes(origin) || isLocalhostDev) {
      callback(null, true);
    } else {
      callback(new Error(`Origem bloqueada pelo CORS: ${origin}`));
    }
  },
  /** Métodos HTTP aceitos pela API */
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  /** Headers que o cliente pode enviar */
  allowedHeaders: ['Content-Type', 'Authorization'],
  /** Permite envio de cookies e credenciais */
  credentials: true,
};

module.exports = cors(corsOptions);
