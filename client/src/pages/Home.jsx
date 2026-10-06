import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PriorityBadge from '../components/PriorityBadge';

// Turns "Pay [[the fee]] by [[Friday]]" into text with highlighted (marker) parts.
// The highlight sweep plays once on page load - the single animated moment on this page.
function Marked({ text }) {
  let delayIndex = 0;
  return text.split(/(\[\[.*?\]\])/g).map((part, i) => {
    if (part.startsWith('[[')) {
      const delay = 0.5 + delayIndex * 0.55;
      delayIndex += 1;
      return (
        <mark key={i} className="marker marker-sweep" style={{ animationDelay: `${delay}s` }}>
          {part.slice(2, -2)}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const steps = ['capture', 'understand', 'act', 'track'];
  const features = ['deadlines', 'priority', 'language', 'camera', 'extracted', 'reminders'];

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="hero-brand">LifeLens AI</p>
            <h1>{t('home.heroTitle')}</h1>
            <p className="hero-text">{t('home.heroText')}</p>
            <div className="hero-cta">
              <Link to="/analyze" className="btn btn-marker btn-lg">
                {t('home.ctaPrimary')}
              </Link>
              <a href="#how-it-works" className="btn btn-outline-light btn-lg">
                {t('home.ctaSecondary')}
              </a>
            </div>
            {!user && <p className="hero-sub">{t('home.freeNote')}</p>}
          </div>

          <div className="hero-demo" aria-label={t('home.demoLabel')}>
            <div className="notice-paper">
              <p className="notice-tag">{t('home.noticeLabel')}</p>
              <h2>{t('home.noticeTitle')}</h2>
              <p><Marked text={t('home.notice1')} /></p>
              <p><Marked text={t('home.notice2')} /></p>
              <p><Marked text={t('home.notice3')} /></p>
            </div>
            <div className="found-card">
              <p className="found-title">{t('home.found.title')}</p>
              <dl>
                <div><dt>{t('home.found.action')}</dt><dd>{t('home.found.actionValue')}</dd></div>
                <div><dt>{t('home.found.deadline')}</dt><dd>{t('home.found.deadlineValue')}</dd></div>
                <div><dt>{t('home.found.needs')}</dt><dd>{t('home.found.needsValue')}</dd></div>
                <div><dt>{t('home.found.priority')}</dt><dd><PriorityBadge priority="High" /></dd></div>
                <div><dt>{t('home.found.status')}</dt><dd>{t('card.status.Pending')}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section">
        <div className="container">
          <h2 className="section-title">{t('home.howTitle')}</h2>
          <p className="section-sub">{t('home.howSub')}</p>
          <ol className="steps">
            {steps.map((step, index) => (
              <li key={step}>
                <span className="step-num" aria-hidden="true">{index + 1}</span>
                <h3>{t(`home.steps.${step}.title`)}</h3>
                <p>{t(`home.steps.${step}.text`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <h2 className="section-title">{t('home.featuresTitle')}</h2>
          <div className="feature-grid">
            {features.map((feature) => (
              <div key={feature} className="feature">
                <h3>{t(`home.features.${feature}.title`)}</h3>
                <p>{t(`home.features.${feature}.text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cta-band">
          <div>
            <h2>{t('home.finalTitle')}</h2>
            <p>{t('home.finalText')}</p>
          </div>
          <Link to={user ? '/analyze' : '/register'} className="btn btn-primary btn-lg">
            {user ? t('home.ctaPrimary') : t('home.finalCta')}
          </Link>
        </div>
      </section>
    </>
  );
}
