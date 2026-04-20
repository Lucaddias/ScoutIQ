import React from 'react';
import { formatBRL, positionLabel, positionFullLabel } from '../utils/formatters.js';
import './PlayerCard.css';

const POSITION_COLORS = {
  Forward:    '#f59e0b',
  Midfielder: '#3b82f6',
  Defender:   '#14b8a6',
  Goalkeeper: '#8b5cf6',
};

export default function PlayerCard({ player, onClick }) {
  const color = POSITION_COLORS[player.position] || '#6b7a99';
  const posShort = positionLabel(player.position);
  const posFull  = positionFullLabel(player.position);

  return (
    <div className={`player-card ${onClick ? 'clickable' : ''}`} onClick={() => onClick && onClick(player)}>
      <div className="pc-avatar">
        <img
          src={player.profileImageURL}
          alt={player.name}
          onError={e => { e.target.onerror = null; e.target.src = ''; e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<span class="pc-avatar-fallback">${player.name[0]}</span>`; }}
        />
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
