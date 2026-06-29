import { describe, it, expect, vi } from 'vitest';

// O slice agora fala com a API Express. Mockamos o api.js para isolar o reducer
// (os testes abaixo despacham as actions .pending/.fulfilled/.rejected diretamente,
// sem executar os thunks, mas o mock evita qualquer chamada de rede real).
vi.mock('../lib/api.js', () => ({
  api: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn(),
  },
}));

import reducer, { resetAtletasStatus, fetchAtletas } from '../store/atletasSlice.js';

// ---------------------------------------------------------------------------
// atletasSlice — testa o reducer puro, sem chamar thunks assíncronos reais.
// Os action creators .pending/.fulfilled/.rejected são usados diretamente.
// ---------------------------------------------------------------------------

describe('atletasSlice reducer', () => {
  it('initial_state: estado inicial tem status idle, loading false e error null', () => {
    const state = reducer(undefined, { type: '@@INIT' });

    expect(state.status).toBe('idle');
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetch_pending: fetchAtletas.pending seta status=loading e loading=true', () => {
    const state = reducer(undefined, fetchAtletas.pending('req-1'));

    expect(state.status).toBe('loading');
    expect(state.loading).toBe(true);
  });

  it('fetch_fulfilled: fetchAtletas.fulfilled armazena jogadores e seta status=succeeded', () => {
    const payload = [{ id: '1', name: 'Jogador A' }];
    const state = reducer(undefined, fetchAtletas.fulfilled(payload, 'req-1'));

    expect(state.status).toBe('succeeded');
    expect(state.loading).toBe(false);
    // O entityAdapter armazena entidades em state.entities e IDs em state.ids
    expect(state.ids).toContain('1');
    expect(state.entities['1'].name).toBe('Jogador A');
  });

  it('fetch_rejected: fetchAtletas.rejected seta status=failed e guarda a mensagem de erro', () => {
    const action = {
      type: fetchAtletas.rejected.type,
      error: { message: 'Network error' },
    };
    const state = reducer(undefined, action);

    expect(state.status).toBe('failed');
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Network error');
  });

  it('reset_after_failed: resetAtletasStatus após falha volta status para idle (desbloqueia retry)', () => {
    // Arrange: estado com falha
    const failedAction = {
      type: fetchAtletas.rejected.type,
      error: { message: 'Network error' },
    };
    const failedState = reducer(undefined, failedAction);
    expect(failedState.status).toBe('failed');

    // Act
    const resetState = reducer(failedState, resetAtletasStatus());

    // Assert
    expect(resetState.status).toBe('idle');
  });
});
