import { createSlice } from '@reduxjs/toolkit';

export const atletasSlice = createSlice({
  name: 'atletas',
  initialState: {
    lista: [], 
  },
  reducers: {
    // READ (Ler): Puxa os dados do JSON/Supabase
    setAtletas: (state, action) => {
      state.lista = action.payload;
    },

    // CREATE (Criar): Adiciona um jogador novo
    adicionarAtleta: (state, action) => {
      state.lista.push(action.payload);
    },

    // UPDATE (Alterar): Acha o jogador pelo ID e atualiza
    atualizarAtleta: (state, action) => {
      const index = state.lista.findIndex(atleta => atleta.id === action.payload.id);
      if (index !== -1) {
        state.lista[index] = action.payload;
      }
    },

    // DELETE (Excluir): Remove o jogador usando o ID
    excluirAtleta: (state, action) => {
      state.lista = state.lista.filter(atleta => atleta.id !== action.payload);
    }
  }
});

export const { setAtletas, adicionarAtleta, atualizarAtleta, excluirAtleta } = atletasSlice.actions;
export default atletasSlice.reducer;