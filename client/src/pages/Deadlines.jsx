import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import useTasks from '../hooks/useTasks';
import ActionCard from '../components/ActionCard';
import EmptyState, { ErrorState, Loading } from '../components/EmptyState';
import { deadlineState, toDateKey } from '../utils/dateHelpers';

const GROUPS = ['overdue', 'today', 'week', 'later', 'none'];

export default function Deadlines() {
  const { t } = useLanguage();
  const { actions, reminders, loading, error, reload, replaceAction, removeAction, changeReminder } = useTasks();

  const grouped = useMemo(() => {
    const result = { overdue: [], today: [], week: [], later: [], none: [] };
    actions
      .filter((a) => a.status === 'Pending')
      .forEach((a) => {
        const { state, days } = deadlineState(a.deadline);
        if (state === 'overdue') result.overdue.push(a);
        else if (state === 'today') result.today.push(a);
        else if (state === 'upcoming') (days <= 7 ? result.week : result.later).push(a);
        else result.none.push(a);
      });
    const byDate = (a, b) => toDateKey(a.deadline).localeCompare(toDateKey(b.deadline));
    ['overdue', 'today', 'week', 'later'].forEach((key) => result[key].sort(byDate));
    return result;
  }, [actions]);

  if (loading) return <div className="container page"><Loading /></div>;
  if (error) return <div className="container page"><ErrorState message={error} onRetry={reload} /></div>;

  const pendingCount = GROUPS.reduce((sum, key) => sum + grouped[key].length, 0);

  return (
    <div className="container page">
      <h1>{t('deadlines.title')}</h1>
      <p className="lead">{t('deadlines.sub')}</p>

      {pendingCount === 0 ? (
        <EmptyState icon="📅" title={t('deadlines.emptyTitle')} text={t('deadlines.emptyText')}>
          <Link to="/analyze" className="btn btn-primary">{t('home.ctaPrimary')}</Link>
        </EmptyState>
      ) : (
        GROUPS.filter((key) => grouped[key].length > 0).map((key) => (
          <section key={key} className="block" aria-labelledby={`group-${key}`}>
            <h2 id={`group-${key}`} className={`group-title group-${key}`}>
              {t(`deadlines.groups.${key}`)} <span className="count">{grouped[key].length}</span>
            </h2>
            {key === 'none' && <p className="muted">{t('deadlines.noneHint')}</p>}
            <div className="task-list">
              {grouped[key].map((action) => (
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
          </section>
        ))
      )}
    </div>
  );
}
