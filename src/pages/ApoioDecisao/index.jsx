import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import PlayerCard from '../../components/PlayerCard.jsx';
import PlayerModal from '../../components/PlayerModal.jsx';
import playersData from '../../data/players_updated.json';
import { enrichPlayers } from '../../utils/playerScore.js';
import { gerarCenarios } from '../../utils/algorithm.js';
import { formatBRL, clamp } from '../../utils/formatters.js';
import './ApoioDecisao.css';

const allPlayers = enrichPlayers(playersData.athletes);

const SCENARIO_META = {
  1: { label: 'Máxima Performance', icon: 'fa-trophy', color: '#f59e0b', desc: 'Maximiza o score de desempenho.' },
  2: { label: 'Equilíbrio (ROI)', icon: 'fa-chart-line', color: '#14b8a6', desc: 'Maximiza o retorno sobre investimento.' },
  3: { label: 'Conservador (Caixa)', icon: 'fa-piggy-bank', color: '#8b5cf6', desc: 'Menor custo total possível mantendo qualidade.' },
};

const POSITIONS = [
  { val: 'ATA', db: 'Forward', label: 'Atacante (ATA)' },
  { val: 'MEI', db: 'Midfielder', label: 'Meia (MEI)' },
  { val: 'ZAG', db: 'Defender', label: 'Zagueiro (ZAG)' },
  { val: 'GOL', db: 'Goalkeeper', label: 'Goleiro (GOL)' },
];

export default function ApoioDecisao({ pacoteSelecionado, setPacoteSelecionado, onNavigate }) {
  const [orcamento, setOrcamento] = useState(5000000);
  const [tetoSalarial, setTetoSalarial] = useState(400000);
  const [vagas, setVagas] = useState(3);

  // Vagas Dinâmicas
  const [listaVagas, setListaVagas] = useState([
    { id: 1, pos: 'ATA', prio: 3 },
    { id: 2, pos: 'MEI', prio: 2 },
    { id: 3, pos: 'ZAG', prio: 1 },
  ]);

  const [cenarios, setCenarios] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [noResult, setNoResult] = useState(false);
  const [modalPlayer, setModalPlayer] = useState(null);

  /*
   * handleVagasChange — sincroniza o número de vagas com a listaVagas.
   * Quando aumenta, adiciona novas vagas com posição e prioridade padrão.
   * Quando diminui, remove as últimas vagas da lista (splice).
   * clamp garante que o valor fique entre 1 e 5.
   */
  const handleVagasChange = (val) => {
    const newVal = clamp(val, 1, 5);
    setVagas(newVal);
    setListaVagas(prev => {
      const novaLoc = [...prev];
      if (newVal > prev.length) {
        for (let i = prev.length; i < newVal; i++) {
          novaLoc.push({ id: Date.now() + i, pos: 'ATA', prio: 2 });
        }
      } else if (newVal < prev.length) {
        novaLoc.splice(newVal);
      }
      return novaLoc;
    });
  };

  /* updateVaga — atualiza um campo específico (posição ou prioridade) de uma vaga pelo índice. */
  const updateVaga = (index, field, val) => {
    setListaVagas(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  /*
   * handleGerar — valida os parâmetros e aciona o algoritmo de cenários.
   * Mapeia as vagas do formato UI (ATA, MEI...) para o formato do banco (Forward, Midfielder...).
   * O setTimeout de 600ms simula latência para exibir o spinner de loading.
   * Chama gerarCenarios (algorithm.js) que retorna os 3 pacotes distintos.
   */
  const handleGerar = () => {
    const errs = {};
    if (!orcamento || orcamento <= 0) errs.orcamento = 'Inválido (> 0).';
    if (!tetoSalarial || tetoSalarial <= 0) errs.tetoSalarial = 'Inválido (> 0).';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setNoResult(false);

    const mappedVagas = listaVagas.map(v => ({
      dbPos: POSITIONS.find(p => p.val === v.pos).db,
      prio: Number(v.prio)
    }));

    setTimeout(() => {
      const result = gerarCenarios(allPlayers, { orcamento, tetoSalarial, vagasArray: mappedVagas });
      setCenarios(result);
      setAbaAtiva(1);
      setLoading(false);
      if (result.cenario1.length === 0) setNoResult(true);
    }, 600);
  };

  /*
   * handleGerarRelatorioOficial — passa o pacote do cenário ativo para o estado global
   * (via setPacoteSelecionado em App.jsx) e navega para a página de Relatórios.
   */
  const handleGerarRelatorioOficial = () => {
    const pacoteAtivo = cenarios[`cenario${abaAtiva}`];
    setPacoteSelecionado(pacoteAtivo);
    onNavigate('relatorios');
  };

  const pacoteAtivo = cenarios ? cenarios[`cenario${abaAtiva}`] ?? [] : [];
  const investimentoTotal = pacoteAtivo.reduce((a, p) => a + p.marketValue, 0);
  const folhaCalculada = pacoteAtivo.reduce((a, p) => a + p.monthlySalary, 0);
  const scoreMedio = pacoteAtivo.length > 0 ? (pacoteAtivo.reduce((a, p) => a + p.score, 0) / pacoteAtivo.length).toFixed(0) : '—';

  return (
    <div className="apoio-decisao-page">
      <div className="dash-header">
        <div>
          <h1>Apoio à Decisão (Simulador)</h1>
          <p>Orçamento e vagas dinâmicas para gerar as melhores contratações.</p>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card form-card">
          <h3><i className="fa-solid fa-sliders"></i> Parâmetros Financeiros</h3>

          <div className="form-group">
            <label>Orçamento (R$)</label>
            <input
              type="text"
              className="form-control"
              value={orcamento ? orcamento.toLocaleString('pt-BR') : ''}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, '');
                setOrcamento(raw ? parseInt(raw, 10) : 0);
              }}
            />
          </div>

          <div className="form-group">
            <label>Teto Salarial Mensal (R$)</label>
            <input
              type="text"
              className="form-control"
              value={tetoSalarial ? tetoSalarial.toLocaleString('pt-BR') : ''}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, '');
                setTetoSalarial(raw ? parseInt(raw, 10) : 0);
              }}
            />
          </div>

          <div className="form-group">
            <label>Nº de Vagas (Máx 5)</label>
            <input type="number" className="form-control" value={vagas} min={1} max={5} onChange={e => handleVagasChange(Number(e.target.value))} />
          </div>

          <div className="vagas-dinamicas">
            <p className="vagas-title">Especificação de Vagas</p>
            {listaVagas.map((v, i) => (
              <div className="vaga-row" key={v.id}>
                <span>Vaga {i + 1}</span>
                <select className="form-control" value={v.pos} onChange={e => updateVaga(i, 'pos', e.target.value)}>
                  {POSITIONS.map(p => <option key={p.val} value={p.val}>{p.label}</option>)}
                </select>
                <select className="form-control" value={v.prio} onChange={e => updateVaga(i, 'prio', e.target.value)}>
                  <option value={3}>Alta (3)</option>
                  <option value={2}>Média (2)</option>
                  <option value={1}>Baixa (1)</option>
                </select>
              </div>
            ))}
          </div>

          <button className="btn-gerar" onClick={handleGerar} disabled={loading}>
            {loading ? <><div className="spinner"></div> Calculando...</> : <><i className="fa-solid fa-bolt"></i> Gerar Cenários</>}
          </button>
        </div>

        <div className="card results-card">
          <div className="scenario-tabs">
            {[1, 2, 3].map(n => (
              <button key={n} className={`tab ${abaAtiva === n ? 'active' : ''} ${!cenarios ? 'disabled' : ''}`} onClick={() => cenarios && setAbaAtiva(n)}>
                <i className={`fa-solid ${SCENARIO_META[n].icon}`}></i> Cenário {n}
              </button>
            ))}
          </div>

          {loading && <div className="loading-state"><div className="spinner large"></div></div>}

          {!loading && !cenarios && !noResult && (
            <div className="empty-state">
              <i className="fa-solid fa-brain"></i>
              <h4>Pronto para simular</h4>
            </div>
          )}

          {!loading && cenarios && pacoteAtivo.length > 0 && (
            <>
              <div className="results-metrics">
                <div className="metric-box"><span>Custo Total</span><strong>{formatBRL(investimentoTotal)}</strong></div>
                <div className="metric-box"><span>Folha Mensal</span><strong>{formatBRL(folhaCalculada)}</strong></div>
              </div>

              <div className="algo-justification" style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', borderLeft: '4px solid #3b82f6', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', marginBottom: '8px' }}>
                  <i className="fa-solid fa-microchip-ai" style={{ color: '#3b82f6' }}></i>
                  <strong>Justificativa do Algoritmo ScoutIQ</strong>
                </div>
                <p style={{ color: '#cbd5e1', fontSize: '14px', margin: 0 }}>
                  <strong>{SCENARIO_META[abaAtiva].label}:</strong> {SCENARIO_META[abaAtiva].desc} Este conjunto utilizou {formatBRL(investimentoTotal)} do orçamento disponível de {formatBRL(orcamento)}.
                </p>
              </div>

              <div className="player-list">
                {pacoteAtivo.map(player => <PlayerCard key={player.id} player={player} onClick={setModalPlayer} />)}
              </div>

              <button className="btn-gerar-relatorio oficial-btn" onClick={handleGerarRelatorioOficial}>
                <i className="fa-solid fa-file-signature"></i> Gerar Relatório Oficial (Ofício)
              </button>
            </>
          )}
        </div>
      </div>
      <PlayerModal player={modalPlayer} onClose={() => setModalPlayer(null)} />
    </div>
  );
}
