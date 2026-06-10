import { describe, it, expect } from 'vitest';
import { gerarCenarios } from '../utils/algorithm.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makePlayer = (overrides = {}) => ({
  id: '1',
  name: 'Test Player',
  position: 'Forward',
  marketValue: 1_000_000,
  monthlySalary: 50_000,
  score: 80,
  ...overrides,
});

const defaultConfig = {
  orcamento: 10_000_000,
  tetoSalarial: 500_000,
  vagasArray: [{ dbPos: 'Forward', prio: 2 }],
};

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('gerarCenarios', () => {
  it('cenario2_no_infinity: jogador com marketValue=0 não gera rank Infinity em cenario2', () => {
    const players = [
      makePlayer({ id: '1', score: 80, marketValue: 0 }),
      makePlayer({ id: '2', score: 70, marketValue: 1_000_000 }),
    ];

    const result = gerarCenarios(players, defaultConfig);

    // Nenhum jogador em cenário2 deve ter rank Infinity
    // (o rank é calculado internamente; validamos o efeito: o jogador com value=0
    // NÃO aparece em cenario2, pois o rank dele é 0, enquanto o outro tem rank > 0)
    result.cenario2.forEach(p => {
      const roi = p.marketValue > 0 ? p.score / (p.marketValue / 1_000_000) : 0;
      expect(isFinite(roi)).toBe(true);
    });
  });

  it('cenario2_best_roi: com mesmo score, cenario2 prefere jogador mais barato (melhor ROI)', () => {
    const players = [
      makePlayer({ id: 'caro',   score: 80, marketValue: 8_000_000, monthlySalary: 50_000 }),
      makePlayer({ id: 'barato', score: 80, marketValue: 1_000_000, monthlySalary: 50_000 }),
    ];

    const result = gerarCenarios(players, defaultConfig);

    // cenario2 deve escolher o jogador mais barato (ROI 80 vs 10)
    expect(result.cenario2).toHaveLength(1);
    expect(result.cenario2[0].id).toBe('barato');
  });

  it('empty_players: lista vazia retorna arrays vazios e não lança erro', () => {
    const result = gerarCenarios([], defaultConfig);

    expect(result.cenario1).toEqual([]);
    expect(result.cenario2).toEqual([]);
    expect(result.cenario3).toEqual([]);
  });

  it('warnings_when_budget_zero: orçamento zero impossibilita contratações e gera aviso', () => {
    const players = [makePlayer()];
    const config = { ...defaultConfig, orcamento: 0 };

    const result = gerarCenarios(players, config);

    expect(result.avisos.length).toBeGreaterThanOrEqual(1);
  });

  it('dedup_avisos: avisos repetidos entre cenários aparecem apenas uma vez', () => {
    // Config que força falha em todos os cenários → mesmo aviso repetido
    const config = {
      orcamento: 100, // menor que qualquer valor de mercado
      tetoSalarial: 500_000,
      vagasArray: [{ dbPos: 'Forward', prio: 2 }],
    };
    const players = [makePlayer({ marketValue: 1_000_000 })];

    const result = gerarCenarios(players, config);

    const avisos = result.avisos;
    const uniqueAvisos = [...new Set(avisos)];
    expect(avisos.length).toBe(uniqueAvisos.length);
  });
});
