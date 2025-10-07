(function (globalFactory) {
  const api = globalFactory();
  const globalObject = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (typeof define === 'function' && define.amd) {
    define(function () {
      return api;
    });
  }
  if (globalObject) {
    globalObject.StorageAPI = api;
  }
})(function () {
  const LS_EVENTS = 'health_events_v1';
  const LS_SETTINGS = 'health_settings_v1';
  const LS_LOCATIONS = 'health_locations_v1';
  const SCHEMA_VERSION = 1;

  function nowISO() {
    return new Date().toISOString();
  }

  function parseDate(value) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  function safeParse(raw, fallback) {
    if (!raw) return clone(fallback);
    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (err) {
      console.warn('[StorageAPI] Failed to parse JSON for localStorage value', err);
      return clone(fallback);
    }
  }

  function sanitizeEvent(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const source = { ...raw };
    const ensureString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
    const ensureNumber = (value) => {
      if (value == null || value === '') return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };
    const ensureDateIso = (value, fallback) => {
      const parsed = parseDate(value) || (fallback ? parseDate(fallback) : null);
      return parsed ? parsed.toISOString() : nowISO();
    };

    const id = ensureString(source.id, undefined) || generateId('evt');
    const type = ensureString(source.type, 'generic');
    const note = ensureString(source.note, '');
    const valueNumber = ensureNumber(source.value_number);
    const createdAt = ensureDateIso(source.created_at, source.updated_at);
    const updatedAt = ensureDateIso(source.updated_at, createdAt);
    const deletedAt = parseDate(source.deleted_at);

    const normalized = {
      ...source,
      id,
      type,
      note,
      value_number: valueNumber,
      created_at: createdAt,
      updated_at: updatedAt,
    };
    if (deletedAt) {
      normalized.deleted_at = deletedAt.toISOString();
    } else {
      delete normalized.deleted_at;
    }
    return normalized;
  }

  function sanitizeLocation(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const source = { ...raw };
    const ensureNumber = (value) => {
      if (value == null || value === '') return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };
    const ensureString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
    const ensureDateIso = (value, fallback) => {
      const parsed = parseDate(value) || (fallback ? parseDate(fallback) : null);
      return parsed ? parsed.toISOString() : nowISO();
    };

    const id = ensureString(source.id, undefined) || generateId('loc');
    const lat = ensureNumber(source.lat);
    const lng = ensureNumber(source.lng);
    if (lat == null || lng == null) {
      return null;
    }
    const accuracy = ensureNumber(source.accuracy_m);
    const createdAt = ensureDateIso(source.created_at, source.updated_at);
    const updatedAt = ensureDateIso(source.updated_at, createdAt);
    const note = ensureString(source.note, '');
    const locationSource = ensureString(source.source, 'device');

    const normalized = {
      ...source,
      id,
      lat,
      lng,
      note,
      source: locationSource === 'manual' ? 'manual' : 'device',
      created_at: createdAt,
      updated_at: updatedAt,
    };

    if (accuracy != null) {
      normalized.accuracy_m = accuracy;
    } else {
      delete normalized.accuracy_m;
    }

    return normalized;
  }

  function generateId(prefix = 'evt') {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }

  function readArray(key) {
    const raw = storage().getItem(key);
    const parsed = safeParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  function readObject(key) {
    const raw = storage().getItem(key);
    const parsed = safeParse(raw, {});
    return parsed && typeof parsed === 'object' ? parsed : {};
  }

  function storage() {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment');
    }
    return localStorage;
  }

  function dispatchChange(target) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
      return;
    }
    const detail = { target };
    const event = createCustomEvent('health:changed', { detail });
    window.dispatchEvent(event);
  }

  function createCustomEvent(name, params) {
    if (typeof CustomEvent === 'function') {
      return new CustomEvent(name, params);
    }
    if (typeof document !== 'undefined' && typeof document.createEvent === 'function') {
      const event = document.createEvent('CustomEvent');
      event.initCustomEvent(name, params?.bubbles || false, params?.cancelable || false, params?.detail);
      return event;
    }
    return { type: name, detail: params?.detail };
  }

  function loadEvents() {
    const items = readArray(LS_EVENTS).map(sanitizeEvent).filter(Boolean);
    return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function saveEvents(events) {
    const normalized = (Array.isArray(events) ? events : []).map(sanitizeEvent).filter(Boolean);
    const sorted = normalized.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    storage().setItem(LS_EVENTS, JSON.stringify(sorted));
    dispatchChange('events');
    return sorted;
  }

  function loadSettings() {
    const data = readObject(LS_SETTINGS);
    return data;
  }

  function saveSettings(settings) {
    const source = settings && typeof settings === 'object' ? settings : {};
    storage().setItem(LS_SETTINGS, JSON.stringify(source));
    dispatchChange('settings');
    return source;
  }

  function loadLocations() {
    const items = readArray(LS_LOCATIONS).map(sanitizeLocation).filter(Boolean);
    return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function saveLocations(locations) {
    const normalized = (Array.isArray(locations) ? locations : []).map(sanitizeLocation).filter(Boolean);
    const sorted = normalized.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    storage().setItem(LS_LOCATIONS, JSON.stringify(sorted));
    dispatchChange('locations');
    return sorted;
  }

  function addLocation(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload is required for addLocation');
    }
    const now = nowISO();
    const entry = sanitizeLocation({
      ...payload,
      id: generateId('loc'),
      source: payload.source || 'device',
      created_at: now,
      updated_at: now,
    });
    if (!entry) {
      throw new Error('Invalid location payload');
    }
    const locations = loadLocations();
    locations.unshift(entry);
    saveLocations(locations);
    return entry;
  }

  function updateLocation(id, patch) {
    if (!id) return;
    const list = loadLocations();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return;
    const current = list[index];
    const next = sanitizeLocation({
      ...current,
      ...patch,
      id: current.id,
      created_at: current.created_at,
      updated_at: nowISO(),
    });
    if (!next) return;
    list[index] = next;
    saveLocations(list);
  }

  function deleteLocation(id) {
    if (!id) return;
    const next = loadLocations().filter((item) => item.id !== id);
    saveLocations(next);
  }

  function locationsByDate(date) {
    const target = date instanceof Date ? date : new Date(date);
    const start = startOfDay(target);
    const end = endOfDay(target);
    return locationsInRange(start, end);
  }

  function locationsInRange(start, end) {
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    return loadLocations().filter((location) => {
      const created = parseDate(location.created_at);
      if (!created) return false;
      if (startDate && created < startDate) return false;
      if (endDate && created > endDate) return false;
      return true;
    });
  }

  function upsertEvents(incoming) {
    const list = loadEvents();
    const map = new Map(list.map((item) => [item.id, item]));
    let added = 0;
    let updated = 0;
    (incoming || []).forEach((raw) => {
      const next = sanitizeEvent(raw);
      if (!next) return;
      const existing = map.get(next.id);
      if (!existing) {
        map.set(next.id, next);
        added += 1;
        return;
      }
      const incomingDate = parseDate(next.updated_at);
      const existingDate = parseDate(existing.updated_at);
      if (!existingDate || (incomingDate && incomingDate > existingDate)) {
        map.set(next.id, { ...existing, ...next, updated_at: incomingDate ? incomingDate.toISOString() : nowISO() });
        updated += 1;
      }
    });
    const merged = Array.from(map.values());
    saveEvents(merged);
    return { added, updated, total: merged.length };
  }

  function upsertLocations(incoming) {
    const list = loadLocations();
    const map = new Map(list.map((item) => [item.id, item]));
    let added = 0;
    let updated = 0;
    (incoming || []).forEach((raw) => {
      const next = sanitizeLocation(raw);
      if (!next) return;
      const existing = map.get(next.id);
      if (!existing) {
        map.set(next.id, next);
        added += 1;
        return;
      }
      const incomingDate = parseDate(next.updated_at);
      const existingDate = parseDate(existing.updated_at);
      if (!existingDate || (incomingDate && incomingDate > existingDate)) {
        map.set(next.id, { ...existing, ...next, updated_at: incomingDate ? incomingDate.toISOString() : nowISO() });
        updated += 1;
      }
    });
    const merged = Array.from(map.values());
    saveLocations(merged);
    return { added, updated, total: merged.length };
  }

  function exportJson() {
    return {
      version: SCHEMA_VERSION,
      events: loadEvents(),
      settings: loadSettings(),
      locations: loadLocations(),
    };
  }

  function importJson(payload) {
    const result = {
      added: 0,
      updated: 0,
      events: { added: 0, updated: 0, total: loadEvents().length },
      locations: { added: 0, updated: 0, total: loadLocations().length },
    };
    if (!payload || typeof payload !== 'object') {
      return result;
    }
    const events = Array.isArray(payload.events) ? payload.events : [];
    const settings = payload.settings && typeof payload.settings === 'object' ? payload.settings : null;
    const incomingLocations = Array.isArray(payload.locations) ? payload.locations : [];
    const { added, updated, total } = upsertEvents(events);
    result.added = added;
    result.updated = updated;
    result.events = { added, updated, total };
    const locationsMerge = upsertLocations(incomingLocations);
    result.locations = locationsMerge;
    if (settings) {
      const current = loadSettings();
      saveSettings({ ...current, ...settings });
    }
    return result;
  }

  function range(start, end) {
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    return loadEvents().filter((event) => {
      if (event.deleted_at) return false;
      const created = parseDate(event.created_at);
      if (!created) return false;
      if (startDate && created < startDate) return false;
      if (endDate && created > endDate) return false;
      return true;
    });
  }

  function aggregates(scope, anchor) {
    const reference = anchor ? new Date(anchor) : new Date();
    const { start, end } = resolveScope(scope, reference);
    const items = range(start, end);
    const summary = {
      water_ml: 0,
      caffeine_mg: 0,
      steps: 0,
      sleep_min: 0,
      stress_avg: 0,
      energy_avg: 0,
      srv_avg: 0,
      meds_count: 0,
    };
    const counters = {
      stress: 0,
      energy: 0,
      srv: 0,
    };

    items.forEach((event) => {
      const val = typeof event.value_number === 'number' ? event.value_number : null;
      switch (event.type) {
        case 'water':
          if (val != null) summary.water_ml += val;
          break;
        case 'caffeine':
          if (val != null) summary.caffeine_mg += val;
          break;
        case 'steps':
          if (val != null) summary.steps += val;
          break;
        case 'sleep':
          if (val != null) summary.sleep_min += val;
          break;
        case 'stress':
          if (val != null) {
            summary.stress_avg += val;
            counters.stress += 1;
          }
          break;
        case 'energy':
          if (val != null) {
            summary.energy_avg += val;
            counters.energy += 1;
          }
          break;
        case 'srv':
          if (val != null) {
            summary.srv_avg += val;
            counters.srv += 1;
          }
          break;
        case 'med':
        case 'medication':
          summary.meds_count += 1;
          break;
        default:
          break;
      }
    });

    summary.stress_avg = counters.stress ? +(summary.stress_avg / counters.stress).toFixed(2) : 0;
    summary.energy_avg = counters.energy ? +(summary.energy_avg / counters.energy).toFixed(2) : 0;
    summary.srv_avg = counters.srv ? +(summary.srv_avg / counters.srv).toFixed(2) : 0;

    return summary;
  }

  function resolveScope(scope, anchor) {
    const reference = anchor instanceof Date ? anchor : new Date();
    let start;
    switch (scope) {
      case 'week':
        start = startOfWeek(reference);
        break;
      case 'month':
        start = startOfMonth(reference);
        break;
      case 'year':
        start = startOfYear(reference);
        break;
      case 'day':
      default:
        start = startOfDay(reference);
        break;
    }
    const end = endOfDay(
      scope === 'day'
        ? reference
        : scope === 'week'
          ? addDays(start, 6)
          : scope === 'month'
            ? endOfMonth(start)
            : endOfYear(start)
    );
    return { start, end };
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  function startOfWeek(date) {
    const d = startOfDay(date);
    const day = d.getDay();
    const diff = (day + 6) % 7; // Monday as start of week
    d.setDate(d.getDate() - diff);
    return d;
  }

  function startOfMonth(date) {
    const d = startOfDay(date);
    d.setDate(1);
    return d;
  }

  function startOfYear(date) {
    const d = startOfDay(date);
    d.setMonth(0, 1);
    return d;
  }

  function endOfMonth(date) {
    const d = startOfMonth(date);
    d.setMonth(d.getMonth() + 1);
    d.setMilliseconds(-1);
    return d;
  }

  function endOfYear(date) {
    const d = startOfYear(date);
    d.setFullYear(d.getFullYear() + 1);
    d.setMilliseconds(-1);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (!event) return;
      if (event.key === LS_EVENTS) {
        dispatchChange('events');
      }
      if (event.key === LS_SETTINGS) {
        dispatchChange('settings');
      }
      if (event.key === LS_LOCATIONS) {
        dispatchChange('locations');
      }
      if (event.key == null) {
        dispatchChange('storage');
      }
    });
  }

  const api = {
    LS_EVENTS,
    LS_SETTINGS,
    LS_LOCATIONS,
    SCHEMA_VERSION,
    loadEvents,
    saveEvents,
    loadSettings,
    saveSettings,
    loadLocations,
    saveLocations,
    addLocation,
    updateLocation,
    deleteLocation,
    locationsByDate,
    locationsInRange,
    upsertEvents,
    upsertLocations,
    exportJson,
    importJson,
    range,
    aggregates,
    utils: {
      startOfWeek,
      startOfMonth,
      startOfYear,
      endOfDay,
    },
  };

  api.__esModule = true;
  api.default = api;

  return api;
});

