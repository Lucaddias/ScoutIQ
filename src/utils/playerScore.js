/**
 * Algoritmo de Avaliação de Atletas — ScoutIQ Score.
 *
 * Pipeline desenhado para ser JUSTO ENTRE POSIÇÕES e revelar DISCREPÂNCIAS DE
 * MERCADO (barganhas) — ajudando clubes menores a achar talento acessível.
 *
 * Em vez de uma fórmula única (que punia zagueiros/goleiros frente a atacantes),
 * o cálculo produz TRÊS notas independentes, todas relativas à posição:
 *   1. performanceScore (P) — habilidade no papel, comparada só com pares da posição.
 *   2. valueScore       (V) — custo-benefício: desempenho alto + preço baixo = barganha.
 *   3. projectionScore  (J) — potencial/revenda, ajustado pela curva de idade.
 * E um scoutScore final = combinação ajustável (perfil) das três.
 *
 * Etapas internas: per-90 → encolhimento bayesiano (anti ruído de amostra pequena)
 * → percentil dentro da posição (robusto a outliers) → pesos por papel.
 *
 * @module utils/playerScore
 */

/**
 * Minutos de "regularização" do encolhimento. Quanto menor que isso o atleta
 * jogou, mais a métrica dele é puxada para a mediana da posição (evita que
 * "1 gol em 1 jogo" vire fenômeno). ~5 jogos completos.
 * @type {number}
 */
const M0 = 450;

/**
 * Perfil padrão de pesos do scoutScore — orientado a clube pequeno
 * (prioriza custo-benefício). Ajustável via options.profile.
 * @type {{wP:number, wV:number, wJ:number}}
 */
const DEFAULT_PROFILE = { wP: 0.35, wV: 0.45, wJ: 0.20 };

/**
 * Pesos por posição (somam 1). Cada chave é uma métrica calculada em rawMetrics.
 * Goleiro é limitado pelos dados disponíveis (sem defesas/clean sheets) — ver README.
 * @type {Object<string, Object<string, number>>}
 */
const POSITION_WEIGHTS = {
  Forward:    { goals90: 0.40, assists90: 0.20, defense90: 0.10, passAcc: 0.08, dist90: 0.10, discipline: 0.12 },
  Midfielder: { assists90: 0.20, goals90: 0.12, defense90: 0.20, passAcc: 0.18, passVol90: 0.12, dist90: 0.13, discipline: 0.05 },
  Defender:   { defense90: 0.35, passAcc: 0.20, passVol90: 0.10, dist90: 0.10, discipline: 0.15, goals90: 0.05, assists90: 0.05 },
  Goalkeeper: { passAcc: 0.45, passVol90: 0.15, discipline: 0.15, availability: 0.25 },
  // Fallback para posições desconhecidas (perfil equilibrado de jogador de linha).
  Outfield:   { goals90: 0.20, assists90: 0.18, defense90: 0.22, passAcc: 0.15, dist90: 0.10, discipline: 0.15 },
};

/** Todas as métricas que entram em medianas/percentis. */
const METRIC_KEYS = ['goals90', 'assists90', 'defense90', 'passAcc', 'passVol90', 'dist90', 'discipline', 'availability'];

/** Número seguro (não-finito → 0). @param {*} v @returns {number} */
const num = (v) => (Number.isFinite(v) ? v : 0);

/** Limita x ao intervalo [lo, hi]. */
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** Converte uma estatística acumulada em "por 90 minutos". */
const per90 = (value, minutes) => (minutes > 0 ? (num(value) / minutes) * 90 : 0);

/** Mediana de uma lista numérica (0 se vazia). */
function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Percentil por posto médio (midrank): (#abaixo + 0.5·#iguais) / n · 100.
 * Sempre em (0,100); para grupo de 1 elemento devolve 50 (sem pool de comparação).
 * @param {number} value @param {number[]} arr @returns {number}
 */
function midrankPercentile(value, arr) {
  const n = arr.length;
  if (n === 0) return 50;
  let below = 0, equal = 0;
  for (const v of arr) {
    if (v < value) below++;
    else if (v === value) equal++;
  }
  return ((below + 0.5 * equal) / n) * 100;
}

/**
 * Fator de idade para projeção/revenda (pico ~27 anos). Idade ausente → 1.0.
 * @param {number} [age] @returns {number}
 */
function ageFactor(age) {
  if (!Number.isFinite(age)) return 1.0;
  if (age <= 21) return 1.25;
  if (age <= 25) return 1.10;
  if (age <= 29) return 1.00;
  if (age <= 32) return 0.85;
  return 0.70;
}

/** Mapeia a posição bruta para o grupo de comparação. */
function groupOf(position) {
  return POSITION_WEIGHTS[position] ? position : 'Outfield';
}

/**
 * Extrai as métricas brutas por-90 (e taxas) de um atleta, tolerando dados ausentes.
 * @param {Object} player @returns {Object} métricas indexadas por METRIC_KEYS + minutes
 */
function rawMetrics(player) {
  const s = player.statistics || {};
  const minutes = num(s.minutesPlayed);
  const totalPasses = num(s.totalPasses);
  return {
    minutes,
    goals90:    per90(s.goals, minutes),
    assists90:  per90(s.assists, minutes),
    defense90:  per90(num(s.tackles) + num(s.interceptions), minutes),
    passVol90:  per90(totalPasses, minutes),
    dist90:     per90(s.distanceCoveredKm, minutes),
    // Disciplina: menos cartões = melhor (valor negativo; o percentil cuida da direção).
    discipline: -per90(num(s.yellowCards) + 2 * num(s.redCards), minutes),
    // Aproveitamento de passe é uma taxa (não per-90).
    passAcc:    totalPasses > 0 ? num(s.accuratePasses) / totalPasses : 0,
    // Disponibilidade (minutos em campo) — usada para goleiros (titularidade).
    availability: minutes,
  };
}

/**
 * Representa um atleta enriquecido com as notas do ScoutIQ Score.
 * @typedef {Object} EnrichedAthlete
 * @property {number} score            - Headline = performanceScore (habilidade justa por posição, 0-100).
 * @property {number} performanceScore - Habilidade no papel, relativa à posição (0-100).
 * @property {number} valueScore       - Custo-benefício / barganha (0-100; >50 = subvalorizado).
 * @property {number} projectionScore  - Potencial/revenda ajustado por idade (0-100).
 * @property {number} scoutScore       - Combinação ajustável das três (perfil), 0-100.
 * @property {number} pricePercentile  - Percentil de preço dentro da posição (0-100).
 * @property {number} valueGapPct       - performanceScore − pricePercentile (>0 = mercado paga menos do que entrega).
 */

/**
 * Enriquece uma lista de atletas com o ScoutIQ Score (notas relativas à posição).
 *
 * O cálculo é necessariamente RELATIVO AO POOL (percentis por posição), então a
 * lista inteira é processada de uma vez. Atletas com dados incompletos não geram
 * NaN nem contaminam o pool (são puxados para a mediana da posição).
 *
 * @param {Object[]} athletes - Lista de atletas brutos (com position, statistics, marketValue, age).
 * @param {Object} [options]
 * @param {{wP:number, wV:number, wJ:number}} [options.profile] - Pesos do scoutScore.
 * @returns {EnrichedAthlete[]} Lista enriquecida.
 */
export function enrichPlayers(athletes, options = {}) {
  if (!athletes || athletes.length === 0) return [];
  const profile = options.profile || DEFAULT_PROFILE;

  // 1) Métricas brutas + agrupamento por posição.
  const items = athletes.map((player) => ({
    player,
    group: groupOf(player.position),
    m: rawMetrics(player),
  }));

  const groups = {};
  for (const it of items) (groups[it.group] ||= []).push(it);

  // 2) Medianas das métricas brutas, por posição (base do encolhimento).
  const medians = {};
  for (const [g, list] of Object.entries(groups)) {
    medians[g] = {};
    for (const k of METRIC_KEYS) medians[g][k] = median(list.map((it) => it.m[k]));
  }

  // 3) Encolhimento bayesiano: puxa quem jogou pouco para a mediana da posição.
  for (const it of items) {
    const rel = it.m.minutes / (it.m.minutes + M0);
    it.adj = {};
    for (const k of METRIC_KEYS) {
      // Disponibilidade (minutos) não é encolhida — ela MEDE o tempo em campo.
      it.adj[k] = k === 'availability' ? it.m[k] : rel * it.m[k] + (1 - rel) * medians[it.group][k];
    }
  }

  // 4) Arrays por posição para o cálculo de percentis (métricas ajustadas + preço).
  const arrays = {};
  for (const [g, list] of Object.entries(groups)) {
    arrays[g] = { price: list.map((it) => num(it.player.marketValue)) };
    for (const k of METRIC_KEYS) arrays[g][k] = list.map((it) => it.adj[k]);
  }

  // 5) performanceScore (P) e percentil de preço.
  for (const it of items) {
    const weights = POSITION_WEIGHTS[it.group] || POSITION_WEIGHTS.Outfield;
    let acc = 0, wsum = 0;
    for (const [k, w] of Object.entries(weights)) {
      acc += w * midrankPercentile(it.adj[k], arrays[it.group][k]);
      wsum += w;
    }
    it.P = wsum > 0 ? acc / wsum : 50;
    it.pricePct = midrankPercentile(num(it.player.marketValue), arrays[it.group].price);
  }

  // 6) valueScore (V) e base da projeção (P · fator de idade).
  for (const it of items) {
    it.valueGap = it.P - it.pricePct;                  // >0 = subvalorizado
    it.V = clamp((it.valueGap + 100) / 2, 0, 100);     // residual [-100,100] → [0,100]
    it.proj = it.P * ageFactor(it.player.age);
  }
  const projArrays = {};
  for (const [g, list] of Object.entries(groups)) projArrays[g] = list.map((it) => it.proj);

  // 7) projectionScore (J), scoutScore, perfil de radar e montagem final.
  const { wP, wV, wJ } = profile;
  return items.map((it) => {
    const performanceScore = Math.round(clamp(it.P, 0, 100));
    const valueScore = Math.round(clamp(it.V, 0, 100));
    const projectionScore = Math.round(clamp(midrankPercentile(it.proj, projArrays[it.group]), 0, 100));
    const scoutScore = Math.round(
      clamp(wP * performanceScore + wV * valueScore + wJ * projectionScore, 0, 100)
    );

    // Perfil de radar: cada eixo é o PERCENTIL do atleta entre pares da posição
    // (0-100). Isso distribui o gráfico de forma justa — sem picos por escalas
    // brutas diferentes (passes nas centenas vs gols nas dezenas).
    const pct = (k) => Math.round(midrankPercentile(it.adj[k], arrays[it.group][k]));
    const radar = {
      gols:      pct('goals90'),
      assist:    pct('assists90'),
      passe:     pct('passAcc'),
      defesa:    pct('defense90'),
      distancia: pct('dist90'),
    };

    return {
      ...it.player,
      // Headline mantém a semântica de "habilidade" (agora justa por posição),
      // para os cenários de contratação (técnico/ROI/financeiro) seguirem corretos.
      score: performanceScore,
      performanceScore,
      valueScore,
      projectionScore,
      scoutScore,
      pricePercentile: Math.round(it.pricePct),
      valueGapPct: Math.round(it.valueGap),
      radar,
    };
  });
}
