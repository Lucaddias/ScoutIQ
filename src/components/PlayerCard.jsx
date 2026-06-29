/**
 * @file Cartão visual compacto para exibição de um atleta.
 * @module components/PlayerCard
 */
import React, { useState } from 'react';
import { formatBRL, positionLabel, positionFullLabel } from '../utils/formatters.js';
import './PlayerCard.css';

import { POSITION_COLORS } from '../utils/constants.js';

/**
 * Cartão visual compacto de um atleta exibindo avatar, nome, posição,
 * clube, valores financeiros e score de desempenho.
 * Quando a foto não carrega, exibe um fallback com a inicial do nome.
 *
 * @component
 * @param {object}   props          - Propriedades do componente.
 * @param {object}   props.player   - Objeto com os dados do atleta.
 * @param {string}   props.player.name             - Nome completo do atleta.
 * @param {string}   props.player.position         - Posição em inglês (ex: 'Forward').
 * @param {string}   [props.player.team]           - Nome do clube.
 * @param {number}   [props.player.age]            - Idade do atleta.
 * @param {string}   [props.player.profileImageURL] - URL da foto de perfil.
 * @param {number}   props.player.marketValue      - Valor de mercado em reais.
 * @param {number}   props.player.monthlySalary    - Salário mensal em reais.
 * @param {number}   props.player.score            - Score de desempenho calculado.
 * @param {Function} [props.onClick] - Callback ao clicar no cartão (recebe o objeto player).
 * @returns {React.ReactElement} O cartão renderizado.
 */
export default function PlayerCard({ player, onClick }) {
  const [imgError, setImgError] = useState(false);
  const color = POSITION_COLORS[player.position] || '#6b7a99';
  const posShort = positionLabel(player.position);
  const posFull  = positionFullLabel(player.position);

  return (
    <div className={`player-card ${onClick ? 'clickable' : ''}`} onClick={() => onClick && onClick(player)}>
      <div className="pc-avatar">
        {imgError ? (
          <span className="pc-avatar-fallback">{(player.name || 'J').charAt(0).toUpperCase()}</span>
        ) : (
          <img
            src={player.profileImageURL}
            alt={player.name}
            onError={() => setImgError(true)}
          />
        )}
        <div className="pc-pos-badge" style={{ background: color }}>
          {posShort}
        </div>
      </div>

      <div className="pc-info">
        <div className="pc-name">{player.name}</div>
        <div className="pc-meta">
          <span>{posFull}</span>
          {player.team && <span className="pc-team">· {player.team}</span>}
          {player.age && <span className="pc-age">· {player.age} anos</span>}
        </div>
      </div>

      <div className="pc-financials">
        <div className="pc-val"><span>Valor</span>{formatBRL(player.marketValue)}</div>
        <div className="pc-val"><span>Salário</span>{formatBRL(player.monthlySalary)}/mês</div>
      </div>

      <div className="pc-score-wrap">
        <div className="pc-score" style={{ '--s-color': color }}>
          {player.score}
        </div>
        <div className="pc-score-label">Score</div>
      </div>
    </div>
  );
}
