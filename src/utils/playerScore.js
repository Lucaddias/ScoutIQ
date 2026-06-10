/**
 * Algoritmo de Cálculo de Desempenho e Normalização de Atletas.
 * @module utils/playerScore
 */

/**
 * Representa os dados estatísticos de um atleta.
 * @typedef {Object} PlayerStatistics
 * @property {number} [gamesPlayed=1] - Quantidade de partidas jogadas.
 * @property {number} [minutesPlayed=1] - Minutos totais jogados.
 * @property {number} [goals] - Gols marcados.
 * @property {number} [assists] - Assistências realizadas.
 * @property {number} [totalPasses] - Passes totais tentados.
 * @property {number} [accuratePasses] - Passes corretos realizados.
 * @property {number} [tackles] - Desarmes efetuados.
 * @property {number} [distanceCoveredKm] - Distância percorrida em quilômetros.
 */

/**
 * Representa um atleta bruto vindo do banco de dados/API.
 * @typedef {Object} RawAthlete
 * @property {string|number} id - Identificador exclusivo do atleta.
 * @property {string} name - Nome completo do atleta.
 * @property {string} position - Posição ('Forward', 'Midfielder', 'Defender', 'Goalkeeper').
 * @property {PlayerStatistics} [statistics] - Bloco com as estatísticas acumuladas do atleta.
 */

/**
 * Calcula uma pontuação de desempenho bruta e normalizada (0 a 100) para um atleta específico.
 * Utiliza pesos baseados na posição:
 * - Goleiros (Goalkeeper): Foco em aproveitamento de passes e distância média percorrida por minuto.
 * - Linha (Outfield): Foco ponderado em gols por jogo, assistências por jogo, acerto de passe, desarmes e quilometragem por minuto.
 *
 * @param {RawAthlete} player - O objeto do atleta contendo a posição e estatísticas.
 * @returns {number} Um valor inteiro entre 0 e 100 representando o nível de desempenho técnico bruto.
 */
export function computeScore(player) {
  const s = player.statistics;
  if (!s) return 50;

  const gamesPlayed = s.gamesPlayed || 1;
  const minutesPlayed = s.minutesPlayed || 1;

  const isGK = player.position === 'Goalkeeper';

  let raw;
  if (isGK) {
    // GK: pass accuracy + distance per minute
    // coeficiente 0.3 evita que distPerMin (m/min) domine e force raw > 100 sozinho
    const passAcc = s.totalPasses > 0 ? (s.accuratePasses / s.totalPasses) * 100 : 0;
    const distPerMin = (s.distanceCoveredKm * 1000) / minutesPlayed;
    raw = passAcc * 0.7 + distPerMin * 0.3;
  } else {
    const goalsPerGame   = s.goals / gamesPlayed;
    const assistsPerGame = s.assists / gamesPlayed;
    const passAcc        = s.totalPasses > 0 ? (s.accuratePasses / s.totalPasses) * 100 : 0;
    const tacklesPerGame = s.tackles / gamesPlayed;
    const distPerMin     = (s.distanceCoveredKm * 1000) / minutesPlayed;

    raw =
      goalsPerGame   * 25 +
      assistsPerGame * 18 +
      passAcc        *  0.3 +
      tacklesPerGame *  0.8 +
      distPerMin     * 12;
  }

  return Math.min(100, Math.max(0, Math.round(raw)));
}

/**
 * Representa um atleta enriquecido com a sua pontuação técnica calculada.
 * @typedef {Object} EnrichedAthlete
 * @property {string|number} id - Identificador exclusivo do atleta.
 * @property {string} name - Nome completo do atleta.
 * @property {string} position - Posição ('Forward', 'Midfielder', 'Defender', 'Goalkeeper').
 * @property {PlayerStatistics} [statistics] - Estatísticas acumuladas.
 * @property {number} score - Pontuação de desempenho normalizada (0-100).
 */

/**
 * Enriquece e normaliza uma lista de atletas com base no pool total.
 * O cálculo faz com que a pontuação final (score) seja relativa, distribuída proporcionalmente
 * de 0 a 100 entre a menor e a maior pontuação encontrada na lista.
 *
 * @param {RawAthlete[]} athletes - Lista de atletas brutos.
 * @returns {EnrichedAthlete[]} Lista de atletas enriquecida com a propriedade `score` normalizada.
 */
export function enrichPlayers(athletes) {
  if (athletes.length === 0) return [];
  const scored = athletes.map(p => ({
    ...p,
    score: computeScore(p),
  }));
  // Normalise scores to 0-100 relative to the whole pool
  const scores = scored.map(p => p.score);
  const minS = Math.min(...scores);
  const maxS = Math.max(...scores);
  const range = maxS - minS;
  // Se todos os atletas têm o mesmo score bruto, retorna sem normalizar
  if (range === 0) return scored;
  return scored.map(p => ({
    ...p,
    score: Math.round(((p.score - minS) / range) * 100),
  }));
}

