/**
 * Controller de Atletas.
 * Operações CRUD sobre a tabela `athletes`, acessadas via cliente service_role.
 * A autorização é feita nas rotas (verifyJWT + requireRole); aqui focamos nos dados.
 * @module controllers/athleteController
 */

'use strict';

const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { HttpError } = require('../utils/httpError');

/**
 * Campos que o cliente pode gravar em um atleta.
 * Whitelist evita que o corpo injete colunas inesperadas (ex: sobrescrever `id`).
 *
 * Obs: `statistics` e `score` são aceitos para permitir edição administrativa,
 * mas o fluxo normal de estatísticas passa pelos endpoints `/estatisticas`
 * (com trilha de auditoria).
 * @type {string[]}
 */
const ALLOWED_FIELDS = [
  'name', 'position', 'age', 'nationality', 'marketValue', 'monthlySalary',
  'currency', 'team', 'profileImageURL', 'statistics', 'championshipId', 'score',
];

/**
 * Filtra o corpo da requisição mantendo apenas os campos permitidos.
 *
 * @param {Object} body - Corpo bruto da requisição.
 * @returns {Object} Objeto contendo somente as chaves de ALLOWED_FIELDS presentes.
 */
function pickAllowed(body) {
  return ALLOWED_FIELDS.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});
}

/**
 * Lista todos os atletas.
 * **Endpoint:** `GET /api/athletes` (protegido — qualquer role)
 */
async function getAll(req, res) {
  const { data, error } = await supabase
    .from('athletes')
    .select('id, name, position, team, age, nationality, marketValue, monthlySalary, currency, profileImageURL, statistics, championshipId, score');
  if (error) throw new Error(error.message);
  res.status(200).json({ status: 'success', count: data.length, athletes: data });
}

/**
 * Busca um atleta pelo id.
 * **Endpoint:** `GET /api/athletes/:id` (protegido — qualquer role)
 */
async function getById(req, res) {
  const { data, error } = await supabase
    .from('athletes')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new HttpError(404, 'Atleta não encontrado.');
  res.status(200).json({ status: 'success', athlete: data });
}

/**
 * Cria um novo atleta. O id (prefixo `USR-`) é gerado no servidor.
 * **Endpoint:** `POST /api/athletes` (protegido — scout, admin)
 */
async function create(req, res) {
  const fields = pickAllowed(req.body);
  if (!fields.name || !String(fields.name).trim()) {
    throw new HttpError(400, 'O nome do atleta é obrigatório.');
  }

  const athlete = { id: `USR-${crypto.randomUUID()}`, ...fields };
  const { data, error } = await supabase.from('athletes').insert(athlete).select().single();
  if (error) throw new Error(error.message);
  res.status(201).json({ status: 'success', athlete: data });
}

/**
 * Atualiza um atleta existente.
 * **Endpoint:** `PUT /api/athletes/:id` (protegido — scout, admin)
 */
async function update(req, res) {
  const fields = pickAllowed(req.body);
  if (Object.keys(fields).length === 0) throw new HttpError(400, 'Nenhum campo válido para atualizar.');

  const { data, error } = await supabase
    .from('athletes')
    .update(fields)
    .eq('id', req.params.id)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new HttpError(404, 'Atleta não encontrado.');
  res.status(200).json({ status: 'success', athlete: data });
}

/**
 * Remove um atleta.
 * **Endpoint:** `DELETE /api/athletes/:id` (protegido — admin)
 */
async function remove(req, res) {
  const { data, error } = await supabase
    .from('athletes')
    .delete()
    .eq('id', req.params.id)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new HttpError(404, 'Atleta não encontrado.');
  res.status(200).json({ status: 'success', id: data.id });
}

module.exports = {
  getAll: asyncHandler(getAll),
  getById: asyncHandler(getById),
  create: asyncHandler(create),
  update: asyncHandler(update),
  remove: asyncHandler(remove),
};
