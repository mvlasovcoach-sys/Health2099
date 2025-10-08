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

  const migrated = migrateSchema(parsed || {});
  const next = mergeDeep({}, DEFAULT_DB, migrated);

  next.logs = Array.isArray(next.logs)
    ? next.logs
        .filter((item) => item && (item.id || item.createdAt))
        .map(normalizeLog)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];
  next.targets = normalizeTargets(next.targets);
  next.meds_today = normalizeMeds(next.meds_today);
  next.settings = normalizeSettings(next.settings);
  next.queue = Array.isArray(next.queue) ? next.queue.filter(Boolean) : [];

  db = next;
  persist();
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

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: db.version,
        logs: db.logs,
        targets: db.targets,
        meds_today: db.meds_today,
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
  db.settings.lastDevicePingISO = log.createdAt;
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
  db.targets = normalizeTargets({ ...db.targets, ...(nextTargets || {}) });
  notify({ target: 'targets', action: 'set', targets: getTargets() });
  return getTargets();
}

function getSettings() {
  return { ...db.settings };
}

function setSettings(partial) {
  db.settings = normalizeSettings({ ...db.settings, ...(partial || {}) });
  notify({ target: 'settings', action: 'set', settings: getSettings() });
  return getSettings();
}

function getMedsToday() {
  return db.meds_today.map((med) => ({ ...med }));
}

function setMedsToday(next) {
  db.meds_today = normalizeMeds(next);
  notify({ target: 'meds', action: 'set', meds: getMedsToday() });
  return getMedsToday();
}

function updateMedToday(id, updates) {
  let updated;
  db.meds_today = db.meds_today.map((med) => {
    if (med.id !== id) return med;
    updated = { ...med, ...(updates || {}) };
    return updated;
  });
  if (updated) {
    setMedsToday(db.meds_today);
  }
  return updated;
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

function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
