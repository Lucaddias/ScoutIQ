import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './Sidebar.css';

const ROLE_LABELS = { admin: 'Admin', scout: 'Olheiro', user: 'Usuário' };
const ROLE_COLORS = { admin: '#f87171', scout: '#fbbf24', user: '#60a5fa' };

const NAV_ITEMS = [
  { id: 'dashboard',    icon: 'fa-house',             label: 'Início',        roles: ['user', 'scout', 'admin'] },
  { id: 'atletas',      icon: 'fa-user-group',        label: 'Atletas',       roles: ['user', 'scout', 'admin'] },
  { id: 'estatisticas', icon: 'fa-chart-simple',      label: 'Estatísticas',  roles: ['user', 'scout', 'admin'] },
  { id: 'relatorios',   icon: 'fa-file-lines',        label: 'Relatórios',    roles: ['scout', 'admin'] },
  { id: 'contratos',    icon: 'fa-file-signature',    label: 'Contratos',     roles: ['scout', 'admin'] },
  { id: 'admin',        icon: 'fa-shield-halved',     label: 'Gerenciar',     roles: ['admin'] },
];

export default function Sidebar({ page, onNavigate }) {
  const { user, logout } = useAuth();
  const role = user?.role || 'user';

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role));

  const handleLogout = async () => {
    await logout();
    onNavigate('login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sb-icon">Q</div>
        <span>ScoutIQ</span>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {visibleItems.map(item => (
            <li key={item.id}>
              <button
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <i className={`fa-solid ${item.icon}`}></i>
                <span>{item.label}</span>
                {page === item.id && <div className="nav-indicator"></div>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-bottom">
        {/* Profile link */}
        <button
          className={`nav-item profile-btn ${page === 'perfil' ? 'active' : ''}`}
          onClick={() => onNavigate('perfil')}
        >
          <div className="profile-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="profile-info">
            <span className="profile-name">{user?.name || 'Usuário'}</span>
            <span className="profile-role" style={{ color: ROLE_COLORS[role] }}>
              {ROLE_LABELS[role]}
            </span>
          </div>
        </button>

        <button
          className="nav-item logout"
          onClick={handleLogout}
        >
          <i className="fa-solid fa-arrow-right-from-bracket"></i>
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
