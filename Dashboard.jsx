import React, { useState } from 'react';
import './Dashboard.css';

// Mock Data
const jogadoresMock = [
  { id: 1, nome: "L. Silva", posicao: "ATA", custo: 2800000, salario: 210000, score: 95 },
  { id: 2, nome: "P. Santos", posicao: "ATA", custo: 1200000, salario: 90000, score: 82 },
  { id: 3, nome: "M. Rojas", posicao: "MEI", custo: 1500000, salario: 115000, score: 89 },
  { id: 4, nome: "J. Gomez", posicao: "MEI", custo: 800000, salario: 60000, score: 76 },
  { id: 5, nome: "F. Melo", posicao: "ZAG", custo: 550000, salario: 60000, score: 85 },
  { id: 6, nome: "V. Hugo", posicao: "ZAG", custo: 1800000, salario: 130000, score: 91 }
];

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

const Dashboard = ({ onNavigate }) => {
  // Estados dos Inputs
  const [orcamento, setOrcamento] = useState(5000000);
  const [tetoSalarial, setTetoSalarial] = useState(400000);
  const [vagas, setVagas] = useState(3);
  const [prioridadeAta, setPrioridadeAta] = useState('Alta (3)');
  const [prioridadeMei, setPrioridadeMei] = useState('Média (2)');
  const [prioridadeZag, setPrioridadeZag] = useState('Baixa (1)');

  // Estados dos Resultados
  const [pacoteSugerido, setPacoteSugerido] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState(1);

  // Botão de Ação (A Mágica)
  const gerarCenarios = () => {
    // Ordena por score decrescente para tentar pegar os melhores primeiro
    const atas = jogadoresMock.filter(j => j.posicao === 'ATA').sort((a,b) => b.score - a.score);
    const meis = jogadoresMock.filter(j => j.posicao === 'MEI').sort((a,b) => b.score - a.score);
    const zags = jogadoresMock.filter(j => j.posicao === 'ZAG').sort((a,b) => b.score - a.score);

    let melhorPacote = [];
    
    // Algoritmo simples iterativo (busca o melhor trio que caiba no orçamento)
    for (let ata of atas) {
        for (let mei of meis) {
            for (let zag of zags) {
                if (ata.custo + mei.custo + zag.custo <= orcamento) {
                    setPacoteSugerido([ata, mei, zag]);
                    setAbaAtiva(1); // Set to active scenario
                    return; // Encontrou o melhor possível
                }
            }
        }
    }

    // Se não encontrou, pega o mais barato de cada
    const pacoteBarato = [atas[atas.length-1], meis[meis.length-1], zags[zags.length-1]];
    if (pacoteBarato[0].custo + pacoteBarato[1].custo + pacoteBarato[2].custo <= orcamento) {
        setPacoteSugerido(pacoteBarato);
    } else {
        alert("Orçamento insuficiente para preencher as 3 vagas.");
        setPacoteSugerido([]);
    }
  };

  const getPosicaoPrioridade = (posicao) => {
      if (posicao === 'ATA') return `Atacante (${prioridadeAta})`;
      if (posicao === 'MEI') return `Meia Ofensivo (${prioridadeMei})`;
      if (posicao === 'ZAG') return `Zagueiro (${prioridadeZag})`;
      return posicao;
  };

  // Cálculos do Header de Resultados
  const investimentoTotal = pacoteSugerido.reduce((acc, curr) => acc + curr.custo, 0);
  const folhaCalculada = pacoteSugerido.reduce((acc, curr) => acc + curr.salario, 0);
  const scoreMedio = pacoteSugerido.length > 0 ? (pacoteSugerido.reduce((acc, curr) => acc + curr.score, 0) / pacoteSugerido.length).toFixed(1) : 0;

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-logo"><i className="fa-solid fa-magnifying-glass"></i> ScoutIQ</div>
        <nav>
          <ul>
            <li><a href="#inicio" onClick={(e) => e.preventDefault()}><i className="fa-solid fa-house"></i> Início</a></li>
            <li><a href="#atletas" onClick={(e) => e.preventDefault()}><i className="fa-solid fa-user-group"></i> Atletas</a></li>
            <li><a href="#ligas" onClick={(e) => e.preventDefault()}><i className="fa-solid fa-globe"></i> Ligas</a></li>
            <li><a href="#campeonatos" onClick={(e) => e.preventDefault()}><i className="fa-solid fa-trophy"></i> Campeonatos</a></li>
            <li><a href="#estatisticas" onClick={(e) => e.preventDefault()}><i className="fa-solid fa-chart-simple"></i> Estatísticas</a></li>
            <li><a href="#apoio" className="ativo" onClick={(e) => e.preventDefault()}><i className="fa-solid fa-brain"></i> Apoio à Decisão</a></li>
            <br />
            <li><a href="#sair" onClick={(e) => { e.preventDefault(); onNavigate('login'); }}><i className="fa-solid fa-arrow-right-from-bracket"></i> Sair</a></li>
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        <div className="header">
          <h1>Sistema de Apoio à Decisão</h1>
          <p style={{ color: '#8a8a9d', fontSize: '13px', marginTop: '5px' }}>Simule cenários e otimize seu orçamento de transferências com inteligência de dados.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
          
          <div className="card">
            <h3>1. Configurar Janela de Mercado</h3>
            
            <div className="form-group">
                <label>Orçamento Total Disponível (€)</label>
                <input 
                    type="number" 
                    className="form-control" 
                    value={orcamento} 
                    onChange={(e) => setOrcamento(Number(e.target.value))} 
                />
            </div>
            
            <div className="form-group">
                <label>Teto Salarial Mensal Disponível (€)</label>
                <input 
                    type="number" 
                    className="form-control" 
                    value={tetoSalarial} 
                    onChange={(e) => setTetoSalarial(Number(e.target.value))} 
                />
            </div>

            <div className="form-group" style={{ marginTop: '25px' }}>
                <label style={{ color: 'white', fontWeight: 'bold' }}>Quantidade de Vagas Carentes</label>
                <input 
                    type="number" 
                    className="form-control" 
                    value={vagas} 
                    onChange={(e) => setVagas(Number(e.target.value))}
                    min="1" max="10" 
                />
            </div>

            <p style={{ marginTop: '25px', marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>Definir Posições e Prioridades</p>
            
            <div className="priority-group">
                <select className="form-control" style={{ flex: 2 }} disabled><option>Atacante (ATA)</option></select>
                <select className="form-control" style={{ flex: 1 }} value={prioridadeAta} onChange={e => setPrioridadeAta(e.target.value)}>
                    <option>Alta (3)</option>
                    <option>Média (2)</option>
                    <option>Baixa (1)</option>
                </select>
            </div>

            <div className="priority-group">
                <select className="form-control" style={{ flex: 2 }} disabled><option>Meia Ofensivo (MEI)</option></select>
                <select className="form-control" style={{ flex: 1 }} value={prioridadeMei} onChange={e => setPrioridadeMei(e.target.value)}>
                    <option>Alta (3)</option>
                    <option>Média (2)</option>
                    <option>Baixa (1)</option>
                </select>
            </div>

            <div className="priority-group">
                <select className="form-control" style={{ flex: 2 }} disabled><option>Zagueiro (ZAG)</option></select>
                <select className="form-control" style={{ flex: 1 }} value={prioridadeZag} onChange={e => setPrioridadeZag(e.target.value)}>
                    <option>Alta (3)</option>
                    <option>Média (2)</option>
                    <option>Baixa (1)</option>
                </select>
            </div>

            <button className="btn-azul" onClick={gerarCenarios}>Gerar Cenários de Contratação</button>
          </div>

          <div className="card">
            
            <div className="package-tabs">
                <button className={`tab ${abaAtiva === 1 ? 'active' : ''}`} onClick={() => setAbaAtiva(1)}>
                    <strong>Cenário 1</strong>Máxima Performance
                </button>
                <button className={`tab ${abaAtiva === 2 ? 'active' : ''}`} onClick={() => setAbaAtiva(2)}>
                    <strong>Cenário 2</strong>Equilíbrio (ROI)
                </button>
                <button className={`tab ${abaAtiva === 3 ? 'active' : ''}`} onClick={() => setAbaAtiva(3)}>
                    <strong>Cenário 3</strong>Conservador (Caixa)
                </button>
            </div>

            <h3 style={{ border: 'none', paddingBottom: 0 }}>Análise do Cenário: {abaAtiva === 1 ? 'Máxima Performance' : abaAtiva === 2 ? 'Equilíbrio (ROI)' : 'Conservador (Caixa)'}</h3>
            
            {pacoteSugerido.length > 0 ? (
              <>
                <div className="results-header">
                    <div className="metric"><span>Investimento Total</span><strong>{formatCurrency(investimentoTotal)}</strong></div>
                    <div className="metric"><span>Folha Salarial</span><strong>{formatCurrency(folhaCalculada)}/mês</strong></div>
                    <div className="metric"><span>Score Médio</span><strong>{scoreMedio}</strong></div>
                </div>

                <div>
                    {pacoteSugerido.map(jogador => (
                        <a href={"#player-" + jogador.id} key={jogador.id} className="player-card" onClick={e => e.preventDefault()}>
                            <div className="player-photo">👤</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{jogador.nome}</div>
                                <div style={{ fontSize: '12px', color: '#8a8a9d' }}>{getPosicaoPrioridade(jogador.posicao)}</div>
                            </div>
                            <div style={{ textAlign: 'right', marginRight: '15px', fontSize: '12px', color: '#8a8a9d' }}>
                                <div>Custo: <strong style={{ color: 'white' }}>{formatCurrency(jogador.custo)}</strong></div>
                                <div>Salário: <strong style={{ color: 'white' }}>{formatCurrency(jogador.salario)}</strong></div>
                            </div>
                            <div className="score-badge">Perf: {jogador.score}</div>
                        </a>
                    ))}
                </div>

                <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #1f1f4d' }}>
                    <h3 style={{ border: 'none', marginBottom: '5px', color: '#4A76A8' }}>Justificativa do Algoritmo</h3>
                    <p style={{ fontSize: '13px', color: '#8a8a9d', lineHeight: '1.5' }}>
                        Este cenário foi montado respeitando o teto de {formatCurrency(orcamento)}. 
                        Priorizou as métricas ofensivas escolhendo os perfis baseados nas suas necessidades.
                    </p>
                </div>
              </>
            ) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#8a8a9d' }}>
                    Clique em "Gerar Cenários de Contratação" para calcular o escopo ideal baseado no seu orçamento.
                </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
