/**
 * Controller de Apoio à Decisão.
 * Persistência de relatórios oficiais e propostas de contrato. Cada recurso é
 * escopado ao usuário autenticado (`user_id` vem do JWT, nunca do corpo),
 * preservando o isolamento por usuário que antes era feito pelo RLS do Supabase.
 * @module controllers/apoioController
 */

'use strict';

const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { HttpError } = require('../utils/httpError');

/** Campos de proposta que o cliente pode enviar (o resto é montado no servidor). */
const PROPOSTA_FIELDS = [
  'proposedValue', 'proposedSalary', 'duration', 'bonusPerformance',
  'clausula', 'observacoes', 'detalhes',
];

// ──────────────────────────────────────────────────
// RELATÓRIOS
// ──────────────────────────────────────────────────

/** Lista os relatórios do usuário autenticado. **GET /api/relatorios** */
async function getRelatorios(req, res) {
  const { data, error } = await supabase
    .from('relatorios')
    .select('*')
    .eq('user_id', req.user.id)
    .order('dataCriacao', { ascending: false });
  if (error) throw new Error(error.message);
  res.status(200).json({ status: 'success', count: data.length, relatorios: data });
}

/** Cria um relatório. **POST /api/relatorios** — Body: `{ nome, atletas: [...] }` */
async function createRelatorio(req, res) {
  const { nome, atletas } = req.body;
  if (!nome || !Array.isArray(atletas)) throw new HttpError(400, 'nome e atletas (array) são obrigatórios.');

  const novo = {
    id: `rel_${crypto.randomUUID()}`,
    nome,
    dataCriacao: new Date().toISOString(),
    atletas,
    user_id: req.user.id,
  };
  const { data, error } = await supabase.from('relatorios').insert([novo]).select().single();
  if (error) throw new Error(`Erro ao salvar relatório: ${error.message}`);
  res.status(201).json({ status: 'success', relatorio: data });
}

/** Renomeia um relatório do próprio usuário. **PATCH /api/relatorios/:id** — Body: `{ nome }` */
async function renameRelatorio(req, res) {
  const { nome } = req.body;
  if (!nome) throw new HttpError(400, 'nome é obrigatório.');

  const { data, error } = await supabase
    .from('relatorios')
    .update({ nome })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new HttpError(404, 'Relatório não encontrado.');
  res.status(200).json({ status: 'success', relatorio: data });
}

/** Remove um relatório do próprio usuário. **DELETE /api/relatorios/:id** */
async function deleteRelatorio(req, res) {
  const { data, error } = await supabase
    .from('relatorios')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new HttpError(404, 'Relatório não encontrado.');
  res.status(200).json({ status: 'success', id: data.id });
}

// ──────────────────────────────────────────────────
// PROPOSTAS
// ──────────────────────────────────────────────────

/** Lista as propostas do usuário autenticado. **GET /api/propostas** */
async function getPropostas(req, res) {
  const { data, error } = await supabase
    .from('propostas')
    .select('*')
    .eq('user_id', req.user.id)
    .order('dataCriacao', { ascending: false });
  if (error) throw new Error(error.message);
  res.status(200).json({ status: 'success', count: data.length, propostas: data });
}

/** Cria uma proposta. **POST /api/propostas** — Body: `{ player, proposal }` */
async function createProposta(req, res) {
  const { player, proposal } = req.body;
  if (!player?.id) throw new HttpError(400, 'player.id é obrigatório.');

  const proposalFields = PROPOSTA_FIELDS.reduce((acc, key) => {
    if (proposal && proposal[key] !== undefined) acc[key] = proposal[key];
    return acc;
  }, {});

  const nova = {
    id: `prop_${crypto.randomUUID()}`,
    tipo: 'proposta',
    dataCriacao: new Date().toISOString(),
    jogadorId: player.id,
    jogadorNome: player.name,
    jogadorTime: player.team,
    jogadorPosicao: player.position,
    jogadorFoto: player.profileImageURL || '',
    jogadorScore: player.score,
    user_id: req.user.id,
    ...proposalFields,
  };
  const { data, error } = await supabase.from('propostas').insert([nova]).select().single();
  if (error) throw new Error(`Erro ao salvar proposta: ${error.message}`);
  res.status(201).json({ status: 'success', proposta: data });
}

/** Remove uma proposta do próprio usuário. **DELETE /api/propostas/:id** */
async function deleteProposta(req, res) {
  const { data, error } = await supabase
    .from('propostas')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new HttpError(404, 'Proposta não encontrada.');
  res.status(200).json({ status: 'success', id: data.id });
}

module.exports = {
  getRelatorios: asyncHandler(getRelatorios),
  createRelatorio: asyncHandler(createRelatorio),
  renameRelatorio: asyncHandler(renameRelatorio),
  deleteRelatorio: asyncHandler(deleteRelatorio),
  getPropostas: asyncHandler(getPropostas),
  createProposta: asyncHandler(createProposta),
  deleteProposta: asyncHandler(deleteProposta),
};
