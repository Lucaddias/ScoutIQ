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
import playersData from '../../data/players_updated.json';
import { enrichPlayers } from '../../utils/playerScore.js';
import './Dashboard.css';

const allPlayers = enrichPlayers(playersData.athletes);

const Dashboard = ({ page, onNavigate, pacoteSelecionado, setPacoteSelecionado }) => {
  const { user } = useAuth();
  const role = user?.role || 'user';
  const [modalPlayer, setModalPlayer] = useState(null);

  const canAccess = (required) => required.includes(role);

  const renderContent = () => {
    switch (page) {
      case 'inicio':
        return <div className="main-content"><Inicio /></div>;
      case 'apoio_decisao':
        if (canAccess(['user', 'scout', 'admin'])) {
            return <div className="main-content"><ApoioDecisao pacoteSelecionado={pacoteSelecionado} setPacoteSelecionado={setPacoteSelecionado} onNavigate={onNavigate} /></div>;
        }
        return <div className="main-content"><h2>Acesso Negado</h2></div>;
      case 'relatorios':
        if (canAccess(['user', 'scout', 'admin'])) {
            return <div className="main-content"><Relatorios pacoteSelecionado={pacoteSelecionado} /></div>;
        }
        return <div className="main-content"><h2>Acesso Negado</h2></div>;
      case 'atletas':
        return <div className="main-with-sidebar"><Atletas onPlayerClick={setModalPlayer} /></div>;
      case 'estatisticas':
        return <div className="main-with-sidebar"><Estatisticas players={allPlayers} onPlayerClick={setModalPlayer} /></div>;
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

  return (
    <div className="dashboard-page">
      <Sidebar page={page} onNavigate={onNavigate} />
      {renderContent()}
      <PlayerModal player={modalPlayer} onClose={() => setModalPlayer(null)} />
    </div>
  );
};

export default Dashboard;
