/**
 * Módulo de utilitários para formatação e mapeamento de dados.
 * @module utils/formatters
 */

/**
 * Formata um valor numérico para o formato de moeda Real Brasileiro (BRL).
 *
 * @param {number} val - O valor numérico a ser formatado.
 * @returns {string} O valor formatado como string monetária em PT-BR (ex: R$ 1.500).
 */
export const formatBRL = (val) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);

/**
 * Mapeia os nomes das posições em inglês para siglas curtas em PT-BR.
 *
 * @param {string} pos - A posição em inglês (ex: 'Forward', 'Midfielder', 'Defender', 'Goalkeeper').
 * @returns {string} A sigla correspondente em português ('ATA', 'MEI', 'ZAG', 'GOL' ou o próprio valor de entrada).
 */
export const positionLabel = (pos) => {
  const map = {
    Forward:    'ATA',
    Midfielder: 'MEI',
    Defender:   'ZAG',
    Goalkeeper: 'GOL',
  };
  return map[pos] || pos;
};

/**
 * Mapeia os nomes das posições em inglês para rótulos por extenso em PT-BR.
 *
 * @param {string} pos - A posição em inglês (ex: 'Forward', 'Midfielder', 'Defender', 'Goalkeeper').
 * @returns {string} O nome por extenso da posição em português ('Atacante', 'Meia', 'Zagueiro', 'Goleiro' ou o próprio valor de entrada).
 */
export const positionFullLabel = (pos) => {
  const map = {
    Forward:    'Atacante',
    Midfielder: 'Meia',
    Defender:   'Zagueiro',
    Goalkeeper: 'Goleiro',
  };
  return map[pos] || pos;
};

/**
 * Limita um número dentro de um intervalo mínimo e máximo especificado (clamp).
 *
 * @param {number} val - O número a ser limitado.
 * @param {number} min - O limite inferior permitido.
 * @param {number} max - O limite superior permitido.
 * @returns {number} O valor limitado entre min e max.
 */
export const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

