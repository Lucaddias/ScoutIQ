import React from 'react';
import { formatBRL, positionLabel, positionFullLabel } from '../utils/formatters.js';
import './PlayerModal.css';

const POS_COLORS = {
  Forward:    '#f59e0b',
  Midfielder: '#3b82f6',
  Defender:   '#14b8a6',
  Goalkeeper: '#8b5cf6',
};

/* ── Pure-CSS Radar Chart (5 axes, SVG) ── */
function RadarChart({ stats, color }) {
  const axes = [
    { label: 'Gols',     key: 'goals',     max: 20 },
    { label: 'Assist.',   key: 'assists',   max: 15 },
    { label: 'Passes',    key: 'passAcc',   max: 100 },
    { label: 'Tackles',   key: 'tackles',   max: 250 },
    { label: 'Distância', key: 'distKm',    max: 300 },
  ];

  const cx = 100, cy = 100, R = 75;
  const n = axes.length;

  const point = (i, ratio) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + R * ratio * Math.cos(angle), cy + R * ratio * Math.sin(angle)];
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const dataPoints = axes.map((a, i) => {
    const val = stats[a.key] ?? 0;
    return point(i, Math.min(val / a.max, 1));
  });
  const polygon = dataPoints.map(p => p.join(',')).join(' ');

  return (
    <svg viewBox="0 0 200 200" className="radar-svg">
      {/* Grid */}
      {gridLevels.map(lv => (
        <polygon
          key={lv}
          points={axes.map((_, i) => point(i, lv).join(',')).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"
        />
      ))}
      {/* Axes */}
      {axes.map((_, i) => {
        const [ex, ey] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}
      {/* Data fill */}
      <polygon points={polygon} fill={color + '20'} stroke={color} strokeWidth="2" />
      {/* Data dots */}
      {dataPoints.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r="3" fill={color} />
      ))}
      {/* Labels */}
      {axes.map((a, i) => {
        const [lx, ly] = point(i, 1.22);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
            fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="600">{a.label}</text>
        );
      })}
    </svg>
  );
}

/* ── Stat Bar ── */
function StatBar({ label, value, max, unit, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="modal-stat-bar">
      <div className="msb-header">
        <span className="msb-label">{label}</span>
        <span className="msb-value">{value}{unit && <small> {unit}</small>}</span>
      </div>
      <div className="msb-track">
        <div className="msb-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function PlayerModal({ player, onClose }) {
  if (!player) return null;

  const s = player.statistics || {};
  const color = POS_COLORS[player.position] || '#6b7a99';
  const passAcc = s.totalPasses > 0 ? ((s.accuratePasses / s.totalPasses) * 100).toFixed(1) : 0;
  const gamesPlayed = s.gamesPlayed || 1;
  const distKm = s.distanceCoveredKm || 0;

  const radarStats = {
    goals:   s.goals || 0,
    assists: s.assists || 0,
    passAcc: parseFloat(passAcc),
    tackles: s.tackles || 0,
    distKm:  distKm,
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-avatar">
            <img src={player.profileImageURL} alt={player.name}
              onError={e => { e.target.style.display = 'none'; }} />
            <div className="modal-pos-badge" style={{ background: color }}>{positionLabel(player.position)}</div>
          </div>
          <div className="modal-title">
            <h2>{player.name}</h2>
            <div className="modal-sub">
              <span>{positionFullLabel(player.position)}</span>
              {player.team && <span>· {player.team}</span>}
              {player.age && <span>· {player.age} anos</span>}
              {player.nationality && <span>· {player.nationality}</span>}
            </div>
            <div className="modal-score-row">
              <div className="modal-score-badge" style={{ borderColor: color, color }}>
                {player.score}
              </div>
              <span>Score de desempenho</span>
            </div>
          </div>
        </div>

        {/* Financial row */}
        <div className="modal-fin-row">
          <div className="modal-fin">
            <span>Valor de Mercado</span>
            <strong>{formatBRL(player.marketValue)}</strong>
          </div>
          <div className="modal-fin">
            <span>Salário Mensal</span>
            <strong>{formatBRL(player.monthlySalary)}/mês</strong>
          </div>
          <div className="modal-fin">
            <span>Jogos</span>
            <strong>{s.gamesPlayed ?? '—'}</strong>
          </div>
          <div className="modal-fin">
            <span>Minutos</span>
            <strong>{s.minutesPlayed ?? '—'}</strong>
          </div>
        </div>

        {/* Body: radar + bars */}
        <div className="modal-body">
          <div className="modal-radar-wrap">
            <h4>Radar de Desempenho</h4>
            <RadarChart stats={radarStats} color={color} />
          </div>

          <div className="modal-bars-wrap">
            <h4>Estatísticas Detalhadas</h4>
            <StatBar label="Gols" value={s.goals ?? 0} max={20} color="#f59e0b" />
            <StatBar label="Assistências" value={s.assists ?? 0} max={15} color="#14b8a6" />
            <StatBar label="Precisão de Passe" value={passAcc} max={100} unit="%" color="#3b82f6" />
            <StatBar label="Tackles" value={s.tackles ?? 0} max={250} color="#8b5cf6" />
            <StatBar label="Interceptações" value={s.interceptions ?? 0} max={100} color="#ec4899" />
            <StatBar label="Distância" value={distKm.toFixed(1)} max={300} unit="km" color="#06b6d4" />
            <StatBar label="Cartões Amarelos" value={s.yellowCards ?? 0} max={15} color="#eab308" />
            <StatBar label="Cartões Vermelhos" value={s.redCards ?? 0} max={5} color="#ef4444" />
          </div>
        </div>
      </div>
    </div>
  );
}
