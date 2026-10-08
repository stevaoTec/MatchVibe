import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import './Admin.css';

interface AdminStats {
  totalUsers: number;
  onlineUsers: number;
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.email !== 'steven35silva@gmail.com') {
      navigate('/');
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await api.get('/users/admin/stats');
        setStats(res.data);
      } catch (err: any) {
        setError('Erro ao carregar estatísticas.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  if (loading) return <div className="admin-loading">Carregando painel...</div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Painel do Dono 👑</h1>
        <p>Bem-vindo, {user?.name}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon users-icon">👥</div>
          <div className="stat-info">
            <h3>Usuários Cadastrados</h3>
            <span className="stat-number">{stats?.totalUsers || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon online-icon">🟢</div>
          <div className="stat-info">
            <h3>Usuários Online</h3>
            <span className="stat-number">{stats?.onlineUsers || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
