/**
 * Rotas do módulo de Autenticação.
 * Monta os endpoints `/api/auth/*` ligando-os ao authController.
 * @module routes/auth
 */

'use strict';

const { Router } = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { verifyJWT } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimit');

/**
 * Router do Express para autenticação.
 * Montado pelo agregador de rotas em `/api/auth`.
 * @type {import('express').Router}
 */
const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Cadastra um novo usuário (hash de senha) e retorna um JWT.
 * @access  Public
 */
router.post('/register', authLimiter, register);

/**
 * @route   POST /api/auth/login
 * @desc    Verifica as credenciais e retorna um JWT.
 * @access  Public
 */
router.post('/login', authLimiter, login);

/**
 * @route   GET /api/auth/me
 * @desc    Retorna os dados do usuário autenticado.
 * @access  Private (requer Bearer token)
 */
router.get('/me', verifyJWT, getMe);

module.exports = router;
