/**
 * Compute a normalized performance score (0–100) for a player
 * based on their statistics. Weights are tuned for outfield players;
 * goalkeepers use a separate path.
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
    const passAcc = s.totalPasses > 0 ? (s.accuratePasses / s.totalPasses) * 100 : 0;
    const distPerMin = (s.distanceCoveredKm * 1000) / minutesPlayed;
    raw = passAcc * 0.6 + distPerMin * 40;
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
 * Enrich all athletes with a computed score and normalise their fields.
 */
export function enrichPlayers(athletes) {
  const scored = athletes.map(p => ({
    ...p,
    score: computeScore(p),
  }));
  // Normalise scores to 0-100 relative to the whole pool
  const scores = scored.map(p => p.score);
  const minS = Math.min(...scores);
  const maxS = Math.max(...scores);
  const range = maxS - minS || 1;
  return scored.map(p => ({
    ...p,
    score: Math.round(((p.score - minS) / range) * 100),
  }));
}
