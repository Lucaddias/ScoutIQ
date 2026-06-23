/**
 * @file Página de estatísticas com visão por posição, rankings e CRUD de registros (admin).
 * @module pages/Estatisticas
 */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useAtletas } from '../../hooks/useAtletas.js';
import { LoadingState, ErrorState } from '../../components/FetchState.jsx';
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
import TopRankings from './TopRankings.jsx';
import PositionSection from './PositionSection.jsx';
import StatFormModal from './StatFormModal.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { POSITION_COLORS, STAT_KEYS, STAT_LABELS, POSITIONS_DB } from '../../utils/constants.js';
import './Estatisticas.css';

/*
 * getStatKeys — extrai dinamicamente as chaves de estatísticas disponíveis no JSON.
 * Usa o primeiro atleta válido como referência, garantindo que o admin só possa
 * selecionar tipos de estatísticas que realmente existem no banco de dados.
 */
const getStatKeys = (atletas) => atletas.length > 0 ? Object.keys(atletas[0].statistics || {}) : STAT_KEYS;

/**
 * Página de Estatísticas. Exibe sumário geral, cards por posição (expansíveis),
 * rankings de goleadores/assistentes/score e uma tabela CRUD de registros de
 * estatísticas. Administradores podem criar, editar e excluir registros;
 * demais roles têm acesso somente leitura.
 *
 * @component
 * @param {object}   props               - Propriedades do componente.
 * @param {Function} [props.onPlayerClick] - Callback ao clicar em um PlayerCard nos rankings.
 * @returns {React.ReactElement} A página de estatísticas renderizada.
 */
export default function Estatisticas({ onPlayerClick }) {
  const { user } = useAuth();
  const role = user?.role || 'user';
  const isAdmin = role === 'admin';

  // `players` já vem enriquecido com o ScoutIQ Score (selector memoizado, pool completo).
  const { players, loading, status: atletasStatus, error: atletasError, retry } = useAtletas();
  const dispatch = useDispatch();

  /* Busca os registros de estatísticas ao montar (atletas vêm do useAtletas) */
  useEffect(() => {
    dispatch(fetchEstatisticas());
  }, [dispatch]);

  /* ─── CRUD State — agora vem do Redux (persistido no json-server) ─── */
  const statKeys = useMemo(() => getStatKeys(players), [players]);
  const registros = useSelector(selectAllEstatisticas);
  const statsLoading = useSelector((state) => state.estatisticas.loading);

  /* ─── Modal State ─── */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
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
    POSITIONS_DB.forEach(pos => {
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
    if (!formData.jogadorId) {
      setFormError('Selecione um jogador na lista.');
      setPlayerDropdownOpen(true);
      return;
    }

    setSaving(true);
    setFormError('');

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
          setFormError('Adicione ao menos uma estatística válida.');
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
      closeModal();
    } catch (err) {
      setFormError(`Erro ao salvar estatística: ${err.message || 'Tente novamente.'}`);
    } finally {
      setSaving(false);
    }
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

  if (loading) return <LoadingState message="Processando dados..." />;
  if (atletasStatus === 'failed') return <ErrorState error={atletasError} onRetry={retry} />;

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

      <PositionSection 
        stats={stats} 
        expandedPos={expandedPos} 
        togglePos={togglePos} 
        onPlayerClick={onPlayerClick} 
      />

      <TopRankings 
        stats={stats} 
        onPlayerClick={onPlayerClick} 
      />

      <StatFormModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        editingRecord={editingRecord}
        formData={formData}
        setFormData={setFormData}
        handleFormChange={handleFormChange}
        bulkEntries={bulkEntries}
        addBulkEntry={addBulkEntry}
        updateBulkEntry={updateBulkEntry}
        removeBulkEntry={removeBulkEntry}
        bulkData={bulkData}
        setBulkData={setBulkData}
        saving={saving}
        formError={formError}
        playerFieldRef={playerFieldRef}
        playerSearch={playerSearch}
        setPlayerSearch={setPlayerSearch}
        playerDropdownOpen={playerDropdownOpen}
        setPlayerDropdownOpen={setPlayerDropdownOpen}
        filteredPlayers={filteredPlayers}
        selectPlayer={selectPlayer}
        statKeys={statKeys}
      />

      {/* ──────────────────────────────────────── */}
      {/* MODAL — Confirmação de Exclusão */}
      {/* ──────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão"
        message={deleteTarget ? <span>Deseja remover o registro de <strong>{STAT_LABELS[deleteTarget.tipoEstatistica] || deleteTarget.tipoEstatistica}</strong> do jogador <strong>{deleteTarget.jogador}</strong>?</span> : ''}
        confirmText="Sim, Excluir"
        variant="danger"
      />
    </div>
  );
}
