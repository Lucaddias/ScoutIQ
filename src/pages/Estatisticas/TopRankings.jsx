import React from 'react';

export default function TopRankings({ stats, onPlayerClick }) {
  if (!stats) return null;

  return (
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
  );
}
