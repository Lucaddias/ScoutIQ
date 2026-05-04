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
