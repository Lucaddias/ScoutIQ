import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import PreLogin from './pages/PreLogin/index.jsx';
import Login from './pages/Login/index.jsx';
import Dashboard from './pages/Dashboard/index.jsx';

// Importações do Redux
import { useDispatch } from 'react-redux';
import { setAtletas } from './store/atletasSlice';

// A MÁGICA AQUI: Importando o arquivo JSON diretamente!
import mockJogadores from './data/players_updated.json';
function LoadingScreen() {
  /* ... (Mantenha o mesmo código de LoadingScreen que você já tem) ... */
}

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState(user ? 'inicio' : 'prelogin');
  const [pacoteSelecionado, setPacoteSelecionado] = useState(null);
  
  const dispatch = useDispatch();

  // O Motoboy agora busca os dados na gaveta local (JSON)
  useEffect(() => {
    // Se não tem usuário logado, não faz nada
    if (!user) return; 

    // Pega os dados do arquivo JSON e joga no Redux
    // Tentamos pegar a propriedade athletes primeiro. Se não existir, pegamos o arquivo inteiro.
// E por precaução, garantimos que sempre seja um array com o || []
dispatch(setAtletas(mockJogadores.athletes || mockJogadores || []));
    console.log("Cofre do Redux abastecido com dados MOCKADOS com sucesso!", mockJogadores.length);

  }, [user, dispatch]);

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