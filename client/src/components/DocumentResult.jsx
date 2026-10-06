// Shows one analyzed document: extracted facts, AI interpretation, and the resulting tasks.
// Used by the Analyze page (fresh result) and the History page (saved result).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import ActionCard from './ActionCard';
import EmptyState from './EmptyState';
import { formatDate } from '../utils/dateHelpers';
import { hasTamil, localizeDocument } from '../utils/localize';

export default function DocumentResult({ document, initialActions, usedFallback, justAnalyzed = false }) {
  const { t, lang, setLanguage } = useLanguage();
  const [actions, setActions] = useState(initialActions || []);
  const [reminders, setReminders] = useState({});

  // Load existing reminders so the cards can show them.
  useEffect(() => {
    let cancelled = false;
    api
      .get('/reminders')
      .then((res) => {
        if (cancelled) return;
        const map = {};
        res.data.reminders.forEach((r) => {
          map[r.actionId] = r;
        });
        setReminders(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const view = localizeDocument(document, lang);
  const tamilAvailable = hasTamil(document);
  const fallbackUsed = usedFallback ?? document.usedFallback;

  const updateAction = (updated) => setActions((list) => list.map((a) => (a._id === updated._id ? updated : a)));
  const removeAction = (id) => setActions((list) => list.filter((a) => a._id !== id));
  const changeReminder = (actionId, reminder) =>
    setReminders((map) => {
      const next = { ...map };
      if (reminder) next[actionId] = reminder;
      else delete next[actionId];
      return next;
    });

  return (
    <div className="result">
      <div className="result-head">
        <div>
          <h2>{view.title}</h2>
          <p className="result-sub">
            <span className="chip">{t(`result.docType.${document.documentType}`)}</span>
            <span className="chip">{t(`result.source.${document.sourceType}`)}</span>
            {document.originalFileName && <span className="chip">{document.originalFileName}</span>}
          </p>
        </div>
        <div className="result-tools">
          {lang === 'en' ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLanguage('ta')} lang="ta">
              {t('result.viewTamil')}
            </button>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLanguage('en')}>
              {t('result.viewEnglish')}
            </button>
          )}
        </div>
      </div>

      {fallbackUsed && (
        <div className="alert alert-warn" role="status">
          <div>
            <strong>{t('result.fallbackBanner')}</strong>
            <p>{t('result.fallbackNote')}</p>
          </div>
        </div>
      )}

      {lang === 'ta' && !tamilAvailable && (
        <div className="alert alert-info" role="status">
          <p>{t('result.noTamil')}</p>
        </div>
      )}

      <div className="result-columns">
        <section className="panel panel-extracted" aria-labelledby="extracted-title">
          <h3 id="extracted-title">{t('result.extractedTitle')}</h3>
          <p className="panel-hint">{t('result.extractedHint')}</p>

          <h4>{t('result.importantInfo')}</h4>
          {view.importantInformation.length > 0 ? (
            <ul className="marked-list">
              {view.importantInformation.map((item, i) => (
                <li key={i}>
                  <mark className="marker">{item}</mark>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('common.notIdentified')}</p>
          )}

          <h4>{t('result.dates')}</h4>
          {document.dates?.length > 0 ? (
            <ul className="date-list">
              {document.dates.map((d, i) => (
                <li key={i}>
                  <span className="date-label">{d.label || t('result.date')}</span>
                  <mark className="marker">{d.date ? formatDate(d.date, lang) : t('common.notIdentified')}</mark>
                  {d.description && <span className="date-desc">{d.description}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('common.notIdentified')}</p>
          )}

          <h4>{t('result.requirements')}</h4>
          {view.requirements.length > 0 ? (
            <ul className="marked-list">
              {view.requirements.map((item, i) => (
                <li key={i}>
                  <mark className="marker">{item}</mark>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('common.notIdentified')}</p>
          )}
        </section>

        <section className="panel panel-ai" aria-labelledby="ai-title">
          <h3 id="ai-title">{t('result.interpretationTitle')}</h3>
          <p className="panel-hint">{t('result.interpretationHint')}</p>

          <h4>{t('result.summary')}</h4>
          <p className="summary-text">{view.summary === 'Not clearly identified' ? t('common.notIdentified') : view.summary}</p>

          {view.warnings.length > 0 && (
            <>
              <h4>{t('result.warnings')}</h4>
              <ul className="plain-list">
                {view.warnings.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </>
          )}

          <h4>{t('result.confidence')}</h4>
          <div className="meter" role="img" aria-label={`${t('result.confidence')}: ${document.confidence}%`}>
            <span style={{ width: `${document.confidence}%` }} />
          </div>
          <p className="muted small">{t('result.confidenceNote', { n: document.confidence })}</p>
        </section>
      </div>

      <section className="result-actions" aria-labelledby="actions-title">
        <h3 id="actions-title">{t('result.actions')}</h3>
        {justAnalyzed && actions.length > 0 && (
          <div className="alert alert-success" role="status">
            <p>
              {t('result.addedToTasks')} <Link to="/tasks">{t('result.goToTasks')}</Link>
            </p>
          </div>
        )}
        {actions.length === 0 ? (
          <EmptyState icon="✓" title={t('result.noActions')} text={t('result.noActionsHint')} />
        ) : (
          <div className="task-list">
            {actions.map((action) => (
              <ActionCard
                key={action._id}
                action={action}
                reminder={reminders[action._id]}
                onUpdated={updateAction}
                onDeleted={removeAction}
                onReminderChanged={changeReminder}
              />
            ))}
          </div>
        )}
      </section>

      <p className="disclaimer">{t('common.disclaimer')}</p>
    </div>
  );
}
