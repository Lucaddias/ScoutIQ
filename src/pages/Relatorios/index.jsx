import React from 'react';
import PlayerCard from '../../components/PlayerCard.jsx';
import { formatBRL } from '../../utils/formatters.js';
import './Relatorios.css';

export default function Relatorios({ pacoteSelecionado }) {
  if (!pacoteSelecionado || pacoteSelecionado.length === 0) {
    return (
      <div className="relatorios-page">
        <div className="relatorios-header">
          <div>
            <h1><i className="fa-solid fa-file-lines"></i> Relatório Oficial</h1>
          </div>
        </div>
        <div className="empty-state" style={{marginTop: '40px', background: 'var(--card-bg)', padding: '48px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center'}}>
          <i className="fa-solid fa-file-circle-xmark" style={{fontSize: '48px', color: '#475569', marginBottom: '16px'}}></i>
          <h4 style={{fontSize: '18px', color: '#94a3b8'}}>Nenhum cenário selecionado no painel de Apoio à Decisão.</h4>
          <p style={{color: '#64748b', marginTop: '8px'}}>Volte ao simulador, escolha o cenário ideal para o clube e clique em "Gerar Relatório Oficial".</p>
        </div>
      </div>
    );
  }

  const investimentoTotal = pacoteSelecionado.reduce((a, p) => a + p.marketValue, 0);
  const folhaCalculada    = pacoteSelecionado.reduce((a, p) => a + p.monthlySalary, 0);

  return (
    <div className="relatorios-page">
      <div className="relatorios-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1><i className="fa-solid fa-file-signature"></i> Ofício de Contratação</h1>
          <p>Pacote selecionado via inteligência algorítmica do ScoutIQ.</p>
        </div>
        <button 
          onClick={() => window.print()} 
          style={{ padding: '10px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          <i className="fa-solid fa-file-pdf"></i> Salvar Relatório (PDF)
        </button>
      </div>

      <div className="oficio-container card print-area" style={{ padding: '32px', marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ color: '#f8fafc', fontSize: '20px', letterSpacing: '0.05em' }}>DOCUMENTO INTERNO OFICIAL</h2>
            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>Ref: SCIQ-{(Math.random() * 10000).toFixed(0)}/25</div>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '8px 16px', borderRadius: '16px', fontWeight: 'bold', fontSize: '14px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            VALIDADO PELO ALGORITMO
          </div>
        </div>

        <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: '1.6', marginBottom: '16px' }}>
          <strong>À Presidência e Diretoria de Futebol,</strong>
        </p>
        
        <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
          Com base na análise algorítmica do <strong>ScoutIQ</strong>, e respeitando rigorosamente o teto orçamentário deliberado, sugerimos a aprovação do pacote técnico discriminado abaixo. A seleção cobre as carências solicitadas pelo departamento de futebol, otimizando o <strong>Retorno Sobre Investimento (ROI)</strong> e maximizando a probabilidade de sucesso esportivo na atual janela.
        </p>

        <div style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', marginBottom: '32px', borderLeft: '4px solid #3b82f6' }}>
          <strong style={{ display: 'block', color: '#f8fafc', marginBottom: '12px' }}>Resumo Financeiro da Operação:</strong>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', lineHeight: '1.8' }}>
            <li>Custo total de direitos econômicos: <strong style={{color: '#f8fafc'}}>{formatBRL(investimentoTotal)}</strong></li>
            <li>Adição à folha salarial mensal: <strong style={{color: '#f8fafc'}}>{formatBRL(folhaCalculada)}</strong></li>
            <li>Status de compliance financeiro: <strong style={{color: '#10b981'}}>✔ APROVADO</strong></li>
          </ul>
        </div>

        <h3 style={{ marginBottom: '20px', color: '#f8fafc', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-users" style={{color: '#3b82f6'}}></i> Atletas Selecionados / Sugeridos:
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {pacoteSelecionado.map(player => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px dashed var(--border-color)', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
          Documento gerado automaticamente pelo algoritmo corporativo ScoutIQ.<br />
          Para aprovação final, acione o Departamento Jurídico.
        </div>
      </div>
    </div>
  );
}
