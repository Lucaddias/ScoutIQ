/**
 * Slice do Redux para controle de Estatísticas de Jogadores.
 * Gerencia a inserção, edição e exclusão de eventos estatísticos (ex: desarmes, gols)
 * e atualiza o acumulado na entidade Atletas correspondente (dupla escrita).
 * @module store/estatisticasSlice
 */

import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { fetchAtletas } from './atletasSlice';
import { supabase } from '../lib/supabase.js';

/**
 * Helper interno para buscar um atleta individual por ID no servidor.
 *
 * @param {string|number} id - ID do atleta a ser buscado.
 * @returns {Promise<Object>} Dados do atleta retornado pela API.
 */
const fetchAtleta = async (id) => {
  const { data, error } = await supabase
    .from('athletes')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(`Atleta ${id} não encontrado: ${error.message}`);
  return data;
};

/**
 * Helper interno para atualizar as estatísticas de um atleta aplicando um delta (soma/subtração).
 * Garante que o valor acumulado nunca fique negativo.
 *
 * @param {string|number} jogadorId - ID do jogador.
 * @param {string} statKey - Chave da estatística (ex: 'goals', 'assists').
 * @param {number} delta - Valor a ser incrementado (ou decrementado, se negativo).
 * @returns {Promise<Object>} Dados atualizados do atleta.
 */
const patchAtletaStat = async (jogadorId, statKey, delta) => {
  const atleta = await fetchAtleta(jogadorId);
  const stats = atleta.statistics || {};
  const currentVal = Number(stats[statKey]) || 0;
  const newVal = Math.max(0, currentVal + delta); // nunca fica negativo

  const updatedStats = { ...stats, [statKey]: newVal };
  const { data, error } = await supabase
    .from('athletes')
    .update({ statistics: updatedStats })
    .eq('id', jogadorId)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar estatísticas do atleta: ${error.message}`);
  return data;
};

// ──────────────────────────────────────────────────
// THUNKS ASSÍNCRONOS
// ──────────────────────────────────────────────────

/**
 * Thunk assíncrono para buscar todos os registros de estatísticas individuais.
 *
 * @type {Function}
 */
export const fetchEstatisticas = createAsyncThunk(
  'estatisticas/fetchAll',
  async () => {
    const { data, error } = await supabase
      .from('estatisticas')
      .select('*');
    if (error) throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    return data;
  }
);

/**
 * Thunk assíncrono para salvar um novo evento estatístico e atualizar o total no perfil do atleta (dupla escrita).
 * Recarrega a lista de atletas do Redux ao finalizar.
 *
 * @type {Function}
 */
export const criarEstatistica = createAsyncThunk(
  'estatisticas/criar',
  async (registro, { dispatch }) => {
    // 1. Persiste o registro de estatística
    const { data, error } = await supabase
      .from('estatisticas')
      .insert([registro])
      .select()
      .single();
    if (error) throw new Error(`Erro ao criar estatística: ${error.message}`);

    // 2. Sincroniza com o atleta (dupla escrita)
    await patchAtletaStat(registro.jogadorId, registro.tipoEstatistica, Number(registro.valor));

    // 3. Re-busca a lista de atletas para o Redux refletir a mudança
    dispatch(fetchAtletas());

    return data;
  }
);

/**
 * Thunk assíncrono para salvar múltiplos registros de estatísticas para o mesmo atleta em lote (Bulk Create).
 * Agrupa os deltas das estatísticas para realizar uma única chamada PATCH otimizada ao atleta.
 *
 * @type {Function}
 */
export const criarEstatisticasEmLote = createAsyncThunk(
  'estatisticas/criarEmLote',
  async ({ jogadorData, entries, data }, { dispatch }) => {
    // 1. Prepara e insere registros individuais na coleção estatisticas
    const recordsToInsert = entries.map(entry => ({
      jogadorId: jogadorData.jogadorId,
      jogador: jogadorData.jogador,
      jogadorImg: jogadorData.jogadorImg,
      jogadorTeam: jogadorData.jogadorTeam,
      tipoEstatistica: entry.tipoEstatistica,
      valor: Number(entry.valor),
      data,
    }));

    const { data: insertedRecords, error } = await supabase
      .from('estatisticas')
      .insert(recordsToInsert)
      .select();
    if (error) throw new Error(`Erro ao criar estatísticas em lote: ${error.message}`);

    // 2. Acumula deltas por tipo de stat para um único PATCH otimizado
    const deltaMap = {};
    for (const entry of entries) {
      const key = entry.tipoEstatistica;
      deltaMap[key] = (deltaMap[key] || 0) + Number(entry.valor);
    }

    // 3. Aplica PATCH único no atleta com todos os deltas
    const atleta = await fetchAtleta(jogadorData.jogadorId);
    const stats = { ...(atleta.statistics || {}) };
    for (const [key, delta] of Object.entries(deltaMap)) {
      stats[key] = Math.max(0, (Number(stats[key]) || 0) + delta);
    }

    const { error: updateError } = await supabase
      .from('athletes')
      .update({ statistics: stats })
      .eq('id', jogadorData.jogadorId);
    if (updateError) throw new Error(`Erro ao atualizar atleta com estatísticas do lote: ${updateError.message}`);

    // 4. Re-busca atletas
    dispatch(fetchAtletas());

    return insertedRecords;
  }
);

/**
 * Thunk assíncrono para atualizar um registro estatístico existente.
 * Trata o delta gerado se houver alteração de tipo, valor ou jogador para evitar inconsistência de dados.
 *
 * @type {Function}
 */
export const atualizarEstatistica = createAsyncThunk(
  'estatisticas/atualizar',
  async ({ registro, valorAnterior, tipoAnterior, jogadorIdAnterior }, { dispatch }) => {
    // 1. Atualiza o registro
    const { data, error } = await supabase
      .from('estatisticas')
      .update(registro)
      .eq('id', registro.id)
      .select()
      .single();
    if (error) throw new Error(`Erro ao atualizar estatística: ${error.message}`);

    // 2. Se mudou o jogador ou o tipo de stat, reverter do antigo e aplicar no novo
    const mesmoJogador = jogadorIdAnterior === registro.jogadorId;
    const mesmoTipo = tipoAnterior === registro.tipoEstatistica;

    if (mesmoJogador && mesmoTipo) {
      // Mesmo jogador e mesmo tipo: aplica apenas o delta
      const delta = Number(registro.valor) - Number(valorAnterior);
      if (delta !== 0) {
        await patchAtletaStat(registro.jogadorId, registro.tipoEstatistica, delta);
      }
    } else {
      // Mudou jogador ou tipo: desfaz no antigo, aplica no novo
      await patchAtletaStat(jogadorIdAnterior, tipoAnterior, -Number(valorAnterior));
      await patchAtletaStat(registro.jogadorId, registro.tipoEstatistica, Number(registro.valor));
    }

    // 3. Re-busca atletas
    dispatch(fetchAtletas());

    return data;
  }
);

/**
 * Thunk assíncrono para excluir uma estatística individual, decrementando o valor correspondente no atleta.
 *
 * @type {Function}
 */
export const deletarEstatistica = createAsyncThunk(
  'estatisticas/deletar',
  async (registro, { dispatch }) => {
    // 1. Remove o registro
    const { error } = await supabase
      .from('estatisticas')
      .delete()
      .eq('id', registro.id);
    if (error) throw new Error(`Erro ao deletar estatística: ${error.message}`);

    // 2. Decrementa no atleta
    await patchAtletaStat(registro.jogadorId, registro.tipoEstatistica, -Number(registro.valor));

    // 3. Re-busca atletas
    dispatch(fetchAtletas());

    return registro.id;
  }
);

/**
 * Thunk assíncrono para ajustar diretamente uma estatística específica de um atleta.
 * Registra um evento especial de auditoria na coleção de estatísticas e atualiza o atleta.
 *
 * @type {Function}
 */
export const ajustarStatAtleta = createAsyncThunk(
  'estatisticas/ajustarStat',
  async ({ jogadorId, jogador, jogadorImg, jogadorTeam, statKey, valorNovo, valorAntigo }, { dispatch }) => {
    const delta = Number(valorNovo) - Number(valorAntigo);
    if (delta === 0) return null;

    // 1. PATCH direto no atleta com o novo valor absoluto
    const atleta = await fetchAtleta(jogadorId);
    const stats = { ...(atleta.statistics || {}) };
    stats[statKey] = Math.max(0, Number(valorNovo));

    const { error: updateError } = await supabase
      .from('athletes')
      .update({ statistics: stats })
      .eq('id', jogadorId);
    if (updateError) throw new Error(`Erro ao ajustar estatísticas do atleta: ${updateError.message}`);

    // 2. Cria registro de auditoria em estatisticas
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

    const { data: created, error: insertError } = await supabase
      .from('estatisticas')
      .insert([auditRecord])
      .select()
      .single();
    if (insertError) throw new Error(`Erro ao registrar auditoria de ajuste: ${insertError.message}`);

    // 3. Re-busca atletas
    dispatch(fetchAtletas());

    return created;
  }
);

// ──────────────────────────────────────────────────
// ENTITY ADAPTER + SLICE
// ──────────────────────────────────────────────────

/**
 * Adaptador de entidade do Redux Toolkit para gerenciar o estado dos eventos estatísticos.
 */
const estatisticasAdapter = createEntityAdapter();

/**
 * Slice de estatísticas para gerenciar o estado Redux do CRUD e logs de auditoria.
 */
export const estatisticasSlice = createSlice({
  name: 'estatisticas',
  initialState: estatisticasAdapter.getInitialState({
    loading: false,
    error: null,
  }),
  reducers: {},
  extraReducers: (builder) => {
    builder
      // --- FETCH ---
      .addCase(fetchEstatisticas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEstatisticas.fulfilled, (state, action) => {
        state.loading = false;
        estatisticasAdapter.setAll(state, action.payload);
      })
      .addCase(fetchEstatisticas.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // --- CREATE ---
      .addCase(criarEstatistica.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(criarEstatistica.fulfilled, (state, action) => {
        state.loading = false;
        estatisticasAdapter.addOne(state, action.payload);
      })
      .addCase(criarEstatistica.rejected, (state, action) => { state.loading = false; state.error = action.error.message; })

      // --- BULK CREATE ---
      .addCase(criarEstatisticasEmLote.pending, (state) => {
        state.loading = true;
      })
      .addCase(criarEstatisticasEmLote.fulfilled, (state, action) => {
        state.loading = false;
        estatisticasAdapter.addMany(state, action.payload);
      })
      .addCase(criarEstatisticasEmLote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // --- UPDATE ---
      .addCase(atualizarEstatistica.fulfilled, (state, action) => {
        estatisticasAdapter.updateOne(state, {
          id: action.payload.id,
          changes: action.payload,
        });
      })

      // --- DELETE ---
      .addCase(deletarEstatistica.fulfilled, (state, action) => {
        estatisticasAdapter.removeOne(state, action.payload);
      })

      // --- AJUSTE DIRETO ---
      .addCase(ajustarStatAtleta.fulfilled, (state, action) => {
        if (action.payload) {
          estatisticasAdapter.addOne(state, action.payload);
        }
      });
  },
});

/**
 * Seletores automáticos gerados pelo adaptador de estatísticas.
 * Expõe selectAllEstatisticas, selectEstatisticaById e selectEstatisticaIds.
 */
export const {
  selectAll: selectAllEstatisticas,
  selectById: selectEstatisticaById,
  selectIds: selectEstatisticaIds,
} = estatisticasAdapter.getSelectors((state) => state.estatisticas);

export default estatisticasSlice.reducer;
