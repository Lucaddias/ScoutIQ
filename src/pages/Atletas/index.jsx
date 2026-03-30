import React, { useState, useMemo } from 'react';
import PlayerCard from '../../components/PlayerCard.jsx';
import playersData from '../../data/players_updated.json';
import { enrichPlayers } from '../../utils/playerScore.js';
import './Atletas.css';

const defaultPlayers = enrichPlayers(playersData.athletes);

const POSITIONS = ['Todos', 'Forward', 'Midfielder', 'Defender', 'Goalkeeper'];
const POS_PT = { Forward: 'Atacante', Midfielder: 'Meia', Defender: 'Zagueiro', Goalkeeper: 'Goleiro' };
const PAGE_SIZE = 12;

export default function Atletas({ players = defaultPlayers, onPlayerClick, initialPosition }) {
  const [search,   setSearch]   = useState('');
  const [position, setPosition] = useState(initialPosition || 'Todos');
  const [team,     setTeam]     = useState('Todos');
  const [sortBy,   setSortBy]   = useState('score');
  const [page,     setPage]     = useState(1);

  const teams = useMemo(() => {
    const t = new Set(players.map(p => p.team).filter(Boolean));
    return ['Todos', ...Array.from(t).sort()];
  }, [players]);

  const filtered = useMemo(() => {
    let list = players;
    if (search)            list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (position !== 'Todos') list = list.filter(p => p.position === position);
    if (team !== 'Todos')  list = list.filter(p => p.team === team);
    list = [...list].sort((a, b) =>
      sortBy === 'score'       ? b.score - a.score :
      sortBy === 'marketValue' ? b.marketValue - a.marketValue :
      sortBy === 'salary'      ? b.monthlySalary - a.monthlySalary :
      a.name.localeCompare(b.name)
    );
    return list;
  }, [players, search, position, team, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visible    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage  = () => setPage(1);

  return (
    <div className="atletas-page">
      <div className="atletas-header">
        <div>
          <h1>Atletas</h1>
          <p>{filtered.length} atletas encontrados</p>
        </div>
      </div>

      <div className="atletas-filters">
        <div className="filter-search">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }}
          />
        </div>

        <select className="filter-select" value={position} onChange={e => { setPosition(e.target.value); resetPage(); }}>
          {POSITIONS.map(p => <option key={p} value={p}>{p === 'Todos' ? 'Todas posições' : POS_PT[p]}</option>)}
        </select>

        <select className="filter-select" value={team} onChange={e => { setTeam(e.target.value); resetPage(); }}>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="score">Score ↓</option>
          <option value="marketValue">Valor ↓</option>
          <option value="salary">Salário ↓</option>
          <option value="name">Nome A–Z</option>
        </select>
      </div>

      <div className="atletas-list">
        {visible.map(p => <PlayerCard key={p.id} player={p} onClick={onPlayerClick} />)}
        {visible.length === 0 && (
          <div className="atletas-empty">
            <i className="fa-solid fa-user-slash"></i>
            <p>Nenhum atleta encontrado para os filtros selecionados.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const n = page <= 4 ? i + 1 : page + i - 3;
            if (n < 1 || n > totalPages) return null;
            return (
              <button key={n} className={n === page ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>
            );
          })}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      )}
    </div>
  );
}
