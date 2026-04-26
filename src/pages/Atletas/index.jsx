import React, { useState, useMemo, useReducer, useEffect } from 'react';
import PlayerCard from '../../components/PlayerCard.jsx';
import { enrichPlayers } from '../../utils/playerScore.js';
import './Atletas.css';

/*
 * HOOKS DO REDUX E NOVOS THUNKS ASSÍNCRONOS
 */
import { useSelector, useDispatch } from 'react-redux';
import { fetchAtletas, criarAtleta, atualizarAtletaMock, deletarAtletaMock } from '../../store/atletasSlice';

const POSITIONS = ['Todos', 'Forward', 'Midfielder', 'Defender', 'Goalkeeper'];
const POS_PT = { Forward: 'Atacante', Midfielder: 'Meia', Defender: 'Zagueiro', Goalkeeper: 'Goleiro' };
const PAGE_SIZE = 12;

// Reducer para gerenciar todos os filtros da listagem
const filterReducer = (state, action) => {
  switch (action.type) {
    case 'SET_SEARCH':   return { ...state, search: action.payload, page: 1 };
    case 'SET_POSITION': return { ...state, position: action.payload, page: 1 };
    case 'SET_TEAM':     return { ...state, team: action.payload, page: 1 };
    case 'SET_SORT':     return { ...state, sortBy: action.payload };
    case 'SET_PAGE':     return { ...state, page: action.payload };
    default:             return state;
  }
};

const initialFilterState = {
  search: '',
  position: 'Todos',
  team: 'Todos',
  sortBy: 'score',
  page: 1,
};

export default function Atletas({ onPlayerClick, initialPosition }) {
  /*
   * LEITURA DO STORE: Agora pegamos a lista E o estado de loading
   */
  const { lista: jogadoresDoBanco, loading } = useSelector((state) => state.atletas);
  const dispatch = useDispatch();

  // O GATILHO INICIAL: Busca os dados no JSON assim que a tela abre
  useEffect(() => {
    if (jogadoresDoBanco.length === 0) {
      dispatch(fetchAtletas());
    }
  }, [dispatch, jogadoresDoBanco.length]);

  // Os dados crus do Redux são enriquecidos com o score calculado antes de serem usados
  const players = useMemo(() => enrichPlayers(jogadoresDoBanco), [jogadoresDoBanco]);

  // Filtros
  const [filters, dispatchFilter] = useReducer(filterReducer, {
    ...initialFilterState,
    position: initialPosition || 'Todos',
  });
  const { search, position, team, sortBy, page } = filters;

  // Estados dos Modais
  const [modalAberto, setModalAberto] = useState(false);
  const [formulario, setFormulario] = useState({ name: '', position: 'Forward', team: '', marketValue: 0, monthlySalary: 0 });

  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [jogadorEditando, setJogadorEditando] = useState(null);

  // Lógica de Filtros
  const teams = useMemo(() => {
    const t = new Set(players.map(p => p.team).filter(Boolean));
    return ['Todos', ...Array.from(t).sort()];
  }, [players]);

  const filtered = useMemo(() => {
    let list = players;
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (position !== 'Todos') list = list.filter(p => p.position === position);
    if (team !== 'Todos') list = list.filter(p => p.team === team);
    list = [...list].sort((a, b) =>
      sortBy === 'score' ? b.score - a.score :
      sortBy === 'marketValue' ? b.marketValue - a.marketValue :
      sortBy === 'salary' ? b.monthlySalary - a.monthlySalary :
      a.name.localeCompare(b.name)
    );
    return list;
  }, [players, search, position, team, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── UPDATE ────────────────────────────────────────────────────────────── */
  const handleAbrirEdicao = (jogador) => {
    setJogadorEditando({ ...jogador });
    setModalEdicaoAberto(true);
  };

  const handleSalvarEdicao = (e) => {
    e.preventDefault();
    // Dispara o novo Thunk Assíncrono
    dispatch(atualizarAtletaMock(jogadorEditando));
    setModalEdicaoAberto(false);
    setJogadorEditando(null);
  };

  /* ── CREATE ────────────────────────────────────────────────────────────── */
  const handleSalvar = (e) => {
    e.preventDefault();
    const novoJogador = {
      // O ID agora é gerado lá dentro do criarAtleta (no Slice), fingindo ser o banco de dados
      name: formulario.name,
      position: formulario.position,
      team: formulario.team,
      marketValue: Number(formulario.marketValue),
      monthlySalary: Number(formulario.monthlySalary),
      stats: {}
    };

    // Dispara o novo Thunk Assíncrono
    dispatch(criarAtleta(novoJogador));
    setModalAberto(false);
    setFormulario({ name: '', position: 'Forward', team: '', marketValue: 0, monthlySalary: 0 });
  };

  /* ── DELETE ────────────────────────────────────────────────────────────── */
  const handleExcluir = (id, nome) => {
    if (window.confirm(`Deseja mesmo remover o atleta ${nome} da base de dados?`)) {
      // Dispara o novo Thunk Assíncrono
      dispatch(deletarAtletaMock(id));
    }
  };

  return (
    <div className="atletas-page">
      <div className="atletas-header">
        <div>
          <h1>Atletas</h1>
          <p>{filtered.length} atletas encontrados</p>
        </div>
        {/* BOTÃO DE ADICIONAR */}
        <button 
          className="btn-verde" 
          onClick={() => setModalAberto(true)}
          style={{ background: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
        >
          <i className="fa-solid fa-plus"></i> Novo Atleta
        </button>
      </div>

      {/* JANELA MODAL DE CADASTRO */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', width: '400px' }}>
            <h3 style={{ marginTop: 0, color: 'white' }}>Cadastrar Atleta</h3>
            <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input required placeholder="Nome do Jogador" value={formulario.name} onChange={e => setFormulario({...formulario, name: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <select value={formulario.position} onChange={e => setFormulario({...formulario, position: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}>
                {POSITIONS.filter(p => p !== 'Todos').map(p => <option key={p} value={p}>{POS_PT[p]}</option>)}
              </select>
              <input required placeholder="Clube" value={formulario.team} onChange={e => setFormulario({...formulario, team: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <input type="number" required placeholder="Valor de Mercado (€)" value={formulario.marketValue || ''} onChange={e => setFormulario({...formulario, marketValue: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <input type="number" required placeholder="Salário Mensal (€)" value={formulario.monthlySalary || ''} onChange={e => setFormulario({...formulario, monthlySalary: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, background: '#3b82f6', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Salvar</button>
                <button type="button" onClick={() => setModalAberto(false)} style={{ flex: 1, background: '#ef4444', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FILTROS — controlados pelo useReducer */}
      <div className="atletas-filters">
        <div className="filter-search">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input type="text" placeholder="Buscar por nome..." value={search} onChange={e => dispatchFilter({ type: 'SET_SEARCH', payload: e.target.value })} />
        </div>
        <select className="filter-select" value={position} onChange={e => dispatchFilter({ type: 'SET_POSITION', payload: e.target.value })}>
          {POSITIONS.map(p => <option key={p} value={p}>{p === 'Todos' ? 'Todas posições' : POS_PT[p]}</option>)}
        </select>
        <select className="filter-select" value={team} onChange={e => dispatchFilter({ type: 'SET_TEAM', payload: e.target.value })}>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="filter-select" value={sortBy} onChange={e => dispatchFilter({ type: 'SET_SORT', payload: e.target.value })}>
          <option value="score">Score ↓</option>
          <option value="marketValue">Valor ↓</option>
          <option value="salary">Salário ↓</option>
          <option value="name">Nome A–Z</option>
        </select>
      </div>

      {/* MODAL DE EDIÇÃO DE ATLETA */}
      {modalEdicaoAberto && jogadorEditando && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', width: '400px' }}>
            <h3 style={{ marginTop: 0, color: 'white' }}>Editar Atleta</h3>
            <form onSubmit={handleSalvarEdicao} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input required placeholder="Nome do Jogador" value={jogadorEditando.name} onChange={e => setJogadorEditando({ ...jogadorEditando, name: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <select value={jogadorEditando.position} onChange={e => setJogadorEditando({ ...jogadorEditando, position: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}>
                {POSITIONS.filter(p => p !== 'Todos').map(p => <option key={p} value={p}>{POS_PT[p]}</option>)}
              </select>
              <input required placeholder="Clube" value={jogadorEditando.team || ''} onChange={e => setJogadorEditando({ ...jogadorEditando, team: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <input type="number" placeholder="Valor de Mercado (€)" value={jogadorEditando.marketValue || ''} onChange={e => setJogadorEditando({ ...jogadorEditando, marketValue: Number(e.target.value) })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <input type="number" placeholder="Salário Mensal (€)" value={jogadorEditando.monthlySalary || ''} onChange={e => setJogadorEditando({ ...jogadorEditando, monthlySalary: Number(e.target.value) })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, background: '#10b981', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Salvar Alterações</button>
                <button type="button" onClick={() => setModalEdicaoAberto(false)} style={{ flex: 1, background: '#ef4444', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FEEDBACK DE LOADING OU LISTA DE JOGADORES */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#94a3b8' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '40px', marginBottom: '15px', color: '#10b981' }}></i>
          <h2>Processando dados...</h2>
        </div>
      ) : (
        <div className="atletas-list">
          {visible.map(p => (
            <div key={p.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>

              <div style={{ position: 'absolute', top: '10px', right: '80px', zIndex: 10, display: 'flex', gap: '8px' }}>
                {/* Botão Editar */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleAbrirEdicao(p); }}
                  style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s ease' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; e.currentTarget.style.color = '#3b82f6'; }}
                  title="Editar Jogador"
                >
                  <i className="fa-solid fa-pen"></i>
                </button>
                {/* Botão Excluir */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleExcluir(p.id, p.name); }}
                  style={{ 
                    background: 'rgba(239, 68, 68, 0.15)', 
                    color: '#ef4444', 
                    border: 'none', 
                    borderRadius: '50%', 
                    width: '32px', 
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer', 
                    fontSize: '14px',
                    transition: 'all 0.2s ease' 
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#ef4444';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  title="Demitir Jogador"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>

              {/* O Seu Card Intacto */}
              <PlayerCard player={p} onClick={onPlayerClick} />
            </div>
          ))}

          {visible.length === 0 && !loading && (
            <div className="atletas-empty">
              <i className="fa-solid fa-user-slash"></i>
              <p>Nenhum atleta encontrado para os filtros selecionados.</p>
            </div>
          )}
        </div>
      )}

      {/* PAGINAÇÃO */}
      {totalPages > 1 && !loading && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => dispatchFilter({ type: 'SET_PAGE', payload: page - 1 })}><i className="fa-solid fa-chevron-left"></i></button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const n = page <= 4 ? i + 1 : page + i - 3;
            if (n < 1 || n > totalPages) return null;
            return <button key={n} className={n === page ? 'active' : ''} onClick={() => dispatchFilter({ type: 'SET_PAGE', payload: n })}>{n}</button>;
          })}
          <button disabled={page === totalPages} onClick={() => dispatchFilter({ type: 'SET_PAGE', payload: page + 1 })}><i className="fa-solid fa-chevron-right"></i></button>
        </div>
      )}
    </div>
  );
}