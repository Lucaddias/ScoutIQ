import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { salvarProposta } from '../../store/apoioSlice';
import { enrichPlayers } from '../../utils/playerScore.js';
import { formatBRL, parseBR } from '../../utils/formatters.js';
import { useAtletas } from '../../hooks/useAtletas.js';
import { LoadingState, ErrorState } from '../../components/FetchState.jsx';
import './Contratos.css';

const formatBRNum = (v) => Number(v).toLocaleString('pt-BR');

/*
 * generateProposal — gera automaticamente uma proposta de contrato para o jogador.
 * Os valores são calculados com variação aleatória sobre o valor de mercado e salário:
 *   - Valor da proposta: 85% a 95% do valor de mercado (simula margem de negociação)
 *   - Salário proposto:  90% a 110% do salário atual
 *   - Duração: sorteada entre 2, 3 ou 4 anos
 *   - Bônus de performance: fixado em 5% do valor de mercado
 */
function generateProposal(player) {
  const factor = 0.85 + Math.random() * 0.10;
  const salaryFactor = 0.90 + Math.random() * 0.20;
  const years = [2, 3, 4][Math.floor(Math.random() * 3)];
  return {
    proposedValue: Math.round(player.marketValue * factor),
    proposedSalary: Math.round(player.monthlySalary * salaryFactor),
    duration: years,
    bonusPerformance: Math.round(player.marketValue * 0.05),
  };
}

export default function Contratos() {
  const { atletas: jogadoresDoBanco, loading, status, error, retry } = useAtletas();
  const dispatch = useDispatch();

  const allPlayers = useMemo(() => enrichPlayers(jogadoresDoBanco), [jogadoresDoBanco]);
  
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [toast, setToast] = useState(null);

  /* useMemo: filtra os jogadores pelo nome digitado e limita a 20 resultados para performance. */
  const filtered = useMemo(() => {
    if (!search) return allPlayers.slice(0, 20);
    return allPlayers.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 20);
  }, [search, allPlayers]);

  const handleSelect = (player) => {
    setSelectedPlayer(player);
    setProposal(generateProposal(player));
    setEditing(false);
    setDraft(null);
  };

  const handleSendProposal = async () => {
    try {
      await dispatch(salvarProposta({ player: selectedPlayer, proposal })).unwrap();
      setToast(`✅ Proposta enviada e salva para ${selectedPlayer.name}!`);
    } catch (err) {
      setToast(`❌ Erro ao salvar proposta: ${err.message || 'Tente novamente.'}`);
    }
    setTimeout(() => setToast(null), 3500);
  };

  const handleNewProposal = () => {
    const p = generateProposal(selectedPlayer);
    setProposal(p);
    setEditing(false);
    setDraft(null);
  };

  const handleStartEdit = () => {
    setDraft({
      proposedValue:    formatBRNum(proposal.proposedValue),
      proposedSalary:   formatBRNum(proposal.proposedSalary),
      duration:         proposal.duration,
      bonusPerformance: formatBRNum(proposal.bonusPerformance),
      clausula:         proposal.clausula ? formatBRNum(proposal.clausula) : '',
      observacoes:      proposal.observacoes || '',
    });
    setEditing(true);
  };

  const handleSaveDraft = () => {
    setProposal({
      proposedValue:    parseBR(draft.proposedValue),
      proposedSalary:   parseBR(draft.proposedSalary),
      duration:         Number(draft.duration),
      bonusPerformance: parseBR(draft.bonusPerformance),
      clausula:         draft.clausula ? parseBR(draft.clausula) : 0,
      observacoes:      draft.observacoes,
    });
    setEditing(false);
    setDraft(null);
    setToast('Proposta atualizada!');
    setTimeout(() => setToast(null), 2500);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setDraft(null);
  };

  const setDraftField = (field, rawValue) => {
    const isMonetary = ['proposedValue', 'proposedSalary', 'bonusPerformance', 'clausula'].includes(field);
    if (isMonetary) {
      const digits = rawValue.replace(/[^\d]/g, '');
      setDraft(d => ({ ...d, [field]: digits ? Number(digits).toLocaleString('pt-BR') : '' }));
    } else {
      setDraft(d => ({ ...d, [field]: rawValue }));
    }
  };

  if (loading) return <LoadingState message="Carregando atletas..." />;
  if (status === 'failed') return <ErrorState error={error} onRetry={retry} />;

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

              {/* ── MODO VISUALIZAÇÃO ── */}
              {!editing ? (
                <>
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
                    {proposal.clausula > 0 && (
                      <div className="term-item">
                        <i className="fa-solid fa-gavel"></i>
                        <div><span>Cláusula Rescisória</span><strong>{formatBRL(proposal.clausula)}</strong></div>
                      </div>
                    )}
                    <div className="term-item">
                      <i className="fa-solid fa-coins"></i>
                      <div><span>Custo Total Estimado</span><strong>{formatBRL(proposal.proposedValue + proposal.proposedSalary * 12 * proposal.duration)}</strong></div>
                    </div>
                  </div>

                  {proposal.observacoes && (
                    <div className="proposal-obs">
                      <i className="fa-solid fa-note-sticky"></i>
                      <p>{proposal.observacoes}</p>
                    </div>
                  )}

                  <div className="proposal-actions">
                    <button className="btn-send-proposal" onClick={handleSendProposal}>
                      <i className="fa-solid fa-paper-plane"></i> Enviar Proposta
                    </button>
                    <button className="btn-edit-proposal" onClick={handleStartEdit}>
                      <i className="fa-solid fa-pen"></i> Editar
                    </button>
                    <button className="btn-regen-proposal" onClick={handleNewProposal}>
                      <i className="fa-solid fa-rotate"></i> Gerar Nova
                    </button>
                  </div>
                </>
              ) : (
                /* ── MODO EDIÇÃO ── */
                <div className="proposal-edit-form">
                  <h4 className="edit-section-title"><i className="fa-solid fa-pen-to-square"></i> Editar Proposta</h4>

                  <div className="edit-grid">
                    <div className="edit-field">
                      <label>Valor da Proposta (R$)</label>
                      <input
                        inputMode="numeric"
                        value={draft.proposedValue}
                        onChange={e => setDraftField('proposedValue', e.target.value)}
                        className="edit-input"
                        placeholder="0"
                      />
                    </div>
                    <div className="edit-field">
                      <label>Salário Mensal (R$)</label>
                      <input
                        inputMode="numeric"
                        value={draft.proposedSalary}
                        onChange={e => setDraftField('proposedSalary', e.target.value)}
                        className="edit-input"
                        placeholder="0"
                      />
                    </div>
                    <div className="edit-field">
                      <label>Duração (anos)</label>
                      <select
                        value={draft.duration}
                        onChange={e => setDraftField('duration', e.target.value)}
                        className="edit-input"
                      >
                        {[1,2,3,4,5].map(y => <option key={y} value={y}>{y} ano{y > 1 ? 's' : ''}</option>)}
                      </select>
                    </div>
                    <div className="edit-field">
                      <label>Bônus por Performance (R$)</label>
                      <input
                        inputMode="numeric"
                        value={draft.bonusPerformance}
                        onChange={e => setDraftField('bonusPerformance', e.target.value)}
                        className="edit-input"
                        placeholder="0"
                      />
                    </div>
                    <div className="edit-field">
                      <label>Cláusula Rescisória (R$) <span className="edit-optional">opcional</span></label>
                      <input
                        inputMode="numeric"
                        value={draft.clausula}
                        onChange={e => setDraftField('clausula', e.target.value)}
                        className="edit-input"
                        placeholder="0"
                      />
                    </div>
                    <div className="edit-field edit-field-full">
                      <label>Observações <span className="edit-optional">opcional</span></label>
                      <textarea
                        value={draft.observacoes}
                        onChange={e => setDraftField('observacoes', e.target.value)}
                        className="edit-input edit-textarea"
                        placeholder="Cláusulas especiais, condições, etc."
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="edit-total-preview">
                    <i className="fa-solid fa-coins"></i>
                    <span>Custo Total Estimado:</span>
                    <strong>{formatBRL(parseBR(draft.proposedValue) + parseBR(draft.proposedSalary) * 12 * Number(draft.duration))}</strong>
                  </div>

                  <div className="proposal-actions">
                    <button className="btn-send-proposal" onClick={handleSaveDraft}>
                      <i className="fa-solid fa-check"></i> Salvar Alterações
                    </button>
                    <button className="btn-regen-proposal" onClick={handleCancelEdit}>
                      <i className="fa-solid fa-xmark"></i> Cancelar
                    </button>
                  </div>
                </div>
              )}
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
