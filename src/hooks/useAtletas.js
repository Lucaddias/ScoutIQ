/**
 * Hook compartilhado para carregar a lista de atletas do Redux.
 * Centraliza a política de fetch: busca apenas quando status === 'idle',
 * evitando requisições duplicadas entre páginas e habilitando retry após falha.
 * @module hooks/useAtletas
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAtletas, resetAtletasStatus, selectAllAtletas } from '../store/atletasSlice';

/**
 * Carrega e expõe o estado dos atletas.
 *
 * @returns {{
 *   atletas: Object[],
 *   loading: boolean,
 *   status: 'idle'|'loading'|'succeeded'|'failed',
 *   error: string|null,
 *   retry: Function
 * }} Estado dos atletas e função de retry (reseta o status para 'idle').
 */
export function useAtletas() {
  const dispatch = useDispatch();
  const atletas = useSelector(selectAllAtletas);
  const loading = useSelector((state) => state.atletas.loading);
  const status  = useSelector((state) => state.atletas.status);
  const error   = useSelector((state) => state.atletas.error);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchAtletas());
  }, [dispatch, status]);

  const retry = useCallback(() => dispatch(resetAtletasStatus()), [dispatch]);

  return { atletas, loading, status, error, retry };
}
