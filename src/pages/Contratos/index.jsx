import React, { useState, useMemo } from 'react';
import playersData from '../../data/players_updated.json';
import { enrichPlayers } from '../../utils/playerScore.js';
import { formatBRL } from '../../utils/formatters.js';
import './Contratos.css';

const allPlayers = enrichPlayers(playersData.athletes);

function generateProposal(player) {
  const factor = 0.85 + Math.random() * 0.10; // 85–95% of market value
  const salaryFactor = 0.90 + Math.random() * 0.20; // 90–110%
  const years = [2, 3, 4][Math.floor(Math.random() * 3)];
  return {
    proposedValue: Math.round(player.marketValue * factor),
    proposedSalary: Math.round(player.monthlySalary * salaryFactor),
    duration: years,
    bonusPerformance: Math.round(player.marketValue * 0.05),
  };
}

export default function Contratos() {
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [toast, setToast] = useState(null);

  const filtered = useMemo(() => {
    if (!search) return allPlayers.slice(0, 20);
    return allPlayers.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 20);
  }, [search]);

  const handleSelect = (player) => {
    setSelectedPlayer(player);
    setProposal(generateProposal(player));
  };

  const handleSendProposal = () => {
    setToast(`Proposta enviada para ${selectedPlayer.name}!`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleNewProposal = () => {
    setProposal(generateProposal(selectedPlayer));
  };

  return (
    <div className="contratos-page">
      <div className="contratos-header">
        <div>
          <h1><i className="fa-solid fa-file-signature"></i> Propostas de Contrato</h1>
          <p>Gere propostas automáticas baseadas no valor de mercado e condição salarial</p>
        </div>
      </div>

      <div className="contratos-grid">
        {/* Player Selection */}
        <div className="contratos-list-panel">
          <div className="contratos-search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Buscar jogador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="contratos-player-list">
            {filtered.map(player => (
              <div
                key={player.id}
                className={`contrato-player-row ${selectedPlayer?.id === player.id ? 'selected' : ''}`}
                onClick={() => handleSelect(player)}
              >
                <img
                  src={player.profileImageURL}
                  alt={player.name}
                  className="contrato-avatar"
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div className="contrato-player-info">
                  <div className="contrato-name">{player.name}</div>
                  <div className="contrato-meta">{player.team} · Score {player.score}</div>
                </div>
                <div className="contrato-value">{formatBRL(player.marketValue)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Proposal */}
        <div className="proposal-panel">
          {!selectedPlayer ? (
            <div className="proposal-empty">
              <i className="fa-solid fa-file-contract"></i>
              <h3>Selecione um jogador</h3>
              <p>Escolha um atleta na lista ao lado para gerar uma proposta automática de contrato.</p>
            </div>
          ) : (
            <div className="proposal-document">
              <div className="proposal-doc-header">
                <div className="proposal-stamp">
                  <i className="fa-solid fa-stamp"></i>
                </div>
                <h2>Proposta de Contrato</h2>
                <p className="proposal-subtitle">ScoutIQ — Geração Automática</p>
              </div>

              <div className="proposal-player-section">
                <img
                  src={selectedPlayer.profileImageURL}
                  alt={selectedPlayer.name}
                  className="proposal-player-img"
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div>
                  <h3>{selectedPlayer.name}</h3>
                  <p>{selectedPlayer.team} · {selectedPlayer.position}</p>
                </div>
                <div className="proposal-player-score">
                  <span>Score</span>
                  <strong>{selectedPlayer.score}</strong>
                </div>
              </div>

              <div className="proposal-comparison">
                <div className="comparison-col">
                  <h4>Valores Atuais</h4>
                  <div className="comp-row"><span>Valor de Mercado</span><strong>{formatBRL(selectedPlayer.marketValue)}</strong></div>
                  <div className="comp-row"><span>Salário Mensal</span><strong>{formatBRL(selectedPlayer.monthlySalary)}/mês</strong></div>
                </div>
                <div className="comparison-arrow"><i className="fa-solid fa-arrow-right"></i></div>
                <div className="comparison-col proposed">
                  <h4>Proposta Gerada</h4>
                  <div className="comp-row"><span>Valor da Proposta</span><strong>{formatBRL(proposal.proposedValue)}</strong></div>
                  <div className="comp-row"><span>Salário Proposto</span><strong>{formatBRL(proposal.proposedSalary)}/mês</strong></div>
                </div>
              </div>

              <div className="proposal-terms">
                <div className="term-item">
                  <i className="fa-solid fa-calendar"></i>
                  <div><span>Duração</span><strong>{proposal.duration} anos</strong></div>
                </div>
                <div className="term-item">
                  <i className="fa-solid fa-trophy"></i>
                  <div><span>Bônus por Performance</span><strong>{formatBRL(proposal.bonusPerformance)}</strong></div>
                </div>
                <div className="term-item">
                  <i className="fa-solid fa-coins"></i>
                  <div><span>Custo Total Estimado</span><strong>{formatBRL(proposal.proposedValue + proposal.proposedSalary * 12 * proposal.duration)}</strong></div>
                </div>
              </div>

              <div className="proposal-actions">
                <button className="btn-send-proposal" onClick={handleSendProposal}>
                  <i className="fa-solid fa-paper-plane"></i> Enviar Proposta
                </button>
                <button className="btn-regen-proposal" onClick={handleNewProposal}>
                  <i className="fa-solid fa-rotate"></i> Gerar Nova
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-success">
          <i className="fa-solid fa-circle-check"></i>
          {toast}
        </div>
      )}
    </div>
  );
}
