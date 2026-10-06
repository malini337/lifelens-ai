import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import DocumentResult from '../components/DocumentResult';
import EmptyState, { ErrorState, Loading } from '../components/EmptyState';
import { formatDate } from '../utils/dateHelpers';
import { localizeDocument } from '../utils/localize';

export default function History() {
  const { t, lang } = useLanguage();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({}); // id -> { document, actions }
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/documents');
      setDocuments(res.data.documents);
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (id) => {
    setDetailError('');
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (details[id]) return;
    setDetailLoading(true);
    try {
      const res = await api.get(`/documents/${id}`);
      setDetails((current) => ({ ...current, [id]: res.data }));
    } catch (err) {
      setDetailError(getErrorMessage(err, t));
    } finally {
      setDetailLoading(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm(t('history.confirmDelete'))) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((current) => current.filter((d) => d._id !== id));
      if (openId === id) setOpenId(null);
    } catch (err) {
      setError(getErrorMessage(err, t));
    }
  };

  if (loading) return <div className="container page"><Loading /></div>;

  return (
    <div className="container page">
      <h1>{t('history.title')}</h1>
      <p className="lead">{t('history.sub')}</p>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && documents.length === 0 ? (
        <EmptyState icon="🗂" title={t('history.emptyTitle')} text={t('history.emptyText')}>
          <Link to="/analyze" className="btn btn-primary">{t('home.ctaPrimary')}</Link>
        </EmptyState>
      ) : (
        <ul className="history-list">
          {documents.map((doc) => {
            const view = localizeDocument(doc, lang);
            const open = openId === doc._id;
            return (
              <li key={doc._id} className="history-item">
                <div className="history-row">
                  <div className="history-main">
                    <strong>{view.title}</strong>
                    <span className="muted small">
                      {formatDate(doc.createdAt, lang)} · {t(`result.source.${doc.sourceType}`)}
                    </span>
                    <span className="chip">{t(`result.docType.${doc.documentType}`)}</span>
                  </div>
                  <div className="history-buttons">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(doc._id)} aria-expanded={open}>
                      {open ? t('history.hide') : t('history.view')}
                    </button>
                    <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => remove(doc._id)}>
                      {t('common.delete')}
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="history-detail">
                    {detailLoading && !details[doc._id] && <Loading />}
                    {detailError && <ErrorState message={detailError} />}
                    {details[doc._id] && (
                      <DocumentResult document={details[doc._id].document} initialActions={details[doc._id].actions} />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
