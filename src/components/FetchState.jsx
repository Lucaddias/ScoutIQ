import React from 'react';

/**
 * Tela de carregamento centralizada, usada enquanto dados são buscados do servidor.
 */
export function LoadingState({ message = 'Carregando dados...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#94a3b8' }}>
      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '40px', marginBottom: '15px', color: '#10b981' }}></i>
      <h2>{message}</h2>
    </div>
  );
}

/**
 * Tela de erro com botão de retry, usada quando o fetch de dados falha.
 */
export function ErrorState({ error, onRetry, title = 'Erro ao carregar atletas' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#94a3b8', gap: '16px' }}>
      <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '40px', color: '#f87171' }}></i>
      <h2 style={{ color: '#f1f5f9', margin: 0 }}>{title}</h2>
      <p style={{ margin: 0, fontSize: '14px' }}>{error || 'Verifique sua conexão e tente novamente.'}</p>
      <button
        onClick={onRetry}
        style={{ padding: '10px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
      >
        <i className="fa-solid fa-rotate-right" style={{ marginRight: '8px' }}></i>Tentar novamente
      </button>
    </div>
  );
}
