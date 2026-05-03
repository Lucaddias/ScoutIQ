import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { gerarCenarios } from '../utils/algorithm.js';

const API_URL = 'http://localhost:3001/relatorios';

// 1. A MATEMÁTICA CONTINUA LOCAL: O algoritmo roda aqui no front-end
export const simularCenarios = createAsyncThunk(
  'apoio/simular',
  async ({ allPlayers, config }) => {
    await new Promise(resolve => setTimeout(resolve, 600)); // "Pensando..."
    return gerarCenarios(allPlayers, config);
  }
);

// 2. NOVO: THUNK PARA SALVAR O RELATÓRIO NO BANCO DE DADOS
export const salvarPacoteOficial = createAsyncThunk(
  'apoio/salvarRelatorio',
  async (pacoteArray) => {
    // Montamos um objeto legal para salvar no banco
    const novoRelatorio = {
      id: `rel_${Date.now()}`,
      dataCriacao: new Date().toISOString(),
      atletas: pacoteArray
    };

    // Salvamos no JSON Server
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoRelatorio)
    });

    // Retornamos apenas a array de jogadores para não quebrar a sua tela de Relatórios!
    return pacoteArray; 
  }
);

const apoioSlice = createSlice({
  name: 'apoio',
  initialState: {
    cenariosGerados: null,
    loadingSimulacao: false,
    loadingRelatorio: false, // Novo state para o botão de gerar relatório
    pacoteSelecionado: null, 
  },
  reducers: {
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
        state.pacoteSelecionado = action.payload; // Guarda a array na gaveta para a tela de Relatórios ler
      });
  }
});

export const { limparSimulacao } = apoioSlice.actions;
export default apoioSlice.reducer;