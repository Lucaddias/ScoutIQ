import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { enrichPlayers } from '../../utils/playerScore.js';
import { fetchAtletas, selectAllAtletas } from '../../store/atletasSlice';
import {
  fetchEstatisticas,
  selectAllEstatisticas,
  criarEstatistica,
  atualizarEstatistica,
  deletarEstatistica,
} from '../../store/estatisticasSlice';
import { formatBRL, positionFullLabel } from '../../utils/formatters.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PlayerCard from '../../components/PlayerCard.jsx';
import playersData from '../../data/players_updated.json';
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
const getStatKeys = () => {
  const athletes = playersData?.athletes || [];
  const first = athletes.find(a => a.statistics && typeof a.statistics === 'object');
  return first ? Object.keys(first.statistics) : [];
};

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
  const [formData, setFormData] = useState({
    jogadorId: '',
    jogador: '',
    jogadorImg: '',
    jogadorTeam: '',
    tipoEstatistica: statKeys[0] || '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
  });

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
    const avgMarketValue   = total > 0 ? totalMarketValue / total : 0;

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
    setPlayerSearch('');
    setPlayerDropdownOpen(false);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    /* Valida que um jogador foi selecionado do dropdown */
    if (!formData.jogadorId) {
      setPlayerDropdownOpen(true);
      return;
    }

    const registro = {
      ...formData,
      valor: Number(formData.valor),
    };

    if (editingRecord) {
      /*
       * UPDATE — envia PUT para /estatisticas/{id} e PATCH para /athletes/{id}.
       * Passa o valor/tipo/jogador anterior para o thunk calcular o delta correto.
       */
      dispatch(atualizarEstatistica({
        registro: { ...registro, id: editingRecord.id },
        valorAnterior: editingRecord.valor,
        tipoAnterior: editingRecord.tipoEstatistica,
        jogadorIdAnterior: editingRecord.jogadorId,
      }));
    } else {
      /*
       * CREATE — POST para /estatisticas + PATCH para /athletes/{id}.
       * O json-server gera o ID automaticamente.
       */
      dispatch(criarEstatistica(registro));
    }
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
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="crud-empty">
                    <i className="fa-solid fa-inbox"></i>
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : (
                registros.map((reg, idx) => (
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

              <div className="crud-modal-actions">
                <button type="submit" className="crud-btn crud-btn-save">
                  <i className="fa-solid fa-check"></i>
                  {editingRecord ? 'Salvar Alterações' : 'Adicionar'}
                </button>
                <button type="button" className="crud-btn crud-btn-cancel" onClick={closeModal}>
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
