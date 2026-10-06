// Deadline helpers. Deadlines arrive from the API as ISO strings at 00:00 UTC, so we only ever use
// the date part ("YYYY-MM-DD") and compare it with the user's local calendar date.

const pad = (n) => String(n).padStart(2, '0');

// "2026-10-15T00:00:00.000Z" -> "2026-10-15". Returns '' for missing/invalid values.
export function toDateKey(value) {
  if (!value) return '';
  const key = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : '';
}

export function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function daysBetween(fromKey, toKey) {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

// -> { state: 'overdue' | 'today' | 'upcoming' | 'none', days: number|null }
export function deadlineState(deadline) {
  const key = toDateKey(deadline);
  if (!key) return { state: 'none', days: null };
  const days = daysBetween(todayKey(), key);
  if (days < 0) return { state: 'overdue', days: Math.abs(days) };
  if (days === 0) return { state: 'today', days: 0 };
  return { state: 'upcoming', days };
}

export function formatDate(value, lang) {
  const key = toDateKey(value);
  if (!key) return '';
  return new Date(`${key}T00:00:00Z`).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateTime(value, lang) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Value for <input type="datetime-local"> in the user's local time.
export function toLocalInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Sensible default reminder time: 9:00 the day before the deadline, else one hour from now.
export function defaultReminderTime(deadline) {
  const key = toDateKey(deadline);
  const soon = new Date(Date.now() + 60 * 60 * 1000);
  if (!key) return soon;
  const [y, m, d] = key.split('-').map(Number);
  const dayBefore = new Date(y, m - 1, d - 1, 9, 0, 0);
  return dayBefore.getTime() > Date.now() ? dayBefore : soon;
}
