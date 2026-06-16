/**
 * Slice do Redux para controle dos Atletas/Jogadores do ScoutIQ.
 * Centraliza o estado e operações CRUD se conectando ao Supabase.
 * @module store/atletasSlice
 */

import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { supabase } from '../lib/supabase.js';

/**
 * Thunk assíncrono para buscar todos os atletas do servidor.
 * Retorna uma lista de jogadores com dados demográficos e estatísticas.
 *
 * @type {Function}
 */
export const fetchAtletas = createAsyncThunk('atletas/fetchAtletas', async () => {
  const { data, error } = await supabase
    .from('athletes')
    .select('*');
  if (error) throw new Error(error.message);
  return data;
});

/**
 * Thunk assíncrono para criar um novo atleta no servidor.
 * Gera um ID único com prefixo 'USR-' para diferenciar de atletas importados ('SF-').
 *
 * @type {Function}
 */
export const criarAtleta = createAsyncThunk('atletas/criarAtleta', async (novoJogador) => {
  const atletaComId = {
    id: `USR-${crypto.randomUUID()}`,
    ...novoJogador,
  };
  const { data, error } = await supabase
    .from('athletes')
    .insert([atletaComId])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
});

/**
 * Thunk assíncrono para atualizar por completo um atleta existente.
 *
 * @type {Function}
 */
export const atualizarAtletaMock = createAsyncThunk('atletas/atualizarAtleta', async (jogador) => {
  const { data, error } = await supabase
    .from('athletes')
    .update(jogador)
    .eq('id', jogador.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
});

/**
 * Thunk assíncrono para remover um atleta do servidor com base em seu ID.
 *
 * @type {Function}
 */
export const deletarAtletaMock = createAsyncThunk('atletas/deletarAtleta', async (id) => {
  const { error } = await supabase
    .from('athletes')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return id; // Retornamos o ID para o Redux saber quem remover da tela
});

// ==========================================
// A MÁGICA DO ENTITY ADAPTER COMEÇA AQUI
// ==========================================

/**
 * Adaptador de entidade do Redux Toolkit para gerenciar o estado dos atletas de forma estruturada.
 * Fornece métodos otimizados para manipulação do estado em formato hashmap de entidades e array de IDs.
 */
const atletasAdapter = createEntityAdapter();

/**
 * Slice de atletas contendo o estado de carregamento, erros e os reducers/extraReducers associados ao CRUD.
 */
export const atletasSlice = createSlice({
  name: 'atletas',
  // getInitialState cria o formato { ids: [], entities: {} } 
  // e nós acoplamos as nossas variáveis loading e error junto!
  initialState: atletasAdapter.getInitialState({
    loading: false,
    error: null,
    status: 'idle',
  }),
  reducers: {
    resetAtletasStatus: (state) => { state.status = 'idle'; },
  },

  extraReducers: (builder) => {
    builder
      // --- FETCH ---
      .addCase(fetchAtletas.pending, (state) => { state.loading = true; state.error = null; state.status = 'loading'; })
      .addCase(fetchAtletas.fulfilled, (state, action) => {
        state.loading = false;
        state.status = 'succeeded';
        atletasAdapter.setAll(state, action.payload);
      })
      .addCase(fetchAtletas.rejected, (state, action) => { state.loading = false; state.error = action.error.message; state.status = 'failed'; })

      // --- CREATE ---
      .addCase(criarAtleta.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(criarAtleta.fulfilled, (state, action) => {
        state.loading = false;
        atletasAdapter.addOne(state, action.payload);
      })
      .addCase(criarAtleta.rejected, (state, action) => { state.loading = false; state.error = action.error.message; })

      // --- UPDATE ---
      .addCase(atualizarAtletaMock.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(atualizarAtletaMock.fulfilled, (state, action) => {
        state.loading = false;
        atletasAdapter.updateOne(state, { id: action.payload.id, changes: action.payload });
      })
      .addCase(atualizarAtletaMock.rejected, (state, action) => { state.loading = false; state.error = action.error.message; })

      // --- DELETE ---
      .addCase(deletarAtletaMock.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deletarAtletaMock.fulfilled, (state, action) => {
        state.loading = false;
        atletasAdapter.removeOne(state, action.payload);
      })
      .addCase(deletarAtletaMock.rejected, (state, action) => { state.loading = false; state.error = action.error.message; });
  },
});

/**
 * Seletores gerados automaticamente pelo adaptador para consulta direta no estado do Redux.
 * Exibe funções como selectAllAtletas, selectAtletaById e selectAtletaIds.
 */
export const { resetAtletasStatus } = atletasSlice.actions;

export const {
  selectAll: selectAllAtletas,
  selectById: selectAtletaById,
  selectIds: selectAtletaIds
} = atletasAdapter.getSelectors((state) => state.atletas);

export default atletasSlice.reducer;