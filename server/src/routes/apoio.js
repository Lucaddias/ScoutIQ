/**
 * Rotas do módulo de Apoio à Decisão (relatórios e propostas).
 * Todas exigem autenticação; cada recurso é escopado ao próprio usuário.
 * Exporta dois routers: um para `/relatorios` e outro para `/propostas`.
 * @module routes/apoio
 */

'use strict';

const { Router } = require('express');
const {
  getRelatorios, createRelatorio, renameRelatorio, deleteRelatorio,
  getPropostas, createProposta, deleteProposta,
} = require('../controllers/apoioController');
const { verifyJWT } = require('../middlewares/auth');

/** Router de relatórios — montado em `/api/relatorios`. */
const relatoriosRouter = Router();
relatoriosRouter.use(verifyJWT);

/** @route GET    /api/relatorios      @desc Lista relatórios do usuário.  @access Private */
relatoriosRouter.get('/', getRelatorios);
/** @route POST   /api/relatorios      @desc Cria um relatório.            @access Private */
relatoriosRouter.post('/', createRelatorio);
/** @route PATCH  /api/relatorios/:id  @desc Renomeia um relatório.        @access Private */
relatoriosRouter.patch('/:id', renameRelatorio);
/** @route DELETE /api/relatorios/:id  @desc Remove um relatório.          @access Private */
relatoriosRouter.delete('/:id', deleteRelatorio);

/** Router de propostas — montado em `/api/propostas`. */
const propostasRouter = Router();
propostasRouter.use(verifyJWT);

/** @route GET    /api/propostas      @desc Lista propostas do usuário.  @access Private */
propostasRouter.get('/', getPropostas);
/** @route POST   /api/propostas      @desc Cria uma proposta.           @access Private */
propostasRouter.post('/', createProposta);
/** @route DELETE /api/propostas/:id  @desc Remove uma proposta.         @access Private */
propostasRouter.delete('/:id', deleteProposta);

module.exports = { relatoriosRouter, propostasRouter };
