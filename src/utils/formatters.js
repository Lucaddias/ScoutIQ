/**
 * Formats a BRL currency value.
 */
export const formatBRL = (val) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);

/**
 * Maps English position names to short PT-BR labels.
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
 * Clamps a number between min and max.
 */
export const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
