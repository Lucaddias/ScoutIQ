/**
 * @file Modal de detalhes completos de um atleta com radar chart e barras de estatística.
 * @module components/PlayerModal
 */
import React from 'react';
import { formatBRL, positionLabel, positionFullLabel } from '../utils/formatters.js';
import './PlayerModal.css';

const POS_COLORS = {
  Forward:    '#f59e0b',
  Midfielder: '#3b82f6',
  Defender:   '#14b8a6',
  Goalkeeper: '#8b5cf6',
};

/* ── Radar de Perfil (5 eixos, SVG) ── */
/**
 * Gráfico radar SVG com 5 eixos, cada um já normalizado em PERCENTIL 0–100 do
 * jogador frente aos pares da MESMA posição (vem de enrichPlayers → player.radar).
 * Isso distribui o gráfico de forma justa: acaba com os picos causados por escalas
 * brutas diferentes (passes nas centenas vs gols nas dezenas). Um jogador mediano
 * fica num pentágono ~50% em todos os eixos.
 *
 * @component
 * @param {object} props        - Propriedades do componente.
 * @param {Array<{label: string, value: number}>} props.data - Eixos do radar (value 0-100).
 * @param {string} props.color  - Cor do preenchimento do polígono (hex/rgb).
 * @returns {React.ReactElement} SVG do radar.
 */
function RadarChart({ data, color }) {
  const cx = 100, cy = 100, R = 75;
  const n = data.length;

  const point = (i, ratio) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + R * ratio * Math.cos(angle), cy + R * ratio * Math.sin(angle)];
  };

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const dataPoints = data.map((d, i) => point(i, clamp01((Number(d.value) || 0) / 100)));
  const polygon = dataPoints.map(p => p.join(',')).join(' ');

  return (
    <svg viewBox="0 0 200 200" className="radar-svg">
      {/* Grid */}
      {gridLevels.map(lv => (
        <polygon
          key={lv}
          points={data.map((_, i) => point(i, lv).join(',')).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"
        />
      ))}
      {/* Axes */}
      {data.map((_, i) => {
        const [ex, ey] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}
      {/* Data fill */}
      <polygon points={polygon} fill={color + '33'} stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {/* Data dots */}
      {dataPoints.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r="3" fill={color} />
      ))}
      {/* Labels */}
      {data.map((d, i) => {
        const [lx, ly] = point(i, 1.22);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
            fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="600">{d.label}</text>
        );
      })}
    </svg>
  );
}

/**
 * Perfil de radar de reserva, caso o atleta não venha enriquecido (sem player.radar).
 * Normaliza por-90 contra referências "de elite" e limita a 0–100 — também sem picos.
 */
function fallbackRadar(s) {
  const min = Math.max(Number(s.minutesPlayed) || 0, 1);
  const p90 = (v) => ((Number(v) || 0) / min) * 90;
  const passAcc = s.totalPasses > 0 ? (s.accuratePasses / s.totalPasses) * 100 : 0;
  const norm = (v, ref) => Math.max(0, Math.min(100, (v / ref) * 100));
  return [
    { label: 'Gols',      value: norm(p90(s.goals), 0.6) },
    { label: 'Assist.',   value: norm(p90(s.assists), 0.4) },
    { label: 'Passes',    value: Math.min(100, passAcc) },
    { label: 'Defesa',    value: norm(p90((Number(s.tackles) || 0) + (Number(s.interceptions) || 0)), 6) },
    { label: 'Distância', value: norm(p90(s.distanceCoveredKm), 12) },
  ];
}

/* ── Stat Bar ── */
/**
 * Barra de progresso horizontal para uma estatística individual.
 * Quando `isAdmin` é `true` e `onStatEdit` está disponível, exibe um botão de edição inline.
 *
 * @component
 * @param {object}   props             - Propriedades do componente.
 * @param {string}   props.label       - Rótulo legível da estatística.
 * @param {number}   props.value       - Valor atual da estatística.
 * @param {number}   props.max         - Valor máximo para cálculo da porcentagem.
 * @param {string}   [props.unit]      - Unidade exibida após o valor (ex: '%', 'km').
 * @param {string}   props.color       - Cor da barra de preenchimento.
 * @param {string}   props.statKey     - Chave da estatística no objeto `statistics` do atleta.
 * @param {boolean}  [props.isAdmin]   - Se `true`, exibe o botão de edição.
 * @param {Function} [props.onStatEdit] - Callback ao salvar edição: `(statKey, novoValor, valorAntigo) => Promise`.
 * @returns {React.ReactElement} A barra de estatística renderizada.
 */
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

/**
 * Modal de detalhes completos de um atleta. Exibe header com foto e score,
 * dados financeiros, radar chart de 5 eixos e barras de estatísticas detail.
 * Admins podem editar estatísticas individualmente via {@link StatBar}.
 *
 * @component
 * @param {object}   props             - Propriedades do componente.
 * @param {object|null} props.player   - Objeto do atleta a exibir. Se `null`, retorna `null`.
 * @param {Function} props.onClose     - Callback ao fechar o modal.
 * @param {Function} [props.onEdit]    - Callback para editar o atleta (recebe player).
 * @param {Function} [props.onDelete]  - Callback para excluir o atleta (recebe player).
 * @param {boolean}  [props.isAdmin]   - Habilita edição de estatísticas.
 * @param {Function} [props.onStatEdit] - Callback para salvar ajuste de stat: `(player, statKey, novoValor, valorAntigo) => Promise`.
 * @returns {React.ReactElement|null} O modal renderizado ou `null`.
 */
export default function PlayerModal({ player, onClose, onEdit, onDelete, isAdmin, onStatEdit }) {
  if (!player) return null;

  const s = player.statistics || {};
  const color = POS_COLORS[player.position] || '#6b7a99';
  const passAcc = s.totalPasses > 0 ? ((s.accuratePasses / s.totalPasses) * 100).toFixed(1) : 0;
  const gamesPlayed = s.gamesPlayed || 1;
  const distKm = s.distanceCoveredKm || 0;

  // Radar por percentil de posição (vindo de enrichPlayers); fallback se ausente.
  const r = player.radar;
  const radarData = r
    ? [
        { label: 'Gols',      value: r.gols },
        { label: 'Assist.',   value: r.assist },
        { label: 'Passes',    value: r.passe },
        { label: 'Defesa',    value: r.defesa },
        { label: 'Distância', value: r.distancia },
      ]
    : fallbackRadar(s);

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
            <RadarChart data={radarData} color={color} />
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
