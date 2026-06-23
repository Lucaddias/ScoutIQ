/**
 * Hook compartilhado para carregar a lista de atletas do Redux.
 * Centraliza a política de fetch: busca apenas quando status === 'idle',
 * evitando requisições duplicadas entre páginas e habilitando retry após falha.
 * @module hooks/useAtletas
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAtletas, resetAtletasStatus, selectAllAtletas, selectAtletasEnriquecidos } from '../store/atletasSlice';

/**
 * Carrega e expõe o estado dos atletas.
 *
 * `players` já vem enriquecido com o ScoutIQ Score (via selector memoizado), calculado
 * uma única vez sobre o pool completo e compartilhado entre todas as telas. `atletas`
 * é a lista crua, mantida para quem precisar dos dados originais.
 *
 * @returns {{
 *   atletas: Object[],
 *   players: import('../store/atletasSlice').EnrichedAthlete[],
 *   loading: boolean,
 *   status: 'idle'|'loading'|'succeeded'|'failed',
 *   error: string|null,
 *   retry: Function
 * }} Estado dos atletas e função de retry (reseta o status para 'idle').
 */
export function useAtletas() {
  const dispatch = useDispatch();
  const atletas = useSelector(selectAllAtletas);
  const players = useSelector(selectAtletasEnriquecidos);
  const loading = useSelector((state) => state.atletas.loading);
  const status  = useSelector((state) => state.atletas.status);
  const error   = useSelector((state) => state.atletas.error);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchAtletas());
  }, [dispatch, status]);

  const retry = useCallback(() => dispatch(resetAtletasStatus()), [dispatch]);

  return { atletas, players, loading, status, error, retry };
}
