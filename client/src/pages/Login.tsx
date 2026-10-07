import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import '../styles/auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user } = await api.login(email, password);
      login(token, user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (response: any) => {
    setError('');
    setLoading(true);
    try {
      const { token, user } = await api.googleLogin(response.credential);
      login(token, user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login com Google');
    } finally {
      setLoading(false);
    }
  };

  // Initialize Google Sign-In
  React.useEffect(() => {
    const initGoogle = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          callback: handleGoogleLogin,
        });
        (window as any).google.accounts.id.renderButton(
          document.getElementById('google-signin-btn-login'),
          { theme: 'outline', size: 'large', width: '100%', text: 'continue_with', shape: 'rectangular' }
        );
      }
    };
    
    // Try immediately or wait for script to load
    if ((window as any).google?.accounts?.id) {
      initGoogle();
    } else {
      const timer = setTimeout(initGoogle, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
      </div>
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </span>
          <h1>MatchVibe</h1>
          <p>Encontre pessoas incriveis</p>
        </div>

        <div id="google-signin-btn-login" style={{ marginBottom: 8 }}></div>

        <div className="auth-divider">ou</div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <div className="input-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="input-group">
            <label htmlFor="login-password">Senha</label>
            <input
              id="login-password"
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="btn-loader" /> : 'Entrar'}
          </button>
        </form>
        <p className="auth-switch">
          Nao tem conta? <Link to="/register">Criar conta</Link>
        </p>
        <div className="auth-demo">
          <p>Demo: qualquer email dos usuarios abaixo com senha <strong>123456</strong></p>
          <small>ana@demo.com | lucas@demo.com | maria@demo.com</small>
        </div>
      </div>
    </div>
  );
}
