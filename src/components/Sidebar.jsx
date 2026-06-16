/**
 * @file Barra lateral de navegação principal da aplicação.
 * @module components/Sidebar
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './Sidebar.css';

const ROLE_LABELS = { admin: 'Admin', scout: 'Olheiro', user: 'Usuário' };
const ROLE_COLORS = { admin: '#f87171', scout: '#fbbf24', user: '#60a5fa' };

// Sub-itens da pasta "Relatórios"
const RELATORIOS_SUB = [
  { id: 'relatorios_elenco',    icon: 'fa-folder-open',    label: 'Relatórios de Elenco',   color: '#3b82f6' },
  { id: 'relatorios_propostas', icon: 'fa-file-signature',  label: 'Propostas de Contratos', color: '#14b8a6' },
];

// Sub-itens da pasta "Gerenciar"
const GERENCIAR_SUB = [
  { id: 'admin_perfis',    icon: 'fa-users-gear', label: 'Gerenciar Perfis',  color: '#f59e0b' },
  { id: 'admin_jogadores', icon: 'fa-user-plus',  label: 'Adicionar Jogador', color: '#10b981' },
];

/**
 * Itens de navegação disponíveis no sidebar.
 * Cada item define quais roles (papéis) têm acesso àquela rota.
 * @constant {Array<{id: string, icon: string, label: string, roles: string[]}>}
 */
const NAV_ITEMS = [
  { id: 'inicio',        icon: 'fa-house',          label: 'Início',          roles: ['user', 'scout', 'admin'] },
  { id: 'apoio_decisao', icon: 'fa-brain',           label: 'Apoio à Decisão', roles: ['user', 'scout', 'admin'] },
  { id: 'atletas',       icon: 'fa-user-group',      label: 'Atletas',         roles: ['user', 'scout', 'admin'] },
  { id: 'estatisticas',  icon: 'fa-chart-simple',    label: 'Estatísticas',    roles: ['user', 'scout', 'admin'] },
  { id: 'contratos',     icon: 'fa-file-contract',   label: 'Contratos',       roles: ['scout', 'admin'] },
  { id: 'relatorios',    icon: 'fa-file-lines',      label: 'Relatórios',      roles: ['user', 'scout', 'admin'], hasChildren: true, subKey: 'relatorios' },
  { id: 'admin',         icon: 'fa-shield-halved',   label: 'Gerenciar',       roles: ['admin'],                  hasChildren: true, subKey: 'admin' },
];

const RELATORIOS_IDS = RELATORIOS_SUB.map(s => s.id);
const GERENCIAR_IDS  = GERENCIAR_SUB.map(s => s.id);

// Mapeia subKey → lista de sub-itens
const SUB_MAP = { relatorios: RELATORIOS_SUB, admin: GERENCIAR_SUB };

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

  // Abre automaticamente se a página ativa é um sub-item de relatórios
  const [relOpen, setRelOpen] = useState(() => RELATORIOS_IDS.includes(page));
  const [admOpen, setAdmOpen] = useState(() => GERENCIAR_IDS.includes(page));

  // Sincroniza quando a navegação ocorre externamente (ex: ApoioDecisao → relatorios_elenco)
  useEffect(() => {
    if (RELATORIOS_IDS.includes(page)) setRelOpen(true);
    if (GERENCIAR_IDS.includes(page)) setAdmOpen(true);
  }, [page]);

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role));

  const handleLogout = async () => {
    await logout();
    onNavigate('login');
  };

  const isRelatoriosActive = RELATORIOS_IDS.includes(page);
  const isAdminActive      = GERENCIAR_IDS.includes(page);

  // Retorna metadados de estado para cada pasta
  const folderState = (subKey) => {
    if (subKey === 'relatorios') return { isOpen: relOpen, toggle: () => setRelOpen(o => !o), isActive: isRelatoriosActive, subitems: RELATORIOS_SUB };
    if (subKey === 'admin')      return { isOpen: admOpen, toggle: () => setAdmOpen(o => !o), isActive: isAdminActive,      subitems: GERENCIAR_SUB };
    return null;
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sb-icon">Q</div>
        <span>ScoutIQ</span>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {visibleItems.map(item => {
            if (item.hasChildren) {
              const fs = folderState(item.subKey);
              return (
                <li key={item.id}>
                  <button
                    className={`nav-item ${fs.isActive ? 'active' : ''}`}
                    onClick={fs.toggle}
                  >
                    <i className={`fa-solid ${item.icon}`}></i>
                    <span>{item.label}</span>
                    <i className={`fa-solid fa-chevron-down nav-chevron ${fs.isOpen ? 'open' : ''}`}></i>
                    {fs.isActive && <div className="nav-indicator"></div>}
                  </button>

                  <ul className={`nav-children ${fs.isOpen ? 'nav-children--open' : ''}`}>
                    {fs.subitems.map(sub => (
                      <li key={sub.id}>
                        <button
                          className={`nav-item nav-child-item ${page === sub.id ? 'active' : ''}`}
                          onClick={() => onNavigate(sub.id)}
                        >
                          <i
                            className={`fa-solid ${sub.icon}`}
                            style={{ color: page === sub.id ? sub.color : undefined }}
                          ></i>
                          <span>{sub.label}</span>
                          {page === sub.id && <div className="nav-indicator"></div>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            }

            return (
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
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-bottom">
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

        <button className="nav-item logout" onClick={handleLogout}>
          <i className="fa-solid fa-arrow-right-from-bracket"></i>
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
