/**
 * Configuração e inicialização do Store Global do Redux.
 * Combina os reducers de atletas, apoio e estatísticas em um único estado unificado.
 * @module store/index
 */

import { configureStore } from '@reduxjs/toolkit';
import atletasReducer from './atletasSlice';
import apoioReducer from './apoioSlice';
import estatisticasReducer from './estatisticasSlice';

/**
 * Store global do Redux para toda a aplicação ScoutIQ.
 *
 * Estrutura do Estado Global:
 * - `atletas`: Estado do CRUD de atletas (EntityAdapter + loading/error).
 * - `apoio`: Estado de simulações, relatórios oficiais salvos e propostas de contrato.
 * - `estatisticas`: Estado dos logs e registros de eventos estatísticos (EntityAdapter).
 *
 * @type {Object}
 */
export const store = configureStore({
  reducer: {
    atletas: atletasReducer,
    apoio: apoioReducer,
    estatisticas: estatisticasReducer,
  },
});