import { useLanguage } from '../context/LanguageContext';

// Shape + word + colour, so priority never depends on colour alone.
const SYMBOLS = { High: '▲', Medium: '◆', Low: '▼' };

export default function PriorityBadge({ priority }) {
  const { t } = useLanguage();
  const level = SYMBOLS[priority] ? priority : 'Medium';
  return (
    <span className={`badge priority-${level.toLowerCase()}`}>
      <span aria-hidden="true">{SYMBOLS[level]}</span>
      <span className="sr-only">{t('priority.label')}: </span>
      {t(`priority.${level}`)}
    </span>
  );
}
