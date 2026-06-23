/**
 * Algoritmo de Geração de Cenários de Compra de Jogadores.
 * @module utils/algorithm
 */
import { positionFullLabel } from './formatters.js';

/**
 * Representa um jogador com sua pontuação calculada.
 * @typedef {Object} Player
 * @property {string|number} id - Identificador exclusivo do jogador.
 * @property {string} name - Nome completo do jogador.
 * @property {string} position - Posição do jogador ('Forward', 'Midfielder', 'Defender', 'Goalkeeper').
 * @property {number} marketValue - Valor de mercado em BRL.
 * @property {number} monthlySalary - Salário mensal do jogador em BRL.
 * @property {number} score - Pontuação geral de desempenho (0-100).
 */

/**
 * Representa uma vaga a ser preenchida.
 * @typedef {Object} Vaga
 * @property {string} dbPos - Posição a ser preenchida ('Forward', 'Midfielder', 'Defender', 'Goalkeeper').
 * @property {number} prio - Prioridade da vaga (1: Baixa, 2: Média, 3: Alta).
 */

/**
 * Gera 3 cenários distintos de pacotes de compra que respeitam as restrições orçamentárias, salariais, número de vagas e prioridades.
 *
 * - Cenário 1 (Foco Técnico): Maximiza o score absoluto acumulado dos jogadores selecionados.
 * - Cenário 2 (Custo-Benefício): Prioriza jogadores com melhor relação Score por Milhão gasto.
 * - Cenário 3 (Foco Financeiro/Investimento): Minimiza a despesa total (Preço + 12 meses de Salário) mantendo um patamar técnico mínimo (score >= floor).
 *
 * @param {Player[]} players - Lista completa de atletas elegíveis (já calculados com .score).
 * @param {Object} config - Configurações financeiras e vagas.
 * @param {number} config.orcamento - Orçamento máximo total de transferências.
 * @param {number} config.tetoSalarial - Teto salarial máximo mensal combinado para todas as contratações.
 * @param {Vaga[]} config.vagasArray - Array descrevendo as vagas configuradas e suas prioridades.
 * @returns {{cenario1: Player[], cenario2: Player[], cenario3: Player[]}} Objeto contendo os três cenários recomendados.
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

  /**
   * Função interna auxiliar para selecionar jogadores preenchendo as vagas por posição de acordo com uma função de classificação (ranking).
   *
   * @param {Player[]} pool - Lista de jogadores disponíveis para escolha.
   * @param {Object.<string, number>} slotsObj - Mapeamento com a quantidade de vagas por posição.
   * @param {number} maxOrcamento - Orçamento remanescente para o cenário.
   * @param {number} maxTeto - Teto salarial mensal remanescente para o cenário.
   * @param {function(Player): number} rankFn - Função que define a métrica a ser maximizada (ou minimizada, se valor negativo).
   * @returns {{ players: Player[], warnings: string[] }} Jogadores selecionados e avisos de vagas não preenchidas.
   */
  function pickBySlots(pool, slotsObj, maxOrcamento, maxTeto, rankFn) {
    const result = [];
    const warnings = [];
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
      if (picked < count) {
        const posLabel = positionFullLabel(pos);
        warnings.push(`${count - picked} vaga(s) de ${posLabel} não puderam ser preenchidas dentro do orçamento.`);
      }
    }
    return { players: result, warnings };
  }

  const r1 = pickBySlots(elegivel, slots, orcamento, tetoSalarial, p => p.score);
  const r2 = pickBySlots(elegivel, slots, orcamento, tetoSalarial, p => p.marketValue > 0 ? p.score / (p.marketValue / 1_000_000) : 0);

  const floor = r1.players.length > 0
    ? (r1.players.reduce((a, p) => a + p.score, 0) / r1.players.length) * 0.35
    : 50;
  const eligibleC3 = elegivel.filter(p => p.score >= floor);
  const r3 = pickBySlots(eligibleC3, slots, orcamento, tetoSalarial, p => -(p.marketValue + p.monthlySalary * 12));

  // Deduplica avisos entre cenários para não repetir a mesma mensagem
  const todosAvisos = [...new Set([...r1.warnings, ...r2.warnings, ...r3.warnings])];

  return {
    cenario1: r1.players,
    cenario2: r2.players,
    cenario3: r3.players,
    avisos: todosAvisos,
  };
}

