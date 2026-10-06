// Deterministic (keyword + pattern based) analysis used ONLY when the AI is unavailable and the
// input is plain text. It is clearly labelled in the UI and is much less capable than the AI.
const { isValidISODate, daysBetween } = require('../../utils/dateHelpers');

const FALLBACK_NOTICE = 'AI unavailable — deterministic fallback used.';

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const MONTH_PATTERN = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';

const pad = (n) => String(n).padStart(2, '0');

// If no year is written, use the nearest upcoming occurrence of that day.
function resolveYear(month, day, yearText, today) {
  if (yearText) return Number(yearText);
  const todayYear = Number(today.slice(0, 4));
  const candidate = `${todayYear}-${pad(month)}-${pad(day)}`;
  return isValidISODate(candidate) && daysBetween(today, candidate) < 0 ? todayYear + 1 : todayYear;
}

// Finds dates written like "15 October 2026", "October 15", "15/10/2026" or "2026-10-15".
function findDates(text, today) {
  const found = [];
  const add = (index, raw, year, month, day) => {
    const iso = `${year}-${pad(month)}-${pad(day)}`;
    if (isValidISODate(iso)) found.push({ index, raw, iso });
  };

  let m;
  const dayFirst = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_PATTERN},?(?:\\s+(\\d{4}))?`, 'gi');
  while ((m = dayFirst.exec(text))) {
    const month = MONTHS[m[2].toLowerCase()];
    add(m.index, m[0], resolveYear(month, Number(m[1]), m[3], today), month, Number(m[1]));
  }
  const monthFirst = new RegExp(`\\b${MONTH_PATTERN}\\s+(\\d{1,2})(?!\\d)(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`, 'gi');
  while ((m = monthFirst.exec(text))) {
    const month = MONTHS[m[1].toLowerCase()];
    add(m.index, m[0], resolveYear(month, Number(m[2]), m[3], today), month, Number(m[2]));
  }
  const isoStyle = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  while ((m = isoStyle.exec(text))) add(m.index, m[0], m[1], Number(m[2]), Number(m[3]));
  const slashStyle = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g; // day/month/year (Indian format)
  while ((m = slashStyle.exec(text))) add(m.index, m[0], m[3], Number(m[2]), Number(m[1]));

  return found.sort((a, b) => a.index - b.index);
}

function splitSentences(text) {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

const ACTION_WORDS = /\b(must|should|required|need to|have to|submit|pay|bring|register|apply|attend|complete|upload|collect|reply|send|fill|renew|before|deadline|last date|due)\b/i;
const REQUIREMENT_WORDS = /\b(bring|include|attach|carry|enclose|along with|signed|documents?|certificate|id card|fee|fees|payment)\b/i;
const URGENT_WORDS = /\b(must|mandatory|compulsory|last date|penalty|fine|fail|not be considered|will not be accepted|strictly)\b/i;

function shorten(text, max) {
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

function analyzeWithFallback(text, today) {
  const sentences = splitSentences(text);
  const firstLine = text.split('\n').map((l) => l.trim()).find(Boolean) || 'Untitled document';

  const actionSentences = sentences.filter((s) => ACTION_WORDS.test(s));
  const actions = actionSentences.slice(0, 8).map((sentence) => {
    const dates = findDates(sentence, today);
    const deadline = dates.length > 0 ? dates[dates.length - 1].iso : '';
    let priority = 'Medium';
    if (URGENT_WORDS.test(sentence)) priority = 'High';
    else if (deadline && daysBetween(today, deadline) >= 0 && daysBetween(today, deadline) <= 3) priority = 'High';
    else if (!deadline && !/\bmust\b/i.test(sentence)) priority = 'Low';
    return {
      title: shorten(sentence.replace(/\.$/, ''), 140),
      description: '',
      deadline,
      priority,
      requiredItems: [],
    };
  });

  const requirements = sentences.filter((s) => REQUIREMENT_WORDS.test(s)).slice(0, 8).map((s) => shorten(s, 300));

  const dates = findDates(text, today)
    .slice(0, 10)
    .map((d) => ({ label: d.raw.trim(), date: d.iso, description: '' }));

  return {
    title: shorten(firstLine, 120),
    documentType: 'other',
    summary: sentences.length > 0 ? shorten(sentences.slice(0, 2).join(' '), 400) : 'Not clearly identified',
    importantInformation: sentences.slice(0, 5).map((s) => shorten(s, 300)),
    dates,
    actions,
    requirements,
    warnings: [FALLBACK_NOTICE, 'Results are keyword-based and may miss details. Please check the original document.'],
    confidence: 30,
    ta: null,
  };
}

module.exports = { analyzeWithFallback, findDates, FALLBACK_NOTICE };
