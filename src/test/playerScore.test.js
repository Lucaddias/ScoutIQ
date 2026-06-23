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

  it('stat_refs: expõe teto por posição (max bruto) p/ barras relativas, com floor 1', () => {
    const players = [
      makeOutfield({ id: 'a', goals: 20, assists: 5, tackles: 30 }),
      makeOutfield({ id: 'b', goals: 8, assists: 12, tackles: 10 }),
    ];
    players[0].id = 'a'; players[1].id = 'b';
    const [p] = enrichPlayers(players);

    // Teto = melhor da posição em cada stat bruta.
    expect(p.statRefs.goals).toBe(20);
    expect(p.statRefs.assists).toBe(12);
    expect(p.statRefs.tackles).toBe(30);
    // Todos os tetos respeitam o floor de 1 (sem divisão por zero no modal).
    for (const k of ['goals', 'assists', 'tackles', 'interceptions', 'distanceCoveredKm']) {
      expect(p.statRefs[k]).toBeGreaterThanOrEqual(1);
    }
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

// ---------------------------------------------------------------------------
// Regressão golden — trava a saída exata para um pool fixo.
// Protege otimizações do pipeline (ex.: percentil O(n log n) com busca binária)
// contra qualquer mudança numérica acidental. Se algum número mudar de propósito,
// recalcule e atualize os valores esperados conscientemente.
// ---------------------------------------------------------------------------

describe('enrichPlayers — regressão golden (pool fixo)', () => {
  const POOL = [
    { id: 'a', position: 'Forward', age: 24, marketValue: 30_000_000, statistics: { gamesPlayed: 30, minutesPlayed: 2500, goals: 15, assists: 8, totalPasses: 600, accuratePasses: 480, tackles: 20, interceptions: 10, distanceCoveredKm: 10, yellowCards: 4, redCards: 0 } },
    { id: 'b', position: 'Forward', age: 31, marketValue: 8_000_000, statistics: { gamesPlayed: 28, minutesPlayed: 2300, goals: 9, assists: 5, totalPasses: 450, accuratePasses: 360, tackles: 15, interceptions: 8, distanceCoveredKm: 9.5, yellowCards: 6, redCards: 1 } },
    { id: 'c', position: 'Forward', age: 19, marketValue: 2_000_000, statistics: { goals: 3, assists: 1 } },
    { id: 'd', position: 'Midfielder', age: 27, marketValue: 20_000_000, statistics: { gamesPlayed: 32, minutesPlayed: 2700, goals: 8, assists: 12, totalPasses: 1100, accuratePasses: 935, tackles: 35, interceptions: 25, distanceCoveredKm: 12, yellowCards: 5, redCards: 0 } },
    { id: 'e', position: 'Midfielder', age: 23, marketValue: 12_000_000, statistics: { gamesPlayed: 30, minutesPlayed: 2400, goals: 4, assists: 7, totalPasses: 900, accuratePasses: 760, tackles: 40, interceptions: 30, distanceCoveredKm: 11.5, yellowCards: 8, redCards: 0 } },
    { id: 'f', position: 'Defender', age: 26, marketValue: 10_000_000, statistics: { gamesPlayed: 30, minutesPlayed: 2700, goals: 1, assists: 1, totalPasses: 1200, accuratePasses: 1100, tackles: 90, interceptions: 70, distanceCoveredKm: 11, yellowCards: 7, redCards: 1 } },
    { id: 'g', position: 'Defender', age: 33, marketValue: 4_000_000, statistics: { gamesPlayed: 25, minutesPlayed: 2100, goals: 0, assists: 0, totalPasses: 700, accuratePasses: 560, tackles: 50, interceptions: 35, distanceCoveredKm: 9, yellowCards: 9, redCards: 0 } },
    { id: 'h', position: 'Goalkeeper', age: 29, marketValue: 6_000_000, statistics: { gamesPlayed: 30, minutesPlayed: 2700, goals: 0, assists: 0, totalPasses: 800, accuratePasses: 720, tackles: 5, interceptions: 2, distanceCoveredKm: 4, yellowCards: 2, redCards: 0 } },
    { id: 'i', position: 'Goalkeeper', age: 22, marketValue: 1_500_000, statistics: { gamesPlayed: 12, minutesPlayed: 1000, goals: 0, assists: 0, totalPasses: 300, accuratePasses: 240, tackles: 1, interceptions: 0, distanceCoveredKm: 1.5, yellowCards: 1, redCards: 0 } },
  ];

  const GOLDEN = {
    a: { score: 74, performanceScore: 74, valueScore: 45, projectionScore: 83, scoutScore: 63, pricePercentile: 83, valueGapPct: -10, radar: { gols: 83, assist: 83, passe: 50, defesa: 83, distancia: 33 } },
    b: { score: 38, performanceScore: 38, valueScore: 44, projectionScore: 17, scoutScore: 37, pricePercentile: 50, valueGapPct: -12, radar: { gols: 33, assist: 33, passe: 50, defesa: 33, distancia: 83 } },
    c: { score: 39, performanceScore: 39, valueScore: 61, projectionScore: 50, scoutScore: 51, pricePercentile: 17, valueGapPct: 22, radar: { gols: 33, assist: 33, passe: 50, defesa: 33, distancia: 33 } },
    d: { score: 59, performanceScore: 59, valueScore: 42, projectionScore: 75, scoutScore: 55, pricePercentile: 75, valueGapPct: -16, radar: { gols: 75, assist: 75, passe: 75, defesa: 25, distancia: 25 } },
    e: { score: 42, performanceScore: 42, valueScore: 58, projectionScore: 25, scoutScore: 46, pricePercentile: 25, valueGapPct: 17, radar: { gols: 25, assist: 25, passe: 25, defesa: 75, distancia: 75 } },
    f: { score: 70, performanceScore: 70, valueScore: 48, projectionScore: 75, scoutScore: 61, pricePercentile: 75, valueGapPct: -5, radar: { gols: 75, assist: 75, passe: 75, defesa: 75, distancia: 25 } },
    g: { score: 30, performanceScore: 30, valueScore: 53, projectionScore: 25, scoutScore: 39, pricePercentile: 25, valueGapPct: 5, radar: { gols: 25, assist: 25, passe: 25, defesa: 25, distancia: 75 } },
    h: { score: 68, performanceScore: 68, valueScore: 46, projectionScore: 75, scoutScore: 60, pricePercentile: 75, valueGapPct: -7, radar: { gols: 50, assist: 50, passe: 75, defesa: 75, distancia: 25 } },
    i: { score: 33, performanceScore: 33, valueScore: 54, projectionScore: 25, scoutScore: 41, pricePercentile: 25, valueGapPct: 8, radar: { gols: 50, assist: 50, passe: 25, defesa: 25, distancia: 75 } },
  };

  it('saida_estavel: todas as notas e radares batem com o golden', () => {
    const byId = Object.fromEntries(enrichPlayers(POOL).map(p => [p.id, p]));
    for (const [id, expected] of Object.entries(GOLDEN)) {
      const p = byId[id];
      expect(p, `atleta ${id} ausente no resultado`).toBeDefined();
      expect({
        score: p.score, performanceScore: p.performanceScore, valueScore: p.valueScore,
        projectionScore: p.projectionScore, scoutScore: p.scoutScore,
        pricePercentile: p.pricePercentile, valueGapPct: p.valueGapPct, radar: p.radar,
      }, `divergência no atleta ${id}`).toEqual(expected);
    }
  });
});
