import React from 'react';
import PlayerCard from '../../components/PlayerCard.jsx';
import { formatBRL, positionFullLabel } from '../../utils/formatters.js';
import { POSITION_COLORS, POSITIONS_DB } from '../../utils/constants.js';

export default function PositionSection({ stats, expandedPos, togglePos, onPlayerClick }) {
  if (!stats) return null;

  return (
    <div className="stats-section">
      <h2>Por Posição <span className="section-hint">(clique para ver os jogadores)</span></h2>
      <div className="pos-grid">
        {POSITIONS_DB.map(pos => {
          const d = stats.byPos[pos];
          if (!d) return null;
          const isExpanded = expandedPos === pos;
          return (
            <div
              className={`pos-card ${isExpanded ? 'expanded' : ''}`}
              key={pos}
              style={{ '--pos-color': POSITION_COLORS[pos] }}
              onClick={() => togglePos(pos)}
            >
              <div className="pos-badge" style={{ background: POSITION_COLORS[pos] }}>
                {positionFullLabel(pos)}
              </div>
              <div className="pos-count">{d.count} atletas</div>
              <div className="pos-rows">
                <div><span>Valor médio</span><strong>{formatBRL(d.avgValue)}</strong></div>
                <div><span>Salário médio</span><strong>{formatBRL(d.avgSalary)}/mês</strong></div>
                <div><span>Score médio</span><strong style={{ color: POSITION_COLORS[pos] }}>{d.avgScore}</strong></div>
              </div>
              <div className="pos-expand-hint">
                <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                {isExpanded ? 'Fechar lista' : 'Ver jogadores'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded player list for selected position */}
      {expandedPos && stats.byPos[expandedPos] && (
        <div className="pos-expanded-list">
          <h3 style={{ color: POSITION_COLORS[expandedPos] }}>
            <i className="fa-solid fa-list"></i> {positionFullLabel(expandedPos)}s — {stats.byPos[expandedPos].count} atletas
          </h3>
          <div className="pos-players">
            {stats.byPos[expandedPos].players.map(p => (
              <PlayerCard key={p.id} player={p} onClick={onPlayerClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
