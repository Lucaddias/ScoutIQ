/**
 * Slice do Redux para controle de Estatísticas de Jogadores.
 * Gerencia a inserção, edição e exclusão de eventos estatísticos (ex: desarmes, gols)
 * e atualiza o acumulado na entidade Atletas correspondente (dupla escrita).
 * @module store/estatisticasSlice
 */

import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { fetchAtletas } from './atletasSlice';
import { api } from '../lib/api.js';

// ──────────────────────────────────────────────────
// THUNKS ASSÍNCRONOS
// A dupla-escrita (sincronizar o acumulado do atleta) é feita no servidor;
// aqui apenas chamamos a API e re-buscamos os atletas para refletir a mudança.
// ──────────────────────────────────────────────────

/**
 * Thunk assíncrono para buscar todos os registros de estatísticas individuais.
 *
 * @type {Function}
 */
export const fetchEstatisticas = createAsyncThunk(
  'estatisticas/fetchAll',
  async () => {
    const { estatisticas } = await api.get('/estatisticas');
    return estatisticas;
  }
);

/**
 * Thunk assíncrono para salvar um novo evento estatístico.
 * O servidor atualiza o acumulado do atleta; recarregamos a lista ao finalizar.
 *
 * @type {Function}
 */
export const criarEstatistica = createAsyncThunk(
  'estatisticas/criar',
  async (registro, { dispatch }) => {
    const { estatistica } = await api.post('/estatisticas', registro);
    dispatch(fetchAtletas());
    return estatistica;
  }
);

/**
 * Thunk assíncrono para salvar múltiplos registros de estatísticas para o mesmo atleta em lote.
 * O servidor aplica um único update otimizado no acumulado do atleta.
 *
 * @type {Function}
 */
export const criarEstatisticasEmLote = createAsyncThunk(
  'estatisticas/criarEmLote',
  async ({ jogadorData, entries, data }, { dispatch }) => {
    const { estatisticas } = await api.post('/estatisticas/lote', { jogadorData, entries, data });
    dispatch(fetchAtletas());
    return estatisticas;
  }
);

/**
 * Thunk assíncrono para atualizar um registro estatístico existente.
 * O servidor reconcilia o acumulado do atleta (lê os valores anteriores no banco).
 *
 * @type {Function}
 */
export const atualizarEstatistica = createAsyncThunk(
  'estatisticas/atualizar',
  async ({ registro }, { dispatch }) => {
    const { estatistica } = await api.put(`/estatisticas/${registro.id}`, registro);
    dispatch(fetchAtletas());
    return estatistica;
  }
);

/**
 * Thunk assíncrono para excluir uma estatística individual.
 * O servidor decrementa o acumulado correspondente no atleta.
 *
 * @type {Function}
 */
export const deletarEstatistica = createAsyncThunk(
  'estatisticas/deletar',
  async (registro, { dispatch }) => {
    await api.del(`/estatisticas/${registro.id}`);
    dispatch(fetchAtletas());
    return registro.id;
  }
);

/**
 * Thunk assíncrono para ajustar diretamente uma estatística de um atleta para um valor absoluto.
 * O servidor registra a auditoria e aplica o novo valor.
 *
 * @type {Function}
 */
export const ajustarStatAtleta = createAsyncThunk(
  'estatisticas/ajustarStat',
  async ({ jogadorId, jogador, jogadorImg, jogadorTeam, statKey, valorNovo, valorAntigo }, { dispatch }) => {
    const { estatistica } = await api.post('/estatisticas/ajuste', {
      jogadorId, jogador, jogadorImg, jogadorTeam, statKey, valorNovo, valorAntigo,
    });
    dispatch(fetchAtletas());
    return estatistica; // null quando não houve mudança (delta 0)
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
      .addCase(atualizarEstatistica.rejected, (state, action) => {
        state.error = action.error.message;
      })

      // --- DELETE ---
      .addCase(deletarEstatistica.fulfilled, (state, action) => {
        estatisticasAdapter.removeOne(state, action.payload);
      })
      .addCase(deletarEstatistica.rejected, (state, action) => {
        state.error = action.error.message;
      })

      // --- AJUSTE DIRETO ---
      .addCase(ajustarStatAtleta.fulfilled, (state, action) => {
        if (action.payload) {
          estatisticasAdapter.addOne(state, action.payload);
        }
      })
      .addCase(ajustarStatAtleta.rejected, (state, action) => {
        state.error = action.error.message;
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
