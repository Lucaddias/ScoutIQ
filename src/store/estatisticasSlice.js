import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { fetchAtletas } from './atletasSlice';

/*
 * ESTATÍSTICAS SLICE
 * Gerencia o CRUD de registros de estatísticas individuais (ex: "Robert Renan +1 Gol")
 * e faz a sincronização cruzada com a tabela de atletas (dupla escrita).
 *
 * Endpoints:
 *   /estatisticas  → registros de eventos estatísticos
 *   /athletes/{id} → atualização do acumulado do atleta
 */

const API_BASE = 'http://localhost:3001';
const STATS_URL = `${API_BASE}/estatisticas`;
const ATHLETES_URL = `${API_BASE}/athletes`;

/* ─── Helper: busca o atleta atual da API ─── */
const fetchAtleta = async (id) => {
  const res = await fetch(`${ATHLETES_URL}/${id}`);
  if (!res.ok) throw new Error(`Atleta ${id} não encontrado`);
  return res.json();
};

/* ─── Helper: faz PATCH nas statistics do atleta ─── */
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

/*
 * READ — busca todos os registros de estatísticas do json-server.
 */
export const fetchEstatisticas = createAsyncThunk(
  'estatisticas/fetchAll',
  async () => {
    const res = await fetch(STATS_URL);
    if (!res.ok) throw new Error('Erro ao buscar estatísticas');
    return res.json();
  }
);

/*
 * CREATE — persiste o registro E incrementa a stat no atleta.
 * Fluxo:
 *   1. POST /estatisticas          → salva o registro
 *   2. PATCH /athletes/{id}        → soma o valor ao acumulado
 *   3. dispatch(fetchAtletas())    → refresca o Redux dos atletas
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

/*
 * BULK CREATE — cria múltiplos registros para o mesmo jogador de uma vez.
 * Otimiza o PATCH: acumula todos os deltas por tipo de stat e aplica um único PATCH.
 * Retorna o array de todos os registros criados.
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

/*
 * UPDATE — atualiza o registro E ajusta o delta no atleta.
 * Calcula a diferença entre o valor novo e o antigo para aplicar corretamente.
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

/*
 * DELETE — remove o registro E decrementa a stat do atleta.
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

/*
 * AJUSTE DIRETO — permite editar uma stat do atleta diretamente pelo perfil.
 * Faz PATCH com o valor absoluto e cria um registro de auditoria em estatisticas.
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

const estatisticasAdapter = createEntityAdapter();

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

// Seletores prontos para os componentes
export const {
  selectAll: selectAllEstatisticas,
  selectById: selectEstatisticaById,
  selectIds: selectEstatisticaIds,
} = estatisticasAdapter.getSelectors((state) => state.estatisticas);

export default estatisticasSlice.reducer;
