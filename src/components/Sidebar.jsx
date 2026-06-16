/**
 * @file Barra lateral de navegação principal da aplicação.
 * @module components/Sidebar
 */
import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './Sidebar.css';

const ROLE_LABELS = { admin: 'Admin', scout: 'Olheiro', user: 'Usuário' };
const ROLE_COLORS = { admin: '#f87171', scout: '#fbbf24', user: '#60a5fa' };

/**
 * Itens de navegação disponíveis no sidebar.
 * Cada item define quais roles (papéis) têm acesso àquela rota.
 * @constant {Array<{id: string, icon: string, label: string, roles: string[]}>}
 */
const NAV_ITEMS = [
  { id: 'inicio',         icon: 'fa-house',             label: 'Início',             roles: ['user', 'scout', 'admin'] },
  { id: 'apoio_decisao',  icon: 'fa-brain',             label: 'Apoio à Decisão',    roles: ['user', 'scout', 'admin'] },
  { id: 'atletas',        icon: 'fa-user-group',        label: 'Atletas',            roles: ['user', 'scout', 'admin'] },
  { id: 'estatisticas',   icon: 'fa-chart-simple',      label: 'Estatísticas',       roles: ['user', 'scout', 'admin'] },
  { id: 'relatorios',     icon: 'fa-file-lines',        label: 'Relatórios',         roles: ['user', 'scout', 'admin'] },
  { id: 'contratos',      icon: 'fa-file-signature',    label: 'Contratos',          roles: ['scout', 'admin'] },
  { id: 'admin',          icon: 'fa-shield-halved',     label: 'Gerenciar',          roles: ['admin'] },
];

/**
 * Barra lateral de navegação da aplicação. Filtra os itens do menu com base no role
 * do usuário logado e exibe botões de perfil e logout na parte inferior.
 * Em dispositivos móveis é controlada pela prop `isOpen`.
 *
 * @component
 * @param {object}   props            - Propriedades do componente.
 * @param {string}   props.page       - ID da página ativa para destacar o item correto.
 * @param {Function} props.onNavigate - Callback de navegação que recebe o ID da página destino.
 * @param {boolean}  props.isOpen     - Controla a visibilidade no mobile (adiciona classe CSS).
 * @returns {React.ReactElement} A barra lateral renderizada.
 */
export default function Sidebar({ page, onNavigate, isOpen }) {
  const { user, logout } = useAuth();
  const role = user?.role || 'user';

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role));

  const handleLogout = async () => {
    await logout();
    onNavigate('login');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
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
