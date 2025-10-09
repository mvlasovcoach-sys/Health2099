import { getDB } from './sharedStorage.js';

const TIME_ZONE = 'Europe/Amsterdam';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'short',
});

const WEEKDAY_INDEX = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function sumToday(type, db) {
  const snapshot = db || getDB();
  return sumRange(type, startOfDay(new Date()), endOfDay(new Date()), snapshot);
}

export function sumWeek(type, db) {
  const snapshot = db || getDB();
  return sumRange(type, startOfWeek(new Date()), endOfWeek(new Date()), snapshot);
}

export function sumRange(type, start, end, db = getDB()) {
  if (!type) return 0;
  const logs = Array.isArray(db?.logs) ? db.logs : [];
  const startTime = start?.getTime?.() ?? Number.NEGATIVE_INFINITY;
  const endTime = end?.getTime?.() ?? Number.POSITIVE_INFINITY;
  return logs.reduce((total, log) => {
    if (!log || log.type !== type) return total;
    const value = Number(log.value);
    if (!Number.isFinite(value)) return total;
    const time = new Date(log.createdAt).getTime();
    if (Number.isNaN(time)) return total;
    if (time < startTime || time >= endTime) return total;
    return total + value;
  }, 0);
}

function startOfDay(date) {
  const parts = toZonedParts(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
}

function endOfDay(date) {
  const start = startOfDay(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

function startOfWeek(date) {
  const start = startOfDay(date);
  const weekday = getWeekdayIndex(date);
  const diff = (weekday + 6) % 7;
  const weekStart = new Date(start);
  weekStart.setUTCDate(weekStart.getUTCDate() - diff);
  return weekStart;
}

function endOfWeek(date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return end;
}

function toZonedParts(date) {
  const parts = dateFormatter.formatToParts(date || new Date());
  const lookup = Object.create(null);
  parts.forEach((part) => {
    if (part.type === 'literal') return;
    lookup[part.type] = part.value;
  });
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  };
}

function getWeekdayIndex(date) {
  const label = weekdayFormatter.format(date || new Date());
  const index = WEEKDAY_INDEX[label];
  return typeof index === 'number' ? index : 0;
}
