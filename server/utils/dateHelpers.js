// Date helpers. Deadlines are handled as "YYYY-MM-DD" strings so time zones never shift a date.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// True only for real calendar dates (rejects 2026-02-31, "tomorrow", "", null...).
function isValidISODate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// "2026-10-15" -> Date at 00:00 UTC. Returns null for invalid input.
function isoToDate(value) {
  return isValidISODate(value) ? new Date(`${value}T00:00:00.000Z`) : null;
}

// Today's date as "YYYY-MM-DD" in the server's local time.
function todayISO() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Whole days from `fromISO` to `toISO` (negative = in the past).
function daysBetween(fromISO, toISO) {
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

// Classifies a deadline: 'overdue' | 'today' | 'upcoming' | 'none'.
function deadlineStatus(deadlineISO, todayStr = todayISO()) {
  if (!isValidISODate(deadlineISO)) return 'none';
  const diff = daysBetween(todayStr, deadlineISO);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  return 'upcoming';
}

module.exports = { isValidISODate, isoToDate, todayISO, daysBetween, deadlineStatus };
