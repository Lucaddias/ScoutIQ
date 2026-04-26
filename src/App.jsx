import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import PreLogin from './pages/PreLogin/index.jsx';
import Login from './pages/Login/index.jsx';
import Dashboard from './pages/Dashboard/index.jsx';

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#94a3b8', fontSize: '18px', gap: '12px' }}>
      <div style={{ width: '24px', height: '24px', border: '3px solid #334155', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Carregando...
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState(user ? 'inicio' : 'prelogin');
  const [pacoteSelecionado, setPacoteSelecionado] = useState(null);

  if (loading) return <LoadingScreen />;

  const navigate = (target) => setPage(target);

  if (user && (page === 'prelogin' || page === 'login')) {
    return <Dashboard page="inicio" onNavigate={navigate} pacoteSelecionado={pacoteSelecionado} setPacoteSelecionado={setPacoteSelecionado} />;
  }

  if (page === 'prelogin') return <PreLogin onNavigate={navigate} />;
  if (page === 'login')    return <Login    onNavigate={navigate} />;

  if (!user) return <Login onNavigate={navigate} />;
  return <Dashboard page={page} onNavigate={navigate} pacoteSelecionado={pacoteSelecionado} setPacoteSelecionado={setPacoteSelecionado} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}