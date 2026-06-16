import { describe, it, expect } from 'vitest';
import { enrichPlayers } from '../utils/playerScore.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeGK = (overrides = {}) => ({
  id: 'gk1',
  name: 'Goleiro Teste',
  position: 'Goalkeeper',
  statistics: {
    gamesPlayed: 30,
    minutesPlayed: 2700,
    goals: 0,
    assists: 0,
    totalPasses: 800,
    accuratePasses: 720,
    tackles: 5,
    distanceCoveredKm: 9,
    ...overrides,
  },
});

const makeOutfield = (overrides = {}) => ({
  id: 'fw1',
  name: 'Atacante Teste',
  position: 'Forward',
  statistics: {
    gamesPlayed: 30,
    minutesPlayed: 2500,
    goals: 15,
    assists: 8,
    totalPasses: 600,
    accuratePasses: 480,
    tackles: 20,
    distanceCoveredKm: 10,
    ...overrides,
  },
});

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('enrichPlayers', () => {
  it('gk_score_in_range: score do goleiro está entre 0 e 100', () => {
    const result = enrichPlayers([makeGK()]);

    expect(result).toHaveLength(1);
    expect(result[0].score).toBeGreaterThanOrEqual(0);
    expect(result[0].score).toBeLessThanOrEqual(100);
  });

  it('single_player_no_crash: jogador único retorna score numérico sem lançar erro', () => {
    const player = makeOutfield();

    expect(() => enrichPlayers([player])).not.toThrow();

    const result = enrichPlayers([player]);
    expect(typeof result[0].score).toBe('number');
  });

  it('empty_array: lista vazia retorna array vazio', () => {
    const result = enrichPlayers([]);

    expect(result).toEqual([]);
  });

  it('incomplete_stats_no_nan: atleta com stats incompletas (criado pelo Admin) não gera NaN nem contamina o pool', () => {
    // Jogador criado pelo formulário Admin: só goals e assists, sem tackles/distanceCoveredKm/minutesPlayed
    const incompleto = {
      id: 'novo1',
      name: 'Recém Cadastrado',
      position: 'Forward',
      statistics: { goals: 0, assists: 0 },
    };
    const result = enrichPlayers([incompleto, makeOutfield(), makeGK()]);

    result.forEach(p => {
      expect(Number.isNaN(p.score)).toBe(false);
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    });
  });

  it('normalized_scores: com múltiplos jogadores todos os scores ficam entre 0 e 100', () => {
    const players = [
      makeGK({ id: 'gk1' }),
      makeOutfield({ id: 'fw1' }),
      makeOutfield({ id: 'fw2', goals: 5, assists: 2 }),
      { id: 'def1', name: 'Defensor', position: 'Defender', statistics: {
        gamesPlayed: 28, minutesPlayed: 2400, goals: 2, assists: 3,
        totalPasses: 900, accuratePasses: 810, tackles: 60, distanceCoveredKm: 11,
      }},
      { id: 'mid1', name: 'Meia', position: 'Midfielder', statistics: {
        gamesPlayed: 32, minutesPlayed: 2700, goals: 8, assists: 12,
        totalPasses: 1100, accuratePasses: 935, tackles: 35, distanceCoveredKm: 12,
      }},
    ];

    const result = enrichPlayers(players);

    expect(result).toHaveLength(players.length);
    result.forEach(p => {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    });
  });
});

// ---------------------------------------------------------------------------
// ScoutIQ Score — dimensões novas (custo-benefício, projeção, justiça de posição)
// ---------------------------------------------------------------------------

describe('enrichPlayers — ScoutIQ Score', () => {
  it('campos_presentes: expõe as quatro notas e diagnósticos, todas em [0,100]', () => {
    const [p] = enrichPlayers([makeOutfield({}, )]);
    for (const k of ['performanceScore', 'valueScore', 'projectionScore', 'scoutScore', 'pricePercentile']) {
      expect(typeof p[k]).toBe('number');
      expect(p[k]).toBeGreaterThanOrEqual(0);
      expect(p[k]).toBeLessThanOrEqual(100);
    }
  });

  it('valor_barganha: mesmo desempenho, o mais barato tem valueScore maior', () => {
    const base = { id: 'caro', position: 'Forward', marketValue: 50_000_000, statistics: makeOutfield().statistics };
    const players = [
      { ...base, id: 'caro',   marketValue: 50_000_000 },
      { ...base, id: 'barato', marketValue: 1_000_000 },
    ];
    const result = enrichPlayers(players);
    const caro = result.find(p => p.id === 'caro');
    const barato = result.find(p => p.id === 'barato');

    expect(barato.valueScore).toBeGreaterThan(caro.valueScore);
    // O barato é subvalorizado (entrega mais do que custa).
    expect(barato.valueGapPct).toBeGreaterThan(caro.valueGapPct);
  });

  it('projecao_juventude: mesmo desempenho, o mais jovem tem projectionScore maior', () => {
    const stats = makeOutfield().statistics;
    const players = [
      { id: 'velho', position: 'Forward', age: 33, marketValue: 5_000_000, statistics: stats },
      { id: 'jovem', position: 'Forward', age: 22, marketValue: 5_000_000, statistics: stats },
    ];
    const result = enrichPlayers(players);
    const jovem = result.find(p => p.id === 'jovem');
    const velho = result.find(p => p.id === 'velho');

    expect(jovem.projectionScore).toBeGreaterThan(velho.projectionScore);
  });

  it('justica_posicao: zagueiro forte é avaliado entre zagueiros, sem punição por não fazer gol', () => {
    const defGood = { id: 'defG', position: 'Defender', age: 26, marketValue: 10_000_000, statistics: {
      gamesPlayed: 30, minutesPlayed: 2700, goals: 1, assists: 1,
      totalPasses: 1200, accuratePasses: 1100, tackles: 90, interceptions: 70, distanceCoveredKm: 11,
    }};
    const defWeak = { id: 'defW', position: 'Defender', age: 26, marketValue: 10_000_000, statistics: {
      gamesPlayed: 30, minutesPlayed: 2700, goals: 0, assists: 0,
      totalPasses: 400, accuratePasses: 300, tackles: 20, interceptions: 10, distanceCoveredKm: 9,
    }};
    const fwGood = makeOutfield({}, );
    const fwWeak = makeOutfield({ goals: 1, assists: 0 });
    fwWeak.id = 'fwW'; fwGood.id = 'fwG';

    const result = enrichPlayers([defGood, defWeak, { ...fwGood }, { ...fwWeak, id: 'fwW' }]);
    const g = result.find(p => p.id === 'defG');
    const w = result.find(p => p.id === 'defW');

    // Ranqueamento dentro da posição funciona...
    expect(g.score).toBeGreaterThan(w.score);
    // ...e o bom zagueiro NÃO é esmagado por não marcar gols (continua nota alta).
    expect(g.score).toBeGreaterThanOrEqual(50);
  });

  it('radar_percentis: expõe radar com 5 eixos, todos percentis em [0,100]', () => {
    const [p] = enrichPlayers([makeOutfield()]);
    expect(p.radar).toBeDefined();
    for (const axis of ['gols', 'assist', 'passe', 'defesa', 'distancia']) {
      expect(typeof p.radar[axis]).toBe('number');
      expect(p.radar[axis]).toBeGreaterThanOrEqual(0);
      expect(p.radar[axis]).toBeLessThanOrEqual(100);
    }
  });
});
