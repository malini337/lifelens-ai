import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const { t } = useLanguage();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, t));
      setLoading(false);
    }
  };

  return (
    <div className="container narrow auth-page">
      <h1>{t('auth.loginTitle')}</h1>
      <p className="lead">{t('auth.loginSub')}</p>

      <form className="card form" onSubmit={handleSubmit} noValidate>
        {error && <div className="alert alert-error" role="alert"><p>{error}</p></div>}

        <label className="field">
          <span>{t('auth.email')}</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="field">
          <span>{t('auth.password')}</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading || !email || !password}>
          {loading ? t('auth.loggingIn') : t('auth.loginButton')}
        </button>
      </form>

      <p className="auth-switch">
        {t('auth.noAccount')} <Link to="/register">{t('nav.register')}</Link>
      </p>
    </div>
  );
}
