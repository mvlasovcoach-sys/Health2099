const STORAGE_KEY = 'health2099-db-v1';
const CHANNEL_NAME = 'health2099';

const DEFAULT_DB = {
  version: 2,
  logs: [],
  targets: {
    water_ml: 2000,
    steps: 8000,
    sleep_min: 420,
    caffeine_mg: 300,
  },
  meds_today: [],
  settings: {
    tz: 'Europe/Amsterdam',
    lastDevicePingISO: null,
    batteryPct: 82,
    city: '',
  },
  queue: [],
};

const listeners = new Set();

let db = safeLoad();
persist();

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

if (channel) {
  channel.addEventListener('message', (event) => {
    if (event?.data?.type === 'db-updated') {
      db = safeLoad();
      notify(event?.data?.payload || null);
    }
  });
}

export const getDB = () => clone(db);

export function setDB(next, options = {}) {
  const { payload = null, broadcast = true, skipNormalize = false } = options;
  const prepared = skipNormalize ? next : prepareState(next || {});
  db = prepared;
  persist();
  if (broadcast && channel) {
    try {
      channel.postMessage({ type: 'db-updated', payload });
    } catch (error) {
      console.warn('[sharedStorage] Failed to broadcast db update', error);
    }
  }
  notify(payload);
  return getDB();
}

export function listLogs({ type, limit, since } = {}) {
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

export function pushLog(type, value, options = {}) {
  const log = createLog(type, value, options);
  const nextLogs = [log, ...db.logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const nextSettings = { ...db.settings, lastDevicePingISO: log.createdAt };
  write({ ...db, logs: nextLogs, settings: nextSettings }, { target: 'logs', action: 'push', log });
  return log;
}

export function updateLog(id, updates) {
  let updated = null;
  const nextLogs = db.logs.map((log) => {
    if (log.id !== id) return log;
    updated = normalizeLog({ ...log, ...(updates || {}), updatedAt: new Date().toISOString() });
    return updated;
  });
  if (updated) {
    write({ ...db, logs: nextLogs }, { target: 'logs', action: 'update', log: updated });
  }
  return updated;
}

export function removeLog(id) {
  const removed = db.logs.find((log) => log.id === id) || null;
  if (!removed) return null;
  const nextLogs = db.logs.filter((log) => log.id !== id);
  write({ ...db, logs: nextLogs }, { target: 'logs', action: 'remove', log: removed });
  return removed;
}

export function getTargets() {
  return { ...db.targets };
}

export function setTargets(nextTargets) {
  const targets = normalizeTargets({ ...db.targets, ...(nextTargets || {}) });
  write({ ...db, targets }, { target: 'targets', action: 'set', targets: { ...targets } });
  return getTargets();
}

export function getSettings() {
  return { ...db.settings };
}

export function setSettings(partial) {
  const settings = normalizeSettings({ ...db.settings, ...(partial || {}) });
  write({ ...db, settings }, { target: 'settings', action: 'set', settings: { ...settings } });
  return getSettings();
}

export function getMedsToday() {
  return db.meds_today.map((med) => ({ ...med }));
}

export function setMedsToday(next) {
  const meds = normalizeMeds(next);
  write({ ...db, meds_today: meds }, { target: 'meds', action: 'set', meds: meds.map((item) => ({ ...item })) });
  return getMedsToday();
}

export function updateMedToday(id, updates) {
  let updated = null;
  const meds = db.meds_today.map((med) => {
    if (med.id !== id) return med;
    updated = { ...med, ...(updates || {}) };
    return updated;
  });
  if (updated) {
    setMedsToday(meds);
  }
  return updated;
}

export function onChange(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addQueue(action) {
  const item = {
    id: createId('queue'),
    createdAt: new Date().toISOString(),
    ...(action || {}),
  };
  const queue = [...db.queue, item];
  write({ ...db, queue }, { target: 'queue', action: 'push', item });
  return item;
}

export function flushQueue(flushFn) {
  if (!db.queue.length) return Promise.resolve([]);
  const items = [...db.queue];
  write({ ...db, queue: [] }, { target: 'queue', action: 'flush' });
  if (typeof flushFn === 'function') {
    return Promise.resolve(flushFn(items));
  }
  return Promise.resolve(items);
}

export function removeQueue(predicate) {
  if (typeof predicate !== 'function') return;
  const queue = db.queue.filter((item) => !predicate(item));
  write({ ...db, queue }, { target: 'queue', action: 'remove' });
}

export function recentLogs(hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return listLogs({ since: cutoff.toISOString() });
}

export function aggregateDay(date = new Date()) {
  const tz = getTimezone();
  const start = startOfDay(date, tz);
  const end = endOfDay(date, tz);
  return aggregateRange(start, end);
}

export function aggregateRange(start, end) {
  const result = {
    water_ml: 0,
    steps: 0,
    sleep_min: 0,
    caffeine_mg: 0,
    meds_taken: 0,
  };
  const startTime = start.getTime();
  const endTime = end.getTime();
  db.logs.forEach((log) => {
    const time = new Date(log.createdAt).getTime();
    if (time < startTime || time > endTime) return;
    switch (log.type) {
      case 'water':
        result.water_ml += log.value || 0;
        break;
      case 'steps':
        result.steps += log.value || 0;
        break;
      case 'sleep':
        result.sleep_min += log.value || 0;
        break;
      case 'caffeine':
        result.caffeine_mg += log.value || 0;
        break;
      case 'med':
        result.meds_taken += 1;
        break;
      default:
        break;
    }
  });
  return result;
}

export function streaks(days = 14) {
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

export function startOfDayISO(date = new Date(), tz = getTimezone()) {
  return startOfDay(date, tz).toISOString();
}

export function createLog(type, value, options = {}) {
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

function safeLoad() {
  const stored = readStorage();
  return prepareState(stored);
}

function readStorage() {
  if (typeof localStorage === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('[sharedStorage] Failed to read db', error);
    return {};
  }
}

function prepareState(source) {
  const migrated = migrateSchema(source || {});
  const base = mergeDeep({}, DEFAULT_DB, migrated);
  const next = {
    ...base,
    logs: Array.isArray(base.logs)
      ? base.logs
          .filter((item) => item && (item.id || item.createdAt))
          .map(normalizeLog)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      : [],
    targets: normalizeTargets(base.targets),
    meds_today: normalizeMeds(base.meds_today),
    settings: normalizeSettings(base.settings),
    queue: Array.isArray(base.queue) ? base.queue.filter(Boolean) : [],
  };
  return next;
}

function migrateSchema(source) {
  const draft = { ...source };

  if (draft.targets) {
    if (typeof draft.targets.water === 'number') {
      draft.targets.water_ml = draft.targets.water;
    }
    if (typeof draft.targets.sleep === 'number') {
      draft.targets.sleep_min = draft.targets.sleep;
    }
    if (typeof draft.targets.caffeine === 'number') {
      draft.targets.caffeine_mg = draft.targets.caffeine;
    }
  }

  if (Array.isArray(draft.targets?.meds) && !Array.isArray(draft.meds_today)) {
    draft.meds_today = draft.targets.meds.map((med) => ({
      id: med.id || createId('med'),
      title: med.name || med.title || 'Medication',
      timeISO: med.timeISO || med.timeIso || null,
      taken: Boolean(med.taken),
    }));
    delete draft.targets.meds;
  }

  if (draft.settings) {
    if (draft.settings.deviceBattery != null && draft.settings.batteryPct == null) {
      draft.settings.batteryPct = draft.settings.deviceBattery;
    }
    if (draft.settings.lastDevicePing && !draft.settings.lastDevicePingISO) {
      draft.settings.lastDevicePingISO = draft.settings.lastDevicePing;
    }
  }

  if (Array.isArray(draft.logs)) {
    draft.logs = draft.logs.map((log) => {
      if (log.type === 'meds') {
        return { ...log, type: 'med' };
      }
      return log;
    });
  }

  return draft;
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
  next.water_ml = ensureNumber(next.water_ml, DEFAULT_DB.targets.water_ml);
  next.steps = ensureNumber(next.steps, DEFAULT_DB.targets.steps);
  next.sleep_min = ensureNumber(next.sleep_min, DEFAULT_DB.targets.sleep_min);
  next.caffeine_mg = ensureNumber(next.caffeine_mg, DEFAULT_DB.targets.caffeine_mg);
  return next;
}

function normalizeMeds(meds) {
  if (!Array.isArray(meds)) return [];
  return meds
    .map((med) => ({
      id: med.id || createId('med'),
      title: med.title || med.name || 'Medication',
      timeISO: med.timeISO || med.timeIso || null,
      taken: Boolean(med.taken),
    }))
    .filter((med) => med.id && med.title);
}

function normalizeSettings(settings) {
  const next = { ...DEFAULT_DB.settings, ...(settings || {}) };
  if (next.batteryPct != null) {
    const battery = Number(next.batteryPct);
    next.batteryPct = Number.isFinite(battery) ? battery : null;
  }
  if (next.lastDevicePingISO) {
    const ping = new Date(next.lastDevicePingISO);
    next.lastDevicePingISO = Number.isNaN(ping.getTime()) ? null : ping.toISOString();
  }
  if (typeof next.city !== 'string') {
    next.city = '';
  } else {
    next.city = next.city.trim();
  }
  if (typeof next.tz !== 'string' || !next.tz) {
    next.tz = DEFAULT_DB.settings.tz;
  }
  return next;
}

function ensureNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
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
    case 'med':
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

function write(nextState, payload) {
  setDB(nextState, { payload });
}

function persist(state = db) {
  if (typeof localStorage === 'undefined') return;
  try {
    const snapshot = {
      version: state.version,
      logs: state.logs,
      targets: state.targets,
      meds_today: state.meds_today,
      settings: state.settings,
      queue: state.queue,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('[sharedStorage] Failed to persist db', error);
  }
}

function notify(payload) {
  listeners.forEach((listener) => {
    try {
      listener(payload || null);
    } catch (error) {
      console.error('[sharedStorage] Listener error', error);
    }
  });
}

function getTimezone() {
  const tz = (db && db.settings && db.settings.tz) || DEFAULT_DB.settings.tz;
  if (tz) return tz;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    return 'UTC';
  }
}

function startOfDay(date, tz = getTimezone()) {
  try {
    const parts = zonedParts(date, tz);
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  } catch (error) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}

function endOfDay(date, tz = getTimezone()) {
  try {
    const parts = zonedParts(date, tz);
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999));
  } catch (error) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
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

function clone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export const SharedStorage = {
  getDB,
  setDB,
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
  getMedsToday,
  setMedsToday,
  updateMedToday,
  onChange,
  addQueue,
  flushQueue,
  removeQueue,
  createLog,
  startOfDayISO,
};
