import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// 1. READ: Buscar do seu arquivo JSON
export const fetchAtletas = createAsyncThunk('atletas/fetchAtletas', async () => {
  // Simulando que o JSON é uma API na internet (com 1 seg de atraso)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const response = await fetch('/players_updated.json');
  if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
  const data = await response.json();
  
  return data.athletes || data || [];
});

// 2. CREATE: Simular criação com atraso
export const criarAtleta = createAsyncThunk('atletas/criarAtleta', async (novoJogador) => {
  await new Promise(resolve => setTimeout(resolve, 800)); // "Pensando..."
  
  return {
    ...novoJogador,
    id: `mock_${Math.random().toString(36).substr(2, 9)}` // Cria ID falso
  };
});

// 3. UPDATE: Simular edição com atraso
export const atualizarAtletaMock = createAsyncThunk('atletas/atualizarAtleta', async (jogador) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return jogador; // Só devolve o cara modificado pra gaveta atualizar
});

// 4. DELETE: Simular exclusão com atraso
export const deletarAtletaMock = createAsyncThunk('atletas/deletarAtleta', async (id) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return id; // Devolve o ID pra gaveta sumir com ele da tela
});

export const atletasSlice = createSlice({
  name: 'atletas',
  initialState: {
    lista: [],
    loading: false, // Variável de Ouro! Vamos usar pra mostrar o spinner
    error: null,
  },
  reducers: {}, // Vazio, pois tudo agora é assíncrono (Thunks)
  
  extraReducers: (builder) => {
    builder
      // --- FETCH ---
      .addCase(fetchAtletas.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAtletas.fulfilled, (state, action) => { state.loading = false; state.lista = action.payload; })
      .addCase(fetchAtletas.rejected, (state, action) => { state.loading = false; state.error = action.error.message; })
      
      // --- CREATE ---
      .addCase(criarAtleta.pending, (state) => { state.loading = true; })
      .addCase(criarAtleta.fulfilled, (state, action) => {
        state.loading = false;
        state.lista.push(action.payload);
      })

      // --- UPDATE ---
      .addCase(atualizarAtletaMock.pending, (state) => { state.loading = true; })
      .addCase(atualizarAtletaMock.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.lista.findIndex(a => a.id === action.payload.id);
        if (index !== -1) { state.lista[index] = action.payload; }
      })

      // --- DELETE ---
      .addCase(deletarAtletaMock.pending, (state) => { state.loading = true; })
      .addCase(deletarAtletaMock.fulfilled, (state, action) => {
        state.loading = false;
        state.lista = state.lista.filter(a => a.id !== action.payload);
      });
  },
});

export default atletasSlice.reducer;