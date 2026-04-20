import React from 'react';
import './Login.css';

const Login = ({ onNavigate }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onNavigate('dashboard');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">
            <div className="icon-circle">🔍</div>
            <h1>ScoutIQ</h1>
            <p>Inteligência em Recrutamento Esportivo</p>
        </div>

        <form onSubmit={handleSubmit}>
            <div className="input-group">
                <label>Usuário / Email</label>
                <input type="email" placeholder="gestor@clube.com" required />
            </div>
            <div className="input-group">
                <label>Senha</label>
                <input type="password" placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn-login">ENTRAR</button>
        </form>

        <div className="footer">
            <a href="#esqueceu" onClick={(e) => e.preventDefault()}>Esqueci minha senha</a>
            <hr />
            <p style={{ color: '#666' }}>Acesso restrito à Diretoria e Scouts</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
