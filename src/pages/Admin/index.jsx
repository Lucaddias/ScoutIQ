import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import playersData from '../../data/players_updated.json';
import { enrichPlayers } from '../../utils/playerScore.js';
import { formatBRL } from '../../utils/formatters.js';
import './Admin.css';

const ROLE_LABELS  = { admin: 'Administrador', scout: 'Olheiro', user: 'Usuário' };
const ROLE_COLORS  = { admin: '#f87171', scout: '#fbbf24', user: '#60a5fa' };

const defaultPlayers = enrichPlayers(playersData.athletes);

export default function AdminPage() {
  const { allUsers, setUserRole, user: currentUser } = useAuth();

  // Custom players added via admin
  const [customPlayers, setCustomPlayers] = useState([]);
  const [toast, setToast] = useState(null);

  // Add player form
  const [form, setForm] = useState({
    name: '', team: '', position: 'Forward',
    marketValue: '', monthlySalary: '', age: '',
  });

  const handleRoleChange = (userId, newRole) => {
    setUserRole(userId, newRole);
    const u = allUsers.find(u => u.id === userId);
    setToast(`Perfil de ${u?.name || 'usuário'} alterado para ${ROLE_LABELS[newRole]}`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (!form.name || !form.team || !form.marketValue) {
      setToast('Preencha os campos obrigatórios.');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const newPlayer = {
      id: Date.now(),
      name: form.name,
      team: form.team,
      position: form.position,
      marketValue: Number(form.marketValue),
      monthlySalary: Number(form.monthlySalary) || Math.round(Number(form.marketValue) * 0.02),
      age: Number(form.age) || 25,
      score: Math.floor(60 + Math.random() * 30),
      profileImageURL: '',
      statistics: { goals: 0, assists: 0 },
    };
    setCustomPlayers(prev => [newPlayer, ...prev]);
    setForm({ name: '', team: '', position: 'Forward', marketValue: '', monthlySalary: '', age: '' });
    setToast(`Jogador ${newPlayer.name} adicionado com sucesso!`);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1><i className="fa-solid fa-shield-halved"></i> Painel Administrativo</h1>
        <p>Gerencie usuários e adicione novos jogadores ao sistema</p>
      </div>

      {/* [REQ: Bootstrap 5.2] Grid responsivo: empilhado no mobile, lado a lado no desktop (md+) */}
      <div className="container-fluid px-0">
        <div className="row g-4">

        {/* Users Management */}
        <div className="col-md-6">
        <div className="admin-card">
          <h3><i className="fa-solid fa-users-gear"></i> Gerenciar Usuários</h3>
          <div className="admin-users-list">
            {allUsers.map(u => (
              <div className="admin-user-row" key={u.id}>
                <div className="admin-user-avatar">
                  {u.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="admin-user-info">
                  <div className="admin-user-name">
                    {u.name}
                    {u.id === currentUser?.id && <span className="you-badge">Você</span>}
                  </div>
                  <div className="admin-user-email">{u.email}</div>
                </div>
                <select
                  className="admin-role-select"
                  value={u.role}
                  onChange={e => handleRoleChange(u.id, e.target.value)}
                  style={{ borderColor: ROLE_COLORS[u.role], color: ROLE_COLORS[u.role] }}
                >
                  <option value="user">Usuário</option>
                  <option value="scout">Olheiro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
            {allUsers.length === 0 && (
              <div className="admin-empty">Nenhum usuário cadastrado.</div>
            )}
          </div>
        </div>

        </div>{/* fecha col-md-6 de Users */}

        {/* Add Player */}
        <div className="col-md-6">
        <div className="admin-card">
          <h3><i className="fa-solid fa-user-plus"></i> Adicionar Jogador</h3>
          <form className="add-player-form" onSubmit={handleAddPlayer}>
            <div className="form-row">
              <div className="form-group">
                <label>Nome do Jogador *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Ex: João Silva" />
              </div>
              <div className="form-group">
                <label>Clube *</label>
                <input type="text" value={form.team} onChange={e => setForm(p => ({...p, team: e.target.value}))} placeholder="Ex: Palmeiras" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Posição</label>
                <select value={form.position} onChange={e => setForm(p => ({...p, position: e.target.value}))}>
                  <option value="Forward">Atacante</option>
                  <option value="Midfielder">Meia</option>
                  <option value="Defender">Zagueiro</option>
                  <option value="Goalkeeper">Goleiro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Idade</label>
                <input type="number" value={form.age} onChange={e => setForm(p => ({...p, age: e.target.value}))} placeholder="25" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Valor de Mercado (R$) *</label>
                <input type="number" value={form.marketValue} onChange={e => setForm(p => ({...p, marketValue: e.target.value}))} placeholder="5000000" />
              </div>
              <div className="form-group">
                <label>Salário Mensal (R$)</label>
                <input type="number" value={form.monthlySalary} onChange={e => setForm(p => ({...p, monthlySalary: e.target.value}))} placeholder="100000" />
              </div>
            </div>
            <button type="submit" className="btn-add-player">
              <i className="fa-solid fa-plus"></i> Adicionar Jogador
            </button>
          </form>

          {customPlayers.length > 0 && (
            <div className="custom-players-section">
              <h4>Jogadores Adicionados ({customPlayers.length})</h4>
              {customPlayers.map(p => (
                <div className="custom-player-row" key={p.id}>
                  <span className="custom-player-name">{p.name}</span>
                  <span className="custom-player-team">{p.team}</span>
                  <span className="custom-player-value">{formatBRL(p.marketValue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>{/* fecha admin-card Add Player */}
        </div>{/* fecha col-md-6 de Add Player */}

        </div>{/* fecha row */}
      </div>{/* fecha container-fluid [REQ: Bootstrap 5.2] */}

      {toast && (
        <div className="toast-success">
          <i className="fa-solid fa-circle-check"></i>
          {toast}
        </div>
      )}
    </div>
  );
}
