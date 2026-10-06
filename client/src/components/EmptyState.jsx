import { useLanguage } from '../context/LanguageContext';

// Friendly "nothing here yet" panel. Children are optional buttons/links.
export default function EmptyState({ icon = '○', title, text, children }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children && <div className="empty-actions">{children}</div>}
    </div>
  );
}

export function Loading({ label }) {
  const { t } = useLanguage();
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label || t('common.loading')}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  const { t } = useLanguage();
  return (
    <div className="alert alert-error" role="alert">
      <div>
        <strong>{t('errors.title')}</strong>
        <p>{message || t('errors.generic')}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
