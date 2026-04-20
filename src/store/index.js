import { configureStore } from '@reduxjs/toolkit';
import atletasReducer from './atletasSlice';

export const store = configureStore({
  reducer: {
    atletas: atletasReducer, // A fatia de atletas agora faz parte do cofre global
  },
});