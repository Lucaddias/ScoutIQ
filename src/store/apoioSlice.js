/**
 * Slice do Redux para Apoio à Decisão no ScoutIQ.
 * Responsável por gerenciar simulações de cenários de compra,
 * persistência de relatórios oficiais e envio de propostas de contratos.
 * @module store/apoioSlice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { gerarCenarios } from '../utils/algorithm.js';
import { supabase } from '../lib/supabase.js';

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const novoRelatorio = {
      id: `rel_${Date.now()}`,
      nome: nomeRelatorio,
      dataCriacao: new Date().toISOString(),
      atletas: pacoteArray,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('relatorios')
      .insert([novoRelatorio])
      .select()
      .single();
    if (error) throw new Error(`Erro ao salvar relatório: ${error.message}`);

    return data;
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
    const { data, error } = await supabase
      .from('relatorios')
      .select('*')
      .order('dataCriacao', { ascending: false });
    if (error) throw new Error(`Erro ao buscar relatórios: ${error.message}`);
    return data;
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
    const { error } = await supabase
      .from('relatorios')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Erro ao deletar relatório: ${error.message}`);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

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
      user_id: user.id,
      ...proposal,
    };
    const { data, error } = await supabase
      .from('propostas')
      .insert([nova])
      .select()
      .single();
    if (error) throw new Error(`Erro ao salvar proposta: ${error.message}`);
    return data;
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
    const { data, error } = await supabase
      .from('propostas')
      .select('*')
      .order('dataCriacao', { ascending: false });
    if (error) throw new Error(`Erro ao buscar propostas: ${error.message}`);
    return data;
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
    const { error } = await supabase
      .from('propostas')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Erro ao deletar proposta: ${error.message}`);
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
    const { data, error } = await supabase
      .from('relatorios')
      .update({ nome: novoNome })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Erro ao renomear relatório: ${error.message}`);
    return data;
  }
);

/**
 * Slice de apoio contendo reducers locais para seleção e limpeza de cenários, além de extraReducers para os thunks assíncronos.
 */
const apoioSlice = createSlice({
  name: 'apoio',
  initialState: {
    cenariosGerados: null,
    avisos: [],
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
      state.avisos = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // --- SIMULAR CENÁRIOS ---
      .addCase(simularCenarios.pending, (state) => {
        state.loadingSimulacao = true;
        state.avisos = [];
      })
      .addCase(simularCenarios.fulfilled, (state, action) => {
        state.loadingSimulacao = false;
        const { avisos, ...cenarios } = action.payload;
        state.cenariosGerados = cenarios;
        state.avisos = avisos || [];
      })
      .addCase(simularCenarios.rejected, (state) => {
        state.loadingSimulacao = false;
      })
      
      // --- SALVAR RELATÓRIO NO BANCO ---
      .addCase(salvarPacoteOficial.pending, (state) => { 
        state.loadingRelatorio = true; 
      })
      .addCase(salvarPacoteOficial.fulfilled, (state, action) => {
        state.loadingRelatorio = false;
        state.pacoteSelecionado = action.payload;
      })
      .addCase(salvarPacoteOficial.rejected, (state) => {
        state.loadingRelatorio = false;
      })

      // --- BUSCAR HISTÓRICO DE RELATÓRIOS ---
      .addCase(fetchRelatorios.pending, (state) => { 
        state.loadingHistorico = true; 
      })
      .addCase(fetchRelatorios.fulfilled, (state, action) => {
        state.loadingHistorico = false;
        const dados = Array.isArray(action.payload) ? action.payload : [];
        state.historicoRelatorios = dados; 
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
        state.propostas = dados;
      })
 
      // --- DELETAR PROPOSTA ---
      .addCase(deletarProposta.fulfilled, (state, action) => {
        state.propostas = state.propostas.filter(p => p.id !== action.payload);
      });
  }
});

export const { limparSimulacao, selecionarPacoteOficial } = apoioSlice.actions;
export default apoioSlice.reducer;