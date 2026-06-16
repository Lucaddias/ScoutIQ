import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import yup from '../../utils/yupConfig.js';
import './Login.css';

const loginSchema = yup.object().shape({
  email: yup.string().email().required(),
  password: yup.string().min(6).required(),
});

const signupSchema = yup.object().shape({
  name: yup.string().max(100).required(),
  email: yup.string().email().required(),
  password: yup.string().min(6).required(),
});

const Login = ({ onNavigate }) => {
  const { login, signup } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(isSignUp ? signupSchema : loginSchema),
    defaultValues: { name: '', email: '', password: '' }
  });

  useEffect(() => {
    reset({ name: '', email: '', password: '' });
    setError('');
    setSuccess('');
  }, [isSignUp, reset]);

  /*
   * handleSubmit — gerencia o fluxo de login e cadastro no mesmo formulário.
   * Valida os campos localmente antes de chamar o Supabase para economizar requisições.
   * Chama signup ou login do AuthContext dependendo do modo ativo (isSignUp).
   * Em caso de sucesso, navega para o dashboard; em caso de erro, exibe a mensagem traduzida.
   */
  const onSubmit = async (data) => {
    setError('');
    setSuccess('');
    setLoading(true);

    const { email, password, name } = data;

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
    if (msg.includes('rate limit') || msg.includes('Request rate limit')) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
    if (msg.includes('Unable to validate email')) return 'Endereço de email inválido.';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
      return 'Falha ao conectar ao servidor. Verifique sua internet (ou alguma extensão/adblock bloqueando) e aguarde alguns minutos — pode ser limite de tentativas.';
    }
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

        <form onSubmit={handleSubmit(onSubmit)}>
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
                  {...register('name')}
                />
              </div>
              {errors.name && <span className="hook-error">{errors.name.message}</span>}
            </div>
          )}

          <div className="input-group">
            <label>Email</label>
            <div className="input-wrapper">
              <i className="fa-solid fa-envelope"></i>
              <input
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
              />
            </div>
            {errors.email && <span className="hook-error">{errors.email.message}</span>}
          </div>

          <div className="input-group">
            <label>Senha</label>
            <div className="input-wrapper">
              <i className="fa-solid fa-lock"></i>
              <input
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
            </div>
            {errors.password && <span className="hook-error">{errors.password.message}</span>}
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
