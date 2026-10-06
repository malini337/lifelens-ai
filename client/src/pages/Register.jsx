import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Register() {
  const { t, lang, setLanguage } = useLanguage();
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const update = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError(t('auth.passwordShort'));
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, preferredLanguage: lang });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, t));
      setLoading(false);
    }
  };

  return (
    <div className="container narrow auth-page">
      <h1>{t('auth.registerTitle')}</h1>
      <p className="lead">{t('auth.registerSub')}</p>

      <form className="card form" onSubmit={handleSubmit} noValidate>
        {error && <div className="alert alert-error" role="alert"><p>{error}</p></div>}

        <label className="field">
          <span>{t('auth.name')}</span>
          <input type="text" value={form.name} onChange={update('name')} autoComplete="name" maxLength={80} required />
        </label>
        <label className="field">
          <span>{t('auth.email')}</span>
          <input type="email" value={form.email} onChange={update('email')} autoComplete="email" required />
        </label>
        <label className="field">
          <span>{t('auth.password')}</span>
          <input type="password" value={form.password} onChange={update('password')} autoComplete="new-password" minLength={8} required />
          <small>{t('auth.passwordHint')}</small>
        </label>
        <label className="field">
          <span>{t('auth.language')}</span>
          <select value={lang} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="ta">தமிழ் (Tamil)</option>
          </select>
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading || !form.name || !form.email || !form.password}>
          {loading ? t('auth.registering') : t('auth.registerButton')}
        </button>
      </form>

      <p className="auth-switch">
        {t('auth.haveAccount')} <Link to="/login">{t('nav.login')}</Link>
      </p>
    </div>
  );
}
