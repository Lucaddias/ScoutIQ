import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import PreLogin from './pages/PreLogin/index.jsx';
import Login from './pages/Login/index.jsx';
import Dashboard from './pages/Dashboard/index.jsx';

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #0f172a 50%, #0a0a1a 100%)',
      color: '#94a3b8',
      gap: '16px',
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: 800,
        color: '#fff',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>
        Q
      </div>
      <p style={{ fontSize: '14px', letterSpacing: '0.05em' }}>Carregando ScoutIQ...</p>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState(user ? 'inicio' : 'prelogin');
  const [pacoteSelecionado, setPacoteSelecionado] = useState(null);

  // Show loading while Supabase restores the session
  if (loading) return <LoadingScreen />;

  const navigate = (target) => setPage(target);

  // If user just logged in and page is still prelogin/login, go to dashboard
  if (user && (page === 'prelogin' || page === 'login')) {
    return <Dashboard page="inicio" onNavigate={navigate} pacoteSelecionado={pacoteSelecionado} setPacoteSelecionado={setPacoteSelecionado} />;
  }

  if (page === 'prelogin') return <PreLogin onNavigate={navigate} />;
  if (page === 'login')    return <Login    onNavigate={navigate} />;

  // Authenticated pages share the sidebar via Dashboard layout
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
