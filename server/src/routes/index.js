/**
 * Agregador central de rotas da API.
 * Importa todos os routers dos módulos e os registra sob o prefixo `/api`.
 * Para adicionar novas funcionalidades, basta criar um novo router e registrá-lo aqui.
 * @module routes/index
 */

'use strict';

const { Router } = require('express');
const helloRouter = require('./hello');
const authRouter = require('./auth');
const athletesRouter = require('./athletes');
const usersRouter = require('./users');
const estatisticasRouter = require('./estatisticas');
const { relatoriosRouter, propostasRouter } = require('./apoio');

/**
 * Router principal da API.
 * Todas as rotas são agrupadas sob o prefixo `/api` definido no `app.js`.
 * @type {import('express').Router}
 */
const router = Router();

/**
 * Rota raiz da API — retorna informações gerais sobre o servidor.
 *
 * @route   GET /api
 * @desc    Indica que a API está online e lista os recursos disponíveis.
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Bem-vindo à ScoutIQ API!',
    version: '1.0.0',
    resources: {
      hello: '/api/hello',
      helloStatus: '/api/hello/status',
      authRegister: 'POST /api/auth/register',
      authLogin: 'POST /api/auth/login',
      authMe: 'GET /api/auth/me',
      athletes: '/api/athletes',
      users: '/api/users',
      estatisticas: '/api/estatisticas',
      relatorios: '/api/relatorios',
      propostas: '/api/propostas',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Registra o router do módulo Hello World sob o prefixo `/hello`.
 * Resultado: todos os endpoints do hello ficam acessíveis em `/api/hello/*`.
 */
router.use('/hello', helloRouter);

/**
 * Registra o router de autenticação sob o prefixo `/auth`.
 * Resultado: endpoints acessíveis em `/api/auth/*` (register, login, me).
 */
router.use('/auth', authRouter);

/**
 * Registra o router de atletas sob o prefixo `/athletes`.
 * Todas as rotas são protegidas por JWT (e algumas por role).
 */
router.use('/athletes', athletesRouter);

/**
 * Registra o router de usuários sob `/users` (gestão de perfis e papéis).
 */
router.use('/users', usersRouter);

/**
 * Registra o router de estatísticas sob `/estatisticas`.
 */
router.use('/estatisticas', estatisticasRouter);

/**
 * Registra os routers de apoio à decisão: relatórios e propostas.
 */
router.use('/relatorios', relatoriosRouter);
router.use('/propostas', propostasRouter);

module.exports = router;
