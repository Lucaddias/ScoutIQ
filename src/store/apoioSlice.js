import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { gerarCenarios } from '../utils/algorithm.js';

// THUNK: Executa o algoritmo de forma assíncrona para não travar a tela e mostrar o loading
export const simularCenarios = createAsyncThunk(
  'apoio/simular',
  async ({ allPlayers, config }) => {
    // Simula um tempo de processamento no servidor (600ms)
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Roda a sua função matemática e devolve os 3 cenários
    const result = gerarCenarios(allPlayers, config);
    return result;
  }
);

const apoioSlice = createSlice({
  name: 'apoio',
  initialState: {
    cenariosGerados: null, // Guarda o resultado (Cenário 1, 2 e 3)
    loadingSimulacao: false, // Controla o spinner de loading da tela
    pacoteSelecionado: null, // Guarda o pacote final que vai para o PDF
  },
  reducers: {
    // Reducer síncrono simples para salvar a escolha do usuário
    selecionarPacoteOficial: (state, action) => {
      state.pacoteSelecionado = action.payload;
    },
    // Opcional: caso queira adicionar um botão de "Limpar" no futuro
    limparSimulacao: (state) => {
      state.cenariosGerados = null;
      state.pacoteSelecionado = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(simularCenarios.pending, (state) => {
        state.loadingSimulacao = true;
      })
      .addCase(simularCenarios.fulfilled, (state, action) => {
        state.loadingSimulacao = false;
        state.cenariosGerados = action.payload;
      })
      .addCase(simularCenarios.rejected, (state) => {
        state.loadingSimulacao = false;
        // Aqui você poderia tratar erros de cálculo, se necessário
      });
  }
});

// Exporta as ações manuais
export const { selecionarPacoteOficial, limparSimulacao } = apoioSlice.actions;

// Exporta o reducer para o store
export default apoioSlice.reducer;