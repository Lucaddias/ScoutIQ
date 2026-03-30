import React, { useState, useMemo } from 'react';
import Sidebar from '../../components/Sidebar.jsx';
import PlayerCard from '../../components/PlayerCard.jsx';
import PlayerModal from '../../components/PlayerModal.jsx';
import Atletas from '../Atletas/index.jsx';
import Estatisticas from '../Estatisticas/index.jsx';
import Relatorios from '../Relatorios/index.jsx';
import Contratos from '../Contratos/index.jsx';
import Perfil from '../Perfil/index.jsx';
import AdminPage from '../Admin/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import playersData from '../../data/players_updated.json';
import { enrichPlayers } from '../../utils/playerScore.js';
import { gerarCenarios } from '../../utils/algorithm.js';
import { formatBRL, clamp } from '../../utils/formatters.js';
import './Dashboard.css';

// Enrich all players with computed scores once
const allPlayers = enrichPlayers(playersData.athletes);

// Validation helpers
const validateForm = (orcamento, tetoSalarial, vagas) => {
  const errors = {};
  if (!orcamento || orcamento <= 0)          errors.orcamento    = 'Informe um orçamento válido (> 0).';
  if (!tetoSalarial || tetoSalarial <= 0)    errors.tetoSalarial = 'Informe um teto salarial válido (> 0).';
  if (!vagas || vagas < 1 || vagas > 15)     errors.vagas        = 'Vagas deve estar entre 1 e 15.';
  return errors;
};

const SCENARIO_META = {
  1: { label: 'Máxima Performance', icon: 'fa-trophy',      color: '#f59e0b', desc: 'Maximiza o score de desempenho ponderado pelas suas prioridades de posição.' },
  2: { label: 'Equilíbrio (ROI)',   icon: 'fa-chart-line',  color: '#14b8a6', desc: 'Maximiza o retorno sobre investimento — melhor desempenho por real gasto.' },
  3: { label: 'Conservador (Caixa)', icon: 'fa-piggy-bank', color: '#8b5cf6', desc: 'Menor custo total possível mantendo um nível mínimo de qualidade.' },
};

const Dashboard = ({ page, onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'user';

  // Form state
  const [orcamento,    setOrcamento]    = useState(5000000);
  const [tetoSalarial, setTetoSalarial] = useState(400000);
  const [vagas,        setVagas]        = useState(3);
  const [prioridades,  setPrioridades]  = useState({
    Forward:    'Alta (3)',
    Midfielder: 'Média (2)',
    Defender:   'Baixa (1)',
    Goalkeeper: 'Baixa (1)',
  });

  // Result state
  const [cenarios,  setCenarios]  = useState(null);
  const [abaAtiva,  setAbaAtiva]  = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [errors,    setErrors]    = useState({});
  const [noResult,  setNoResult]  = useState(false);

  // Modal state
  const [modalPlayer, setModalPlayer] = useState(null);

  const setPrioridade = (pos, val) =>
    setPrioridades(prev => ({ ...prev, [pos]: val }));

  const handleGerar = () => {
    const errs = validateForm(orcamento, tetoSalarial, vagas);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setNoResult(false);

    setTimeout(() => {
      const result = gerarCenarios(allPlayers, {
        orcamento,
        tetoSalarial,
        vagas,
        prioridades,
      });
      setCenarios(result);
      setAbaAtiva(1);
      setLoading(false);
      if (result.cenario1.length === 0) setNoResult(true);
    }, 600);
  };

  const pacoteAtivo = cenarios
    ? cenarios[`cenario${abaAtiva}`] ?? []
    : [];

  const investimentoTotal = pacoteAtivo.reduce((a, p) => a + p.marketValue, 0);
  const folhaCalculada    = pacoteAtivo.reduce((a, p) => a + p.monthlySalary, 0);
  const scoreMedio        = pacoteAtivo.length > 0
    ? (pacoteAtivo.reduce((a, p) => a + p.score, 0) / pacoteAtivo.length).toFixed(0)
    : '—';

  // Protected route helper
  const canAccess = (required) => required.includes(role);

  // Render inner page for sidebar nav
  if (page === 'atletas') return (
    <>
      <Sidebar page={page} onNavigate={onNavigate} />
      <div className="main-with-sidebar">
        <Atletas onPlayerClick={setModalPlayer} />
      </div>
      <PlayerModal player={modalPlayer} onClose={() => setModalPlayer(null)} />
    </>
  );
  if (page === 'estatisticas') return (
    <>
      <Sidebar page={page} onNavigate={onNavigate} />
      <div className="main-with-sidebar">
        <Estatisticas players={allPlayers} onPlayerClick={setModalPlayer} />
      </div>
      <PlayerModal player={modalPlayer} onClose={() => setModalPlayer(null)} />
    </>
  );
  if (page === 'relatorios' && canAccess(['scout', 'admin'])) return (
    <>
      <Sidebar page={page} onNavigate={onNavigate} />
      <div className="main-with-sidebar">
        <Relatorios />
      </div>
    </>
  );
  if (page === 'contratos' && canAccess(['scout', 'admin'])) return (
    <>
      <Sidebar page={page} onNavigate={onNavigate} />
      <div className="main-with-sidebar">
        <Contratos />
      </div>
    </>
  );
  if (page === 'perfil') return (
    <>
      <Sidebar page={page} onNavigate={onNavigate} />
      <div className="main-with-sidebar">
        <Perfil />
      </div>
    </>
  );
  if (page === 'admin' && canAccess(['admin'])) return (
    <>
      <Sidebar page={page} onNavigate={onNavigate} />
      <div className="main-with-sidebar">
        <AdminPage />
      </div>
    </>
  );

  return (
    <div className="dashboard-page">
      <Sidebar page={page} onNavigate={onNavigate} />

      <main className="main-content">
        <div className="dash-header">
          <div>
            <h1>Sistema de Apoio à Decisão</h1>
            <p>Simule cenários e otimize seu orçamento de transferências com inteligência de dados.</p>
          </div>
          <div className="header-badge">
            <i className="fa-solid fa-database"></i>
            {allPlayers.length} atletas · Série A 2025
          </div>
        </div>

        <div className="dash-grid">
          {/* ── LEFT PANEL — Config ── */}
          <div className="card">
            <h3><i className="fa-solid fa-sliders"></i> Configurar Janela de Mercado</h3>

            <div className="form-group">
              <label>Orçamento Total Disponível (R$)</label>
              <input
                type="number"
                className={`form-control ${errors.orcamento ? 'input-error' : ''}`}
                value={orcamento}
                min={1}
                onChange={e => { setOrcamento(Number(e.target.value)); setErrors(p => ({...p, orcamento: null})); }}
              />
              {errors.orcamento && <span className="field-error">{errors.orcamento}</span>}
            </div>

            <div className="form-group">
              <label>Teto Salarial Mensal (R$)</label>
              <input
                type="number"
                className={`form-control ${errors.tetoSalarial ? 'input-error' : ''}`}
                value={tetoSalarial}
                min={1}
                onChange={e => { setTetoSalarial(Number(e.target.value)); setErrors(p => ({...p, tetoSalarial: null})); }}
              />
              {errors.tetoSalarial && <span className="field-error">{errors.tetoSalarial}</span>}
            </div>

            <div className="form-group">
              <label>Número de Vagas <span className="label-hint">(1–15)</span></label>
              <input
                type="number"
                className={`form-control ${errors.vagas ? 'input-error' : ''}`}
                value={vagas}
                min={1} max={15}
                onChange={e => { setVagas(clamp(Number(e.target.value), 1, 15)); setErrors(p => ({...p, vagas: null})); }}
              />
              {errors.vagas && <span className="field-error">{errors.vagas}</span>}
            </div>

            <div className="priority-section">
              <p className="priority-title">Prioridade por Posição</p>
              {[
                { pos: 'Forward',    label: 'Atacante (ATA)' },
                { pos: 'Midfielder', label: 'Meia (MEI)' },
                { pos: 'Defender',   label: 'Zagueiro (ZAG)' },
                { pos: 'Goalkeeper', label: 'Goleiro (GOL)' },
              ].map(({ pos, label }) => (
                <div className="priority-row" key={pos}>
                  <span className="priority-pos">{label}</span>
                  <select
                    className="form-control priority-select"
                    value={prioridades[pos]}
                    onChange={e => setPrioridade(pos, e.target.value)}
                  >
                    <option>Alta (3)</option>
                    <option>Média (2)</option>
                    <option>Baixa (1)</option>
                  </select>
                </div>
              ))}
            </div>

            <button className="btn-gerar" onClick={handleGerar} disabled={loading}>
              {loading
                ? <><div className="spinner"></div> Calculando...</>
                : <><i className="fa-solid fa-bolt"></i> Gerar Cenários</>
              }
            </button>
          </div>

          {/* ── RIGHT PANEL — Results ── */}
          <div className="card results-card">
            <div className="scenario-tabs">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  className={`tab ${abaAtiva === n ? 'active' : ''} ${!cenarios ? 'disabled' : ''}`}
                  onClick={() => cenarios && setAbaAtiva(n)}
                >
                  <i className={`fa-solid ${SCENARIO_META[n].icon}`} style={{ color: SCENARIO_META[n].color }}></i>
                  <span>Cenário {n}</span>
                  <small>{SCENARIO_META[n].label}</small>
                </button>
              ))}
            </div>

            {loading && (
              <div className="loading-state">
                <div className="spinner large"></div>
                <p>Analisando {allPlayers.length} atletas...</p>
              </div>
            )}

            {!loading && noResult && (
              <div className="empty-state error">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <h4>Orçamento insuficiente</h4>
                <p>Nenhum conjunto de jogadores encontrado dentro dos critérios. Tente aumentar o orçamento ou o teto salarial.</p>
              </div>
            )}

            {!loading && !cenarios && !noResult && (
              <div className="empty-state">
                <i className="fa-solid fa-brain"></i>
                <h4>Pronto para calcular</h4>
                <p>Configure os parâmetros ao lado e clique em <strong>Gerar Cenários</strong> para ver as sugestões de contratação.</p>
              </div>
            )}

            {!loading && cenarios && pacoteAtivo.length > 0 && (
              <>
                <div className="scenario-label">
                  <i className={`fa-solid ${SCENARIO_META[abaAtiva].icon}`} style={{ color: SCENARIO_META[abaAtiva].color }}></i>
                  Cenário {abaAtiva} — {SCENARIO_META[abaAtiva].label}
                </div>

                <div className="results-metrics">
                  <div className="metric-box">
                    <span>Investimento</span>
                    <strong>{formatBRL(investimentoTotal)}</strong>
                  </div>
                  <div className="metric-box">
                    <span>Folha Mensal</span>
                    <strong>{formatBRL(folhaCalculada)}</strong>
                  </div>
                  <div className="metric-box">
                    <span>Score Médio</span>
                    <strong className="score-value">{scoreMedio}</strong>
                  </div>
                  <div className="metric-box">
                    <span>Jogadores</span>
                    <strong>{pacoteAtivo.length}</strong>
                  </div>
                </div>

                <div className="player-list">
                  {pacoteAtivo.map(player => (
                    <PlayerCard key={player.id} player={player} onClick={setModalPlayer} />
                  ))}
                </div>

                <div className="algo-justification">
                  <div className="algo-icon"><i className="fa-solid fa-microchip-ai"></i></div>
                  <div>
                    <strong>Justificativa do Algoritmo</strong>
                    <p>{SCENARIO_META[abaAtiva].desc} Orçamento usado: {formatBRL(investimentoTotal)} de {formatBRL(orcamento)} disponíveis.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <PlayerModal player={modalPlayer} onClose={() => setModalPlayer(null)} />
    </div>
  );
};

export default Dashboard;
