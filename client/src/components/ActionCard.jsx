// One task. Handles its own API calls (complete, change priority, reminder, delete) and tells the
// page what changed through callbacks, so every page can reuse it.
import { useState } from 'react';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PriorityBadge from './PriorityBadge';
import { deadlineState, formatDate, formatDateTime, toLocalInputValue, defaultReminderTime } from '../utils/dateHelpers';
import { localizeAction } from '../utils/localize';
import { notificationStatus, requestNotificationPermission } from '../hooks/useReminders';

function DeadlineChip({ deadline }) {
  const { t, lang } = useLanguage();
  const { state, days } = deadlineState(deadline);

  if (state === 'none') {
    return <span className="due due-none">{t('card.deadline')}: {t('common.notIdentified')}</span>;
  }

  let label;
  if (state === 'overdue') label = days === 1 ? t('card.due.overdueOne') : t('card.due.overdue', { n: days });
  else if (state === 'today') label = t('card.due.today');
  else if (days === 1) label = t('card.due.tomorrow');
  else label = t('card.due.inDays', { n: days });

  const symbol = state === 'overdue' ? '!' : state === 'today' ? '●' : '○';
  return (
    <span className={`due due-${state}`}>
      <span aria-hidden="true">{symbol}</span> {label} · {formatDate(deadline, lang)}
    </span>
  );
}

export default function ActionCard({ action, reminder, onUpdated, onDeleted, onReminderChanged, compact = false }) {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [showReminder, setShowReminder] = useState(false);
  const [reminderValue, setReminderValue] = useState('');

  const text = localizeAction(action, lang);
  const completed = action.status === 'Completed';

  // Runs an API call with shared busy/error handling.
  const run = async (fn) => {
    setBusy(true);
    setError('');
    setNote('');
    try {
      await fn();
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  const toggleComplete = () =>
    run(async () => {
      const res = await api.patch(`/actions/${action._id}`, { status: completed ? 'Pending' : 'Completed' });
      onUpdated?.(res.data.action);
    });

  const changePriority = (event) =>
    run(async () => {
      const res = await api.patch(`/actions/${action._id}`, { priority: event.target.value });
      onUpdated?.(res.data.action);
    });

  const remove = () => {
    if (!window.confirm(t('card.confirmDelete'))) return;
    run(async () => {
      await api.delete(`/actions/${action._id}`);
      onDeleted?.(action._id);
    });
  };

  const openReminderForm = () => {
    const start = reminder ? new Date(reminder.reminderDate) : defaultReminderTime(action.deadline);
    setReminderValue(toLocalInputValue(start));
    setShowReminder(true);
    setError('');
    setNote('');
  };

  const saveReminder = (event) => {
    event.preventDefault();
    const when = new Date(reminderValue);
    if (Number.isNaN(when.getTime())) {
      setError(t('card.reminderInvalid'));
      return;
    }
    // Ask for browser permission here (a user click), and only if the user wants browser alerts.
    const wantsBrowser = user?.notificationPreference !== 'none';
    const permissionPromise = wantsBrowser && notificationStatus() === 'default' ? requestNotificationPermission() : null;

    run(async () => {
      const res = await api.post('/reminders', { actionId: action._id, reminderDate: when.toISOString() });
      onReminderChanged?.(action._id, res.data.reminder);
      setShowReminder(false);

      const permission = permissionPromise ? await permissionPromise : notificationStatus();
      if (!wantsBrowser) setNote(t('card.reminderSavedInApp'));
      else if (permission === 'granted') setNote(t('card.reminderSavedBrowser'));
      else if (permission === 'unsupported') setNote(t('card.reminderUnsupported'));
      else setNote(t('card.reminderDenied'));
    });
  };

  const removeReminder = () =>
    run(async () => {
      await api.delete(`/reminders/${reminder._id}`);
      onReminderChanged?.(action._id, null);
    });

  if (compact) {
    return (
      <div className={`task-row ${completed ? 'is-done' : ''}`}>
        <button
          type="button"
          className="check"
          onClick={toggleComplete}
          disabled={busy}
          aria-label={completed ? t('card.reopen') : t('card.complete')}
          title={completed ? t('card.reopen') : t('card.complete')}
        >
          <span aria-hidden="true">{completed ? '✓' : ''}</span>
        </button>
        <div className="task-row-main">
          <span className="task-row-title">{text.title}</span>
          <DeadlineChip deadline={action.deadline} />
        </div>
        <PriorityBadge priority={action.priority} />
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <article className={`task-card priority-edge-${action.priority.toLowerCase()} ${completed ? 'is-done' : ''}`}>
      <div className="task-card-top">
        <h4>{text.title}</h4>
        <div className="task-card-badges">
          <PriorityBadge priority={action.priority} />
          <span className={`badge status-${action.status.toLowerCase()}`}>
            <span aria-hidden="true">{completed ? '✓' : '…'}</span> {t(`card.status.${action.status}`)}
          </span>
        </div>
      </div>

      {text.description && <p className="task-desc">{text.description}</p>}

      <div className="task-meta">
        <DeadlineChip deadline={action.deadline} />
        {completed && action.completedAt && (
          <span className="due due-none">{t('card.completedOn', { date: formatDate(action.completedAt, lang) })}</span>
        )}
      </div>

      {action.requiredItems?.length > 0 && (
        <div className="task-items">
          <span className="task-items-label">{t('card.needs')}</span>
          <ul>
            {action.requiredItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {reminder && !showReminder && (
        <p className="reminder-line">
          <span aria-hidden="true">⏰</span> {t('card.reminderAt', { when: formatDateTime(reminder.reminderDate, lang) })}{' '}
          <button type="button" className="link-btn" onClick={removeReminder} disabled={busy}>
            {t('card.removeReminder')}
          </button>
        </p>
      )}

      {showReminder && (
        <form className="reminder-form" onSubmit={saveReminder}>
          <label htmlFor={`reminder-${action._id}`}>{t('card.reminderTime')}</label>
          <input
            id={`reminder-${action._id}`}
            type="datetime-local"
            value={reminderValue}
            onChange={(e) => setReminderValue(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {t('card.saveReminder')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowReminder(false)}>
            {t('common.cancel')}
          </button>
        </form>
      )}

      {note && <p className="note" role="status">{note}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="task-actions">
        <button type="button" className={`btn btn-sm ${completed ? 'btn-ghost' : 'btn-primary'}`} onClick={toggleComplete} disabled={busy}>
          {completed ? t('card.reopen') : t('card.complete')}
        </button>
        {!completed && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={openReminderForm} disabled={busy}>
            {reminder ? t('card.changeReminder') : t('card.remind')}
          </button>
        )}
        <label className="priority-select">
          <span className="sr-only">{t('card.changePriority')}</span>
          <select value={action.priority} onChange={changePriority} disabled={busy} aria-label={t('card.changePriority')}>
            {['High', 'Medium', 'Low'].map((p) => (
              <option key={p} value={p}>
                {t('card.priorityOption', { level: t(`priority.${p}`) })}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-danger-ghost btn-sm" onClick={remove} disabled={busy}>
          {t('common.delete')}
        </button>
      </div>
    </article>
  );
}
