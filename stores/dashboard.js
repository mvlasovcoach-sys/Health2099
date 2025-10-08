const DASHBOARD_NOTES_KEY = 'health_dashboard_notes_v1';

const dashboardFixture = {
  gauges: { energy: 70, srv: 53, delta15m: { energy: 4, srv: -1 }, confidence: 'manual' },
  device: { online: false, offline_min: 10, battery: 82, input: 'manual' },
  kpi: {
    wellbeing7: { value: 78, badge: 'Normal' },
    cardio: { value: 89, badge: 'Within acceptable' },
    risk: { value: 65, badge: 'System acceptable' },
    arrhythmia: { value: 10, badge: 'Within normal' },
  },
  rings: {
    stress: 30,
    burnout: 21,
    fatigue: 41,
    heartAge: { value: 50, badge: 'Older than biological (+1)' },
  },
  facts: {
    sleep_h: 7.5,
    alcohol_yday: false,
    symptoms: false,
    energy_adj: 10,
    late_meal: false,
  },
  notes: 'Recommendations will appear later (based on Energy / SRV / Stress).',
};

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function readStoredNotes() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const value = localStorage.getItem(DASHBOARD_NOTES_KEY);
    return value == null ? null : value;
  } catch (err) {
    console.warn('[dashboard] Failed to read stored notes', err);
    return null;
  }
}

function persistNotes(next) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DASHBOARD_NOTES_KEY, next ?? '');
  } catch (err) {
    console.warn('[dashboard] Failed to persist notes', err);
  }
}

const listeners = new Set();

const state = {
  snapshot: prepareInitialSnapshot(),
};

function prepareInitialSnapshot() {
  const storedNotes = readStoredNotes();
  if (storedNotes != null) {
    return {
      ...clone(dashboardFixture),
      notes: storedNotes,
    };
  }
  return clone(dashboardFixture);
}

function getSnapshot() {
  return state.snapshot;
}

function setSnapshot(next) {
  const prepared = {
    ...clone(dashboardFixture),
    ...clone(next || {}),
  };
  state.snapshot = prepared;
  listeners.forEach((listener) => {
    try {
      listener(prepared);
    } catch (err) {
      console.error('[dashboard] Listener failed', err);
    }
  });
  return prepared;
}

function updateNotes(notes) {
  const current = getSnapshot();
  const nextNotes = typeof notes === 'string' ? notes : '';
  persistNotes(nextNotes);
  return setSnapshot({
    ...current,
    notes: nextNotes,
  });
}

function subscribe(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const selectors = {
  gauges: (snapshot) => snapshot.gauges,
  device: (snapshot) => snapshot.device,
  kpi: (snapshot) => snapshot.kpi,
  rings: (snapshot) => snapshot.rings,
  facts: (snapshot) => snapshot.facts,
  notes: (snapshot) => snapshot.notes,
};

export const dashboard = {
  fixture: dashboardFixture,
  getSnapshot,
  set: setSnapshot,
  updateNotes,
  subscribe,
  selectors,
};

export default dashboard;
