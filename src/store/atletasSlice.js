import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';

// O endereço onde o JSON Server está rodando
const API_URL = 'http://localhost:3001/athletes';
// 1. READ: Busca os dados reais da API
export const fetchAtletas = createAsyncThunk('atletas/fetchAtletas', async () => {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error('Erro ao buscar atletas');
  return await response.json(); // Retorna o array de atletas
});

// 2. CREATE: Faz um POST para a API (O JSON Server cria o ID automaticamente!)
export const criarAtleta = createAsyncThunk('atletas/criarAtleta', async (novoJogador) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(novoJogador)
  });
  return await response.json(); // Retorna o jogador criado (com o ID novo)
});

// 3. UPDATE: Faz um PUT para a API
export const atualizarAtletaMock = createAsyncThunk('atletas/atualizarAtleta', async (jogador) => {
  const response = await fetch(`${API_URL}/${jogador.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jogador)
  });
  return await response.json(); // Retorna o jogador atualizado
});

// 4. DELETE: Faz um DELETE para a API
export const deletarAtletaMock = createAsyncThunk('atletas/deletarAtleta', async (id) => {
  await fetch(`${API_URL}/${id}`, { 
    method: 'DELETE' 
  });
  return id; // Retornamos o ID para o Redux saber quem remover da tela
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