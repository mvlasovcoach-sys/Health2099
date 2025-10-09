import { getDB, setDB, listLogs } from './sharedStorage.js';

const DEFAULT_SETTINGS = { tz: 'Europe/Amsterdam', lastDevicePingISO: null, batteryPct: null };

export function getSettings() {
  const db = getDB();
  return { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
}

export function setSettings(patch) {
  const db = getDB();
  const next = { ...DEFAULT_SETTINGS, ...(db.settings || {}), ...(patch || {}) };
  setDB({ ...db, settings: next });
  return { ...next };
}

export function getMedsToday() {
  const db = getDB();
  return Array.isArray(db.meds_today) ? db.meds_today.map((item) => ({ ...item })) : [];
}

export function setMedsToday(items) {
  const db = getDB();
  const meds = Array.isArray(items)
    ? items.map((item) => ({ id: ensureMedId(item.id), title: item.title || '', taken: Boolean(item.taken) }))
    : [];
  setDB({ ...db, meds_today: meds });
  return meds.map((item) => ({ ...item }));
}

export function updateMedToday(id, patch) {
  if (!id) return null;
  const meds = getMedsToday();
  let updated = null;
  const next = meds.map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...(patch || {}) };
    return updated;
  });
  if (updated) {
    setMedsToday(next);
  }
  return updated;
}

export function startOfDayISO(date = new Date(), tz = getTimezone()) {
  return startOfDay(date, tz).toISOString();
}

export function aggregateDay(date = new Date()) {
  const tz = getTimezone();
  const start = startOfDay(date, tz);
  const end = endOfDay(date, tz);
  return aggregateRange(start, end);
}

export function aggregateRange(start, end) {
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const totals = {
    water_ml: 0,
    steps: 0,
    sleep_min: 0,
    caffeine_mg: 0,
    meds_taken: 0,
  };
  listLogs().forEach((log) => {
    const time = new Date(log.createdAt).getTime();
    if (Number.isNaN(time)) return;
    if (time < startTime || time > endTime) return;
    const value = Number(log.value) || 0;
    switch (log.type) {
      case 'water':
        totals.water_ml += value;
        break;
      case 'steps':
        totals.steps += value;
        break;
      case 'sleep':
        totals.sleep_min += value;
        break;
      case 'caffeine':
        totals.caffeine_mg += value;
        break;
      case 'med':
        totals.meds_taken += 1;
        break;
      default:
        break;
    }
  });
  return totals;
}

export function streaks(days = 14) {
  const tz = getTimezone();
  const map = new Map();
  for (let i = 0; i < days; i += 1) {
    const reference = new Date(Date.now() - i * 86400000);
    const day = startOfDay(reference, tz);
    map.set(day.toISOString(), aggregateDay(day));
  }
  return map;
}

export function getTimezone() {
  const settings = getSettings();
  if (settings.tz) return settings.tz;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    return 'UTC';
  }
}

function ensureMedId(id) {
  if (id) return id;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `med_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function startOfDay(date, tz = getTimezone()) {
  try {
    const parts = zonedParts(date, tz);
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  } catch (error) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
  }
}

function endOfDay(date, tz = getTimezone()) {
  try {
    const parts = zonedParts(date, tz);
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999));
  } catch (error) {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next;
  }
}

function zonedParts(date, tz) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const result = {
    year: 1970,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
  };
  parts.forEach((part) => {
    if (part.type === 'literal') return;
    const value = Number(part.value);
    if (Number.isFinite(value)) {
      result[part.type] = value;
    }
  });
  return result;
}
