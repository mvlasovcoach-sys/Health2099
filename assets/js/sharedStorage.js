const KEY = 'health2099-db';
let db = load();
const listeners = new Set();
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('health2099') : null;

function load() {
  if (typeof localStorage === 'undefined') {
    return def();
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return def();
    const parsed = JSON.parse(raw);
    return sanitizeDB(parsed);
  } catch (error) {
    console.warn('[sharedStorage] Failed to load db, using defaults', error);
    return def();
  }
}

function def() {
  return {
    logs: [],
    targets: { water_ml: 2000, steps: 8000, sleep_min: 420, caffeine_mg: 300 },
    meds_today: [],
    settings: { tz: 'Europe/Amsterdam', lastDevicePingISO: null, batteryPct: null },
  };
}

function sanitizeDB(next) {
  const base = def();
  const result = {
    ...base,
    ...(next && typeof next === 'object' ? next : {}),
  };
  result.logs = Array.isArray(result.logs) ? result.logs.map(sanitizeLog).sort(sortLogs) : [];
  result.targets = {
    ...base.targets,
    ...(result.targets && typeof result.targets === 'object' ? result.targets : {}),
  };
  result.meds_today = Array.isArray(result.meds_today)
    ? result.meds_today.map((item) => ({ id: ensureId(item.id), title: item.title || '', taken: Boolean(item.taken) }))
    : [];
  result.settings = {
    ...base.settings,
    ...(result.settings && typeof result.settings === 'object' ? result.settings : {}),
  };
  return result;
}

function sanitizeLog(log) {
  if (!log || typeof log !== 'object') return createLog({});
  return createLog(log);
}

function createLog(log) {
  const iso = toISO(log.createdAt || log.ts);
  return {
    id: ensureId(log.id),
    type: log.type || 'note',
    value: toNumber(log.value),
    note: typeof log.note === 'string' ? log.note : '',
    createdAt: iso,
    updatedAt: toISO(log.updatedAt) || iso,
    source: log.source || null,
  };
}

function toISO(value) {
  if (!value) {
    return new Date().toISOString();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function ensureId(id) {
  if (id) return id;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `log_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function sortLogs(a, b) {
  const aTime = new Date(a.createdAt).getTime();
  const bTime = new Date(b.createdAt).getTime();
  return bTime - aTime;
}

function toNumber(value) {
  if (value === '' || value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function persist(state = db) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[sharedStorage] Failed to persist db', error);
  }
}

function clone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

export const getDB = () => clone(db);

export function setDB(next) {
  const nextState = sanitizeDB(next);
  db = nextState;
  persist(db);
  if (bc) {
    try {
      bc.postMessage({ type: 'db-updated' });
    } catch (error) {
      console.warn('[sharedStorage] Failed to broadcast db update', error);
    }
  }
  notify();
  return getDB();
}

export function getTargets() {
  return { ...db.targets };
}

export function setTargets(nextTargets) {
  const merged = {
    ...db.targets,
    ...(nextTargets && typeof nextTargets === 'object' ? nextTargets : {}),
  };
  setDB({ ...db, targets: merged });
  return { ...merged };
}

export function pushLog(payload) {
  const item = createLog(payload || {});
  setDB({ ...db, logs: [item, ...db.logs] });
  return item;
}

export function updateLog(id, patch) {
  if (!id) return null;
  let updated = null;
  const nextLogs = db.logs.map((log) => {
    if (log.id !== id) return log;
    updated = createLog({ ...log, ...(patch || {}), id: log.id, updatedAt: new Date().toISOString() });
    return updated;
  });
  if (updated) {
    setDB({ ...db, logs: nextLogs });
  }
  return updated;
}

export function removeLog(id) {
  if (!id) return null;
  const existing = db.logs.find((log) => log.id === id) || null;
  if (!existing) return null;
  setDB({ ...db, logs: db.logs.filter((log) => log.id !== id) });
  return existing;
}

export function listLogs(options = {}) {
  const { type, since, until } = options || {};
  const sinceTime = since ? new Date(since).getTime() : null;
  const untilTime = until ? new Date(until).getTime() : null;
  return db.logs.filter((log) => {
    if (type && log.type !== type) return false;
    const time = new Date(log.createdAt).getTime();
    if (Number.isNaN(time)) return false;
    if (sinceTime != null && time < sinceTime) return false;
    if (untilTime != null && time > untilTime) return false;
    return true;
  });
}

export function onChange(fn) {
  if (typeof fn !== 'function') {
    return () => {};
  }
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  const snapshot = getDB();
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error('[sharedStorage] Listener error', error);
    }
  });
}

if (bc) {
  bc.addEventListener('message', (event) => {
    if (event?.data?.type === 'db-updated') {
      db = load();
      notify();
    }
  });
}
