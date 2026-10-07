import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { GoogleLogin } from '@react-oauth/google';
import '../styles/auth.css';

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[10])) return false;

  return true;
}

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [cpfTouched, setCpfTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const cpfDigits = cpf.replace(/\D/g, '');
  const isCpfComplete = cpfDigits.length === 11;
  const isCpfValid = isCpfComplete && validateCPF(cpf);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
    if (!cpfTouched) setCpfTouched(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isCpfValid) {
      setError('CPF invalido. Verifique e tente novamente.');
      return;
    }

    if (parseInt(age) < 18) {
      setError('Voce deve ter pelo menos 18 anos para se cadastrar.');
      return;
    }

    setLoading(true);

    try {
      const { token, user } = await api.register({
        email,
        password,
        name,
        cpf: cpfDigits,
        age: parseInt(age) || 18,
        gender
      });
      login(token, user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setLoading(true);
    try {
      const { token, user } = await api.googleLogin(credentialResponse.credential);
      login(token, user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta com Google');
    } finally {
      setLoading(false);
    }
  };

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
          <p>Crie sua conta</p>
        </div>

        <div className="google-auth-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Falha na autenticação do Google')}
            theme="outline"
            size="large"
            text="signup_with"
            width="100%"
          />
        </div>

        <div className="auth-divider">ou</div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <div className="input-group">
            <label htmlFor="reg-name">Nome</label>
            <input
              id="reg-name"
              type="text"
              placeholder="Seu nome completo"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="reg-cpf">CPF</label>
            <div className="cpf-input-wrapper">
              <input
                id="reg-cpf"
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                required
                maxLength={14}
                style={cpfTouched && isCpfComplete ? {
                  borderColor: isCpfValid ? 'var(--success)' : 'var(--danger)',
                  paddingRight: 40
                } : { paddingRight: 40 }}
              />
              {cpfTouched && isCpfComplete && (
                <span className={`cpf-status ${isCpfValid ? 'valid' : 'invalid'}`}>
                  {isCpfValid ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  )}
                </span>
              )}
            </div>
            {cpfTouched && isCpfComplete && !isCpfValid && (
              <span className="cpf-error">CPF invalido</span>
            )}
          </div>
          <div className="input-group">
            <label htmlFor="reg-password">Senha</label>
            <input
              id="reg-password"
              type="password"
              placeholder="Minimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="reg-age">Idade</label>
              <input
                id="reg-age"
                type="number"
                placeholder="18"
                min={18}
                max={99}
                value={age}
                onChange={e => setAge(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="reg-gender">Genero</label>
              <select
                id="reg-gender"
                value={gender}
                onChange={e => setGender(e.target.value)}
                required
              >
                <option value="">Selecione</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="O">Outro</option>
              </select>
            </div>
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="btn-loader" /> : 'Criar Conta'}
          </button>
        </form>
        <p className="auth-switch">
          Ja tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
