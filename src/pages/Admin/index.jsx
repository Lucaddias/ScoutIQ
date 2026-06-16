/**
 * @file Painel administrativo para gerenciamento de usuários e cadastro de novos jogadores.
 * @module pages/Admin
 */
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
// 1. IMPORT NOVO ADICIONADO AQUI:
import { fetchAtletas, criarAtleta, selectAllAtletas } from '../../store/atletasSlice'; 
import { useAuth } from '../../context/AuthContext.jsx';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import yup from '../../utils/yupConfig.js';
import { formatBRL } from '../../utils/formatters.js';
import './Admin.css';

const ROLE_LABELS = { admin: 'Administrador', scout: 'Olheiro', user: 'Usuário' };
const ROLE_COLORS = { admin: '#f87171', scout: '#fbbf24', user: '#60a5fa' };

const jogadorSchema = yup.object().shape({
  name: yup.string().max(100).required(),
  team: yup.string().max(100).required(),
  position: yup.string().required(),
  age: yup.number().transform((value) => (Number.isNaN(value) ? undefined : value)).notRequired(),
  marketValue: yup.number().typeError('Deve ser um número').positive('Deve ser maior que zero').required(),
  monthlySalary: yup.number().transform((value) => (Number.isNaN(value) ? undefined : value)).notRequired(),
});

/**
 * Painel administrativo (acesso exclusivo ao role 'admin').
 * Permite alterar o papel (role) de qualquer usuário cadastrado e
 * adicionar novos atletas ao sistema via formulário validado com Yup.
 * O formulário de jogador usa `react-hook-form` com schema `jogadorSchema`.
 *
 * @component
 * @returns {React.ReactElement} O painel administrativo renderizado.
 */
export default function AdminPage() {
  // 2. LEITURA DO REDUX CORRIGIDA AQUI:
  const lista = useSelector(selectAllAtletas);
  const loading = useSelector((state) => state.atletas.loading);
  const dispatch = useDispatch();

  useEffect(() => {
    if (lista.length === 0) dispatch(fetchAtletas());
  }, [dispatch, lista.length]);

  const { allUsers, setUserRole, user: currentUser } = useAuth();

  const [toast, setToast] = useState(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(jogadorSchema),
    defaultValues: {
      name: '', team: '', position: 'Forward',
      marketValue: '', monthlySalary: '', age: ''
    }
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
  const handleAddPlayer = (data) => {
    const newPlayer = {
      name: data.name,
      team: data.team,
      position: data.position,
      marketValue: Number(data.marketValue),
      monthlySalary: Number(data.monthlySalary) || Math.round(Number(data.marketValue) * 0.02),
      age: Number(data.age) || 25,
      profileImageURL: '',
      statistics: { goals: 0, assists: 0 },
    };
    dispatch(criarAtleta(newPlayer));
    reset();
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
              <form className="add-player-form" onSubmit={handleSubmit(handleAddPlayer)}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nome do Jogador *</label>
                    <input type="text" {...register('name')} placeholder="Ex: João Silva" />
                    {errors.name && <span className="hook-error">{errors.name.message}</span>}
                  </div>
                  <div className="form-group">
                    <label>Clube *</label>
                    <input type="text" {...register('team')} placeholder="Ex: Palmeiras" />
                    {errors.team && <span className="hook-error">{errors.team.message}</span>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Posição</label>
                    <select {...register('position')}>
                      <option value="Forward">Atacante</option>
                      <option value="Midfielder">Meia</option>
                      <option value="Defender">Zagueiro</option>
                      <option value="Goalkeeper">Goleiro</option>
                    </select>
                    {errors.position && <span className="hook-error">{errors.position.message}</span>}
                  </div>
                  <div className="form-group">
                    <label>Idade</label>
                    <input type="number" {...register('age')} placeholder="25" />
                    {errors.age && <span className="hook-error">{errors.age.message}</span>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Valor de Mercado (R$) *</label>
                    <input type="number" {...register('marketValue')} placeholder="5000000" />
                    {errors.marketValue && <span className="hook-error">{errors.marketValue.message}</span>}
                  </div>
                  <div className="form-group">
                    <label>Salário Mensal (R$)</label>
                    <input type="number" {...register('monthlySalary')} placeholder="100000" />
                    {errors.monthlySalary && <span className="hook-error">{errors.monthlySalary.message}</span>}
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