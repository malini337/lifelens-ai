import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

function LensMark() {
  return (
    <svg className="lens-mark" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="29" cy="29" r="14" fill="none" stroke="currentColor" strokeWidth="5" />
      <path d="M39.5 39.5L52 52" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M22 29.5l5 5 9-10.5" fill="none" stroke="#5fd0d6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Navbar() {
  const { user, logout, updateProfile } = useAuth();
  const { lang, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const close = () => setOpen(false);

  const changeLanguage = (next) => {
    setLanguage(next);
    // Remember the choice on the account too (best effort - the UI already switched).
    if (user && user.preferredLanguage !== next) updateProfile({ preferredLanguage: next }).catch(() => {});
  };

  const handleLogout = () => {
    close();
    logout();
    navigate('/');
  };

  const links = user
    ? [
        ['/', t('nav.home'), true],
        ['/dashboard', t('nav.dashboard')],
        ['/analyze', t('nav.analyze')],
        ['/tasks', t('nav.tasks')],
        ['/deadlines', t('nav.deadlines')],
        ['/history', t('nav.history')],
        ['/profile', t('nav.profile')],
      ]
    : [
        ['/', t('nav.home'), true],
        ['/login', t('nav.login')],
        ['/register', t('nav.register')],
      ];

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" onClick={close}>
          <LensMark />
          <span>LifeLens AI</span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          aria-label={t('nav.menu')}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true">{open ? '✕' : '☰'}</span>
        </button>

        <nav id="main-nav" className={`nav-links ${open ? 'open' : ''}`} aria-label="Main">
          {links.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')} onClick={close}>
              {label}
            </NavLink>
          ))}

          <div className="lang-switch" role="group" aria-label={t('nav.language')}>
            <button type="button" aria-pressed={lang === 'en'} onClick={() => changeLanguage('en')}>
              EN
            </button>
            <button type="button" aria-pressed={lang === 'ta'} onClick={() => changeLanguage('ta')} lang="ta">
              தமிழ்
            </button>
          </div>

          {user && (
            <button type="button" className="btn btn-outline-light btn-sm" onClick={handleLogout}>
              {t('nav.logout')}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
