/**
 * Definição das rotas do módulo Hello World.
 * Conecta os endpoints HTTP aos seus respectivos controllers.
 * @module routes/hello
 */

'use strict';

const { Router } = require('express');
const { helloWorld, helloName, healthCheck } = require('../controllers/helloController');

/**
 * Router do Express para o módulo Hello World.
 * É montado pelo agregador de rotas em `/api/hello`.
 * @type {import('express').Router}
 */
const router = Router();

/**
 * @route   GET /api/hello/status
 * @desc    Health check — confirma que a API está online.
 * @access  Public
 */
router.get('/status', healthCheck);

/**
 * @route   GET /api/hello
 * @desc    Retorna a mensagem padrão "Hello World".
 * @access  Public
 */
router.get('/', helloWorld);

/**
 * @route   GET /api/hello/:name
 * @desc    Retorna uma saudação personalizada com o nome informado na URL.
 * @access  Public
 */
router.get('/:name', helloName);

module.exports = router;
