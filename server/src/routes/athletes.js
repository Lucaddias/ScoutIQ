/**
 * Rotas do módulo de Atletas.
 * Todas exigem autenticação (verifyJWT). A escrita é restrita por role:
 * leitura para qualquer usuário, criação/edição para scout+admin, exclusão só admin.
 * @module routes/athletes
 */

'use strict';

const { Router } = require('express');
const { getAll, getById, create, update, remove } = require('../controllers/athleteController');
const { verifyJWT } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

/**
 * Router do Express para atletas.
 * Montado pelo agregador de rotas em `/api/athletes`.
 * @type {import('express').Router}
 */
const router = Router();

// Todas as rotas de atletas exigem um token válido.
router.use(verifyJWT);

/**
 * @route   GET /api/athletes
 * @desc    Lista todos os atletas.
 * @access  Private (qualquer role)
 */
router.get('/', getAll);

/**
 * @route   GET /api/athletes/:id
 * @desc    Retorna um atleta específico.
 * @access  Private (qualquer role)
 */
router.get('/:id', getById);

/**
 * @route   POST /api/athletes
 * @desc    Cria um novo atleta.
 * @access  Private (scout, admin)
 */
router.post('/', requireRole('scout', 'admin'), create);

/**
 * @route   PUT /api/athletes/:id
 * @desc    Atualiza um atleta existente.
 * @access  Private (scout, admin)
 */
router.put('/:id', requireRole('scout', 'admin'), update);

/**
 * @route   DELETE /api/athletes/:id
 * @desc    Remove um atleta.
 * @access  Private (admin)
 */
router.delete('/:id', requireRole('admin'), remove);

module.exports = router;
