import { configureStore } from '@reduxjs/toolkit';
import atletasReducer from './atletasSlice';
import apoioReducer from './apoioSlice'; // <-- Nova importação

/*
 * STORE GLOBAL (Redux)
 * Centralizamos todas as "fatias" (slices) da aplicação aqui.
 */
export const store = configureStore({
  reducer: {
    atletas: atletasReducer, // Cuida do CRUD e do EntityAdapter dos jogadores
    apoio: apoioReducer,     // Cuida da matemática dos cenários e do relatório
  },
});