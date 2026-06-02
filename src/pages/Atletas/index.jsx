import React, { useState, useMemo, useReducer, useEffect } from 'react';
import PlayerCard from '../../components/PlayerCard.jsx';
import { enrichPlayers } from '../../utils/playerScore.js';
import './Atletas.css';

/*
 * HOOKS DO REDUX E NOVOS THUNKS ASSÍNCRONOS
 */
import { useSelector, useDispatch } from 'react-redux';
import { selectAllAtletas } from '../../store/atletasSlice';
import { fetchAtletas, criarAtleta } from '../../store/atletasSlice';

const POSITIONS = ['Todos', 'Forward', 'Midfielder', 'Defender', 'Goalkeeper'];
const POS_PT = { Forward: 'Atacante', Midfielder: 'Meia', Defender: 'Zagueiro', Goalkeeper: 'Goleiro' };
const PAGE_SIZE = 12;

const TIMES_BR = [
  'América-MG', 'Athletico-PR', 'Atlético-GO', 'Atlético-MG', 'Avaí', 'Bahia',
  'Botafogo', 'Ceará', 'Chapecoense', 'Corinthians', 'Coritiba', 'Cuiabá',
  'Cruzeiro', 'Flamengo', 'Fluminense', 'Fortaleza', 'Goiás', 'Grêmio',
  'Internacional', 'Juventude', 'Mirassol', 'Palmeiras', 'Red Bull Bragantino',
  'Remo', 'Santos', 'São Paulo', 'Vasco da Gama', 'Vitória',
];

const inputStyle = {
  padding: '10px 12px', borderRadius: '6px',
  border: '1px solid #334155', background: '#0f172a',
  color: 'white', width: '100%', boxSizing: 'border-box', fontSize: '14px',
};

const labelStyle = {
  fontSize: '11px', color: '#94a3b8', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

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
 const jogadoresDoBanco = useSelector(selectAllAtletas);
 const loading = useSelector((state) => state.atletas.loading);
  const dispatch = useDispatch();

  // O GATILHO INICIAL: Busca dados frescos do JSON Server sempre que a tela abre
  useEffect(() => {
    dispatch(fetchAtletas());
  }, [dispatch]);

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
  const [formulario, setFormulario] = useState({ name: '', position: 'Forward', team: '', marketValue: '', monthlySalary: '' });

  const setFormField = (field, rawValue) => {
    const isMonetary = field === 'marketValue' || field === 'monthlySalary';
    if (isMonetary) {
      const digits = rawValue.replace(/[^\d]/g, '');
      setFormulario(f => ({ ...f, [field]: digits ? Number(digits).toLocaleString('pt-BR') : '' }));
    } else {
      setFormulario(f => ({ ...f, [field]: rawValue }));
    }
  };

  const parseBR = (str) => Number(String(str).replace(/\./g, '').replace(',', '.')) || 0;


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

  /* ── CREATE ────────────────────────────────────────────────────────────── */
  const handleSalvar = (e) => {
    e.preventDefault();
    const novoJogador = {
      name: formulario.name,
      position: formulario.position,
      team: formulario.team,
      marketValue: parseBR(formulario.marketValue),
      monthlySalary: parseBR(formulario.monthlySalary),
      age: 25, // Default age
      profileImageURL: '',
      statistics: { goals: 0, assists: 0 } // Fix column name from 'stats' to 'statistics'
    };
    dispatch(criarAtleta(novoJogador));
    setModalAberto(false);
    setFormulario({ name: '', position: 'Forward', team: '', marketValue: '', monthlySalary: '' });
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', width: '420px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <h3 style={{ marginTop: 0, color: 'white', marginBottom: '20px' }}>Cadastrar Atleta</h3>
            <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Nome</label>
                <input required placeholder="Nome do Jogador" value={formulario.name} onChange={e => setFormField('name', e.target.value)} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Posição</label>
                <select value={formulario.position} onChange={e => setFormField('position', e.target.value)} style={inputStyle}>
                  {POSITIONS.filter(p => p !== 'Todos').map(p => <option key={p} value={p}>{POS_PT[p]}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Clube</label>
                <input
                  list="times-br-novo"
                  required
                  placeholder="Digite ou selecione o clube"
                  value={formulario.team}
                  onChange={e => setFormField('team', e.target.value)}
                  style={inputStyle}
                />
                <datalist id="times-br-novo">
                  {TIMES_BR.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Valor de Mercado (R$)</label>
                <input
                  inputMode="numeric"
                  required
                  placeholder="Ex: 1.000.000"
                  value={formulario.marketValue}
                  onChange={e => setFormField('marketValue', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Salário Mensal (R$)</label>
                <input
                  inputMode="numeric"
                  required
                  placeholder="Ex: 50.000"
                  value={formulario.monthlySalary}
                  onChange={e => setFormField('monthlySalary', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" style={{ flex: 1, background: '#10b981', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Salvar</button>
                <button type="button" onClick={() => setModalAberto(false)} style={{ flex: 1, background: '#334155', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
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


      {/* FEEDBACK DE LOADING OU LISTA DE JOGADORES */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#94a3b8' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '40px', marginBottom: '15px', color: '#10b981' }}></i>
          <h2>Processando dados...</h2>
        </div>
      ) : (
        <div className="atletas-list">
          {visible.map(p => (
            <PlayerCard key={p.id} player={p} onClick={onPlayerClick} />
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