import { configureStore } from '@reduxjs/toolkit';
import atletasReducer from './atletasSlice';

/*
 * STORE GLOBAL (Redux)
 * configureStore cria o "cofre central" da aplicação.
 * Cada chave dentro de reducer representa uma fatia (slice) do estado global.
 * Qualquer componente pode ler ou modificar esses dados usando useSelector e useDispatch.
 */
export const store = configureStore({
  reducer: {
    atletas: atletasReducer, // fatia responsável por toda a lista de atletas
  },
});