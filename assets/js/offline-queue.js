import { pushLog } from './sharedStorage.js';

const STORAGE_KEY = 'health2099-offline-queue';

let queue = loadQueue();
const listeners = new Set();
const flushListeners = new Set();

export function getQueue() {
  return queue.map((item) => ({ ...item }));
}

export function enqueue(entry) {
  const item = normalizeEntry(entry);
  queue = [...queue, item];
  persist();
  notify();
  flushQueue();
  return { ...item };
}

export function remove(id) {
  const before = queue.length;
  queue = queue.filter((item) => item.id !== id);
  if (queue.length !== before) {
    persist();
    notify();
  }
}

export function clearQueue() {
  if (!queue.length) return;
  queue = [];
  persist();
  notify();
}

export function onQueueChange(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function onFlush(fn) {
  if (typeof fn !== 'function') return () => {};
  flushListeners.add(fn);
  return () => flushListeners.delete(fn);
}

export function flushQueue() {
  if (!queue.length) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return;
  }
  const pending = queue;
  queue = [];
  persist();
  notify();
  const failed = [];
  pending.forEach((item) => {
    try {
      const log = pushLog({
        type: item.type,
        value: item.value,
        unit: item.unit ?? null,
        note: item.note ?? null,
        source: item.source || 'quick',
        meta: item.meta || null,
      });
      flushListeners.forEach((listener) => {
        try {
          listener({ entry: { ...item }, log });
        } catch (error) {
          console.error('[offline-queue] flush listener failed', error);
        }
      });
    } catch (error) {
      console.warn('[offline-queue] failed to flush entry, re-queueing', error);
      failed.push(item);
    }
  });
  if (failed.length) {
    queue = [...failed, ...queue];
    persist();
    notify();
  }
}

function normalizeEntry(entry) {
  const now = new Date().toISOString();
  return {
    id: ensureId(entry?.id),
    type: entry?.type || 'note',
    value: Number(entry?.value ?? 0) || 0,
    unit: entry?.unit ?? null,
    note: typeof entry?.note === 'string' ? entry.note : null,
    source: entry?.source || 'quick',
    meta: entry?.meta && typeof entry.meta === 'object' ? { ...entry.meta } : null,
    queuedAt: entry?.queuedAt || now,
  };
}

function ensureId(id) {
  if (id) return id;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `queue_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function loadQueue() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        try {
          return normalizeEntry(item);
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    console.warn('[offline-queue] failed to load queue', error);
    return [];
  }
}

function persist() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('[offline-queue] failed to persist queue', error);
  }
}

function notify() {
  const snapshot = getQueue();
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error('[offline-queue] listener error', error);
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flushQueue());
}

// attempt initial flush when module loads
flushQueue();
