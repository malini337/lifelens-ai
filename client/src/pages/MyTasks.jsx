import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import useTasks from '../hooks/useTasks';
import ActionCard from '../components/ActionCard';
import EmptyState, { ErrorState, Loading } from '../components/EmptyState';
import { toDateKey } from '../utils/dateHelpers';

const RANK = { High: 0, Medium: 1, Low: 2 };

export default function MyTasks() {
  const { t } = useLanguage();
  const { actions, reminders, loading, error, reload, replaceAction, removeAction, changeReminder } = useTasks();
  const [status, setStatus] = useState('Pending'); // Pending | Completed
  const [priority, setPriority] = useState('All'); // All | High | Medium | Low

  const inStatus = useMemo(() => actions.filter((a) => a.status === status), [actions, status]);

  const visible = useMemo(() => {
    const filtered = priority === 'All' ? inStatus : inStatus.filter((a) => a.priority === priority);
    return [...filtered].sort((a, b) => {
      if (status === 'Completed') return new Date(b.completedAt || 0) - new Date(a.completedAt || 0);
      if (RANK[a.priority] !== RANK[b.priority]) return RANK[a.priority] - RANK[b.priority];
      return (toDateKey(a.deadline) || '9999-12-31').localeCompare(toDateKey(b.deadline) || '9999-12-31');
    });
  }, [inStatus, priority, status]);

  const count = (level) => (level === 'All' ? inStatus.length : inStatus.filter((a) => a.priority === level).length);
  const pendingTotal = actions.filter((a) => a.status === 'Pending').length;
  const completedTotal = actions.filter((a) => a.status === 'Completed').length;

  if (loading) return <div className="container page"><Loading /></div>;
  if (error) return <div className="container page"><ErrorState message={error} onRetry={reload} /></div>;

  return (
    <div className="container page">
      <h1>{t('tasks.title')}</h1>
      <p className="lead">{t('tasks.sub')}</p>

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label={t('tasks.statusFilter')}>
          <button type="button" role="tab" aria-selected={status === 'Pending'} className={status === 'Pending' ? 'tab active' : 'tab'} onClick={() => setStatus('Pending')}>
            {t('tasks.pending')} <span className="count">{pendingTotal}</span>
          </button>
          <button type="button" role="tab" aria-selected={status === 'Completed'} className={status === 'Completed' ? 'tab active' : 'tab'} onClick={() => setStatus('Completed')}>
            {t('tasks.completed')} <span className="count">{completedTotal}</span>
          </button>
        </div>

        <div className="chips" role="group" aria-label={t('tasks.priorityFilter')}>
          {['All', 'High', 'Medium', 'Low'].map((level) => (
            <button key={level} type="button" className={priority === level ? 'chip-btn active' : 'chip-btn'} aria-pressed={priority === level} onClick={() => setPriority(level)}>
              {level === 'All' ? t('tasks.all') : t(`priority.${level}`)} <span className="count">{count(level)}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        actions.length === 0 ? (
          <EmptyState icon="📝" title={t('tasks.emptyTitle')} text={t('tasks.emptyText')}>
            <Link to="/analyze" className="btn btn-primary">{t('home.ctaPrimary')}</Link>
          </EmptyState>
        ) : (
          <EmptyState icon="✓" title={status === 'Pending' ? t('tasks.noPending') : t('tasks.noCompleted')} />
        )
      ) : (
        <div className="task-list">
          {visible.map((action) => (
            <ActionCard
              key={action._id}
              action={action}
              reminder={reminders[action._id]}
              onUpdated={replaceAction}
              onDeleted={removeAction}
              onReminderChanged={changeReminder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
