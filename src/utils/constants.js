/**
 * Constantes compartilhadas da aplicação.
 * @module utils/constants
 */

/**
 * Lista de clubes brasileiros para os campos de seleção de time.
 * @type {string[]}
 */
export const TIMES_BR = [
  'América-MG', 'Athletico-PR', 'Atlético-GO', 'Atlético-MG', 'Avaí', 'Bahia',
  'Botafogo', 'Ceará', 'Chapecoense', 'Corinthians', 'Coritiba', 'Cuiabá',
  'Cruzeiro', 'Flamengo', 'Fluminense', 'Fortaleza', 'Goiás', 'Grêmio',
  'Internacional', 'Juventude', 'Mirassol', 'Palmeiras', 'Red Bull Bragantino',
  'Remo', 'Santos', 'São Paulo', 'Vasco da Gama', 'Vitória',
];

/**
 * Posições no formato armazenado no banco de dados.
 * @type {string[]}
 */
export const POSITIONS_DB = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];

/**
 * Cores por posição para badges, gráficos e indicadores visuais.
 * Fonte única usada em PlayerCard, PlayerModal e Estatísticas.
 * @type {Object.<string, string>}
 */
export const POSITION_COLORS = {
  Forward:    '#f59e0b',
  Midfielder: '#3b82f6',
  Defender:   '#14b8a6',
  Goalkeeper: '#8b5cf6',
};

// ── Role Constants ──────────────────────────────────────────────

/**
 * Labels por extenso dos papéis de usuário (ex: 'Administrador').
 * @type {Object.<string, string>}
 */
export const ROLE_LABELS = { admin: 'Administrador', scout: 'Olheiro', user: 'Usuário' };

/**
 * Labels curtas dos papéis de usuário (ex: 'Admin').
 * Usada no Sidebar onde o espaço é limitado.
 * @type {Object.<string, string>}
 */
export const ROLE_LABELS_SHORT = { admin: 'Admin', scout: 'Olheiro', user: 'Usuário' };

/** @type {Object.<string, string>} */
export const ROLE_COLORS = { admin: '#f87171', scout: '#fbbf24', user: '#60a5fa' };

/** @type {Object.<string, string>} */
export const ROLE_ICONS = { admin: 'fa-shield-halved', scout: 'fa-binoculars', user: 'fa-user' };

// ── Stat Constants ──────────────────────────────────────────────

/**
 * Chaves de estatísticas disponíveis no banco de dados.
 * @type {string[]}
 */
export const STAT_KEYS = [
  'gamesPlayed', 'goals', 'assists', 'totalPasses', 'accuratePasses',
  'tackles', 'interceptions', 'yellowCards', 'redCards', 'minutesPlayed', 'distanceCoveredKm',
];

/**
 * Mapeamento de chaves técnicas para labels em PT-BR legíveis.
 * @type {Object.<string, string>}
 */
export const STAT_LABELS = {
  gamesPlayed: 'Jogos Disputados',
  goals: 'Gols',
  assists: 'Assistências',
  totalPasses: 'Passes Totais',
  accuratePasses: 'Passes Certos',
  tackles: 'Desarmes',
  interceptions: 'Interceptações',
  yellowCards: 'Cartões Amarelos',
  redCards: 'Cartões Vermelhos',
  minutesPlayed: 'Minutos Jogados',
  distanceCoveredKm: 'Distância (km)',
};
