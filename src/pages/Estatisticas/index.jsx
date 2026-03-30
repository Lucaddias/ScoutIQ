import React, { useMemo, useState } from 'react';
import { formatBRL, positionFullLabel } from '../../utils/formatters.js';
import PlayerCard from '../../components/PlayerCard.jsx';
import './Estatisticas.css';

const POS_ORDER = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];
const POS_COLORS = { Forward: '#f59e0b', Midfielder: '#3b82f6', Defender: '#14b8a6', Goalkeeper: '#8b5cf6' };

export default function Estatisticas({ players, onPlayerClick }) {
  const [expandedPos, setExpandedPos] = useState(null); // position string or null

  const stats = useMemo(() => {
    const total = players.length;
    const byPos = {};
    POS_ORDER.forEach(pos => {
      const group = players.filter(p => p.position === pos);
      if (!group.length) return;
      byPos[pos] = {
        count: group.length,
        avgValue: group.reduce((a, p) => a + p.marketValue, 0) / group.length,
        avgSalary: group.reduce((a, p) => a + p.monthlySalary, 0) / group.length,
        avgScore: (group.reduce((a, p) => a + p.score, 0) / group.length).toFixed(0),
        players: [...group].sort((a, b) => b.score - a.score),
      };
    });

    const topScorers = [...players]
      .sort((a, b) => (b.statistics?.goals || 0) - (a.statistics?.goals || 0))
      .slice(0, 5);

    const topAssists = [...players]
      .sort((a, b) => (b.statistics?.assists || 0) - (a.statistics?.assists || 0))
      .slice(0, 5);

    const topScore = [...players]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const totalMarketValue = players.reduce((a, p) => a + p.marketValue, 0);
    const avgMarketValue   = totalMarketValue / total;

    return { total, byPos, topScorers, topAssists, topScore, totalMarketValue, avgMarketValue };
  }, [players]);

  const togglePos = (pos) => {
    setExpandedPos(prev => prev === pos ? null : pos);
  };

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1>Estatísticas</h1>
        <p>Visão geral dos {stats.total} atletas monitorados — Série A 2025</p>
      </div>

      {/* Summary Cards */}
      <div className="stats-summary-grid">
        <div className="stat-card">
          <i className="fa-solid fa-users" style={{ color: '#3b82f6' }}></i>
          <div>
            <strong>{stats.total}</strong>
            <span>Atletas cadastrados</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fa-solid fa-coins" style={{ color: '#f59e0b' }}></i>
          <div>
            <strong>{formatBRL(stats.avgMarketValue)}</strong>
            <span>Valor médio de mercado</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fa-solid fa-sack-dollar" style={{ color: '#14b8a6' }}></i>
          <div>
            <strong>{formatBRL(stats.totalMarketValue)}</strong>
            <span>Valor total monitorado</span>
          </div>
        </div>
      </div>

      {/* By Position — Clickable */}
      <div className="stats-section">
        <h2>Por Posição <span className="section-hint">(clique para ver os jogadores)</span></h2>
        <div className="pos-grid">
          {POS_ORDER.map(pos => {
            const d = stats.byPos[pos];
            if (!d) return null;
            const isExpanded = expandedPos === pos;
            return (
              <div
                className={`pos-card ${isExpanded ? 'expanded' : ''}`}
                key={pos}
                style={{ '--pos-color': POS_COLORS[pos] }}
                onClick={() => togglePos(pos)}
              >
                <div className="pos-badge" style={{ background: POS_COLORS[pos] }}>
                  {positionFullLabel(pos)}
                </div>
                <div className="pos-count">{d.count} atletas</div>
                <div className="pos-rows">
                  <div><span>Valor médio</span><strong>{formatBRL(d.avgValue)}</strong></div>
                  <div><span>Salário médio</span><strong>{formatBRL(d.avgSalary)}/mês</strong></div>
                  <div><span>Score médio</span><strong style={{ color: POS_COLORS[pos] }}>{d.avgScore}</strong></div>
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
            <h3 style={{ color: POS_COLORS[expandedPos] }}>
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

      {/* Top Lists */}
      <div className="stats-tops-grid">
        <div className="top-card">
          <h3><i className="fa-solid fa-futbol" style={{ color: '#f59e0b' }}></i> Top Goleadores</h3>
          {stats.topScorers.map((p, i) => (
            <div className="top-row clickable-row" key={p.id} onClick={() => onPlayerClick && onPlayerClick(p)}>
              <span className="top-rank">{i + 1}</span>
              <img src={p.profileImageURL} alt={p.name} className="top-avatar"
                onError={e => { e.target.style.display = 'none'; }} />
              <div className="top-info">
                <div className="top-name">{p.name}</div>
                <div className="top-sub">{p.team}</div>
              </div>
              <div className="top-value">{p.statistics?.goals ?? 0} <span>gols</span></div>
            </div>
          ))}
        </div>

        <div className="top-card">
          <h3><i className="fa-solid fa-handshake" style={{ color: '#14b8a6' }}></i> Top Assistências</h3>
          {stats.topAssists.map((p, i) => (
            <div className="top-row clickable-row" key={p.id} onClick={() => onPlayerClick && onPlayerClick(p)}>
              <span className="top-rank">{i + 1}</span>
              <img src={p.profileImageURL} alt={p.name} className="top-avatar"
                onError={e => { e.target.style.display = 'none'; }} />
              <div className="top-info">
                <div className="top-name">{p.name}</div>
                <div className="top-sub">{p.team}</div>
              </div>
              <div className="top-value">{p.statistics?.assists ?? 0} <span>assist.</span></div>
            </div>
          ))}
        </div>

        <div className="top-card">
          <h3><i className="fa-solid fa-star" style={{ color: '#8b5cf6' }}></i> Maior Score</h3>
          {stats.topScore.map((p, i) => (
            <div className="top-row clickable-row" key={p.id} onClick={() => onPlayerClick && onPlayerClick(p)}>
              <span className="top-rank">{i + 1}</span>
              <img src={p.profileImageURL} alt={p.name} className="top-avatar"
                onError={e => { e.target.style.display = 'none'; }} />
              <div className="top-info">
                <div className="top-name">{p.name}</div>
                <div className="top-sub">{p.team}</div>
              </div>
              <div className="top-value score-col">{p.score}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
