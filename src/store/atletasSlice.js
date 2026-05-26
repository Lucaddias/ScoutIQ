/**
 * Slice do Redux para controle dos Atletas/Jogadores do ScoutIQ.
 * Centraliza o estado e operações CRUD se conectando ao JSON-Server.
 * @module store/atletasSlice
 */

import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';

/**
 * Endereço base da API para atletas.
 * @type {string}
 * @constant
 */
const API_URL = 'http://localhost:3001/athletes';

/**
 * Thunk assíncrono para buscar todos os atletas do servidor.
 * Retorna uma lista de jogadores com dados demográficos e estatísticas.
 *
 * @type {Function}
 */
export const fetchAtletas = createAsyncThunk('atletas/fetchAtletas', async () => {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error('Erro ao buscar atletas');
  return await response.json(); // Retorna o array de atletas
});

/**
 * Thunk assíncrono para criar um novo atleta no servidor.
 * O JSON Server gera o ID automaticamente.
 *
 * @type {Function}
 */
export const criarAtleta = createAsyncThunk('atletas/criarAtleta', async (novoJogador) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(novoJogador)
  });
  return await response.json(); // Retorna o jogador criado (com o ID novo)
});

/**
 * Thunk assíncrono para atualizar por completo um atleta existente.
 *
 * @type {Function}
 */
export const atualizarAtletaMock = createAsyncThunk('atletas/atualizarAtleta', async (jogador) => {
  const response = await fetch(`${API_URL}/${jogador.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jogador)
  });
  return await response.json(); // Retorna o jogador atualizado
});

/**
 * Thunk assíncrono para remover um atleta do servidor com base em seu ID.
 *
 * @type {Function}
 */
export const deletarAtletaMock = createAsyncThunk('atletas/deletarAtleta', async (id) => {
  await fetch(`${API_URL}/${id}`, { 
    method: 'DELETE' 
  });
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
  }),
  reducers: {}, 
  
  extraReducers: (builder) => {
    builder
      // --- FETCH ---
      .addCase(fetchAtletas.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAtletas.fulfilled, (state, action) => { 
        state.loading = false; 
        // Substitui o "state.lista = action.payload"
        atletasAdapter.setAll(state, action.payload); 
      })
      .addCase(fetchAtletas.rejected, (state, action) => { state.loading = false; state.error = action.error.message; })
      
      // --- CREATE ---
      .addCase(criarAtleta.pending, (state) => { state.loading = true; })
      .addCase(criarAtleta.fulfilled, (state, action) => {
        state.loading = false;
        // Substitui o "state.lista.push"
        atletasAdapter.addOne(state, action.payload);
      })
 
      // --- UPDATE ---
      .addCase(atualizarAtletaMock.pending, (state) => { state.loading = true; })
      .addCase(atualizarAtletaMock.fulfilled, (state, action) => {
        state.loading = false;
        // Substitui aquele "findIndex" manual. Muito mais limpo!
        atletasAdapter.updateOne(state, { id: action.payload.id, changes: action.payload });
      })
 
      // --- DELETE ---
      .addCase(deletarAtletaMock.pending, (state) => { state.loading = true; })
      .addCase(deletarAtletaMock.fulfilled, (state, action) => {
        state.loading = false;
        // Substitui o "state.lista.filter"
        atletasAdapter.removeOne(state, action.payload);
      });
  },
});

/**
 * Seletores gerados automaticamente pelo adaptador para consulta direta no estado do Redux.
 * Exibe funções como selectAllAtletas, selectAtletaById e selectAtletaIds.
 */
export const {
  selectAll: selectAllAtletas,
  selectById: selectAtletaById,
  selectIds: selectAtletaIds
} = atletasAdapter.getSelectors((state) => state.atletas);

export default atletasSlice.reducer;