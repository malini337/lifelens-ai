// Dashboard: answers "What do I need to pay attention to today?" at a glance.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import useTasks from '../hooks/useTasks';
import ActionCard from '../components/ActionCard';
import EmptyState, { ErrorState, Loading } from '../components/EmptyState';
import { deadlineState, formatDate, toDateKey } from '../utils/dateHelpers';
import { localizeDocument } from '../utils/localize';

// Nearest deadline first; tasks without a deadline go last.
const byDeadline = (a, b) => {
  const ka = toDateKey(a.deadline) || '9999-12-31';
  const kb = toDateKey(b.deadline) || '9999-12-31';
  return ka.localeCompare(kb);
};

export default function Dashboard() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { actions, loading, error, reload, replaceAction, removeAction, changeReminder } = useTasks();
  const [documents, setDocuments] = useState([]);
  const [docError, setDocError] = useState('');
  const [docsLoading, setDocsLoading] = useState(true);

  useEffect(() => {
    api
      .get('/documents')
      .then((res) => setDocuments(res.data.documents))
      .catch((err) => setDocError(getErrorMessage(err, t)))
      .finally(() => setDocsLoading(false));
  }, [t]);

  const stats = useMemo(() => {
    const pending = actions.filter((a) => a.status === 'Pending');
    const completed = actions.filter((a) => a.status === 'Completed');
    const needsAttention = pending.filter((a) => ['overdue', 'today'].includes(deadlineState(a.deadline).state)).sort(byDeadline);
    const upcoming = pending.filter((a) => deadlineState(a.deadline).state === 'upcoming').sort(byDeadline);
    const byPriority = {
      High: pending.filter((a) => a.priority === 'High').sort(byDeadline),
      Medium: pending.filter((a) => a.priority === 'Medium').sort(byDeadline),
      Low: pending.filter((a) => a.priority === 'Low').sort(byDeadline),
    };
    const total = actions.length;
    return {
      pending,
      completed,
      needsAttention,
      upcoming,
      byPriority,
      upcomingCount: needsAttention.length + upcoming.length,
      percent: total === 0 ? 0 : Math.round((completed.length / total) * 100),
      total,
    };
  }, [actions]);

  if (loading || docsLoading) return <div className="container page"><Loading /></div>;
  if (error) return <div className="container page"><ErrorState message={error} onRetry={reload} /></div>;

  const renderRow = (action) => (
    <ActionCard
      key={action._id}
      action={action}
      compact
      onUpdated={replaceAction}
      onDeleted={removeAction}
      onReminderChanged={changeReminder}
    />
  );

  const isEmpty = documents.length === 0 && actions.length === 0;

  return (
    <div className="container page">
      <h1>{t('dashboard.hello', { name: user.name.split(' ')[0] })}</h1>
      <p className="lead">{t('dashboard.question')}</p>

      {isEmpty ? (
        <EmptyState icon="🔎" title={t('dashboard.emptyTitle')} text={t('dashboard.emptyText')}>
          <Link to="/analyze" className="btn btn-primary">{t('home.ctaPrimary')}</Link>
        </EmptyState>
      ) : (
        <>
          <dl className="stat-strip">
            <div><dt>{t('dashboard.documents')}</dt><dd>{documents.length}</dd></div>
            <div><dt>{t('dashboard.pending')}</dt><dd>{stats.pending.length}</dd></div>
            <div><dt>{t('dashboard.completed')}</dt><dd>{stats.completed.length}</dd></div>
            <div><dt>{t('dashboard.upcoming')}</dt><dd>{stats.upcomingCount}</dd></div>
          </dl>

          <div className="progress-block">
            <div className="progress-text">
              <strong>{t('dashboard.progress')}</strong>
              <span>{t('dashboard.progressText', { done: stats.completed.length, total: stats.total, percent: stats.percent })}</span>
            </div>
            <div className="meter meter-lg" role="img" aria-label={`${t('dashboard.progress')}: ${stats.percent}%`}>
              <span style={{ width: `${stats.percent}%` }} />
            </div>
          </div>

          <section className="block" aria-labelledby="today-title">
            <h2 id="today-title">{t('dashboard.today')}</h2>
            <p className="muted">{t('dashboard.todayHint')}</p>
            {stats.needsAttention.length === 0 ? (
              <EmptyState icon="✓" title={t('dashboard.todayEmpty')} />
            ) : (
              <div className="row-list">{stats.needsAttention.map(renderRow)}</div>
            )}
          </section>

          <section className="block" aria-labelledby="upcoming-title">
            <h2 id="upcoming-title">{t('dashboard.upcomingTitle')}</h2>
            {stats.upcoming.length === 0 ? (
              <p className="muted">{t('dashboard.upcomingEmpty')}</p>
            ) : (
              <div className="row-list">{stats.upcoming.slice(0, 5).map(renderRow)}</div>
            )}
            {stats.upcoming.length > 5 && (
              <p><Link to="/deadlines">{t('common.viewAll')}</Link></p>
            )}
          </section>

          <section className="block" aria-labelledby="priority-title">
            <h2 id="priority-title">{t('dashboard.byPriority')}</h2>
            <div className="priority-columns">
              {['High', 'Medium', 'Low'].map((level) => (
                <div key={level} className={`priority-col priority-col-${level.toLowerCase()}`}>
                  <h3>{t(`priority.${level}`)} <span className="count">{stats.byPriority[level].length}</span></h3>
                  {stats.byPriority[level].length === 0 ? (
                    <p className="muted small">{t('dashboard.noneHere')}</p>
                  ) : (
                    <div className="row-list">{stats.byPriority[level].slice(0, 4).map(renderRow)}</div>
                  )}
                </div>
              ))}
            </div>
            <p><Link to="/tasks">{t('dashboard.allTasks')}</Link></p>
          </section>

          <section className="block" aria-labelledby="recent-title">
            <h2 id="recent-title">{t('dashboard.recent')}</h2>
            {docError && <ErrorState message={docError} />}
            {documents.length === 0 ? (
              <p className="muted">{t('dashboard.noDocs')}</p>
            ) : (
              <ul className="doc-list">
                {documents.slice(0, 4).map((doc) => (
                  <li key={doc._id}>
                    <div>
                      <strong>{localizeDocument(doc, lang).title}</strong>
                      <span className="muted small"> {formatDate(doc.createdAt, lang)}</span>
                    </div>
                    <span className="chip">{t(`result.docType.${doc.documentType}`)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p><Link to="/history">{t('common.viewAll')}</Link></p>
          </section>
        </>
      )}
    </div>
  );
}
