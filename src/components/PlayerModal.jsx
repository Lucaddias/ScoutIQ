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
function StatBar({ label, value, max, unit, color, statKey, isAdmin, onStatEdit }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const [isSaving, setIsSaving] = React.useState(false);

  // Sync editValue when value prop changes (e.g. after save)
  React.useEffect(() => {
    setEditValue(value);
  }, [value]);

  const pct = Math.min((value / max) * 100, 100);

  const handleSave = async () => {
    if (Number(editValue) === Number(value)) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onStatEdit(statKey, editValue, value);
      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao salvar ajuste de stat:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-stat-bar">
      <div className="msb-header">
        <span className="msb-label">{label}</span>
        <div className="msb-value-wrap">
          {isEditing ? (
            <div className="msb-edit-controls">
              <input
                type="number"
                className="msb-edit-input"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                min="0"
                step="any"
                disabled={isSaving}
                autoFocus
              />
              {isSaving ? (
                <span className="msb-saving-text"><i className="fa-solid fa-spinner fa-spin"></i></span>
              ) : (
                <>
                  <button className="msb-save-btn" onClick={handleSave}><i className="fa-solid fa-check"></i></button>
                  <button className="msb-cancel-btn" onClick={() => { setIsEditing(false); setEditValue(value); }}><i className="fa-solid fa-xmark"></i></button>
                </>
              )}
            </div>
          ) : (
            <>
              <span className="msb-value">{value}{unit && <small> {unit}</small>}</span>
              {isAdmin && onStatEdit && (
                <button className="msb-edit-btn" onClick={() => setIsEditing(true)} title={`Editar ${label}`}>
                  <i className="fa-solid fa-pen"></i>
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="msb-track">
        <div className="msb-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function PlayerModal({ player, onClose, onEdit, onDelete, isAdmin, onStatEdit }) {
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
        <div className="modal-actions-top">
          {onEdit && (
            <button className="modal-action-btn modal-action-edit" onClick={() => onEdit(player)} title="Editar Atleta">
              <i className="fa-solid fa-pen"></i>
            </button>
          )}
          {onDelete && (
            <button className="modal-action-btn modal-action-delete" onClick={() => onDelete(player)} title="Excluir Atleta">
              <i className="fa-solid fa-trash"></i>
            </button>
          )}
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

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
            <StatBar label="Gols" statKey="goals" value={s.goals ?? 0} max={20} color="#f59e0b" isAdmin={isAdmin} onStatEdit={(k, nv, ov) => onStatEdit(player, k, nv, ov)} />
            <StatBar label="Assistências" statKey="assists" value={s.assists ?? 0} max={15} color="#14b8a6" isAdmin={isAdmin} onStatEdit={(k, nv, ov) => onStatEdit(player, k, nv, ov)} />
            <StatBar label="Precisão de Passe" statKey="passAcc" value={passAcc} max={100} unit="%" color="#3b82f6" /> {/* Not directly editable since it's derived */}
            <StatBar label="Tackles" statKey="tackles" value={s.tackles ?? 0} max={250} color="#8b5cf6" isAdmin={isAdmin} onStatEdit={(k, nv, ov) => onStatEdit(player, k, nv, ov)} />
            <StatBar label="Interceptações" statKey="interceptions" value={s.interceptions ?? 0} max={100} color="#ec4899" isAdmin={isAdmin} onStatEdit={(k, nv, ov) => onStatEdit(player, k, nv, ov)} />
            <StatBar label="Distância" statKey="distanceCoveredKm" value={distKm.toFixed(1)} max={300} unit="km" color="#06b6d4" isAdmin={isAdmin} onStatEdit={(k, nv, ov) => onStatEdit(player, k, nv, ov)} />
            <StatBar label="Cartões Amarelos" statKey="yellowCards" value={s.yellowCards ?? 0} max={15} color="#eab308" isAdmin={isAdmin} onStatEdit={(k, nv, ov) => onStatEdit(player, k, nv, ov)} />
            <StatBar label="Cartões Vermelhos" statKey="redCards" value={s.redCards ?? 0} max={5} color="#ef4444" isAdmin={isAdmin} onStatEdit={(k, nv, ov) => onStatEdit(player, k, nv, ov)} />
          </div>
        </div>
      </div>
    </div>
  );
}
