import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

/*
 * THUNK ASSÍNCRONO (createAsyncThunk)
 * Permite buscar dados de uma API ou arquivo externo de forma assíncrona.
 * Gera automaticamente 3 actions: pending (carregando), fulfilled (sucesso) e rejected (erro).
 * O retorno da função async vira o action.payload em extraReducers.
 */
export const fetchAtletas = createAsyncThunk('atletas/fetchAtletas', async () => {
  const response = await fetch('/players_updated.json');
  if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
  const data = await response.json();
  return data.athletes || data || [];
});

/*
 * SLICE DE ATLETAS (createSlice)
 * Uma "fatia" do estado global. Reúne em um só lugar:
 *   - initialState: os dados iniciais dessa fatia
 *   - reducers: as funções síncronas que modificam o estado (CRUD)
 *   - extraReducers: os casos assíncronos gerados pelo createAsyncThunk
 * O Redux Toolkit usa Immer internamente, então podemos "mutar" o state diretamente.
 */
export const atletasSlice = createSlice({
  name: 'atletas',
  initialState: {
    lista: [],
    loading: false, // controla o estado de carregamento para exibir spinners
    error: null,    // armazena a mensagem de erro caso o fetch falhe
  },

  /*
   * REDUCERS SÍNCRONOS — operações CRUD sobre a lista local
   * Cada reducer recebe (state, action) onde action.payload é o dado enviado pelo dispatch.
   * Esses reducers geram automaticamente as actions exportadas no final do arquivo.
   */
  reducers: {
    // Carrega a lista completa de uma vez (usado como fallback com dados mock)
    setAtletas: (state, action) => {
      state.lista = action.payload;
    },

    // Adiciona um novo jogador ao final da lista
    adicionarAtleta: (state, action) => {
      state.lista.push(action.payload);
    },

    // Localiza o jogador pelo ID e substitui todo o objeto
    atualizarAtleta: (state, action) => {
      const index = state.lista.findIndex(atleta => atleta.id === action.payload.id);
      if (index !== -1) {
        state.lista[index] = action.payload;
      }
    },

    // Remove o jogador cujo ID foi passado como payload
    excluirAtleta: (state, action) => {
      state.lista = state.lista.filter(atleta => atleta.id !== action.payload);
    },
  },

  /*
   * EXTRA REDUCERS — tratam os 3 estados gerados pelo createAsyncThunk:
   *   pending   → fetch iniciou: ativa o loading
   *   fulfilled → fetch concluiu: salva os dados na lista
   *   rejected  → fetch falhou: registra a mensagem de erro
   */
  extraReducers: (builder) => {
    builder
      .addCase(fetchAtletas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAtletas.fulfilled, (state, action) => {
        state.loading = false;
        state.lista = action.payload;
      })
      .addCase(fetchAtletas.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

/*
 * EXPORTAÇÕES
 * As actions (adicionarAtleta, atualizarAtleta, etc.) são usadas nos componentes com dispatch().
 * O reducer padrão é registrado no store em src/store/index.js.
 */
export const { setAtletas, adicionarAtleta, atualizarAtleta, excluirAtleta } = atletasSlice.actions;
export default atletasSlice.reducer;
