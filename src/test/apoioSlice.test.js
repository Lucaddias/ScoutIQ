import { describe, it, expect, vi } from 'vitest';

// apoioSlice.js está em src/store/ e faz: import { supabase } from '../lib/supabase.js'
// O Vitest resolve mocks pelo caminho absoluto do módulo. Usamos o caminho relativo
// do arquivo de TESTE que leva ao mesmo arquivo resolvido: src/lib/supabase.js
vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

import reducer, { limparSimulacao, simularCenarios, salvarPacoteOficial } from '../store/apoioSlice.js';

// ---------------------------------------------------------------------------
// apoioSlice — testa o reducer puro, sem executar thunks assíncronos reais.
// ---------------------------------------------------------------------------

describe('apoioSlice reducer', () => {
  it('inicial_state: estado inicial tem avisos=[], loadingRelatorio=false, cenariosGerados=null', () => {
    const state = reducer(undefined, { type: '@@INIT' });

    expect(state.avisos).toEqual([]);
    expect(state.loadingRelatorio).toBe(false);
    expect(state.cenariosGerados).toBeNull();
  });

  it('limpar_reseta_avisos: limparSimulacao zera avisos e cenariosGerados', () => {
    // Arrange: estado com dados já preenchidos
    const preState = {
      ...reducer(undefined, { type: '@@INIT' }),
      avisos: ['aviso1'],
      cenariosGerados: { cenario1: [], cenario2: [], cenario3: [] },
    };

    // Act
    const state = reducer(preState, limparSimulacao());

    // Assert
    expect(state.avisos).toEqual([]);
    expect(state.cenariosGerados).toBeNull();
  });

  it('simular_pending_reseta_avisos: simularCenarios.pending limpa avisos e ativa loadingSimulacao', () => {
    const preState = {
      ...reducer(undefined, { type: '@@INIT' }),
      avisos: ['aviso antigo'],
    };

    const state = reducer(preState, simularCenarios.pending('req-1'));

    expect(state.avisos).toEqual([]);
    expect(state.loadingSimulacao).toBe(true);
  });

  it('simular_fulfilled_stores_avisos: simularCenarios.fulfilled salva cenários e avisos retornados', () => {
    const payload = {
      cenario1: [],
      cenario2: [],
      cenario3: [],
      avisos: ['msg1'],
    };

    const state = reducer(undefined, simularCenarios.fulfilled(payload, 'req-1'));

    expect(state.avisos).toEqual(['msg1']);
    expect(state.cenariosGerados).toEqual({
      cenario1: [],
      cenario2: [],
      cenario3: [],
    });
    expect(state.loadingSimulacao).toBe(false);
  });

  it('salvar_rejected_unblocks_loading: salvarPacoteOficial.rejected reseta loadingRelatorio para false', () => {
    // Arrange: estado com loading travado em true (simula bug antes da correção)
    const preState = {
      ...reducer(undefined, { type: '@@INIT' }),
      loadingRelatorio: true,
    };

    // Act: despachar rejected diretamente
    const action = {
      type: salvarPacoteOficial.rejected.type,
      error: { message: 'Erro ao salvar' },
    };
    const state = reducer(preState, action);

    // Assert: loading deve ser false — confirma que o bug foi corrigido
    expect(state.loadingRelatorio).toBe(false);
  });
});
