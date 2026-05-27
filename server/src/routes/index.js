/**
 * Agregador central de rotas da API.
 * Importa todos os routers dos módulos e os registra sob o prefixo `/api`.
 * Para adicionar novas funcionalidades, basta criar um novo router e registrá-lo aqui.
 * @module routes/index
 */

'use strict';

const { Router } = require('express');
const helloRouter = require('./hello');

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
      helloName: '/api/hello/:name',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Registra o router do módulo Hello World sob o prefixo `/hello`.
 * Resultado: todos os endpoints do hello ficam acessíveis em `/api/hello/*`.
 */
router.use('/hello', helloRouter);

module.exports = router;
