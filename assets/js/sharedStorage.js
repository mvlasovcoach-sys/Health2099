const STORAGE_KEY = 'health2099-db-v1';
const CHANNEL_NAME = 'health2099';
const DEFAULT_DB = {
  version: 1,
  logs: [],
  targets: {
    water: 2500,
    steps: 8000,
    sleep: 420,
    caffeine: 240,
    meds: [],
  },
  settings: {
    tz: 'Europe/Amsterdam',
    city: '',
    deviceBattery: 82,
    lastDevicePing: null,
  },
  queue: [],
};

const listeners = new Set();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

if (channel) {
  channel.addEventListener('message', (event) => {
    if (event?.data?.type === 'sync') {
      hydrate();
      emit(event.data.payload);
    }
  });
}

let db = hydrate();

function hydrate() {
  let parsed;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('[sharedStorage] Failed to parse db', err);
  }
  const next = mergeDeep({}, DEFAULT_DB, parsed || {});
  next.logs = Array.isArray(next.logs)
    ? next.logs
        .filter((item) => item && item.id && item.createdAt)
        .map(normalizeLog)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];
  next.targets = normalizeTargets(next.targets);
  next.settings = { ...DEFAULT_DB.settings, ...(next.settings || {}) };
  next.queue = Array.isArray(next.queue) ? next.queue.filter(Boolean) : [];
  db = next;
  persist();
  return next;
}

function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    });
  }
  return mergeDeep(target, ...sources);
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function normalizeLog(log) {
  const now = new Date();
  const created = new Date(log.createdAt || log.created_at || now);
  const updated = new Date(log.updatedAt || log.updated_at || created);
  const type = typeof log.type === 'string' ? log.type.toLowerCase() : 'generic';
  return {
    id: String(log.id || createId('log')),
    type,
    value: toNumber(log.value),
    unit: log.unit || inferUnit(type),
    note: log.note || '',
    createdAt: created.toISOString(),
    updatedAt: updated.toISOString(),
    source: log.source || 'manual',
  };
}

function normalizeTargets(targets) {
  const next = { ...DEFAULT_DB.targets, ...(targets || {}) };
  const ensureNumber = (value, fallback) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };
  next.water = ensureNumber(next.water, DEFAULT_DB.targets.water);
  next.steps = ensureNumber(next.steps, DEFAULT_DB.targets.steps);
  next.sleep = ensureNumber(next.sleep, DEFAULT_DB.targets.sleep);
  next.caffeine = ensureNumber(next.caffeine, DEFAULT_DB.targets.caffeine);
  if (!Array.isArray(next.meds)) next.meds = [];
  return next;
}

function inferUnit(type) {
  switch (type) {
    case 'water':
      return 'ml';
    case 'steps':
      return 'steps';
    case 'sleep':
      return 'min';
    case 'caffeine':
      return 'mg';
    case 'meds':
      return 'dose';
    default:
      return '';
  }
}

function toNumber(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: db.version,
        logs: db.logs,
        targets: db.targets,
        settings: db.settings,
        queue: db.queue,
      }),
    );
  } catch (err) {
    console.warn('[sharedStorage] Failed to persist db', err);
  }
}

function emit(payload) {
  listeners.forEach((listener) => {
    try {
      listener(payload || {});
    } catch (err) {
      console.error(err);
    }
  });
}

function notify(payload) {
  persist();
  emit(payload);
  if (channel) {
    channel.postMessage({ type: 'sync', payload });
  }
}

function getTimezone() {
  const tz = (db && db.settings && db.settings.tz) || DEFAULT_DB.settings.tz;
  if (tz) return tz;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (err) {
    return 'UTC';
  }
}

function createLog(type, value, options = {}) {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset();
  const iso = new Date(now.getTime() - tzOffset * 60000).toISOString();
  const log = normalizeLog({
    id: options.id,
    type,
    value,
    unit: options.unit,
    note: options.note || '',
    createdAt: options.createdAt || iso,
    updatedAt: options.updatedAt || iso,
    source: options.source,
  });
  return log;
}

function pushLog(type, value, options = {}) {
  const log = createLog(type, value, options);
  db.logs = [log, ...db.logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  db.settings.lastDevicePing = log.createdAt;
  notify({ target: 'logs', action: 'push', log });
  return log;
}

function updateLog(id, updates) {
  let updated;
  db.logs = db.logs.map((log) => {
    if (log.id !== id) return log;
    updated = { ...log, ...updates, updatedAt: new Date().toISOString() };
    return normalizeLog(updated);
  });
  if (updated) {
    notify({ target: 'logs', action: 'update', log: updated });
  }
  return updated;
}

function removeLog(id) {
  const removed = db.logs.find((log) => log.id === id);
  db.logs = db.logs.filter((log) => log.id !== id);
  if (removed) {
    notify({ target: 'logs', action: 'remove', log: removed });
  }
  return removed;
}

function listLogs({ type, limit, since } = {}) {
  let items = [...db.logs];
  if (type) {
    items = items.filter((log) => log.type === type);
  }
  if (since) {
    const sinceDate = new Date(since);
    items = items.filter((log) => new Date(log.createdAt) >= sinceDate);
  }
  if (typeof limit === 'number') {
    items = items.slice(0, limit);
  }
  return items;
}

function getTargets() {
  return { ...db.targets };
}

function setTargets(nextTargets) {
  db.targets = normalizeTargets({ ...db.targets, ...nextTargets });
  notify({ target: 'targets', action: 'set', targets: db.targets });
  return getTargets();
}

function getSettings() {
  return { ...db.settings };
}

function setSettings(partial) {
  db.settings = { ...db.settings, ...(partial || {}) };
  notify({ target: 'settings', action: 'set', settings: db.settings });
  return getSettings();
}

function onChange(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function addQueue(action) {
  db.queue = [
    ...db.queue,
    {
      id: createId('queue'),
      createdAt: new Date().toISOString(),
      ...action,
    },
  ];
  notify({ target: 'queue', action: 'push' });
}

function flushQueue(flushFn) {
  if (!db.queue.length) return Promise.resolve([]);
  const items = [...db.queue];
  db.queue = [];
  notify({ target: 'queue', action: 'flush' });
  if (typeof flushFn === 'function') {
    return Promise.resolve(flushFn(items));
  }
  return Promise.resolve(items);
}

function removeQueue(predicate) {
  if (typeof predicate !== 'function') return;
  db.queue = db.queue.filter((item) => !predicate(item));
  notify({ target: 'queue', action: 'remove' });
}

function recentLogs(hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return listLogs({ since: cutoff.toISOString() });
}

function aggregateDay(date = new Date()) {
  const tz = getTimezone();
  const start = startOfDay(date, tz);
  const end = endOfDay(date, tz);
  return aggregateRange(start, end);
}

function aggregateRange(start, end) {
  const result = {
    water: 0,
    steps: 0,
    sleep: 0,
    caffeine: 0,
    meds: 0,
  };
  const startTime = start.getTime();
  const endTime = end.getTime();
  db.logs.forEach((log) => {
    const time = new Date(log.createdAt).getTime();
    if (time < startTime || time > endTime) return;
    switch (log.type) {
      case 'water':
        result.water += log.value || 0;
        break;
      case 'steps':
        result.steps += log.value || 0;
        break;
      case 'sleep':
        result.sleep += log.value || 0;
        break;
      case 'caffeine':
        result.caffeine += log.value || 0;
        break;
      case 'meds':
        result.meds += 1;
        break;
      default:
        break;
    }
  });
  return result;
}

function streaks(days = 14) {
  const dayMap = new Map();
  const tz = getTimezone();
  for (let i = 0; i < days; i += 1) {
    const reference = new Date(Date.now() - i * 86400000);
    const day = startOfDay(reference, tz);
    const key = day.toISOString();
    dayMap.set(key, aggregateDay(day));
  }
  return dayMap;
}

function startOfDay(date, tz = getTimezone()) {
  try {
    const parts = zonedParts(date, tz);
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  } catch (err) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}

function endOfDay(date, tz = getTimezone()) {
  try {
    const parts = zonedParts(date, tz);
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999));
  } catch (err) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}

function startOfDayISO(date = new Date(), tz = getTimezone()) {
  return startOfDay(date, tz).toISOString();
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

export const SharedStorage = {
  listLogs,
  pushLog,
  updateLog,
  removeLog,
  recentLogs,
  aggregateDay,
  aggregateRange,
  streaks,
  getTargets,
  setTargets,
  getSettings,
  setSettings,
  onChange,
  addQueue,
  flushQueue,
  removeQueue,
  createLog,
  startOfDayISO,
};

function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
