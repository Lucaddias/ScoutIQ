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
import PlayerModal from '../../components/PlayerModal.jsx';
import './Dashboard.css';

// Removemos pacoteSelecionado e setPacoteSelecionado daqui!
const Dashboard = ({ page, onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'user';
  const [modalPlayer, setModalPlayer] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      case 'relatorios':
        if (canAccess(['user', 'scout', 'admin'])) {
          // A tela de relatórios agora vai puxar os dados sozinha do Redux!
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
      case 'admin':
        if (canAccess(['admin'])) return <div className="main-with-sidebar"><AdminPage /></div>;
        return <div className="main-content"><h2>Acesso Negado</h2></div>;
      default:
        return <div className="main-content"><Inicio /></div>;
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
      <PlayerModal player={modalPlayer} onClose={() => setModalPlayer(null)} />
    </div>
  );
};

export default Dashboard;
