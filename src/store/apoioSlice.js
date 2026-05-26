/**
 * Slice do Redux para Apoio à Decisão no ScoutIQ.
 * Responsável por gerenciar simulações de cenários de compra,
 * persistência de relatórios oficiais e envio de propostas de contratos.
 * @module store/apoioSlice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { gerarCenarios } from '../utils/algorithm.js';

/**
 * Endereço base da API para relatórios.
 * @type {string}
 * @constant
 */
const API_URL = 'http://localhost:3001/relatorios';

/**
 * Endereço base da API para propostas de contrato.
 * @type {string}
 * @constant
 */
const PROPOSTAS_URL = 'http://localhost:3001/propostas';

/**
 * Thunk assíncrono para simular cenários de compra.
 * Introduz um atraso artificial de 600ms para simular processamento pesado e invoca o algoritmo.
 *
 * @type {Function}
 */
export const simularCenarios = createAsyncThunk(
  'apoio/simular',
  async ({ allPlayers, config }) => {
    await new Promise(resolve => setTimeout(resolve, 600)); // "Pensando..."
    return gerarCenarios(allPlayers, config);
  }
);

/**
 * Thunk assíncrono para salvar um relatório (pacote oficial selecionado).
 * Realiza uma requisição POST com o array de atletas e o nome do relatório.
 *
 * @type {Function}
 */
export const salvarPacoteOficial = createAsyncThunk(
  'apoio/salvarRelatorio',
  async ({ pacoteArray, nomeRelatorio }) => { 
    const novoRelatorio = {
      id: `rel_${Date.now()}`,
      nome: nomeRelatorio, 
      dataCriacao: new Date().toISOString(),
      atletas: pacoteArray
    };
    
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoRelatorio)
    });
    
    return novoRelatorio; 
  }
);

/**
 * Thunk assíncrono para buscar o histórico de relatórios salvos.
 *
 * @type {Function}
 */
export const fetchRelatorios = createAsyncThunk(
  'apoio/fetchRelatorios', 
  async () => {
    const response = await fetch(API_URL);
    return await response.json();
  }
);

/**
 * Thunk assíncrono para excluir um relatório específico do banco de dados.
 *
 * @type {Function}
 */
export const deletarRelatorio = createAsyncThunk(
  'apoio/deletarRelatorio', 
  async (id) => {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    return id;
  }
);

/**
 * Thunk assíncrono para salvar uma nova proposta de contrato direcionada a um atleta.
 *
 * @type {Function}
 */
export const salvarProposta = createAsyncThunk(
  'apoio/salvarProposta',
  async ({ player, proposal }) => {
    const nova = {
      id: `prop_${Date.now()}`,
      tipo: 'proposta',
      dataCriacao: new Date().toISOString(),
      jogadorId: player.id,
      jogadorNome: player.name,
      jogadorTime: player.team,
      jogadorPosicao: player.position,
      jogadorFoto: player.profileImageURL || '',
      jogadorScore: player.score,
      ...proposal,
    };
    await fetch(PROPOSTAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nova),
    });
    return nova;
  }
);

/**
 * Thunk assíncrono para obter todas as propostas enviadas aos jogadores.
 *
 * @type {Function}
 */
export const fetchPropostas = createAsyncThunk(
  'apoio/fetchPropostas',
  async () => {
    const response = await fetch(PROPOSTAS_URL);
    return await response.json();
  }
);

/**
 * Thunk assíncrono para excluir uma proposta de contrato.
 *
 * @type {Function}
 */
export const deletarProposta = createAsyncThunk(
  'apoio/deletarProposta',
  async (id) => {
    await fetch(`${PROPOSTAS_URL}/${id}`, { method: 'DELETE' });
    return id;
  }
);

/**
 * Thunk assíncrono para renomear um relatório salvo através de uma requisição parcial PATCH.
 *
 * @type {Function}
 */
export const renomearRelatorio = createAsyncThunk(
  'apoio/renomearRelatorio', 
  async ({ id, novoNome }) => {
    const response = await fetch(`${API_URL}/${id}`, { 
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome })
    });
    return await response.json();
  }
);

/**
 * Slice de apoio contendo reducers locais para seleção e limpeza de cenários, além de extraReducers para os thunks assíncronos.
 */
const apoioSlice = createSlice({
  name: 'apoio',
  initialState: {
    cenariosGerados: null,
    loadingSimulacao: false,
    loadingRelatorio: false,
    pacoteSelecionado: null,
    historicoRelatorios: [],
    loadingHistorico: false,
    propostas: [],
    loadingPropostas: false,
  },
  reducers: {
    /**
     * Define o pacote selecionado como oficial.
     */
    selecionarPacoteOficial: (state, action) => {
      state.pacoteSelecionado = action.payload;
    },
    /**
     * Limpa os cenários gerados e redefine o pacote selecionado como nulo.
     */
    limparSimulacao: (state) => {
      state.cenariosGerados = null;
      state.pacoteSelecionado = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- SIMULAR CENÁRIOS ---
      .addCase(simularCenarios.pending, (state) => { 
        state.loadingSimulacao = true; 
      })
      .addCase(simularCenarios.fulfilled, (state, action) => {
        state.loadingSimulacao = false;
        state.cenariosGerados = action.payload;
      })
      
      // --- SALVAR RELATÓRIO NO BANCO ---
      .addCase(salvarPacoteOficial.pending, (state) => { 
        state.loadingRelatorio = true; 
      })
      .addCase(salvarPacoteOficial.fulfilled, (state, action) => {
        state.loadingRelatorio = false;
        state.pacoteSelecionado = action.payload; 
      })
 
      // --- BUSCAR HISTÓRICO DE RELATÓRIOS ---
      .addCase(fetchRelatorios.pending, (state) => { 
        state.loadingHistorico = true; 
      })
      .addCase(fetchRelatorios.fulfilled, (state, action) => {
        state.loadingHistorico = false;
        const dados = Array.isArray(action.payload) ? action.payload : [];
        state.historicoRelatorios = [...dados].reverse(); 
      })
 
      // --- RENOMEAR RELATÓRIO ---
      .addCase(renomearRelatorio.fulfilled, (state, action) => {
        const index = state.historicoRelatorios.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.historicoRelatorios[index].nome = action.payload.nome;
        }
      })
 
      // --- DELETAR RELATÓRIO ---
      .addCase(deletarRelatorio.fulfilled, (state, action) => {
        state.historicoRelatorios = state.historicoRelatorios.filter(r => r.id !== action.payload);
      })
 
      // --- SALVAR PROPOSTA ---
      .addCase(salvarProposta.fulfilled, (state, action) => {
        state.propostas.unshift(action.payload);
      })
 
      // --- BUSCAR PROPOSTAS ---
      .addCase(fetchPropostas.pending, (state) => { state.loadingPropostas = true; })
      .addCase(fetchPropostas.fulfilled, (state, action) => {
        state.loadingPropostas = false;
        const dados = Array.isArray(action.payload) ? action.payload : [];
        state.propostas = [...dados].reverse();
      })
 
      // --- DELETAR PROPOSTA ---
      .addCase(deletarProposta.fulfilled, (state, action) => {
        state.propostas = state.propostas.filter(p => p.id !== action.payload);
      });
  }
});

export const { limparSimulacao, selecionarPacoteOficial } = apoioSlice.actions;
export default apoioSlice.reducer;