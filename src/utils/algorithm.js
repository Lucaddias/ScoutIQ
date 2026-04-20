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

export function gerarCenarios(players, { orcamento, tetoSalarial, vagasArray }) {
  // vagasArray: [{ dbPos: 'Forward', prio: 3 }, { dbPos: 'Midfielder', prio: 1 }]
  const elegivel = players.filter(
    p => p.marketValue <= orcamento && p.monthlySalary <= tetoSalarial
  );

  // Determinar counts baseados exatamente no array
  const slots = { Forward: 0, Midfielder: 0, Defender: 0, Goalkeeper: 0 };
  vagasArray.forEach(v => {
    if (slots[v.dbPos] !== undefined) slots[v.dbPos]++;
  });

  function pickBySlots(pool, slotsObj, maxOrcamento, maxTeto, rankFn) {
    const result = [];
    let usedBudget = 0;
    let usedSalary = 0;

    const positions = Object.entries(slotsObj).filter(([, count]) => count > 0);

    for (const [pos, count] of positions) {
      const candidates = pool
        .filter(p => p.position === pos && !result.some(r => r.id === p.id))
        .sort((a, b) => rankFn(b) - rankFn(a));

      let picked = 0;
      for (const player of candidates) {
        if (picked >= count) break;
        if (usedBudget + player.marketValue <= maxOrcamento && 
            usedSalary + player.monthlySalary <= maxTeto) {
          result.push(player);
          usedBudget += player.marketValue;
          usedSalary += player.monthlySalary;
          picked++;
        }
      }
    }
    return result;
  }

  const cenario1 = pickBySlots(elegivel, slots, orcamento, tetoSalarial, p => p.score);
  const cenario2 = pickBySlots(elegivel, slots, orcamento, tetoSalarial, p => p.score / (p.marketValue / 1_000_000));
  
  const floor = cenario1.length > 0 ? (cenario1.reduce((a, p) => a + p.score, 0)/cenario1.length)*0.35 : 50;
  const eligibleC3 = elegivel.filter(p => p.score >= floor);
  const cenario3 = pickBySlots(eligibleC3, slots, orcamento, tetoSalarial, p => -(p.marketValue + p.monthlySalary * 12));

  return { cenario1, cenario2, cenario3 };
}
