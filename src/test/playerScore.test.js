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
