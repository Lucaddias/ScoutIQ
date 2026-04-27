import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';

// 1. READ
export const fetchAtletas = createAsyncThunk('atletas/fetchAtletas', async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const response = await fetch('/players_updated.json');
  if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
  const data = await response.json();
  return data.athletes || data || [];
});

// 2. CREATE
export const criarAtleta = createAsyncThunk('atletas/criarAtleta', async (novoJogador) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    ...novoJogador,
    id: `mock_${Math.random().toString(36).substr(2, 9)}`
  };
});

// 3. UPDATE
export const atualizarAtletaMock = createAsyncThunk('atletas/atualizarAtleta', async (jogador) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return jogador; 
});

// 4. DELETE
export const deletarAtletaMock = createAsyncThunk('atletas/deletarAtleta', async (id) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return id; 
});

// ==========================================
// A MÁGICA DO ENTITY ADAPTER COMEÇA AQUI
// ==========================================

// Criamos o adapter. Ele já sabe organizar tudo por ID automaticamente.
const atletasAdapter = createEntityAdapter();

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

// Exportamos os seletores prontos! As telas vão usar isso para ler os dados.
export const {
  selectAll: selectAllAtletas,
  selectById: selectAtletaById,
  selectIds: selectAtletaIds
} = atletasAdapter.getSelectors((state) => state.atletas);

export default atletasSlice.reducer;