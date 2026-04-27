import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchAtletas, criarAtleta } from '../../store/atletasSlice';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatBRL } from '../../utils/formatters.js';
import './Admin.css';

const ROLE_LABELS = { admin: 'Administrador', scout: 'Olheiro', user: 'Usuário' };
const ROLE_COLORS = { admin: '#f87171', scout: '#fbbf24', user: '#60a5fa' };

export default function AdminPage() {
  const { lista, loading } = useSelector((state) => state.atletas);
  const dispatch = useDispatch();

  useEffect(() => {
    if (lista.length === 0) dispatch(fetchAtletas());
  }, [dispatch, lista.length]);

  const { allUsers, setUserRole, user: currentUser } = useAuth();

  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    name: '', team: '', position: 'Forward',
    marketValue: '', monthlySalary: '', age: '',
  });

  /*
   * handleRoleChange — altera o papel de um usuário chamando setUserRole do AuthContext.
   * Exibe um toast de confirmação por 3 segundos após a mudança.
   * setUserRole persiste a alteração localmente e, se for o próprio admin, também no Supabase.
   */
  const handleRoleChange = (userId, newRole) => {
    setUserRole(userId, newRole);
    const u = allUsers.find(u => u.id === userId);
    setToast(`Perfil de ${u?.name || 'usuário'} alterado para ${ROLE_LABELS[newRole]}`);
    setTimeout(() => setToast(null), 3000);
  };

  /*
   * handleAddPlayer — cria um novo jogador via Redux (criarAtleta thunk).
   * O jogador entra no store global e fica visível em Atletas, Contratos e ApoioDecisao.
   * O salário mensal usa fallback de 2% do valor de mercado se não preenchido.
   */
  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (!form.name || !form.team || !form.marketValue) {
      setToast('Preencha os campos obrigatórios.');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const newPlayer = {
      name: form.name,
      team: form.team,
      position: form.position,
      marketValue: Number(form.marketValue),
      monthlySalary: Number(form.monthlySalary) || Math.round(Number(form.marketValue) * 0.02),
      age: Number(form.age) || 25,
      profileImageURL: '',
      statistics: { goals: 0, assists: 0 },
    };
    dispatch(criarAtleta(newPlayer));
    setForm({ name: '', team: '', position: 'Forward', marketValue: '', monthlySalary: '', age: '' });
    setToast(`Jogador ${newPlayer.name} adicionado com sucesso!`);
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#94a3b8' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '40px', marginBottom: '15px', color: '#10b981' }}></i>
        <h2>Carregando dados...</h2>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1><i className="fa-solid fa-shield-halved"></i> Painel Administrativo</h1>
        <p>Gerencie usuários e adicione novos jogadores ao sistema: {lista.length} atletas cadastrados</p>
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
          </div>

          {/* Add Player */}
          <div className="col-md-6">
            <div className="admin-card">
              <h3><i className="fa-solid fa-user-plus"></i> Adicionar Jogador</h3>
              <form className="add-player-form" onSubmit={handleAddPlayer}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nome do Jogador *</label>
                    <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: João Silva" />
                  </div>
                  <div className="form-group">
                    <label>Clube *</label>
                    <input type="text" value={form.team} onChange={e => setForm(p => ({ ...p, team: e.target.value }))} placeholder="Ex: Palmeiras" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Posição</label>
                    <select value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))}>
                      <option value="Forward">Atacante</option>
                      <option value="Midfielder">Meia</option>
                      <option value="Defender">Zagueiro</option>
                      <option value="Goalkeeper">Goleiro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Idade</label>
                    <input type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} placeholder="25" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Valor de Mercado (R$) *</label>
                    <input type="number" value={form.marketValue} onChange={e => setForm(p => ({ ...p, marketValue: e.target.value }))} placeholder="5000000" />
                  </div>
                  <div className="form-group">
                    <label>Salário Mensal (R$)</label>
                    <input type="number" value={form.monthlySalary} onChange={e => setForm(p => ({ ...p, monthlySalary: e.target.value }))} placeholder="100000" />
                  </div>
                </div>
                <button type="submit" className="btn-add-player">
                  <i className="fa-solid fa-plus"></i> Adicionar Jogador
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>

      {toast && (
        <div className="toast-success">
          <i className="fa-solid fa-circle-check"></i>
          {toast}
        </div>
      )}
    </div>
  );
}
