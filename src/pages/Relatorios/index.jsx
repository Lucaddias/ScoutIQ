import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchRelatorios, deletarRelatorio, selecionarPacoteOficial, renomearRelatorio, fetchPropostas, deletarProposta } from '../../store/apoioSlice';
import PlayerCard from '../../components/PlayerCard.jsx';
import { formatBRL } from '../../utils/formatters.js';
import './Relatorios.css';

export default function Relatorios({ filtroInicial }) {
  const dispatch = useDispatch();
  const [propostaSelecionada, setPropostaSelecionada] = useState(null);
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState(filtroInicial || 'todos');

  // Puxamos tudo que precisamos da nossa gaveta de apoio
  const { pacoteSelecionado, historicoRelatorios, loadingHistorico, propostas, loadingPropostas } = useSelector((state) => state.apoio);

  useEffect(() => {
    dispatch(fetchRelatorios());
    dispatch(fetchPropostas());
  }, [dispatch]);

  // Função para fechar o PDF e voltar para a lista de histórico
  const handleVoltar = () => {
    dispatch(selecionarPacoteOficial(null));
    dispatch(fetchRelatorios()); 
  };

  // ==========================================
  // TELA 0: DETALHE DE PROPOSTA DE CONTRATO
  // ==========================================
  if (propostaSelecionada) {
    const p = propostaSelecionada;
    const custoTotal = p.proposedValue + p.proposedSalary * 12 * p.duration;
    const data = new Date(p.dataCriacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
      <div className="relatorios-page">
        <div className="relatorios-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button onClick={() => setPropostaSelecionada(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <i className="fa-solid fa-arrow-left"></i> Voltar ao Histórico
            </button>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-file-signature" style={{ color: '#14b8a6' }}></i>
              Proposta de Contrato
            </h1>
          </div>
          <button onClick={() => window.print()} style={{ padding: '10px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            <i className="fa-solid fa-file-pdf"></i> Salvar PDF
          </button>
        </div>

        <div className="oficio-container card print-area" style={{ padding: '32px', marginTop: '24px' }}>
          {/* Cabeçalho do documento */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', borderBottom: '1px solid #1e293b', paddingBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ background: 'rgba(20,184,166,0.15)', color: '#14b8a6', border: '1px solid rgba(20,184,166,0.3)', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Proposta</span>
                <span style={{ color: '#64748b', fontSize: '13px' }}>{data}</span>
              </div>
              <h2 style={{ color: '#f8fafc', fontSize: '20px', margin: 0 }}>Proposta a {p.jogadorNome}</h2>
            </div>
            <div style={{ background: 'rgba(20,184,166,0.1)', color: '#14b8a6', padding: '8px 16px', borderRadius: '16px', fontWeight: 700, fontSize: '13px', border: '1px solid rgba(20,184,166,0.2)', whiteSpace: 'nowrap' }}>
              ENVIADA
            </div>
          </div>

          {/* Jogador */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
            {p.jogadorFoto && (
              <img src={p.jogadorFoto} alt={p.jogadorNome} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                onError={e => { e.target.style.display = 'none'; }} />
            )}
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 4px', color: '#f8fafc', fontSize: '20px', fontWeight: 700 }}>{p.jogadorNome}</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{p.jogadorTime} · {p.jogadorPosicao}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#3b82f6' }}>{p.jogadorScore}</div>
            </div>
          </div>

          {/* Grid de valores */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {[
              { icon: 'fa-sack-dollar', label: 'Valor da Proposta', value: formatBRL(p.proposedValue), color: '#3b82f6' },
              { icon: 'fa-money-bill-wave', label: 'Salário Mensal', value: `${formatBRL(p.proposedSalary)}/mês`, color: '#10b981' },
              { icon: 'fa-calendar', label: 'Duração do Contrato', value: `${p.duration} ano${p.duration > 1 ? 's' : ''}`, color: '#f59e0b' },
              { icon: 'fa-trophy', label: 'Bônus por Performance', value: formatBRL(p.bonusPerformance), color: '#8b5cf6' },
              ...(p.clausula > 0 ? [{ icon: 'fa-gavel', label: 'Cláusula Rescisória', value: formatBRL(p.clausula), color: '#ef4444' }] : []),
              { icon: 'fa-coins', label: 'Custo Total Estimado', value: formatBRL(custoTotal), color: '#14b8a6' },
            ].map(({ icon, label, value, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fa-solid ${icon}`} style={{ color, fontSize: '14px' }}></i>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>{value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Observações */}
          {p.observacoes && (
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <i className="fa-solid fa-note-sticky" style={{ color: '#f59e0b', marginTop: '2px', flexShrink: 0 }}></i>
              <div>
                <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Observações</div>
                <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6' }}>{p.observacoes}</p>
              </div>
            </div>
          )}

          {/* Rodapé */}
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px', color: '#475569', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span>ScoutIQ — Geração Automática de Propostas</span>
            <span>{data}</span>
          </div>
        </div>
      </div>
    );
  }

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
  const propostasFiltradas = propostas.filter(p =>
    p.jogadorNome?.toLowerCase().includes(search.toLowerCase())
  );
  const relatoriosFiltrados = historicoRelatorios.filter(r =>
    (r.nome || '').toLowerCase().includes(search.toLowerCase())
  );

  const mostrarPropostas  = filtro !== 'relatorios';
  const mostrarRelatorios = filtro !== 'propostas';
  const totalResultados   = (mostrarPropostas ? propostasFiltradas.length : 0) + (mostrarRelatorios ? relatoriosFiltrados.length : 0);

  return (
    <div className="relatorios-page">
      <div className="relatorios-header">
        <h1>
          <i className={`fa-solid ${filtro === 'propostas' ? 'fa-file-signature' : 'fa-folder-open'}`}></i>
          {' '}{filtro === 'propostas' ? 'Propostas de Contratos' : filtro === 'relatorios' ? 'Relatórios de Elenco' : 'Histórico de Relatórios'}
        </h1>
        <p>
          {filtro === 'propostas'
            ? 'Todas as propostas de contrato geradas pelo sistema.'
            : filtro === 'relatorios'
            ? 'Todos os relatórios de elenco gerados pelo Apoio à Decisão.'
            : 'Acesse todos os ofícios gerados anteriormente pelo simulador.'}
        </p>
      </div>

      {/* ── BARRA DE BUSCA E FILTRO ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: '13px' }}></i>
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px 10px 38px', borderRadius: '8px', border: '1px solid #1e293b', background: '#0f172a', color: '#f8fafc', fontSize: '14px', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
          {[
            { value: 'todos',      label: 'Todos' },
            { value: 'propostas',  label: 'Propostas' },
            { value: 'relatorios', label: 'Relatórios' },
          ].map(op => (
            <button key={op.value} onClick={() => setFiltro(op.value)} style={{ padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', background: filtro === op.value ? '#3b82f6' : 'transparent', color: filtro === op.value ? 'white' : '#64748b' }}>
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resultado vazio */}
      {search && totalResultados === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '32px', marginBottom: '12px' }}></i>
          <p>Nenhum resultado para <strong style={{ color: '#94a3b8' }}>"{search}"</strong></p>
        </div>
      )}

      {/* ── SEÇÃO DE PROPOSTAS DE CONTRATO ── */}
      {mostrarPropostas && (loadingPropostas || propostasFiltradas.length > 0) && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-file-signature" style={{ color: '#14b8a6' }}></i> Propostas de Contrato
            <span style={{ background: 'rgba(20,184,166,0.15)', color: '#14b8a6', borderRadius: '12px', padding: '1px 8px', fontSize: '12px', fontWeight: 700 }}>{propostasFiltradas.length}</span>
          </h2>
          {loadingPropostas ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
              <i className="fa-solid fa-spinner fa-spin"></i>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {propostasFiltradas.map(p => {
                const data = new Date(p.dataCriacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const custoTotal = p.proposedValue + p.proposedSalary * 12 * p.duration;
                return (
                  <div key={p.id} style={{ background: '#1e293b', border: '1px solid rgba(20,184,166,0.25)', borderRadius: '12px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' }} onClick={() => setPropostaSelecionada(p)}>
                    {/* Foto */}
                    {p.jogadorFoto && (
                      <img src={p.jogadorFoto} alt={p.jogadorNome} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        onError={e => { e.target.style.display = 'none'; }} />
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ background: 'rgba(20,184,166,0.15)', color: '#14b8a6', border: '1px solid rgba(20,184,166,0.3)', borderRadius: '6px', padding: '2px 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          Proposta
                        </span>
                        <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: 700 }}>
                          {p.jogadorNome}
                        </h3>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>{p.jogadorTime}</span>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '13px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <span><i className="fa-regular fa-clock"></i> {data}</span>
                        <span><i className="fa-solid fa-calendar"></i> {p.duration} anos</span>
                        <span><i className="fa-solid fa-money-bill-wave"></i> {formatBRL(p.proposedSalary)}/mês</span>
                        <span><i className="fa-solid fa-coins"></i> Custo total: {formatBRL(custoTotal)}</span>
                      </div>
                    </div>

                    {/* Score */}
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Score</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6' }}>{p.jogadorScore}</div>
                    </div>

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setPropostaSelecionada(p)}
                        style={{ background: '#14b8a6', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
                        title="Ver detalhes"
                      >
                        Abrir <i className="fa-solid fa-arrow-right"></i>
                      </button>
                      <button
                        onClick={() => { if (window.confirm(`Excluir proposta de ${p.jogadorNome}?`)) dispatch(deletarProposta(p.id)); }}
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer' }}
                        title="Excluir Proposta"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SEÇÃO DE RELATÓRIOS DE ELENCO ── */}
      {mostrarRelatorios && (
        <>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-folder-open" style={{ color: '#3b82f6' }}></i> Relatórios de Elenco
            <span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', borderRadius: '12px', padding: '1px 8px', fontSize: '12px', fontWeight: 700 }}>{relatoriosFiltrados.length}</span>
          </h2>

          {loadingHistorico ? (
            <div style={{ textAlign: 'center', marginTop: '40px', color: '#94a3b8' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '30px' }}></i>
            </div>
          ) : relatoriosFiltrados.length === 0 && !search ? (
            <div className="empty-state" style={{ marginTop: '20px', background: 'var(--card-bg)', padding: '48px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <i className="fa-solid fa-file-circle-xmark" style={{ fontSize: '48px', color: '#475569', marginBottom: '16px' }}></i>
              <h4 style={{ fontSize: '18px', color: '#94a3b8' }}>Nenhum relatório salvo.</h4>
              <p style={{ color: '#64748b', marginTop: '8px' }}>Vá até o painel de Apoio à Decisão, simule um cenário e gere um relatório oficial para ele aparecer aqui.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {relatoriosFiltrados.map((relatorio) => {
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
        </>
      )}
    </div>
  );
}