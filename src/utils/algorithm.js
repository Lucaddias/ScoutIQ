/**
 * Scenario Generation Algorithm
 *
 * Given the full player pool (already enriched with .score),
 * generates 3 distinct "purchase packages" that respect:
 *   - orcamento (total transfer budget)
 *   - tetoSalarial (monthly salary cap for all new signings combined)
 *   - vagas (number of slots to fill)
 *   - prioridades: { Forward, Midfielder, Defender, Goalkeeper } => "Alta (3)" | "Média (2)" | "Baixa (1)"
 *
 * Rules:
 *   - Max 1 goalkeeper regardless of vagas or priority
 *   - Higher-priority positions get proportionally more slots
 *   - If a position has Alta priority, it WILL be represented in results
 */

/** Parse "Alta (3)" → 3 */
function parsePriority(str) {
  const match = str.match(/\((\d)\)/);
  return match ? Number(match[1]) : 1;
}

/**
 * Allocate slot counts per position based on priority weights.
 * Alta(3) gets 3x shares, Média(2) gets 2x, Baixa(1) gets 1x.
 * GK is capped at 1 max.
 */
function allocateSlots(vagas, prioridades) {
  const positions = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];
  const weights = {};
  let totalWeight = 0;

  positions.forEach(pos => {
    const w = parsePriority(prioridades[pos] || 'Baixa (1)');
    weights[pos] = w;
    totalWeight += w;
  });

  // Proportional allocation
  const slots = {};
  let remaining = vagas;

  // First pass: proportional
  positions.forEach(pos => {
    let count = Math.round((weights[pos] / totalWeight) * vagas);
    // Cap GK at 1
    if (pos === 'Goalkeeper') count = Math.min(count, 1);
    slots[pos] = count;
  });

  // Ensure at least 1 slot for Alta positions
  positions.forEach(pos => {
    if (weights[pos] === 3 && slots[pos] === 0) {
      slots[pos] = 1;
    }
  });

  // Cap GK again
  slots['Goalkeeper'] = Math.min(slots['Goalkeeper'], 1);

  // Adjust to match total vagas
  let total = Object.values(slots).reduce((a, b) => a + b, 0);

  // If over, trim from lowest priority positions first
  const byPrioAsc = [...positions].sort((a, b) => weights[a] - weights[b]);
  while (total > vagas) {
    for (const pos of byPrioAsc) {
      if (total <= vagas) break;
      if (slots[pos] > (weights[pos] === 3 ? 1 : 0)) {
        slots[pos]--;
        total--;
      }
    }
    // Safety: if can't trim more, break
    if (total > vagas) {
      for (const pos of byPrioAsc) {
        if (total <= vagas) break;
        if (slots[pos] > 0) { slots[pos]--; total--; }
      }
    }
  }

  // If under, add to highest priority positions first
  const byPrioDesc = [...positions].sort((a, b) => weights[b] - weights[a]);
  while (total < vagas) {
    for (const pos of byPrioDesc) {
      if (total >= vagas) break;
      // Don't exceed 1 GK
      if (pos === 'Goalkeeper' && slots[pos] >= 1) continue;
      slots[pos]++;
      total++;
    }
  }

  return slots;
}

/**
 * Pick top N players for each position that collectively fit the budget.
 * rankFn(player) → number, higher is better
 */
function pickBySlots(pool, slots, orcamento, tetoSalarial, rankFn) {
  const result = [];
  let usedBudget = 0;
  let usedSalary = 0;

  // Sort positions by slot count desc so we fill important ones first
  const positions = Object.entries(slots)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  for (const [pos, count] of positions) {
    const candidates = pool
      .filter(p => p.position === pos && !result.some(r => r.id === p.id))
      .sort((a, b) => rankFn(b) - rankFn(a));

    let picked = 0;
    for (const player of candidates) {
      if (picked >= count) break;
      const newBudget = usedBudget + player.marketValue;
      const newSalary = usedSalary + player.monthlySalary;
      if (newBudget <= orcamento && newSalary <= tetoSalarial) {
        result.push(player);
        usedBudget = newBudget;
        usedSalary = newSalary;
        picked++;
      }
    }
  }

  // If we have leftover budget and didn't fill all slots, fill with any eligible player
  if (result.length < Object.values(slots).reduce((a, b) => a + b, 0)) {
    const remaining = pool
      .filter(p => !result.some(r => r.id === p.id))
      .filter(p => p.position !== 'Goalkeeper' || result.filter(r => r.position === 'Goalkeeper').length < 1)
      .sort((a, b) => rankFn(b) - rankFn(a));

    for (const player of remaining) {
      if (result.length >= Object.values(slots).reduce((a, b) => a + b, 0)) break;
      const newBudget = usedBudget + player.marketValue;
      const newSalary = usedSalary + player.monthlySalary;
      if (newBudget <= orcamento && newSalary <= tetoSalarial) {
        result.push(player);
        usedBudget = newBudget;
        usedSalary = newSalary;
      }
    }
  }

  return result;
}

/**
 * Main export: generate the 3 scenarios.
 */
export function gerarCenarios(players, { orcamento, tetoSalarial, vagas, prioridades }) {
  const elegivel = players.filter(
    p => p.marketValue <= orcamento && p.monthlySalary <= tetoSalarial
  );

  const slots = allocateSlots(vagas, prioridades);

  // Cenário 1 — Máxima Performance: top score per position
  const cenario1 = pickBySlots(elegivel, slots, orcamento, tetoSalarial, p => p.score);

  // Cenário 2 — Best ROI: score per BRL
  const cenario2 = pickBySlots(elegivel, slots, orcamento, tetoSalarial,
    p => p.score / (p.marketValue / 1_000_000));

  // Cenário 3 — Conservador: cheapest that meets quality floor
  const avgScore1 = cenario1.length > 0
    ? cenario1.reduce((acc, p) => acc + p.score, 0) / cenario1.length
    : 50;
  const floor = avgScore1 * 0.35;
  const eligibleC3 = elegivel.filter(p => p.score >= floor);
  const cenario3 = pickBySlots(eligibleC3, slots, orcamento, tetoSalarial,
    p => -(p.marketValue + p.monthlySalary * 12));

  // Ensure scenarios are distinct where possible
  const c1Ids = new Set(cenario1.map(p => p.id));
  const c2IsDiff = cenario2.some(p => !c1Ids.has(p.id));

  return {
    cenario1,
    cenario2: c2IsDiff ? cenario2 : cenario1,
    cenario3,
  };
}
