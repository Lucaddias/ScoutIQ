import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { gerarCenarios } from '../utils/algorithm.js';

const API_URL       = 'http://localhost:3001/relatorios';
const PROPOSTAS_URL = 'http://localhost:3001/propostas';

// 1. A MATEMÁTICA CONTINUA LOCAL: O algoritmo roda aqui no front-end
export const simularCenarios = createAsyncThunk(
  'apoio/simular',
  async ({ allPlayers, config }) => {
    await new Promise(resolve => setTimeout(resolve, 600)); // "Pensando..."
    return gerarCenarios(allPlayers, config);
  }
);

// 2. SALVAR O RELATÓRIO NO BANCO DE DADOS (POST)
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

// 3. BUSCAR HISTÓRICO DE RELATÓRIOS (GET) - ESSA FALTAVA!
export const fetchRelatorios = createAsyncThunk(
  'apoio/fetchRelatorios', 
  async () => {
    const response = await fetch(API_URL);
    return await response.json();
  }
);

// 4. EXCLUIR UM RELATÓRIO DO HISTÓRICO (DELETE) - ESSA FALTAVA!
export const deletarRelatorio = createAsyncThunk(
  'apoio/deletarRelatorio', 
  async (id) => {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    return id;
  }
);
// 5. SALVAR PROPOSTA DE CONTRATO (POST)
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

// 6. BUSCAR PROPOSTAS (GET)
export const fetchPropostas = createAsyncThunk(
  'apoio/fetchPropostas',
  async () => {
    const response = await fetch(PROPOSTAS_URL);
    return await response.json();
  }
);

// 7. DELETAR PROPOSTA (DELETE)
export const deletarProposta = createAsyncThunk(
  'apoio/deletarProposta',
  async (id) => {
    await fetch(`${PROPOSTAS_URL}/${id}`, { method: 'DELETE' });
    return id;
  }
);

// 8. ATUALIZAR O NOME DO RELATÓRIO (PATCH)
export const renomearRelatorio = createAsyncThunk(
  'apoio/renomearRelatorio', 
  async ({ id, novoNome }) => {
    // Usamos PATCH porque queremos alterar APENAS o nome, sem mexer nos atletas
    const response = await fetch(`${API_URL}/${id}`, { 
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome })
    });
    return await response.json();
  }
);

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
    selecionarPacoteOficial: (state, action) => {
      state.pacoteSelecionado = action.payload;
    },
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
        // Verifica se é realmente um array. Se não for, assume array vazio.
        const dados = Array.isArray(action.payload) ? action.payload : [];
        state.historicoRelatorios = [...dados].reverse(); 
      })

      // --- RENOMEAR RELATÓRIO ---
      .addCase(renomearRelatorio.fulfilled, (state, action) => {
        // Encontra o relatório na lista e atualiza o nome dele instantaneamente na tela
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