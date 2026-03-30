import React, { useState, useMemo } from 'react';
import playersData from '../../data/players_updated.json';
import { enrichPlayers } from '../../utils/playerScore.js';
import { formatBRL } from '../../utils/formatters.js';
import './Relatorios.css';

const allPlayers = enrichPlayers(playersData.athletes);

// Simulated teams and match data
const TEAMS_BR = [
  'Flamengo', 'Palmeiras', 'Grêmio', 'São Paulo', 'Corinthians',
  'Atlético-MG', 'Internacional', 'Fluminense', 'Botafogo', 'Santos',
  'Bahia', 'Fortaleza', 'Athletico-PR', 'Cruzeiro', 'Vasco',
  'Red Bull Bragantino', 'Cuiabá', 'Goiás', 'América-MG', 'Coritiba',
];

function generateMatches(players) {
  const matches = [];
  const usedTeams = new Set();

  for (let i = 0; i < 6; i++) {
    let homeTeam, awayTeam;
    do {
      homeTeam = TEAMS_BR[Math.floor(Math.random() * TEAMS_BR.length)];
      awayTeam = TEAMS_BR[Math.floor(Math.random() * TEAMS_BR.length)];
    } while (homeTeam === awayTeam || usedTeams.has(`${homeTeam}-${awayTeam}`));
    usedTeams.add(`${homeTeam}-${awayTeam}`);

    const matchPlayers = players
      .filter(p => p.team === homeTeam || p.team === awayTeam)
      .slice(0, 10);

    // If not enough players from those teams, grab random ones
    const remaining = matchPlayers.length < 4
      ? [...matchPlayers, ...players.sort(() => Math.random() - 0.5).slice(0, 4 - matchPlayers.length)]
      : matchPlayers;

    const mvp = remaining.sort((a, b) => b.score - a.score)[0];
    const homeGoals = Math.floor(Math.random() * 4);
    const awayGoals = Math.floor(Math.random() * 4);

    const date = new Date();
    date.setDate(date.getDate() - i * 3 - Math.floor(Math.random() * 3));

    matches.push({
      id: i,
      homeTeam,
      awayTeam,
      homeGoals,
      awayGoals,
      date: date.toLocaleDateString('pt-BR'),
      mvp,
      highlights: remaining.slice(0, 3).map(p => ({
        player: p,
        rating: (7 + Math.random() * 3).toFixed(1),
        goals: Math.floor(Math.random() * 3),
        assists: Math.floor(Math.random() * 3),
      })),
    });
  }
  return matches;
}

export default function Relatorios() {
  const [matches, setMatches] = useState(() => generateMatches(allPlayers));
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setMatches(generateMatches(allPlayers));
      setLoading(false);
      setExpanded(null);
    }, 800);
  };

  return (
    <div className="relatorios-page">
      <div className="relatorios-header">
        <div>
          <h1><i className="fa-solid fa-file-lines"></i> Relatórios de Partidas</h1>
          <p>Análise de desempenho das últimas partidas com destaques por jogador</p>
        </div>
        <button className="btn-gerar-relatorio" onClick={handleGenerate} disabled={loading}>
          {loading
            ? <><div className="spinner"></div> Gerando...</>
            : <><i className="fa-solid fa-rotate"></i> Gerar Novos Relatórios</>
          }
        </button>
      </div>

      <div className="matches-list">
        {matches.map(match => (
          <div className={`match-card ${expanded === match.id ? 'expanded' : ''}`} key={match.id}>
            <div className="match-header" onClick={() => setExpanded(prev => prev === match.id ? null : match.id)}>
              <div className="match-date">
                <i className="fa-solid fa-calendar"></i> {match.date}
              </div>
              <div className="match-score">
                <span className="match-team">{match.homeTeam}</span>
                <span className="match-result">{match.homeGoals} × {match.awayGoals}</span>
                <span className="match-team">{match.awayTeam}</span>
              </div>
              <div className="match-mvp">
                <span className="mvp-label">MVP</span>
                <span className="mvp-name">{match.mvp?.name || '—'}</span>
                <span className="mvp-score">Score {match.mvp?.score || '—'}</span>
              </div>
              <i className={`fa-solid ${expanded === match.id ? 'fa-chevron-up' : 'fa-chevron-down'} match-toggle`}></i>
            </div>

            {expanded === match.id && (
              <div className="match-details">
                <h4>Destaques da Partida</h4>
                <div className="highlights-grid">
                  {match.highlights.map((h, i) => (
                    <div className="highlight-card" key={i}>
                      <div className="highlight-rank">#{i + 1}</div>
                      <div className="highlight-player">
                        <img
                          src={h.player.profileImageURL}
                          alt={h.player.name}
                          className="highlight-avatar"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                        <div>
                          <div className="highlight-name">{h.player.name}</div>
                          <div className="highlight-team">{h.player.team}</div>
                        </div>
                      </div>
                      <div className="highlight-stats">
                        <div><span>Rating</span><strong style={{color: parseFloat(h.rating) >= 8.5 ? '#14b8a6' : '#f59e0b'}}>{h.rating}</strong></div>
                        <div><span>Gols</span><strong>{h.goals}</strong></div>
                        <div><span>Assists</span><strong>{h.assists}</strong></div>
                        <div><span>Valor</span><strong>{formatBRL(h.player.marketValue)}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
