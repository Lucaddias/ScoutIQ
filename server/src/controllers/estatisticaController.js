/**
 * Controller de Estatísticas.
 * Cada evento estatístico é persistido em `estatisticas` e o acumulado em
 * `athletes.statistics` é sincronizado por funções atômicas no Postgres
 * (increment_stat / increment_stats / set_stat) — eliminando a race condition
 * do antigo read-modify-write em JS.
 *
 * Como a chamada do registro e a do acumulado são duas operações, mantemos uma
 * transação compensatória (desfaz o registro) quando a sincronização falha.
 * @module controllers/estatisticaController
 */

'use strict';

const { supabase } = require('../config/supabase');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { HttpError } = require('../utils/httpError');

/** Campos que o cliente pode gravar em um registro de estatística (whitelist). */
const ESTAT_FIELDS = [
  'jogadorId', 'jogador', 'jogadorImg', 'jogadorTeam', 'tipoEstatistica', 'valor', 'data', 'tipo',
];

/**
 * Filtra o corpo mantendo apenas os campos permitidos de uma estatística.
 * @param {Object} body
 * @returns {Object}
 */
function pickEstat(body) {
  return ESTAT_FIELDS.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});
}

/**
 * Chama uma função RPC atômica do Postgres, propagando erro.
 * @param {string} fn - Nome da função.
 * @param {Object} args - Argumentos nomeados.
 * @returns {Promise<void>}
 */
async function rpc(fn, args) {
  const { error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
}

/**
 * Lista todos os registros de estatísticas.
 * **Endpoint:** `GET /api/estatisticas` (protegido — qualquer role)
 */
async function getAll(req, res) {
  const { data, error } = await supabase.from('estatisticas').select('*');
  if (error) throw new Error(error.message);
  res.status(200).json({ status: 'success', count: data.length, estatisticas: data });
}

/**
 * Cria um evento estatístico e incrementa (atômico) o acumulado do atleta.
 * **Endpoint:** `POST /api/estatisticas` (protegido — scout, admin)
 */
async function create(req, res) {
  const registro = pickEstat(req.body);
  if (!registro.jogadorId || !registro.tipoEstatistica || registro.valor === undefined) {
    throw new HttpError(400, 'jogadorId, tipoEstatistica e valor são obrigatórios.');
  }
  registro.valor = Number(registro.valor);

  const { data, error } = await supabase.from('estatisticas').insert([registro]).select().single();
  if (error) throw new Error(`Erro ao criar estatística: ${error.message}`);

  try {
    await rpc('increment_stat', { p_id: registro.jogadorId, p_key: registro.tipoEstatistica, p_delta: registro.valor });
  } catch (patchErr) {
    await supabase.from('estatisticas').delete().eq('id', data.id); // compensa
    throw new Error(`Falha ao sincronizar atleta, registro revertido: ${patchErr.message}`);
  }

  res.status(201).json({ status: 'success', estatistica: data });
}

/**
 * Cria vários eventos do mesmo atleta de uma vez, aplicando os deltas em um único RPC.
 * **Endpoint:** `POST /api/estatisticas/lote` (protegido — scout, admin)
 */
async function createBatch(req, res) {
  const { jogadorData, entries, data: dataEvento } = req.body;
  if (!jogadorData?.jogadorId || !Array.isArray(entries) || entries.length === 0) {
    throw new HttpError(400, 'jogadorData.jogadorId e entries (não vazio) são obrigatórios.');
  }

  const records = entries.map((entry) => ({
    jogadorId: jogadorData.jogadorId,
    jogador: jogadorData.jogador,
    jogadorImg: jogadorData.jogadorImg,
    jogadorTeam: jogadorData.jogadorTeam,
    tipoEstatistica: entry.tipoEstatistica,
    valor: Number(entry.valor),
    data: dataEvento,
  }));

  const { data: inserted, error } = await supabase.from('estatisticas').insert(records).select();
  if (error) throw new Error(`Erro ao criar estatísticas em lote: ${error.message}`);

  const deltas = {};
  for (const entry of entries) {
    deltas[entry.tipoEstatistica] = (deltas[entry.tipoEstatistica] || 0) + Number(entry.valor);
  }

  try {
    await rpc('increment_stats', { p_id: jogadorData.jogadorId, p_deltas: deltas });
  } catch (patchErr) {
    await supabase.from('estatisticas').delete().in('id', inserted.map((r) => r.id)); // compensa
    throw new Error(`Erro ao sincronizar atleta com o lote, registros revertidos: ${patchErr.message}`);
  }

  res.status(201).json({ status: 'success', count: inserted.length, estatisticas: inserted });
}

/**
 * Atualiza um registro estatístico, reconciliando o acumulado do atleta.
 * Os valores anteriores são lidos do banco (não confiamos no cliente).
 * **Endpoint:** `PUT /api/estatisticas/:id` (protegido — scout, admin)
 */
async function update(req, res) {
  const { data: anterior, error: readErr } = await supabase
    .from('estatisticas')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!anterior) throw new HttpError(404, 'Estatística não encontrada.');

  const novo = pickEstat(req.body);
  const { data, error } = await supabase
    .from('estatisticas')
    .update(novo)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar estatística: ${error.message}`);

  const mesmoJogador = anterior.jogadorId === data.jogadorId;
  const mesmoTipo = anterior.tipoEstatistica === data.tipoEstatistica;

  if (mesmoJogador && mesmoTipo) {
    const delta = Number(data.valor) - Number(anterior.valor);
    if (delta !== 0) await rpc('increment_stat', { p_id: data.jogadorId, p_key: data.tipoEstatistica, p_delta: delta });
  } else {
    await rpc('increment_stat', { p_id: anterior.jogadorId, p_key: anterior.tipoEstatistica, p_delta: -Number(anterior.valor) });
    await rpc('increment_stat', { p_id: data.jogadorId, p_key: data.tipoEstatistica, p_delta: Number(data.valor) });
  }

  res.status(200).json({ status: 'success', estatistica: data });
}

/**
 * Remove um registro estatístico e decrementa (atômico) o acumulado do atleta.
 * **Endpoint:** `DELETE /api/estatisticas/:id` (protegido — scout, admin)
 */
async function remove(req, res) {
  const { data: registro, error: readErr } = await supabase
    .from('estatisticas')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!registro) throw new HttpError(404, 'Estatística não encontrada.');

  const { error } = await supabase.from('estatisticas').delete().eq('id', req.params.id);
  if (error) throw new Error(`Erro ao deletar estatística: ${error.message}`);

  await rpc('increment_stat', { p_id: registro.jogadorId, p_key: registro.tipoEstatistica, p_delta: -Number(registro.valor) });

  res.status(200).json({ status: 'success', id: registro.id });
}

/**
 * Ajuste direto de uma estatística para um valor absoluto, com auditoria.
 * **Endpoint:** `POST /api/estatisticas/ajuste` (protegido — scout, admin)
 */
async function ajuste(req, res) {
  const { jogadorId, jogador, jogadorImg, jogadorTeam, statKey, valorNovo, valorAntigo } = req.body;
  const delta = Number(valorNovo) - Number(valorAntigo);
  if (delta === 0) {
    res.status(200).json({ status: 'success', estatistica: null });
    return;
  }

  const auditRecord = {
    jogadorId,
    jogador,
    jogadorImg: jogadorImg || '',
    jogadorTeam: jogadorTeam || '',
    tipoEstatistica: statKey,
    valor: delta,
    data: new Date().toISOString().split('T')[0],
    tipo: 'ajuste',
  };

  const { data: created, error: insErr } = await supabase.from('estatisticas').insert([auditRecord]).select().single();
  if (insErr) throw new Error(`Erro ao registrar auditoria de ajuste: ${insErr.message}`);

  try {
    await rpc('set_stat', { p_id: jogadorId, p_key: statKey, p_value: Number(valorNovo) });
  } catch (patchErr) {
    await supabase.from('estatisticas').delete().eq('id', created.id); // compensa
    throw new Error(`Erro ao ajustar atleta, histórico revertido: ${patchErr.message}`);
  }

  res.status(201).json({ status: 'success', estatistica: created });
}

module.exports = {
  getAll: asyncHandler(getAll),
  create: asyncHandler(create),
  createBatch: asyncHandler(createBatch),
  update: asyncHandler(update),
  remove: asyncHandler(remove),
  ajuste: asyncHandler(ajuste),
};
