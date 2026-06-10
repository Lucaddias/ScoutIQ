import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import './Perfil.css';

const ROLE_LABELS = { admin: 'Administrador', scout: 'Olheiro', user: 'Usuário Comum' };
const ROLE_COLORS = { admin: '#f87171', scout: '#fbbf24', user: '#60a5fa' };
const ROLE_ICONS  = { admin: 'fa-shield-halved', scout: 'fa-binoculars', user: 'fa-user' };

const ROLE_PERKS = {
  user: [
    'Acesso ao painel de decisão',
    'Visualizar atletas e estatísticas',
    'Gerar cenários de contratação',
  ],
  scout: [
    'Tudo do Usuário Comum +',
    'Acesso a Relatórios de Partidas',
    'Geração de Propostas de Contrato',
    'Análise avançada de desempenho',
  ],
  admin: [
    'Tudo do Olheiro +',
    'Gerenciar usuários e permissões',
    'Adicionar novos jogadores',
    'Controle total do sistema',
  ],
};

export default function Perfil() {
  /*
   * Lê o usuário logado e a função upgradeRole do AuthContext.
   * role define quais permissões e quais opções de upgrade serão exibidas.
   */
  const { user, upgradeRole } = useAuth();
  const role = user?.role || 'user';

  /* handleUpgrade — promove o próprio usuário de 'user' para 'scout' via Supabase. */
  const handleUpgrade = async () => {
    if (user) {
      try {
        await upgradeRole('scout');
      } catch (err) {
        console.error('Erro ao fazer upgrade:', err.message);
      }
    }
  };

  return (
    <div className="perfil-page">
      <div className="perfil-header">
        <h1>Meu Perfil</h1>
        <p>Gerencie suas informações e nível de acesso</p>
      </div>

      <div className="perfil-grid">
        {/* Card de Perfil */}
        <div className="perfil-card">
          <div className="perfil-avatar-large">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <h2>{user?.name || 'Usuário'}</h2>
          <p className="perfil-email">{user?.email || 'email@exemplo.com'}</p>
          <div className="perfil-role-badge" style={{ background: `${ROLE_COLORS[role]}20`, color: ROLE_COLORS[role], borderColor: `${ROLE_COLORS[role]}40` }}>
            <i className={`fa-solid ${ROLE_ICONS[role]}`}></i>
            {ROLE_LABELS[role]}
          </div>
        </div>

        {/* Card de Permissões */}
        <div className="perfil-perms-card">
          <h3><i className="fa-solid fa-key"></i> Suas Permissões</h3>
          <ul className="perms-list">
            {ROLE_PERKS[role].map((perk, i) => (
              <li key={i}>
                <i className="fa-solid fa-check-circle"></i>
                {perk}
              </li>
            ))}
          </ul>

          {role === 'user' && (
            <div className="upgrade-section">
              <div className="upgrade-divider"></div>
              <div className="upgrade-promo">
                <div className="upgrade-icon">
                  <i className="fa-solid fa-binoculars"></i>
                </div>
                <div>
                  <h4>Quer mais acesso?</h4>
                  <p>Com o perfil de Olheiro, você acessa relatórios detalhados das partidas e pode gerar propostas de contrato automáticas.</p>
                </div>
              </div>
              <button className="btn-upgrade" onClick={handleUpgrade}>
                <i className="fa-solid fa-arrow-up"></i>
                Tornar-se Olheiro
              </button>
            </div>
          )}

          {role === 'scout' && (
            <div className="upgrade-section">
              <div className="upgrade-divider"></div>
              <div className="role-active-msg">
                <i className="fa-solid fa-circle-check"></i>
                Você já possui acesso de <strong>Olheiro</strong>. Aproveite os Relatórios e Contratos no menu lateral.
              </div>
            </div>
          )}

          {role === 'admin' && (
            <div className="upgrade-section">
              <div className="upgrade-divider"></div>
              <div className="role-active-msg admin">
                <i className="fa-solid fa-crown"></i>
                Você possui acesso <strong>Administrador</strong> — controle total do sistema.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
