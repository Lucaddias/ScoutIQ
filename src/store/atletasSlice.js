import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// [REQ: createAsyncThunk] Busca assíncrona de atletas via fetch com async/await
export const fetchAtletas = createAsyncThunk('atletas/fetchAtletas', async () => {
  const response = await fetch('/players_updated.json');
  if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
  const data = await response.json();
  return data.athletes || data || [];
});

export const atletasSlice = createSlice({
  name: 'atletas',
  initialState: {
    lista: [],
    loading: false, // [REQ: loading-state]
    error: null,    // [REQ: error-state]
  },
  reducers: {
    // READ: Carrega lista diretamente (fallback para dados mock)
    setAtletas: (state, action) => {
      state.lista = action.payload;
    },

    // CREATE: Adiciona um jogador novo
    adicionarAtleta: (state, action) => {
      state.lista.push(action.payload);
    },

    // UPDATE: Acha o jogador pelo ID e atualiza
    atualizarAtleta: (state, action) => {
      const index = state.lista.findIndex(atleta => atleta.id === action.payload.id);
      if (index !== -1) {
        state.lista[index] = action.payload;
      }
    },

    // DELETE: Remove o jogador usando o ID
    excluirAtleta: (state, action) => {
      state.lista = state.lista.filter(atleta => atleta.id !== action.payload);
    },
  },

  // [REQ: extraReducers] Trata os três casos do thunk assíncrono
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

export const { setAtletas, adicionarAtleta, atualizarAtleta, excluirAtleta } = atletasSlice.actions;
export default atletasSlice.reducer;
