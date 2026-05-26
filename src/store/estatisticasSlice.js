/**
 * Slice do Redux para controle de Estatísticas de Jogadores.
 * Gerencia a inserção, edição e exclusão de eventos estatísticos (ex: desarmes, gols)
 * e atualiza o acumulado na entidade Atletas correspondente (dupla escrita).
 * @module store/estatisticasSlice
 */

import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { fetchAtletas } from './atletasSlice';

/**
 * Endereço base da API.
 * @type {string}
 * @constant
 */
const API_BASE = 'http://localhost:3001';

/**
 * URL da coleção de estatísticas.
 * @type {string}
 * @constant
 */
const STATS_URL = `${API_BASE}/estatisticas`;

/**
 * URL da coleção de atletas.
 * @type {string}
 * @constant
 */
const ATHLETES_URL = `${API_BASE}/athletes`;

/**
 * Helper interno para buscar um atleta individual por ID no servidor.
 *
 * @param {string|number} id - ID do atleta a ser buscado.
 * @returns {Promise<Object>} Dados do atleta retornado pela API.
 */
const fetchAtleta = async (id) => {
  const res = await fetch(`${ATHLETES_URL}/${id}`);
  if (!res.ok) throw new Error(`Atleta ${id} não encontrado`);
  return res.json();
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
  const res = await fetch(`${ATHLETES_URL}/${jogadorId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statistics: updatedStats }),
  });
  if (!res.ok) throw new Error('Erro ao atualizar estatísticas do atleta');
  return res.json();
};

// ──────────────────────────────────────────────────
// THUNKS ASSÍNCRONOS
// ──────────────────────────────────────────────────

/**
 * Thunk assíncrono para buscar todos os registros de estatísticas individuais do json-server.
 *
 * @type {Function}
 */
export const fetchEstatisticas = createAsyncThunk(
  'estatisticas/fetchAll',
  async () => {
    const res = await fetch(STATS_URL);
    if (!res.ok) throw new Error('Erro ao buscar estatísticas');
    return res.json();
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
    const res = await fetch(STATS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registro),
    });
    if (!res.ok) throw new Error('Erro ao criar estatística');
    const created = await res.json();

    // 2. Sincroniza com o atleta (dupla escrita)
    await patchAtletaStat(registro.jogadorId, registro.tipoEstatistica, Number(registro.valor));

    // 3. Re-busca a lista de atletas para o Redux refletir a mudança
    dispatch(fetchAtletas());

    return created;
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
    const created = [];

    // 1. POST individual para cada entrada na coleção estatisticas
    for (const entry of entries) {
      const registro = {
        jogadorId: jogadorData.jogadorId,
        jogador: jogadorData.jogador,
        jogadorImg: jogadorData.jogadorImg,
        jogadorTeam: jogadorData.jogadorTeam,
        tipoEstatistica: entry.tipoEstatistica,
        valor: Number(entry.valor),
        data,
      };
      const res = await fetch(STATS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registro),
      });
      if (!res.ok) throw new Error('Erro ao criar estatística em lote');
      created.push(await res.json());
    }

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
    await fetch(`${ATHLETES_URL}/${jogadorData.jogadorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statistics: stats }),
    });

    // 4. Re-busca atletas
    dispatch(fetchAtletas());

    return created;
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
    const res = await fetch(`${STATS_URL}/${registro.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registro),
    });
    if (!res.ok) throw new Error('Erro ao atualizar estatística');
    const updated = await res.json();

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

    return updated;
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
    const res = await fetch(`${STATS_URL}/${registro.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Erro ao deletar estatística');

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
    await fetch(`${ATHLETES_URL}/${jogadorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statistics: stats }),
    });

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
    const res = await fetch(STATS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditRecord),
    });
    const created = await res.json();

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
      .addCase(criarEstatistica.fulfilled, (state, action) => {
        estatisticasAdapter.addOne(state, action.payload);
      })

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
