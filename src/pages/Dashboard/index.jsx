/**
 * @file Layout principal autenticado. Orquestra sidebar, roteamento de páginas e modais globais.
 * @module pages/Dashboard
 */
import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar.jsx';
import Inicio from '../Inicio/index.jsx';
import ApoioDecisao from '../ApoioDecisao/index.jsx';
import Relatorios from '../Relatorios/index.jsx';
import Atletas from '../Atletas/index.jsx';
import Estatisticas from '../Estatisticas/index.jsx';
import Contratos from '../Contratos/index.jsx';
import Perfil from '../Perfil/index.jsx';
import AdminPage from '../Admin/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDispatch } from 'react-redux';
import { atualizarAtleta, deletarAtleta } from '../../store/atletasSlice';
import { ajustarStatAtleta } from '../../store/estatisticasSlice';
import { TIMES_BR, POSITIONS_DB } from '../../utils/constants.js';
import { positionFullLabel } from '../../utils/formatters.js';
import PlayerModal from '../../components/PlayerModal.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import './Dashboard.css';

const inputStyle = {
  padding: '10px 12px', borderRadius: '6px',
  border: '1px solid #334155', background: '#0f172a',
  color: 'white', width: '100%', boxSizing: 'border-box', fontSize: '14px',
};

const formatBR = (value) => {
  const num = Number(String(value).replace(/\./g, '').replace(',', '.'));
  if (!value && value !== 0) return '';
  if (isNaN(num)) return String(value);
  return num.toLocaleString('pt-BR');
};

/**
 * Componente raiz do layout autenticado. Renderiza o {@link module:components/Sidebar|Sidebar},
 * despacha a página correta pelo `page` prop, e gerencia o modal de visualização/edição de atletas.
 * Controle de acesso por role está centralizado aqui através da função `canAccess`.
 *
 * @component
 * @param {object}   props            - Propriedades do componente.
 * @param {string}   props.page       - ID da página atual (ex: 'inicio', 'atletas', 'admin').
 * @param {Function} props.onNavigate - Callback de navegação para mudar de página.
 * @returns {React.ReactElement} O layout do dashboard com conteúdo dinâmico.
 */
const Dashboard = ({ page, onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'user';
  const dispatch = useDispatch();
  const [modalPlayer, setModalPlayer] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const canAccess = (required) => required.includes(role);

  const renderContent = () => {
    switch (page) {
      case 'inicio':
        return <div className="main-content"><Inicio /></div>;
      case 'apoio_decisao':
        if (canAccess(['user', 'scout', 'admin'])) {
          // Removemos as props antigas do pacote aqui. Deixamos só o onNavigate.
          return <div className="main-content"><ApoioDecisao onNavigate={onNavigate} /></div>;
        }
        return <div className="main-content"><h2>Acesso Negado</h2></div>;
      case 'relatorios_elenco':
        if (canAccess(['user', 'scout', 'admin'])) {
          return <div className="main-content"><Relatorios filtroInicial="relatorios" /></div>;
        }
        return <div className="main-content"><h2>Acesso Negado</h2></div>;
      case 'relatorios_propostas':
        if (canAccess(['user', 'scout', 'admin'])) {
          return <div className="main-content"><Relatorios filtroInicial="propostas" /></div>;
        }
        return <div className="main-content"><h2>Acesso Negado</h2></div>;
      case 'relatorios':
        if (canAccess(['user', 'scout', 'admin'])) {
          return <div className="main-content"><Relatorios /></div>;
        }
        return <div className="main-content"><h2>Acesso Negado</h2></div>;
      case 'atletas':
        return <div className="main-with-sidebar"><Atletas onPlayerClick={setModalPlayer} /></div>;
      case 'estatisticas':
        return <div className="main-with-sidebar"><Estatisticas onPlayerClick={setModalPlayer} /></div>;
      case 'contratos':
        if (canAccess(['scout', 'admin'])) return <div className="main-with-sidebar"><Contratos /></div>;
        return <div className="main-content"><h2>Acesso Negado</h2></div>;
      case 'perfil':
        return <div className="main-with-sidebar"><Perfil /></div>;
      case 'admin_perfis':
        if (canAccess(['admin'])) return <div className="main-with-sidebar"><AdminPage filtroInicial="perfis" /></div>;
        return <div className="main-content"><h2>Acesso Negado</h2></div>;
      case 'admin_jogadores':
        if (canAccess(['admin'])) return <div className="main-with-sidebar"><AdminPage filtroInicial="jogadores" /></div>;
        return <div className="main-content"><h2>Acesso Negado</h2></div>;
      case 'admin':
        if (canAccess(['admin'])) return <div className="main-with-sidebar"><AdminPage /></div>;
        return <div className="main-content"><h2>Acesso Negado</h2></div>;
      default:
        return <div className="main-content"><Inicio /></div>;
    }
  };

  const handleEditPlayer = (player) => {
    setModalPlayer(null);
    setEditPlayer({ ...player });
  };

  const handleDeletePlayer = (player) => {
    setDeleteTarget(player);
  };

  const confirmDeletePlayer = () => {
    if (deleteTarget) {
      dispatch(deletarAtleta(deleteTarget.id));
      setModalPlayer(null);
      setDeleteTarget(null);
    }
  };

  const handleSalvarEdicao = (e) => {
    e.preventDefault();
    const { _marketValueDisplay, _salaryDisplay, ...playerData } = editPlayer;
    dispatch(atualizarAtleta(playerData));
    setEditPlayer(null);
  };

  const handleStatEdit = async (player, statKey, valorNovo, valorAntigo) => {
    try {
      await dispatch(ajustarStatAtleta({
        jogadorId: player.id,
        jogador: player.name,
        jogadorImg: player.profileImageURL,
        jogadorTeam: player.team,
        statKey,
        valorNovo,
        valorAntigo
      })).unwrap();
      
      // Update local state to immediately reflect in the modal without needing to close/re-open
      setModalPlayer(prev => {
        if (!prev || prev.id !== player.id) return prev;
        return {
          ...prev,
          statistics: {
            ...(prev.statistics || {}),
            [statKey]: Number(valorNovo)
          }
        };
      });
    } catch (err) {
      console.error('Erro ao ajustar estatística inline:', err);
    }
  };

  const handleNavigate = (target) => {
    onNavigate(target);
    setSidebarOpen(false);
  };

  return (
    <div className="dashboard-page">
      {/* Topbar visível só no mobile */}
      <header className="mobile-topbar">
        <div className="mobile-logo">
          <div className="sb-icon">Q</div>
          <span>ScoutIQ</span>
        </div>
        <button className="hamburger-btn" onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">
          <i className={`fa-solid ${sidebarOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
        </button>
      </header>

      {/* Backdrop para fechar o sidebar no mobile */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <Sidebar page={page} onNavigate={handleNavigate} isOpen={sidebarOpen} />
      {renderContent()}
      <PlayerModal
        player={modalPlayer}
        onClose={() => setModalPlayer(null)}
        onEdit={handleEditPlayer}
        onDelete={handleDeletePlayer}
        isAdmin={role === 'admin'}
        onStatEdit={handleStatEdit}
      />

      {/* Modal de Edição */}
      {editPlayer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', width: '420px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <h3 style={{ marginTop: 0, color: 'white', marginBottom: '20px' }}>Editar Atleta</h3>
            <form onSubmit={handleSalvarEdicao} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome</label>
                <input required placeholder="Nome do Jogador" value={editPlayer.name} onChange={e => setEditPlayer({ ...editPlayer, name: e.target.value })} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Posição</label>
                <select value={editPlayer.position} onChange={e => setEditPlayer({ ...editPlayer, position: e.target.value })} style={inputStyle}>
                  {POSITIONS_DB.map(p => <option key={p} value={p}>{positionFullLabel(p)}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clube</label>
                <input
                  list="times-br-list"
                  required
                  placeholder="Digite ou selecione o clube"
                  value={editPlayer.team || ''}
                  onChange={e => setEditPlayer({ ...editPlayer, team: e.target.value })}
                  style={inputStyle}
                />
                <datalist id="times-br-list">
                  {TIMES_BR.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor de Mercado (R$)</label>
                <input
                  inputMode="numeric"
                  placeholder="Ex: 1.000.000"
                  value={editPlayer._marketValueDisplay ?? formatBR(editPlayer.marketValue)}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^\d]/g, '');
                    const num = Number(raw);
                    setEditPlayer({
                      ...editPlayer,
                      marketValue: num,
                      _marketValueDisplay: raw ? num.toLocaleString('pt-BR') : '',
                    });
                  }}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Salário Mensal (R$)</label>
                <input
                  inputMode="numeric"
                  placeholder="Ex: 50.000"
                  value={editPlayer._salaryDisplay ?? formatBR(editPlayer.monthlySalary)}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^\d]/g, '');
                    const num = Number(raw);
                    setEditPlayer({
                      ...editPlayer,
                      monthlySalary: num,
                      _salaryDisplay: raw ? num.toLocaleString('pt-BR') : '',
                    });
                  }}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" style={{ flex: 1, background: '#10b981', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Salvar Alterações</button>
                <button type="button" onClick={() => setEditPlayer(null)} style={{ flex: 1, background: '#334155', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeletePlayer}
        title="Excluir Jogador"
        message={deleteTarget ? `Deseja mesmo remover ${deleteTarget.name} da base de dados? Esta ação não pode ser desfeita.` : ''}
        confirmText="Sim, excluir"
        variant="danger"
      />
    </div>
  );
};

export default Dashboard;
