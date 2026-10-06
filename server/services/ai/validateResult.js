// Checks and cleans the AI's JSON before anything is saved. Never trusts the model's output.
const { isValidISODate } = require('../../utils/dateHelpers');
const { DOCUMENT_TYPES } = require('./prompts');

const PRIORITIES = { high: 'High', medium: 'Medium', low: 'Low' };

// The AI's own confidence is only an estimate, so we never show more than this.
const MAX_CONFIDENCE = 95;

class InvalidAIResultError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidAIResultError';
  }
}

const cleanString = (value, max = 500) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

function cleanStringList(value, maxItems = 20, maxLen = 400) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanDate(value) {
  const str = cleanString(value, 10);
  return isValidISODate(str) ? str : '';
}

function cleanPriority(value) {
  if (typeof value !== 'string') return 'Medium';
  return PRIORITIES[value.trim().toLowerCase()] || 'Medium';
}

function cleanConfidence(value) {
  let n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n > 0 && n <= 1) n *= 100; // model answered 0.9 instead of 90
  return Math.max(0, Math.min(MAX_CONFIDENCE, Math.round(n)));
}

// ---- "Extracted from the document" must really be in the document ----
// Lower-case, straighten quotes and collapse all whitespace so line breaks do not cause misses.
const normalizeText = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\s\u00a0]+/g, ' ')
    .trim();
const stripEdges = (text) => text.replace(/^[\s"'\-\u2022*.,;:]+|[\s"'\-\u2022*.,;:]+$/g, '');

function isVerbatim(item, normalizedSource) {
  const needle = stripEdges(normalizeText(item));
  return needle.length > 0 && normalizedSource.includes(needle);
}

// Cleans a list of quotes. When the source text is known, drops anything that is not an exact quote.
// Returns the kept items plus the positions they had, so the Tamil list can be matched up.
function pickQuotes(rawList, normalizedSource, maxItems, maxLen) {
  const items = [];
  const keptIndexes = [];
  if (!Array.isArray(rawList)) return { items, keptIndexes, rawLength: 0 };
  rawList.forEach((entry, index) => {
    const text = cleanString(entry, maxLen);
    if (!text || items.length >= maxItems) return;
    if (normalizedSource && !isVerbatim(text, normalizedSource)) return;
    items.push(text);
    keptIndexes.push(index);
  });
  return { items, keptIndexes, rawLength: rawList.length };
}

// Keeps only the Tamil lines that belong to the English lines that were kept.
// If the AI gave a Tamil list of a different length we cannot match them, so we drop it (English shows).
function alignTamilList(taList, quotes, maxLen) {
  if (!Array.isArray(taList) || taList.length !== quotes.rawLength) return [];
  return quotes.keptIndexes.map((i) => cleanString(taList[i], maxLen)).filter(Boolean);
}

// Tamil block is optional. If it is malformed we simply drop it (English still works).
function cleanTamil(ta, actionCount, alignedLists) {
  if (!ta || typeof ta !== 'object') return null;

  const tamilActions = Array.isArray(ta.actions) ? ta.actions : [];
  const actions = [];
  for (let i = 0; i < actionCount; i += 1) {
    const item = tamilActions[i] || {};
    actions.push({ title: cleanString(item.title, 600), description: cleanString(item.description, 1200) });
  }

  const cleaned = {
    title: cleanString(ta.title, 400),
    summary: cleanString(ta.summary, 2000),
    importantInformation: alignedLists.importantInformation,
    requirements: alignedLists.requirements,
    warnings: cleanStringList(ta.warnings, 20, 800),
    actions,
  };

  const hasContent = cleaned.summary || cleaned.title || actions.some((a) => a.title);
  return hasContent ? cleaned : null;
}

// Returns a clean result object, or throws InvalidAIResultError.
// options.sourceText: the document text (when we have it). Then "important information" and
// "requirements" are kept only if they are exact quotes from it. Photos have no source text to check.
function validateResult(raw, options = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new InvalidAIResultError('AI result is not an object');
  }

  const rawActions = Array.isArray(raw.actions) ? raw.actions.slice(0, 20) : [];
  const keptIndexes = [];
  const actions = [];
  rawActions.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const title = cleanString(item.title, 300);
    if (!title) return;
    keptIndexes.push(index);
    actions.push({
      title,
      description: cleanString(item.description, 2000),
      deadline: cleanDate(item.deadline),
      priority: cleanPriority(item.priority),
      requiredItems: cleanStringList(item.requiredItems, 15, 200),
    });
  });

  const summary = cleanString(raw.summary, 3000);
  if (!summary && actions.length === 0) {
    throw new InvalidAIResultError('AI result has neither a summary nor actions');
  }

  const dates = (Array.isArray(raw.dates) ? raw.dates : [])
    .filter((item) => item && typeof item === 'object')
    .slice(0, 20)
    .map((item) => ({
      label: cleanString(item.label, 120),
      date: cleanDate(item.date),
      description: cleanString(item.description, 400),
    }))
    .filter((item) => item.label || item.description || item.date);

  const type = cleanString(raw.documentType, 40).toLowerCase();

  const normalizedSource = options.sourceText ? normalizeText(options.sourceText) : '';
  const importantQuotes = pickQuotes(raw.importantInformation, normalizedSource, 15, 600);
  const requirementQuotes = pickQuotes(raw.requirements, normalizedSource, 20, 400);

  // Keep Tamil actions aligned with the English actions that survived cleaning.
  let ta = null;
  if (raw.ta && typeof raw.ta === 'object') {
    const alignedTa = { ...raw.ta, actions: keptIndexes.map((i) => (Array.isArray(raw.ta.actions) ? raw.ta.actions[i] : null) || {}) };
    ta = cleanTamil(alignedTa, actions.length, {
      importantInformation: alignTamilList(raw.ta.importantInformation, importantQuotes, 800),
      requirements: alignTamilList(raw.ta.requirements, requirementQuotes, 800),
    });
  }

  return {
    title: cleanString(raw.title, 200) || 'Untitled document',
    documentType: DOCUMENT_TYPES.includes(type) ? type : 'other',
    summary: summary || 'Not clearly identified',
    importantInformation: importantQuotes.items,
    dates,
    actions,
    requirements: requirementQuotes.items,
    warnings: cleanStringList(raw.warnings, 20, 400),
    confidence: cleanConfidence(raw.confidence),
    ta,
  };
}

// Pulls a JSON object out of the model's reply, even if it added ```json fences or extra words.
function extractJSON(text) {
  if (typeof text !== 'string' || !text.trim()) throw new InvalidAIResultError('Empty AI reply');
  const stripped = text.replace(/```json|```/gi, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end <= start) throw new InvalidAIResultError('No JSON object in AI reply');
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch (err) {
    throw new InvalidAIResultError('AI reply was not valid JSON');
  }
}

module.exports = { validateResult, extractJSON, InvalidAIResultError, MAX_CONFIDENCE };