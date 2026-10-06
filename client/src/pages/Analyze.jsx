// Analyze: upload a file, take a photo, or paste text -> backend -> AI -> structured result.
import { useEffect, useMemo, useRef, useState } from 'react';
import api, { getErrorMessage } from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import CameraCapture from '../components/CameraCapture';
import DocumentResult from '../components/DocumentResult';
import { todayKey } from '../utils/dateHelpers';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'];
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.txt'];
const MAX_TEXT = 20000;

const SAMPLE_NOTICE = `Internal Assessment Notice

Students must submit the completed project report by 15 October 2026.

The report must include the signed approval form.

Students who fail to submit before the deadline may not be considered for evaluation.`;

const formatSize = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export default function Analyze() {
  const { t } = useLanguage();
  const [mode, setMode] = useState('upload'); // upload | camera | text
  const [file, setFile] = useState(null);
  const [fileSource, setFileSource] = useState('upload'); // upload | camera
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  const photoUrl = useMemo(() => (file && fileSource === 'camera' ? URL.createObjectURL(file) : ''), [file, fileSource]);
  useEffect(() => () => photoUrl && URL.revokeObjectURL(photoUrl), [photoUrl]);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

  const chooseFile = (event) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;
    const extension = picked.name.slice(picked.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_TYPES.includes(picked.type) && !ALLOWED_EXTENSIONS.includes(extension)) {
      setError(t('analyze.errType'));
      return;
    }
    if (picked.size > MAX_FILE_SIZE) {
      setError(t('analyze.errSize'));
      return;
    }
    if (picked.size === 0) {
      setError(t('analyze.errEmpty'));
      return;
    }
    setError('');
    setFile(picked);
    setFileSource('upload');
  };

  const useCameraPhoto = (photo) => {
    setError('');
    setFile(photo);
    setFileSource('camera');
  };

  const clearFile = () => {
    setFile(null);
    setError('');
  };

  const hasInput = mode === 'text' ? text.trim().length >= 10 : Boolean(file) && fileSource === (mode === 'camera' ? 'camera' : 'upload');

  const analyze = async () => {
    setError('');
    if (!hasInput) {
      setError(mode === 'text' ? t('analyze.errTextShort') : t('analyze.errNoFile'));
      return;
    }
    if (mode === 'text' && text.length > MAX_TEXT) {
      setError(t('analyze.errTextLong'));
      return;
    }

    const form = new FormData();
    form.append('today', todayKey());
    if (mode === 'text') {
      form.append('text', text.trim());
    } else {
      form.append('file', file);
      form.append('sourceType', mode === 'camera' ? 'camera' : 'file');
    }

    setLoading(true);
    try {
      const res = await api.post('/analyze', form);
      setResult(res.data);
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setFile(null);
    setText('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabs = [
    ['upload', t('analyze.tabUpload')],
    ['camera', t('analyze.tabCamera')],
    ['text', t('analyze.tabText')],
  ];

  return (
    <div className="container page">
      <h1>{t('analyze.title')}</h1>
      <p className="lead">{t('analyze.sub')}</p>

      <div className="card analyze-card">
        <div className="tabs" role="tablist" aria-label={t('analyze.title')}>
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              className={mode === key ? 'tab active' : 'tab'}
              onClick={() => switchMode(key)}
              disabled={loading}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="tab-panel" role="tabpanel">
          {mode === 'upload' && (
            <>
              {file && fileSource === 'upload' ? (
                <div className="file-chip">
                  <span aria-hidden="true">📄</span>
                  <span className="file-name">{file.name}</span>
                  <span className="muted small">{formatSize(file.size)}</span>
                  <button type="button" className="link-btn" onClick={clearFile} disabled={loading}>
                    {t('analyze.remove')}
                  </button>
                </div>
              ) : (
                <label className="dropzone">
                  <input type="file" accept={ALLOWED_EXTENSIONS.join(',')} onChange={chooseFile} disabled={loading} />
                  <strong>{t('analyze.dropTitle')}</strong>
                  <span>{t('analyze.dropHint')}</span>
                </label>
              )}
            </>
          )}

          {mode === 'camera' &&
            (file && fileSource === 'camera' ? (
              <div className="camera-stage">
                <img src={photoUrl} alt={t('camera.previewAlt')} className="camera-video" />
                <div className="camera-controls">
                  <span className="muted">{t('analyze.photoReady')}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={clearFile} disabled={loading}>
                    {t('camera.retake')}
                  </button>
                </div>
              </div>
            ) : (
              <CameraCapture onUse={useCameraPhoto} />
            ))}

          {mode === 'text' && (
            <div className="field">
              <label htmlFor="paste-text">{t('analyze.pasteLabel')}</label>
              <textarea
                id="paste-text"
                rows={9}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('analyze.pastePlaceholder')}
                disabled={loading}
              />
              <div className="field-row">
                <button type="button" className="link-btn" onClick={() => setText(SAMPLE_NOTICE)} disabled={loading}>
                  {t('analyze.useSample')}
                </button>
                <span className="muted small">{text.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            <p>{error}</p>
          </div>
        )}

        <div className="analyze-footer">
          <p className="muted small">{t('analyze.privacy')}</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={analyze} disabled={loading || !hasInput}>
            {loading ? t('analyze.working') : t('analyze.button')}
          </button>
        </div>

        {loading && (
          <div className="loading" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <span>{t('analyze.workingHint')}</span>
          </div>
        )}
      </div>

      {result && (
        <div ref={resultRef} className="result-wrap">
          <DocumentResult
            key={result.document._id}
            document={result.document}
            initialActions={result.actions}
            usedFallback={result.usedFallback}
            justAnalyzed
          />
          <div className="result-footer">
            <button type="button" className="btn btn-ghost" onClick={reset}>
              {t('analyze.another')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
