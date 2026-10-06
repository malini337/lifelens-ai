// Camera flow: Open camera -> live preview -> Capture -> Preview -> Use this photo (or Retake).
// Nothing is uploaded here; the parent decides when to send the photo for analysis.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const MAX_WIDTH = 1600; // keeps the photo comfortably under the upload limit

export default function CameraCapture({ onUse }) {
  const { t } = useLanguage();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | starting | live | captured
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null); // { file, url }

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Release the camera and any preview URL when leaving the page.
  useEffect(() => () => stopStream(), [stopStream]);
  useEffect(() => () => photo && URL.revokeObjectURL(photo.url), [photo]);

  const startCamera = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t('camera.errUnsupported'));
      return;
    }
    setStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setStatus('live');
    } catch (err) {
      setStatus('idle');
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') setError(t('camera.errDenied'));
      else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') setError(t('camera.errNone'));
      else setError(t('camera.errGeneric'));
    }
  };

  // Attach the stream once the <video> element exists.
  useEffect(() => {
    if (status === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [status]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError(t('camera.errGeneric'));
          return;
        }
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        setPhoto({ file, url: URL.createObjectURL(blob) });
        stopStream();
        setStatus('captured');
      },
      'image/jpeg',
      0.85
    );
  };

  const retake = () => {
    setPhoto(null);
    startCamera();
  };

  const close = () => {
    stopStream();
    setPhoto(null);
    setStatus('idle');
  };

  return (
    <div className="camera">
      {error && (
        <div className="alert alert-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {status === 'idle' && (
        <div className="camera-intro">
          <p>{t('camera.hint')}</p>
          <button type="button" className="btn btn-primary" onClick={startCamera}>
            {t('camera.open')}
          </button>
        </div>
      )}

      {status === 'starting' && (
        <div className="loading" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>{t('camera.starting')}</span>
        </div>
      )}

      {status === 'live' && (
        <div className="camera-stage">
          <video ref={videoRef} playsInline muted className="camera-video" aria-label={t('camera.liveAlt')} />
          <div className="camera-controls">
            <button type="button" className="btn btn-primary" onClick={capture}>
              {t('camera.capture')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={close}>
              {t('camera.close')}
            </button>
          </div>
        </div>
      )}

      {status === 'captured' && photo && (
        <div className="camera-stage">
          <img src={photo.url} alt={t('camera.previewAlt')} className="camera-video" />
          <div className="camera-controls">
            <button type="button" className="btn btn-primary" onClick={() => onUse(photo.file)}>
              {t('camera.use')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={retake}>
              {t('camera.retake')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
