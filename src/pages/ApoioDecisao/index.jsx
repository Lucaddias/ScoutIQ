import React, { useState, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchAtletas, resetAtletasStatus, selectAllAtletas } from '../../store/atletasSlice';
import { simularCenarios, salvarPacoteOficial } from '../../store/apoioSlice'; 
import { useAuth } from '../../context/AuthContext.jsx';
import PlayerCard from '../../components/PlayerCard.jsx';
import PlayerModal from '../../components/PlayerModal.jsx';
import { enrichPlayers } from '../../utils/playerScore.js';
import { formatBRL, clamp } from '../../utils/formatters.js';
import './ApoioDecisao.css';
import ModalNomeRelatorio from '../../components/ModalNomeRelatorio.jsx';

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

export default function ApoioDecisao({ onNavigate }) {
  const dispatch = useDispatch();

  // 1. Lendo os atletas com o Entity Adapter
  const jogadoresDoBanco = useSelector(selectAllAtletas);
  const loadingAtletas   = useSelector((state) => state.atletas.loading);
  const atletasStatus    = useSelector((state) => state.atletas.status);
  const atletasError     = useSelector((state) => state.atletas.error);

  // 2. Lendo as simulações direto da gaveta de apoio
  const { cenariosGerados, loadingSimulacao, avisos } = useSelector((state) => state.apoio);

  useEffect(() => {
    if (atletasStatus === 'idle') dispatch(fetchAtletas());
  }, [dispatch, atletasStatus]);

  const allPlayers = useMemo(() => enrichPlayers(jogadoresDoBanco), [jogadoresDoBanco]);

  const [orcamento, setOrcamento] = useState(5000000);
  const [tetoSalarial, setTetoSalarial] = useState(400000);
  const [vagas, setVagas] = useState(3);

  const [listaVagas, setListaVagas] = useState([
    { id: 1, pos: 'ATA', prio: 3 },
    { id: 2, pos: 'MEI', prio: 2 },
    { id: 3, pos: 'ZAG', prio: 1 },
  ]);

  const [abaAtiva, setAbaAtiva] = useState(1);
  const [errors, setErrors] = useState({});
  const [modalPlayer, setModalPlayer] = useState(null);
  
  // NOVO: Estado para controlar se o Modal de Nomear Relatório está aberto
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const updateVaga = (index, field, val) => {
    setListaVagas(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleGerar = () => {
    const errs = {};
    if (!orcamento || orcamento <= 0) errs.orcamento = 'Inválido (> 0).';
    if (!tetoSalarial || tetoSalarial <= 0) errs.tetoSalarial = 'Inválido (> 0).';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setAbaAtiva(1);

    const mappedVagas = listaVagas.map(v => ({
      dbPos: POSITIONS.find(p => p.val === v.pos).db,
      prio: Number(v.prio)
    }));

    const config = { orcamento, tetoSalarial, vagasArray: mappedVagas };
    
    dispatch(simularCenarios({ allPlayers, config }));
  };

  /*
   * FUNÇÃO 1: Apenas verifica se tem jogador e ABRE O MODAL
   */
  const handleGerarRelatorioOficial = () => {
    const pacoteAtivo = cenariosGerados[`cenario${abaAtiva}`];
    
    if (!pacoteAtivo || pacoteAtivo.length === 0) {
      alert("Nenhum jogador encontrado neste cenário para salvar.");
      return;
    }

    setIsModalOpen(true); // Chama o modal bonito ao invés do window.prompt!
  };

  /*
   * FUNÇÃO 2: Disparada pelo Modal quando o usuário clica em "Gerar Relatório"
   */
  const confirmarSalvamento = (nomeDigitado) => {
    const pacoteAtivo = cenariosGerados[`cenario${abaAtiva}`];
    
    dispatch(salvarPacoteOficial({ 
      pacoteArray: pacoteAtivo, 
      nomeRelatorio: nomeDigitado 
    })).then(() => {
      setIsModalOpen(false); // Fecha o modal
      onNavigate('relatorios_elenco'); // vai direto para Relatórios de Elenco
    });
  };

  const pacoteAtivo = cenariosGerados ? cenariosGerados[`cenario${abaAtiva}`] ?? [] : [];
  const investimentoTotal = pacoteAtivo.reduce((a, p) => a + p.marketValue, 0);
  const folhaCalculada = pacoteAtivo.reduce((a, p) => a + p.monthlySalary, 0);

  if (loadingAtletas) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#94a3b8' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '40px', marginBottom: '15px', color: '#10b981' }}></i>
        <h2>Carregando atletas...</h2>
      </div>
    );
  }

  if (atletasStatus === 'failed') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#94a3b8', gap: '16px' }}>
        <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '40px', color: '#f87171' }}></i>
        <h2 style={{ color: '#f1f5f9', margin: 0 }}>Erro ao carregar atletas</h2>
        <p style={{ margin: 0, fontSize: '14px' }}>{atletasError || 'Verifique sua conexão e tente novamente.'}</p>
        <button
          onClick={() => dispatch(resetAtletasStatus())}
          style={{ padding: '10px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          <i className="fa-solid fa-rotate-right" style={{ marginRight: '8px' }}></i>Tentar novamente
        </button>
      </div>
    );
  }

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

          <button className="btn-gerar" onClick={handleGerar} disabled={loadingSimulacao}>
            {loadingSimulacao ? <><div className="spinner"></div> Calculando...</> : <><i className="fa-solid fa-bolt"></i> Gerar Cenários</>}
          </button>
        </div>

        <div className="card results-card">
          <div className="scenario-tabs">
            {[1, 2, 3].map(n => (
              <button key={n} className={`tab ${abaAtiva === n ? 'active' : ''} ${!cenariosGerados ? 'disabled' : ''}`} onClick={() => cenariosGerados && setAbaAtiva(n)}>
                <i className={`fa-solid ${SCENARIO_META[n].icon}`}></i> Cenário {n}
              </button>
            ))}
          </div>

          {loadingSimulacao && <div className="loading-state"><div className="spinner large"></div></div>}

          {!loadingSimulacao && !cenariosGerados && (
            <div className="empty-state">
              <i className="fa-solid fa-brain"></i>
              <h4>Pronto para simular</h4>
            </div>
          )}

          {!loadingSimulacao && cenariosGerados && pacoteAtivo.length === 0 && (
            <div className="empty-state" style={{ padding: '24px', textAlign: 'center' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '32px', color: '#f59e0b', marginBottom: '12px' }}></i>
              <h4 style={{ color: '#f1f5f9', marginBottom: '8px' }}>Nenhum atleta encontrado neste cenário</h4>
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>Nenhum jogador se enquadrou nas restrições de orçamento e teto salarial.</p>
              {avisos && avisos.length > 0 && (
                <ul style={{ listStyle: 'none', marginTop: '12px', padding: 0, textAlign: 'left' }}>
                  {avisos.map((aviso, i) => (
                    <li key={i} style={{ color: '#fbbf24', fontSize: '12px', padding: '4px 0' }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{aviso}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!loadingSimulacao && cenariosGerados && pacoteAtivo.length > 0 && (
            <>
              {avisos && avisos.length > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
                  {avisos.map((aviso, i) => (
                    <p key={i} style={{ color: '#fbbf24', fontSize: '12px', margin: '2px 0' }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{aviso}
                    </p>
                  ))}
                </div>
              )}
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
      
      {/* NOVO: Modal customizado para substituir o window.prompt */}
      <ModalNomeRelatorio 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmarSalvamento}
      />
    </div>
  );
}