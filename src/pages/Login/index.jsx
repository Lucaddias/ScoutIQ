import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import './Login.css';

const Login = ({ onNavigate }) => {
  const { login, signup, loginAsGuest } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  /*
   * handleSubmit — gerencia o fluxo de login e cadastro no mesmo formulário.
   * Valida os campos localmente antes de chamar o Supabase para economizar requisições.
   * Chama signup ou login do AuthContext dependendo do modo ativo (isSignUp).
   * Em caso de sucesso, navega para o dashboard; em caso de erro, exibe a mensagem traduzida.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Por favor preencha todos os campos.');
      return;
    }

    if (isSignUp && password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const result = await signup(email, password, name);
        if (result.success) {
          if (result.needsConfirmation) {
            setSuccess('Conta criada! Verifique seu e-mail para confirmar.');
            setLoading(false);
            return;
          }
          onNavigate('dashboard');
        } else {
          setError(translateError(result.error));
        }
      } else {
        const result = await login(email, password);
        if (result.success) {
          onNavigate('dashboard');
        } else {
          setError(translateError(result.error));
        }
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    }

    setLoading(false);
  };

  /*
   * translateError — converte as mensagens de erro em inglês do Supabase
   * para mensagens amigáveis em português para o usuário final.
   */
  const translateError = (msg) => {
    if (!msg) return 'Erro desconhecido.';
    if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.';
    if (msg.includes('Email not confirmed')) return 'Confirme seu email antes de fazer login.';
    if (msg.includes('User already registered')) return 'Este email já está cadastrado. Faça login.';
    if (msg.includes('Password should be')) return 'A senha deve ter pelo menos 6 caracteres.';
    if (msg.includes('rate limit')) return 'Muitas tentativas. Aguarde um momento.';
    if (msg.includes('Unable to validate email')) return 'Endereço de email inválido.';
    return msg;
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-icon-circle">
            <span>Q</span>
            <div className="login-dot"></div>
          </div>
          <h1>ScoutIQ</h1>
          <p>Inteligência em Recrutamento Esportivo</p>
        </div>

        {/* Toggle Login / Cadastro */}
        <div className="auth-toggle">
          <button
            className={`auth-toggle-btn ${!isSignUp ? 'active' : ''}`}
            onClick={() => { setIsSignUp(false); setError(''); setSuccess(''); }}
          >
            Entrar
          </button>
          <button
            className={`auth-toggle-btn ${isSignUp ? 'active' : ''}`}
            onClick={() => { setIsSignUp(true); setError(''); setSuccess(''); }}
          >
            Cadastrar
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="login-error">
              <i className="fa-solid fa-circle-exclamation"></i> {error}
            </div>
          )}
          {success && (
            <div className="login-success">
              <i className="fa-solid fa-circle-check"></i> {success}
            </div>
          )}

          {isSignUp && (
            <div className="input-group">
              <label>Nome</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-user"></i>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(''); }}
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label>Email</label>
            <div className="input-wrapper">
              <i className="fa-solid fa-envelope"></i>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Senha</label>
            <div className="input-wrapper">
              <i className="fa-solid fa-lock"></i>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                required
                minLength={isSignUp ? 6 : undefined}
              />
            </div>
            {isSignUp && (
              <small className="password-hint">Mínimo 6 caracteres</small>
            )}
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <><div className="login-spinner"></div> Aguarde...</>
            ) : isSignUp ? (
              <><i className="fa-solid fa-user-plus"></i> CRIAR CONTA</>
            ) : (
              <><i className="fa-solid fa-arrow-right-to-bracket"></i> ENTRAR</>
            )}
          </button>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '13px', display: 'block', marginBottom: '12px' }}>ou</span>
            <button 
              type="button" 
              onClick={() => {
                const res = loginAsGuest();
                if (res.success) onNavigate('inicio');
              }}
              style={{ background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', padding: '12px', width: '100%', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <i className="fa-solid fa-bolt"></i> Acesso Rápido (Demo)
            </button>
          </div>
        </form>

        <div className="login-footer">
          <a href="#esqueceu" onClick={e => e.preventDefault()}>Esqueci minha senha</a>
          <p>{isSignUp ? 'Já tem conta? Clique em Entrar acima.' : 'Acesso restrito à Diretoria e Scouts'}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
