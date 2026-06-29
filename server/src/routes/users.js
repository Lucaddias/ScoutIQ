/**
 * Rotas do módulo de Usuários.
 * Todas exigem autenticação; a gestão de papéis é restrita a admin,
 * exceto o auto-upgrade do próprio usuário.
 * @module routes/users
 */

'use strict';

const { Router } = require('express');
const { getAll, setRole, upgradeMe } = require('../controllers/userController');
const { verifyJWT } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

/**
 * Router do Express para usuários.
 * Montado pelo agregador de rotas em `/api/users`.
 * @type {import('express').Router}
 */
const router = Router();

router.use(verifyJWT);

/**
 * @route   PATCH /api/users/me/upgrade
 * @desc    Promove o próprio usuário de 'user' para 'scout'.
 * @access  Private (qualquer autenticado)
 */
router.patch('/me/upgrade', upgradeMe);

/**
 * @route   GET /api/users
 * @desc    Lista todos os perfis.
 * @access  Private (admin)
 */
router.get('/', requireRole('admin'), getAll);

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Altera o papel de um usuário.
 * @access  Private (admin)
 */
router.patch('/:id/role', requireRole('admin'), setRole);

module.exports = router;
