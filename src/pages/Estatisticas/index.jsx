import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { enrichPlayers } from '../../utils/playerScore.js';
import { fetchAtletas, selectAllAtletas } from '../../store/atletasSlice';
import {
  fetchEstatisticas,
  selectAllEstatisticas,
  criarEstatistica,
  criarEstatisticasEmLote,
  atualizarEstatistica,
  deletarEstatistica,
} from '../../store/estatisticasSlice';
import { formatBRL, positionFullLabel } from '../../utils/formatters.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PlayerCard from '../../components/PlayerCard.jsx';
// Chaves de estatísticas disponíveis (anteriormente lidas do JSON local)
const STAT_KEYS_STATIC = [
  'gamesPlayed', 'goals', 'assists', 'totalPasses', 'accuratePasses',
  'tackles', 'interceptions', 'yellowCards', 'redCards', 'minutesPlayed', 'distanceCoveredKm',
];
import './Estatisticas.css';

const POS_ORDER = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];
const POS_COLORS = { Forward: '#f59e0b', Midfielder: '#3b82f6', Defender: '#14b8a6', Goalkeeper: '#8b5cf6' };

/*
 * STAT_LABELS — mapeamento das chaves técnicas do JSON para labels legíveis em PT-BR.
 * Centraliza a tradução para uso tanto na tabela quanto no modal de criação/edição.
 */
const STAT_LABELS = {
  gamesPlayed: 'Jogos Disputados',
  goals: 'Gols',
  assists: 'Assistências',
  totalPasses: 'Passes Totais',
  accuratePasses: 'Passes Certos',
  tackles: 'Desarmes',
  interceptions: 'Interceptações',
  yellowCards: 'Cartões Amarelos',
  redCards: 'Cartões Vermelhos',
  minutesPlayed: 'Minutos Jogados',
  distanceCoveredKm: 'Distância (km)',
};

/*
 * getStatKeys — extrai dinamicamente as chaves de estatísticas disponíveis no JSON.
 * Usa o primeiro atleta válido como referência, garantindo que o admin só possa
 * selecionar tipos de estatísticas que realmente existem no banco de dados.
 */
const getStatKeys = () => STAT_KEYS_STATIC;

export default function Estatisticas({ onPlayerClick }) {
  const { user } = useAuth();
  const role = user?.role || 'user';
  const isAdmin = role === 'admin';

  const jogadoresDoBanco = useSelector(selectAllAtletas);
  const loading = useSelector((state) => state.atletas.loading);
  const dispatch = useDispatch();

  /* Busca atletas e estatísticas do json-server ao montar */
  useEffect(() => {
    dispatch(fetchAtletas());
    dispatch(fetchEstatisticas());
  }, [dispatch]);

  const players = useMemo(() => enrichPlayers(jogadoresDoBanco), [jogadoresDoBanco]);

  /* ─── CRUD State — agora vem do Redux (persistido no json-server) ─── */
  const statKeys = useMemo(() => getStatKeys(), []);
  const registros = useSelector(selectAllEstatisticas);
  const statsLoading = useSelector((state) => state.estatisticas.loading);

  /* ─── Modal State ─── */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    jogadorId: '',
    jogador: '',
    jogadorImg: '',
    jogadorTeam: '',
    tipoEstatistica: statKeys[0] || '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
  });

  /* ─── Bulk Entries State (modo criação) ─── */
  const [bulkEntries, setBulkEntries] = useState([
    { tipoEstatistica: statKeys[0] || '', valor: '' },
  ]);
  const [bulkData, setBulkData] = useState(new Date().toISOString().split('T')[0]);

  /* ─── Table Pagination State ─── */
  const [mostrarHistoricoCompleto, setMostrarHistoricoCompleto] = useState(false);

  const registrosExibidos = useMemo(() => {
    if (!registros) return [];
    // Ordenar do mais recente para o mais antigo (usando a data ou invertendo o array)
    const ordenados = [...registros].sort((a, b) => new Date(b.data) - new Date(a.data));
    return mostrarHistoricoCompleto ? ordenados : ordenados.slice(0, 10);
  }, [registros, mostrarHistoricoCompleto]);

  /* ─── Player Search State ─── */
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerDropdownOpen, setPlayerDropdownOpen] = useState(false);
  const playerFieldRef = useRef(null);

  /*
   * filteredPlayers — filtra a lista de jogadores pelo texto digitado.
   * Busca no nome e no time, limitado a 30 resultados para performance.
   */
  const filteredPlayers = useMemo(() => {
    if (!playerSearch.trim()) return players.slice(0, 30);
    const term = playerSearch.toLowerCase();
    return players
      .filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.team && p.team.toLowerCase().includes(term))
      )
      .slice(0, 30);
  }, [players, playerSearch]);

  /* Fecha o dropdown quando clica fora */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (playerFieldRef.current && !playerFieldRef.current.contains(e.target)) {
        setPlayerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ─── Delete Confirmation State ─── */
  const [deleteTarget, setDeleteTarget] = useState(null);

  /* ─── Expanded position state (mantém funcionalidade original) ─── */
  const [expandedPos, setExpandedPos] = useState(null);

  /*
   * useMemo: cálculo de todas as estatísticas derivadas da lista de jogadores.
   * Agrupa por posição (byPos) com médias de valor, salário e score.
   * Gera os 3 rankings (goleadores, assistentes, maior score) ordenando e fatiando os top 5.
   * O useMemo evita reprocessar esses cálculos a cada render — só roda quando `players` muda.
   */
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
    const avgMarketValue = total > 0 ? totalMarketValue / total : 0;

    return { total, byPos, topScorers, topAssists, topScore, totalMarketValue, avgMarketValue };
  }, [players]);

  /* togglePos — abre ou fecha a lista expandida de jogadores por posição (acordeão). */
  const togglePos = (pos) => {
    setExpandedPos(prev => prev === pos ? null : pos);
  };

  /* ─── CRUD Handlers ─── */

  const openCreateModal = () => {
    setEditingRecord(null);
    setFormData({
      jogadorId: '',
      jogador: '',
      jogadorImg: '',
      jogadorTeam: '',
      tipoEstatistica: statKeys[0] || '',
      valor: '',
      data: new Date().toISOString().split('T')[0],
    });
    setBulkEntries([{ tipoEstatistica: statKeys[0] || '', valor: '' }]);
    setBulkData(new Date().toISOString().split('T')[0]);
    setPlayerSearch('');
    setPlayerDropdownOpen(false);
    setSaving(false);
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setFormData({
      jogadorId: record.jogadorId || '',
      jogador: record.jogador,
      jogadorImg: record.jogadorImg || '',
      jogadorTeam: record.jogadorTeam || '',
      tipoEstatistica: record.tipoEstatistica,
      valor: record.valor,
      data: record.data,
    });
    setPlayerSearch(record.jogador);
    setPlayerDropdownOpen(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRecord(null);
    setPlayerSearch('');
    setPlayerDropdownOpen(false);
    setSaving(false);
  };

  /* Seleciona um jogador do dropdown */
  const selectPlayer = (player) => {
    setFormData(prev => ({
      ...prev,
      jogadorId: player.id,
      jogador: player.name,
      jogadorImg: player.profileImageURL || '',
      jogadorTeam: player.team || '',
    }));
    setPlayerSearch(player.name);
    setPlayerDropdownOpen(false);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /* ─── Bulk Entry Handlers ─── */
  const addBulkEntry = () => {
    setBulkEntries(prev => [...prev, { tipoEstatistica: statKeys[0] || '', valor: '' }]);
  };

  const removeBulkEntry = (idx) => {
    setBulkEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const updateBulkEntry = (idx, field, value) => {
    setBulkEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    /* Valida que um jogador foi selecionado do dropdown */
    if (!formData.jogadorId) {
      setPlayerDropdownOpen(true);
      return;
    }

    setSaving(true);

    try {
      if (editingRecord) {
        /* UPDATE — modo single (igual antes) */
        const registro = { ...formData, valor: Number(formData.valor) };
        await dispatch(atualizarEstatistica({
          registro: { ...registro, id: editingRecord.id },
          valorAnterior: editingRecord.valor,
          tipoAnterior: editingRecord.tipoEstatistica,
          jogadorIdAnterior: editingRecord.jogadorId,
        })).unwrap();
      } else {
        /* CREATE — modo bulk */
        const validEntries = bulkEntries.filter(e => e.valor && Number(e.valor) > 0);
        if (validEntries.length === 0) {
          setSaving(false);
          return;
        }
        await dispatch(criarEstatisticasEmLote({
          jogadorData: {
            jogadorId: formData.jogadorId,
            jogador: formData.jogador,
            jogadorImg: formData.jogadorImg,
            jogadorTeam: formData.jogadorTeam,
          },
          entries: validEntries,
          data: bulkData,
        })).unwrap();
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
    }

    setSaving(false);
    closeModal();
  };

  const confirmDelete = (record) => {
    setDeleteTarget(record);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      /*
       * DELETE — envia DELETE para /estatisticas/{id} e PATCH negativo para /athletes/{id}.
       * Passa o registro completo para o thunk saber o que decrementar.
       */
      dispatch(deletarEstatistica(deleteTarget));
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#94a3b8' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '40px', marginBottom: '15px', color: '#10b981' }}></i>
        <h2>Processando dados...</h2>
      </div>
    );
  }

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

      {/* ──────────────────────────────────────── */}
      {/* CRUD TABLE — Tabela com controle de acesso */}
      {/* ──────────────────────────────────────── */}
      <div className="stats-section">
        <div className="crud-header">
          <h2>
            <i className="fa-solid fa-table-list" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
            Registros de Estatísticas
          </h2>
          {isAdmin && (
            <button className="crud-btn crud-btn-add" onClick={openCreateModal} id="btn-nova-estatistica">
              <i className="fa-solid fa-plus"></i>
              Nova Estatística
            </button>
          )}
        </div>

        <div className="crud-table-wrapper">
          <table className="crud-table" id="tabela-estatisticas">
            <thead>
              <tr>
                <th>#</th>
                <th>Jogador</th>
                <th>Tipo de Estatística</th>
                <th>Valor</th>
                <th>Data</th>
                {isAdmin && <th className="th-acoes">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {registrosExibidos.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="crud-empty">
                    <i className="fa-solid fa-inbox"></i>
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : (
                registrosExibidos.map((reg, idx) => (
                  <tr key={reg.id} className="crud-row">
                    <td className="td-index">{idx + 1}</td>
                    <td className="td-jogador">
                      <div className="jogador-cell">
                        {reg.jogadorImg && (
                          <img
                            src={reg.jogadorImg}
                            alt=""
                            className="jogador-cell-avatar"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <div>
                          <div className="jogador-cell-name">{reg.jogador}</div>
                          {reg.jogadorTeam && <div className="jogador-cell-team">{reg.jogadorTeam}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="stat-type-badge">
                        {STAT_LABELS[reg.tipoEstatistica] || reg.tipoEstatistica}
                      </span>
                    </td>
                    <td className="td-valor">{reg.valor}</td>
                    <td className="td-data">{reg.data}</td>
                    {isAdmin && (
                      <td className="td-acoes">
                        <button
                          className="crud-icon-btn edit"
                          onClick={() => openEditModal(reg)}
                          title="Editar"
                          id={`btn-editar-${reg.id}`}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          className="crud-icon-btn delete"
                          onClick={() => confirmDelete(reg)}
                          title="Excluir"
                          id={`btn-excluir-${reg.id}`}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {registros.length > 10 && (
          <div className="crud-history-toggle" style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              className="crud-btn crud-btn-cancel"
              onClick={() => setMostrarHistoricoCompleto(!mostrarHistoricoCompleto)}
              style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {mostrarHistoricoCompleto ? (
                <>
                  <i className="fa-solid fa-chevron-up"></i> Mostrar Menos
                </>
              ) : (
                <>
                  <i className="fa-solid fa-chevron-down"></i> Ver Histórico de Registros Completo
                </>
              )}
            </button>
          </div>
        )}

        {!isAdmin && (
          <div className="crud-readonly-notice">
            <i className="fa-solid fa-lock"></i>
            Modo leitura — apenas administradores podem gerenciar registros.
          </div>
        )}
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

      {/* ──────────────────────────────────────── */}
      {/* MODAL — Criar / Editar Estatística */}
      {/* ──────────────────────────────────────── */}
      {modalOpen && (
        <div className="crud-modal-overlay" onClick={closeModal}>
          <div className="crud-modal" onClick={e => e.stopPropagation()}>
            <div className="crud-modal-header">
              <h3>
                <i className={`fa-solid ${editingRecord ? 'fa-pen-to-square' : 'fa-plus-circle'}`}></i>
                {editingRecord ? 'Editar Estatística' : 'Nova Estatística'}
              </h3>
              <button className="crud-modal-close" onClick={closeModal}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="crud-modal-form">
              <div className="crud-field" ref={playerFieldRef}>
                <label htmlFor="campo-jogador">Jogador</label>
                <div className="player-search-wrapper">
                  <input
                    id="campo-jogador"
                    type="text"
                    autoComplete="off"
                    required
                    placeholder="Buscar jogador por nome ou clube..."
                    value={playerSearch}
                    onChange={e => {
                      setPlayerSearch(e.target.value);
                      setPlayerDropdownOpen(true);
                      /* Limpa a seleção se editar o texto manualmente */
                      if (formData.jogador && e.target.value !== formData.jogador) {
                        setFormData(prev => ({ ...prev, jogadorId: '', jogador: '', jogadorImg: '', jogadorTeam: '' }));
                      }
                    }}
                    onFocus={() => setPlayerDropdownOpen(true)}
                  />
                  {/* Chip do jogador selecionado */}
                  {formData.jogadorId && (
                    <div className="player-selected-chip">
                      <img
                        src={formData.jogadorImg}
                        alt=""
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                      <span>{formData.jogador}</span>
                      <span className="player-chip-team">· {formData.jogadorTeam}</span>
                      <button
                        type="button"
                        className="player-chip-clear"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, jogadorId: '', jogador: '', jogadorImg: '', jogadorTeam: '' }));
                          setPlayerSearch('');
                        }}
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  )}
                  {/* Dropdown de resultados */}
                  {playerDropdownOpen && !formData.jogadorId && (
                    <div className="player-dropdown">
                      {filteredPlayers.length === 0 ? (
                        <div className="player-dropdown-empty">
                          <i className="fa-solid fa-magnifying-glass"></i>
                          Nenhum jogador encontrado
                        </div>
                      ) : (
                        filteredPlayers.map(p => (
                          <div
                            key={p.id}
                            className="player-dropdown-item"
                            onClick={() => selectPlayer(p)}
                          >
                            <img
                              src={p.profileImageURL}
                              alt={p.name}
                              className="player-dropdown-avatar"
                              onError={e => {
                                e.target.onerror = null;
                                e.target.src = '';
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                            <div className="player-dropdown-fallback" style={{ display: 'none' }}>
                              {p.name[0]}
                            </div>
                            <div className="player-dropdown-info">
                              <span className="player-dropdown-name">{p.name}</span>
                              <span className="player-dropdown-meta">
                                {p.team}
                                {p.position && <> · {positionFullLabel(p.position)}</>}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {/* Hidden required input para validação do form */}
                <input
                  type="hidden"
                  name="jogadorId"
                  value={formData.jogadorId}
                  required
                />
              </div>

              {/* ─── Modo EDIÇÃO: campos single (como antes) ─── */}
              {editingRecord ? (
                <>
                  <div className="crud-field">
                    <label htmlFor="campo-tipo-estatistica">Tipo de Estatística</label>
                    <select
                      id="campo-tipo-estatistica"
                      required
                      value={formData.tipoEstatistica}
                      onChange={e => handleFormChange('tipoEstatistica', e.target.value)}
                    >
                      {statKeys.map(key => (
                        <option key={key} value={key}>
                          {STAT_LABELS[key] || key}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="crud-field">
                    <label htmlFor="campo-valor">Valor</label>
                    <input
                      id="campo-valor"
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="Ex: 12"
                      value={formData.valor}
                      onChange={e => handleFormChange('valor', e.target.value)}
                    />
                  </div>

                  <div className="crud-field">
                    <label htmlFor="campo-data">Data</label>
                    <input
                      id="campo-data"
                      type="date"
                      required
                      value={formData.data}
                      onChange={e => handleFormChange('data', e.target.value)}
                    />
                  </div>
                </>
              ) : (
                /* ─── Modo CRIAÇÃO: formulário dinâmico em lote ─── */
                <>
                  <div className="bulk-entries-section">
                    <label className="bulk-section-label">
                      <i className="fa-solid fa-layer-group"></i>
                      Estatísticas ({bulkEntries.length})
                    </label>

                    {bulkEntries.map((entry, idx) => (
                      <div className="bulk-entry-row" key={idx}>
                        <select
                          value={entry.tipoEstatistica}
                          onChange={e => updateBulkEntry(idx, 'tipoEstatistica', e.target.value)}
                          className="bulk-select"
                        >
                          {statKeys.map(key => (
                            <option key={key} value={key}>
                              {STAT_LABELS[key] || key}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Valor"
                          value={entry.valor}
                          onChange={e => updateBulkEntry(idx, 'valor', e.target.value)}
                          className="bulk-input"
                          required
                        />
                        {bulkEntries.length > 1 && (
                          <button
                            type="button"
                            className="bulk-remove-btn"
                            onClick={() => removeBulkEntry(idx)}
                            title="Remover linha"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    ))}

                    <button type="button" className="bulk-add-btn" onClick={addBulkEntry}>
                      <i className="fa-solid fa-plus"></i>
                      Adicionar outra estatística
                    </button>
                  </div>

                  <div className="crud-field">
                    <label htmlFor="campo-data-bulk">Data</label>
                    <input
                      id="campo-data-bulk"
                      type="date"
                      required
                      value={bulkData}
                      onChange={e => setBulkData(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="crud-modal-actions">
                <button type="submit" className="crud-btn crud-btn-save" disabled={saving}>
                  {saving ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      Salvando...
                    </>
                  ) : editingRecord ? (
                    <>
                      <i className="fa-solid fa-check"></i>
                      Salvar Alterações
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      Enviar Tudo ({bulkEntries.length})
                    </>
                  )}
                </button>
                <button type="button" className="crud-btn crud-btn-cancel" onClick={closeModal} disabled={saving}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────── */}
      {/* MODAL — Confirmação de Exclusão */}
      {/* ──────────────────────────────────────── */}
      {deleteTarget && (
        <div className="crud-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="crud-modal crud-modal-delete" onClick={e => e.stopPropagation()}>
            <div className="crud-delete-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>Confirmar Exclusão</h3>
            <p>
              Deseja remover o registro de <strong>{STAT_LABELS[deleteTarget.tipoEstatistica] || deleteTarget.tipoEstatistica}</strong> do jogador <strong>{deleteTarget.jogador}</strong>?
            </p>
            <p className="delete-warning">Esta ação não pode ser desfeita.</p>
            <div className="crud-modal-actions">
              <button className="crud-btn crud-btn-danger" onClick={handleDelete}>
                <i className="fa-solid fa-trash-can"></i>
                Sim, Excluir
              </button>
              <button className="crud-btn crud-btn-cancel" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
