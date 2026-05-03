import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchRelatorios, deletarRelatorio, selecionarPacoteOficial, renomearRelatorio } from '../../store/apoioSlice';
import PlayerCard from '../../components/PlayerCard.jsx';
import { formatBRL } from '../../utils/formatters.js';
import './Relatorios.css';

export default function Relatorios() {
  const dispatch = useDispatch();
  
  // Puxamos tudo que precisamos da nossa gaveta de apoio
  const { pacoteSelecionado, historicoRelatorios, loadingHistorico } = useSelector((state) => state.apoio);

  // Busca os relatórios do JSON Server assim que a tela abre
  useEffect(() => {
    dispatch(fetchRelatorios());
  }, [dispatch]);

  // Função para fechar o PDF e voltar para a lista de histórico
  const handleVoltar = () => {
    dispatch(selecionarPacoteOficial(null));
    dispatch(fetchRelatorios()); 
  };

  // ==========================================
  // TELA 1: DOCUMENTO OFICIAL ABERTO (PDF)
  // Como o pacote agora é um objeto, lemos pacoteSelecionado.atletas
  // ==========================================
  if (pacoteSelecionado && pacoteSelecionado.atletas && pacoteSelecionado.atletas.length > 0) {
    const investimentoTotal = pacoteSelecionado.atletas.reduce((a, p) => a + p.marketValue, 0);
    const folhaCalculada    = pacoteSelecionado.atletas.reduce((a, p) => a + p.monthlySalary, 0);

    return (
      <div className="relatorios-page">
        <div className="relatorios-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button 
              onClick={handleVoltar} 
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <i className="fa-solid fa-arrow-left"></i> Voltar ao Histórico
            </button>
            {/* Aqui entra o NOME CUSTOMIZADO que você digitou no simulador */}
            <h1><i className="fa-solid fa-file-signature"></i> {pacoteSelecionado.nome || 'Ofício de Contratação'}</h1>
          </div>
          <button 
            onClick={() => window.print()} 
            style={{ padding: '10px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <i className="fa-solid fa-file-pdf"></i> Salvar PDF
          </button>
        </div>

        <div className="oficio-container card print-area" style={{ padding: '32px', marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div>
              <h2 style={{ color: '#f8fafc', fontSize: '20px', letterSpacing: '0.05em' }}>DOCUMENTO INTERNO OFICIAL</h2>
              <div style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>Ref: {pacoteSelecionado.nome}</div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '8px 16px', borderRadius: '16px', fontWeight: 'bold', fontSize: '14px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              VALIDADO PELO ALGORITMO
            </div>
          </div>

          <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: '1.6', marginBottom: '16px' }}>
            <strong>À Presidência e Diretoria de Futebol,</strong>
          </p>
          <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
            Com base na análise algorítmica do <strong>ScoutIQ</strong>, sugerimos a aprovação do pacote técnico discriminado abaixo. Otimizando o Retorno Sobre Investimento (ROI).
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
            {/* Lendo a array de atletas de dentro do objeto */}
            {pacoteSelecionado.atletas.map(player => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA 2: LISTA DE HISTÓRICO (MENU PRINCIPAL)
  // ==========================================
  return (
    <div className="relatorios-page">
      <div className="relatorios-header">
        <h1><i className="fa-solid fa-folder-open"></i> Histórico de Relatórios</h1>
        <p>Acesse todos os ofícios gerados anteriormente pelo simulador.</p>
      </div>

      {loadingHistorico ? (
        <div style={{ textAlign: 'center', marginTop: '40px', color: '#94a3b8' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '30px' }}></i>
        </div>
      ) : historicoRelatorios.length === 0 ? (
        <div className="empty-state" style={{marginTop: '40px', background: 'var(--card-bg)', padding: '48px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center'}}>
          <i className="fa-solid fa-file-circle-xmark" style={{fontSize: '48px', color: '#475569', marginBottom: '16px'}}></i>
          <h4 style={{fontSize: '18px', color: '#94a3b8'}}>Nenhum relatório salvo.</h4>
          <p style={{color: '#64748b', marginTop: '8px'}}>Vá até o painel de Apoio à Decisão, simule um cenário e gere um relatório oficial para ele aparecer aqui.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
          {historicoRelatorios.map((relatorio) => {
            // TRAVA DE SEGURANÇA: Garante que "atletas" seja um array para não quebrar a tela
            const atletasDoRelatorio = relatorio.atletas || []; 
            const custoRelatorio = atletasDoRelatorio.reduce((a, p) => a + p.marketValue, 0);
            const dataFormatada = new Date(relatorio.dataCriacao || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            return (
              <div key={relatorio.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#f8fafc', fontSize: '18px' }}>
                    {relatorio.nome || 'Relatório sem nome'}
                  </h3>
                  <div style={{ color: '#94a3b8', fontSize: '14px', display: 'flex', gap: '16px' }}>
                    <span><i className="fa-regular fa-clock"></i> {dataFormatada}</span>
                    <span><i className="fa-solid fa-users"></i> {atletasDoRelatorio.length} Atletas</span>
                    <span><i className="fa-solid fa-sack-dollar"></i> Custo: {formatBRL(custoRelatorio)}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  {/* Botão de Excluir */}
                  <button 
                    onClick={() => {
                      if(window.confirm('Deseja excluir este relatório do banco de dados?')) {
                        dispatch(deletarRelatorio(relatorio.id));
                      }
                    }} 
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', transition: '0.2s' }}
                    title="Excluir Relatório"
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>

                  {/* NOVO: Botão de Renomear (Editar) */}
                  <button 
                    onClick={() => {
                      const novoNome = window.prompt("Digite o novo nome para o relatório:", relatorio.nome);
                      if (novoNome && novoNome.trim() !== '') {
                        dispatch(renomearRelatorio({ id: relatorio.id, novoNome }));
                      }
                    }} 
                    style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: 'none', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', transition: '0.2s' }}
                    title="Renomear Relatório"
                  >
                    <i className="fa-solid fa-pen"></i>
                  </button>

                  {/* Botão de Abrir */}
                  <button 
                    onClick={() => dispatch(selecionarPacoteOficial(relatorio))}
                    style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Abrir <i className="fa-solid fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}