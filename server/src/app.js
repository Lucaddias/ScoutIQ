/**
 * Configuração da aplicação Express.
 * Centraliza o registro de middlewares globais e de rotas,
 * separando a configuração do servidor do ponto de entrada (`index.js`).
 * Isso facilita testes unitários do app sem precisar iniciar um servidor real.
 * @module app
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const corsMiddleware = require('./middlewares/cors');
const logger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');
const apiRouter = require('./routes/index');
const { nodeEnv } = require('./config/env');

/**
 * Instância da aplicação Express.
 * @type {import('express').Application}
 */
const app = express();

/**
 * Em produção a API roda atrás de um proxy reverso (Render/Nginx). Confiar no
 * primeiro hop faz `req.ip` refletir o IP real do cliente — essencial para o
 * rate-limit funcionar por usuário (e não tratar todos como o IP do proxy).
 */
if (nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// ─────────────────────────────────────────────────
// MIDDLEWARES GLOBAIS
// Aplicados a todas as requisições, na ordem de registro.
// ─────────────────────────────────────────────────

/**
 * Helmet: define cabeçalhos HTTP de segurança (XSS, clickjacking, MIME sniffing).
 * Registrado primeiro para proteger todas as respostas.
 */
app.use(helmet());

/**
 * CORS: libera requisições cross-origin do front-end React (porta 5173).
 * Deve ser registrado antes de qualquer rota para garantir que os headers
 * sejam enviados inclusive nas requisições OPTIONS (preflight).
 */
app.use(corsMiddleware);

/**
 * Logger: registra método, URL, status e tempo de cada requisição.
 */
app.use(logger);

/**
 * JSON Parser: habilita a leitura de `req.body` como JSON.
 * Sem este middleware, requisições POST/PUT com corpo JSON seriam `undefined`.
 */
app.use(express.json());

/**
 * URL-Encoded Parser: habilita leitura de formulários HTML tradicionais.
 * `extended: false` usa a biblioteca nativa `querystring` (mais leve).
 */
app.use(express.urlencoded({ extended: false }));

// ─────────────────────────────────────────────────
// ROTAS
// ─────────────────────────────────────────────────

/**
 * Monta todas as rotas da API sob o prefixo `/api`.
 * Separar rotas sob um prefixo é uma boa prática para versionamento futuro
 * (ex: `/api/v1/hello`, `/api/v2/hello`).
 */
app.use('/api', apiRouter);

/**
 * Rota raiz `/` — resposta de status simples para confirmar que o servidor está ativo.
 *
 * @route GET /
 */
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'ScoutIQ Express Server está rodando!',
    api: 'http://localhost:3000/api',
    docs: 'Acesse /api para ver os recursos disponíveis.',
  });
});

/**
 * Handler de rota não encontrada (404).
 * Captura qualquer requisição que não casou com nenhuma rota registrada acima.
 * Deve ficar ANTES do errorHandler mas DEPOIS de todas as rotas.
 */
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
});

/**
 * Handler global de erros.
 * Captura erros propagados por `next(error)` em qualquer rota ou middleware.
 * DEVE ser o último middleware registrado (4 argumentos é obrigatório para o Express reconhecê-lo).
 */
app.use(errorHandler);

module.exports = app;
