import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import '../styles/profile.css';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [age, setAge] = useState(String(user?.age || ''));
  const [gender, setGender] = useState(user?.gender || '');
  const [maxDistance, setMaxDistance] = useState(user?.maxDistance || 50);
  const [minAge, setMinAge] = useState(user?.minAge || 18);
  const [maxAge, setMaxAge] = useState(user?.maxAge || 100);
  const [genderPreference, setGenderPreference] = useState(user?.genderPreference || 'Todos');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updated = await api.updateProfile({
        name,
        bio,
        age: parseInt(age),
        gender,
        maxDistance,
        minAge,
        maxAge,
        genderPreference,
        interests
      } as any);
      updateUser(updated);
      setMessage('Perfil atualizado com sucesso');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File, type: 'profile' | 'cover') => {
    try {
      if (type === 'profile') {
        const { profilePhoto } = await api.uploadProfilePhoto(file);
        updateUser({ ...user!, profilePhoto });
        setMessage('Foto de perfil atualizada');
      } else {
        const { coverPhoto } = await api.uploadCoverPhoto(file);
        updateUser({ ...user!, coverPhoto });
        setMessage('Foto de capa atualizada');
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('Erro ao enviar foto: ' + err.message);
    }
  };

  const addInterest = () => {
    const trimmed = newInterest.trim();
    if (trimmed && !interests.includes(trimmed) && interests.length < 8) {
      setInterests([...interests, trimmed]);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const handleInterestKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInterest();
    }
  };

  const getProfileImage = () => {
    if (!user?.profilePhoto) return '';
    if (user.profilePhoto.startsWith('http')) return user.profilePhoto;
    return user.profilePhoto;
  };

  const getCoverImage = () => {
    if (!user?.coverPhoto) return '';
    if (user.coverPhoto.startsWith('http')) return user.coverPhoto;
    return user.coverPhoto;
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div
          className="cover-photo"
          style={getCoverImage() ? { backgroundImage: `url(${getCoverImage()})` } : {}}
          onClick={() => coverInputRef.current?.click()}
        >
          <div className="cover-overlay">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span>Alterar capa</span>
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={e => {
              if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0], 'cover');
            }}
          />
        </div>
        <div className="profile-avatar-wrapper">
          <div
            className="profile-avatar"
            onClick={() => profileInputRef.current?.click()}
          >
            {getProfileImage() ? (
              <img src={getProfileImage()} alt={user?.name} />
            ) : (
              <span className="avatar-placeholder">{user?.name?.charAt(0)}</span>
            )}
            <div className="avatar-edit-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </div>
          <input
            ref={profileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={e => {
              if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0], 'profile');
            }}
          />
        </div>
      </div>

      <div className="profile-form">
        <h2>Editar Perfil</h2>

        {message && (
          <div className={`profile-message ${message.includes('Erro') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <span className="profile-section-title">Informacoes basicas</span>

        <div className="input-group">
          <label htmlFor="profile-name">Nome</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Seu nome"
          />
        </div>

        <div className="input-group">
          <label htmlFor="profile-bio">Bio</label>
          <textarea
            id="profile-bio"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Conte algo sobre voce..."
            rows={3}
            maxLength={300}
          />
          <span className="char-count">{bio.length}/300</span>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label htmlFor="profile-age">Idade</label>
            <input
              id="profile-age"
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
              min={18}
              max={99}
            />
          </div>
          <div className="input-group">
            <label htmlFor="profile-gender">Genero</label>
            <select
              id="profile-gender"
              value={gender}
              onChange={e => setGender(e.target.value)}
            >
              <option value="">Selecione</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="O">Outro</option>
            </select>
          </div>
        </div>

        <span className="profile-section-title">Descoberta</span>
        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label htmlFor="profile-distance" style={{ marginBottom: 0 }}>Distância Máxima</label>
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
              {maxDistance >= 500 ? '🌎 Global' : `${maxDistance} km`}
            </span>
          </div>
          <input
            id="profile-distance"
            type="range"
            min={1}
            max={500}
            step={1}
            value={maxDistance}
            onChange={e => setMaxDistance(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
        </div>

        <div className="input-row">
          <div className="input-group">
            <label htmlFor="profile-min-age">Idade Mínima ({minAge})</label>
            <input
              id="profile-min-age"
              type="range"
              min={18}
              max={100}
              value={minAge}
              onChange={e => setMinAge(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
          </div>
          <div className="input-group">
            <label htmlFor="profile-max-age">Idade Máxima ({maxAge})</label>
            <input
              id="profile-max-age"
              type="range"
              min={18}
              max={100}
              value={maxAge}
              onChange={e => setMaxAge(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="profile-gender-pref">Mostrar-me</label>
          <select
            id="profile-gender-pref"
            value={genderPreference}
            onChange={e => setGenderPreference(e.target.value)}
          >
            <option value="Todos">Todos</option>
            <option value="M">Homens</option>
            <option value="F">Mulheres</option>
            <option value="O">Outros</option>
          </select>
        </div>

        <span className="profile-section-title">Interesses</span>

        <div className="interests-container">
          {interests.map(interest => (
            <div key={interest} className="interest-chip">
              {interest}
              <button onClick={() => removeInterest(interest)} title="Remover">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>

        {interests.length < 8 && (
          <div className="add-interest-input">
            <input
              type="text"
              value={newInterest}
              onChange={e => setNewInterest(e.target.value)}
              onKeyDown={handleInterestKeyDown}
              placeholder="Adicionar interesse"
              maxLength={20}
            />
            <button className="add-interest-btn" onClick={addInterest}>
              Adicionar
            </button>
          </div>
        )}

        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? <span className="btn-loader" /> : 'Salvar Alteracoes'}
        </button>
      </div>
    </div>
  );
}
