import { useEffect, useState } from 'react';
import { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { notificationStatus, requestNotificationPermission } from '../hooks/useReminders';

export default function Profile() {
  const { t, setLanguage } = useLanguage();
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    notificationPreference: user.notificationPreference,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [permission, setPermission] = useState(notificationStatus());

  useEffect(() => {
    if (!saved) return undefined;
    const timer = setTimeout(() => setSaved(false), 4000);
    return () => clearTimeout(timer);
  }, [saved]);

  const update = (field) => (event) => {
    setSaved(false);
    setForm((f) => ({ ...f, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const updated = await updateProfile(form);
      setLanguage(updated.preferredLanguage);
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  const enableNotifications = async () => {
    setPermission(await requestNotificationPermission());
  };

  return (
    <div className="container narrow page">
      <h1>{t('profile.title')}</h1>
      <p className="lead">{t('profile.sub')}</p>

      <form className="card form" onSubmit={handleSubmit} noValidate>
        {error && <div className="alert alert-error" role="alert"><p>{error}</p></div>}
        {saved && <div className="alert alert-success" role="status"><p>{t('profile.saved')}</p></div>}

        <label className="field">
          <span>{t('auth.name')}</span>
          <input type="text" value={form.name} onChange={update('name')} maxLength={80} required />
        </label>
        <label className="field">
          <span>{t('auth.email')}</span>
          <input type="email" value={form.email} onChange={update('email')} required />
        </label>
        <label className="field">
          <span>{t('auth.language')}</span>
          <select value={form.preferredLanguage} onChange={update('preferredLanguage')}>
            <option value="en">English</option>
            <option value="ta">தமிழ் (Tamil)</option>
          </select>
        </label>
        <label className="field">
          <span>{t('profile.notifications')}</span>
          <select value={form.notificationPreference} onChange={update('notificationPreference')}>
            <option value="browser">{t('profile.notifBrowser')}</option>
            <option value="none">{t('profile.notifNone')}</option>
          </select>
          <small>{t('profile.notifHint')}</small>
        </label>

        <button type="submit" className="btn btn-primary" disabled={saving || !form.name || !form.email}>
          {saving ? t('profile.saving') : t('common.save')}
        </button>
      </form>

      <section className="card block-card">
        <h2>{t('profile.permissionTitle')}</h2>
        <p>{t(`profile.permission.${permission}`)}</p>
        {permission === 'default' && (
          <button type="button" className="btn btn-ghost" onClick={enableNotifications}>
            {t('profile.enableNotifications')}
          </button>
        )}
      </section>
    </div>
  );
}
