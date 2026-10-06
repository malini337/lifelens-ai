import { useEffect } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import useReminders from './hooks/useReminders';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import EmptyState from './components/EmptyState';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Analyze from './pages/Analyze';
import MyTasks from './pages/MyTasks';
import Deadlines from './pages/Deadlines';
import History from './pages/History';
import Profile from './pages/Profile';

// In-app alerts for reminders that came due while LifeLens is open.
function ReminderAlerts({ reminders, onDismiss }) {
  const { t } = useLanguage();
  if (reminders.length === 0) return null;
  return (
    <div className="reminder-toasts" role="alert" aria-live="assertive">
      {reminders.map((reminder) => (
        <div key={reminder._id} className="toast">
          <div>
            <strong>{t('reminders.due')}</strong>
            <p>{reminder.title}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDismiss(reminder._id)}>
            {t('common.close')}
          </button>
        </div>
      ))}
    </div>
  );
}

function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="container page">
      <EmptyState icon="?" title={t('notFound.title')} text={t('notFound.text')}>
        <Link to="/" className="btn btn-primary">{t('nav.home')}</Link>
      </EmptyState>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const { lang, setLanguage, t } = useLanguage();
  const { dueReminders, dismiss } = useReminders({ enabled: Boolean(user), browserAllowed: user?.notificationPreference !== 'none' });

  // When someone logs in (or the saved session loads), use the language saved on their account.
  useEffect(() => {
    if (user && user.preferredLanguage !== lang) setLanguage(user.preferredLanguage);
    // Only react to the user changing, not to every manual language switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const guard = (page) => <ProtectedRoute>{page}</ProtectedRoute>;

  return (
    <div className="app">
      <a href="#main" className="skip-link">{t('common.skip')}</a>
      <Navbar />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={guard(<Dashboard />)} />
          <Route path="/analyze" element={guard(<Analyze />)} />
          <Route path="/tasks" element={guard(<MyTasks />)} />
          <Route path="/deadlines" element={guard(<Deadlines />)} />
          <Route path="/history" element={guard(<History />)} />
          <Route path="/profile" element={guard(<Profile />)} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <ReminderAlerts reminders={dueReminders} onDismiss={dismiss} />
      <footer className="footer">
        <div className="container">
          <p><strong>LifeLens AI</strong> — {t('footer.tagline')}</p>
          <p className="muted small">{t('common.disclaimer')}</p>
        </div>
      </footer>
    </div>
  );
}
