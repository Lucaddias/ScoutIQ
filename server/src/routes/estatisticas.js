/**
 * Rotas do módulo de Estatísticas.
 * Leitura para qualquer autenticado; escrita (que sincroniza o atleta) para scout+admin.
 * @module routes/estatisticas
 */

'use strict';

const { Router } = require('express');
const { getAll, create, createBatch, update, remove, ajuste } = require('../controllers/estatisticaController');
const { verifyJWT } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

/**
 * Router do Express para estatísticas.
 * Montado pelo agregador de rotas em `/api/estatisticas`.
 * @type {import('express').Router}
 */
const router = Router();

router.use(verifyJWT);

const canWrite = requireRole('scout', 'admin');

/**
 * @route   GET /api/estatisticas
 * @desc    Lista todos os eventos estatísticos.
 * @access  Private (qualquer role)
 */
router.get('/', getAll);

/**
 * @route   POST /api/estatisticas/lote
 * @desc    Cria vários eventos para o mesmo atleta de uma vez.
 * @access  Private (scout, admin)
 */
router.post('/lote', canWrite, createBatch);

/**
 * @route   POST /api/estatisticas/ajuste
 * @desc    Ajuste direto de uma estatística para valor absoluto (com auditoria).
 * @access  Private (scout, admin)
 */
router.post('/ajuste', canWrite, ajuste);

/**
 * @route   POST /api/estatisticas
 * @desc    Cria um evento estatístico e incrementa o acumulado do atleta.
 * @access  Private (scout, admin)
 */
router.post('/', canWrite, create);

/**
 * @route   PUT /api/estatisticas/:id
 * @desc    Atualiza um evento e reconcilia o acumulado do atleta.
 * @access  Private (scout, admin)
 */
router.put('/:id', canWrite, update);

/**
 * @route   DELETE /api/estatisticas/:id
 * @desc    Remove um evento e decrementa o acumulado do atleta.
 * @access  Private (scout, admin)
 */
router.delete('/:id', canWrite, remove);

module.exports = router;
