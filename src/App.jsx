/**
 * Componente Raiz da Aplicação e Roteador Condicional do ScoutIQ.
 * Centraliza o fluxo de renderização baseado no estado da autenticação.
 * @module App
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import PreLogin from './pages/PreLogin/index.jsx';
import Login from './pages/Login/index.jsx';
import Dashboard from './pages/Dashboard/index.jsx';

/**
 * Componente interno que renderiza uma tela de carregamento (spinner)
 * enquanto a sessão ativa com o Supabase está sendo estabelecida.
 *
 * @returns {JSX.Element} Tela de carregamento centralizada.
 */
function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#94a3b8', fontSize: '18px', gap: '12px' }}>
      <div style={{ width: '24px', height: '24px', border: '3px solid #334155', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Carregando...
    </div>
  );
}

/**
 * Componente interno que consome o hook useAuth para realizar o roteamento condicional (state-based routing).
 *
 * Rotas e Estados:
 * - `prelogin`: Apresentação comercial das funcionalidades e planos de assinatura.
 * - `login`: Formulário para entrar ou criar uma nova conta.
 * - `dashboard`: Área interna autenticada contendo relatórios, simulação e perfil.
 *
 * @returns {JSX.Element} O componente correspondente ao estado atual da rota.
 */
function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState(user ? 'inicio' : 'prelogin');

  if (loading) return <LoadingScreen />;

  const navigate = (target) => setPage(target);

  if (user && (page === 'prelogin' || page === 'login')) {
    return <Dashboard page="inicio" onNavigate={navigate} />;
  }

  if (page === 'prelogin') return <PreLogin onNavigate={navigate} />;
  if (page === 'login')    return <Login    onNavigate={navigate} />;

  if (!user) return <Login onNavigate={navigate} />;
  return <Dashboard page={page} onNavigate={navigate} />;
}

/**
 * Componente de entrada principal do React.
 * Envolve toda a aplicação no provedor `AuthProvider` para disponibilizar o contexto de sessão.
 *
 * @returns {JSX.Element} Árvore de componentes renderizada.
 */
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}