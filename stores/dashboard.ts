import { useSyncExternalStore } from 'react';

export type GaugeSnapshot = {
  energy: number;
  srv: number;
  delta15m: {
    energy: number;
    srv: number;
  };
  confidence: 'manual' | 'auto' | 'timeout' | string;
};

export type DeviceSnapshot = {
  online: boolean;
  offline_min: number;
  battery: number;
  input: 'manual' | 'auto' | 'timeout' | string;
};

export type KpiEntry = {
  value: number;
  badge: string;
};

export type RingsSnapshot = {
  stress: number;
  burnout: number;
  fatigue: number;
  heartAge: {
    value: number;
    badge: string;
  };
};

export type FactsSnapshot = {
  sleep_h: number;
  alcohol_yday: boolean;
  symptoms: boolean;
  energy_adj: number;
  late_meal: boolean;
};

export type DashboardSnapshot = {
  gauges: GaugeSnapshot;
  device: DeviceSnapshot;
  kpi: {
    wellbeing7: KpiEntry;
    cardio: KpiEntry;
    risk: KpiEntry;
    arrhythmia: KpiEntry;
  };
  rings: RingsSnapshot;
  facts: FactsSnapshot;
  notes: string;
};

const DASHBOARD_NOTES_KEY = 'health_dashboard_notes_v1';

const dashboardFixture: DashboardSnapshot = {
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

const listeners = new Set<() => void>();

function clone<T>(value: T): T {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function clamp(value: unknown, min = 0, max = 100): number {
  const num = Number.isFinite(value as number) ? Number(value) : Number(min);
  if (num < min) return min;
  if (num > max) return max;
  return Math.round(num);
}

export const badgeRules = {
  wellbeing(value: number) {
    if (value >= 85) return 'Excellent';
    if (value >= 75) return 'Good';
    if (value >= 60) return 'Normal';
    return 'Low';
  },
  cardio(value: number) {
    if (value >= 85) return 'Excellent';
    if (value >= 70) return 'Within acceptable';
    if (value >= 50) return 'Needs attention';
    return 'Low';
  },
  risk(value: number) {
    if (value <= 35) return 'Low';
    if (value <= 65) return 'System acceptable';
    return 'Elevated';
  },
  arrhythmia(value: number) {
    if (value <= 10) return 'Within normal';
    if (value <= 25) return 'Watch';
    return 'Elevated';
  },
  sleep(hours?: number | null) {
    if (hours == null) return '—';
    if (hours >= 7 && hours <= 9) return 'Within normal';
    if (hours < 7) return 'Short';
    return 'Long';
  },
};

function readStoredNotes(): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const value = localStorage.getItem(DASHBOARD_NOTES_KEY);
    return value == null ? null : value;
  } catch (error) {
    console.warn('[dashboard] Failed to read stored notes', error);
    return null;
  }
}

function persistNotes(next: string) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(DASHBOARD_NOTES_KEY, next ?? '');
  } catch (error) {
    console.warn('[dashboard] Failed to persist notes', error);
  }
}

function sanitizeSnapshot(source?: Partial<DashboardSnapshot> | null): DashboardSnapshot {
  const base = dashboardFixture;
  const snapshot = source ?? {};
  const gaugesSource = snapshot.gauges ?? {};
  const deltaSource = gaugesSource.delta15m ?? {};
  const deviceSource = snapshot.device ?? {};
  const kpiSource = snapshot.kpi ?? {};
  const ringsSource = snapshot.rings ?? {};
  const factsSource = snapshot.facts ?? {};

  const energy = clamp(gaugesSource.energy ?? base.gauges.energy);
  const srv = clamp(gaugesSource.srv ?? base.gauges.srv);
  const energyDelta = Number.isFinite(deltaSource.energy) ? Math.round(Number(deltaSource.energy)) : base.gauges.delta15m.energy;
  const srvDelta = Number.isFinite(deltaSource.srv) ? Math.round(Number(deltaSource.srv)) : base.gauges.delta15m.srv;
  const confidence = (gaugesSource.confidence ?? base.gauges.confidence) as GaugeSnapshot['confidence'];

  const battery = clamp(deviceSource.battery ?? base.device.battery);
  const offlineMinutes = Number.isFinite(deviceSource.offline_min)
    ? Math.max(0, Math.round(Number(deviceSource.offline_min)))
    : base.device.offline_min;

  const wellbeingValue = clamp(kpiSource.wellbeing7?.value ?? base.kpi.wellbeing7.value);
  const cardioValue = clamp(kpiSource.cardio?.value ?? base.kpi.cardio.value);
  const riskValue = clamp(kpiSource.risk?.value ?? base.kpi.risk.value);
  const arrhythmiaValue = clamp(kpiSource.arrhythmia?.value ?? base.kpi.arrhythmia.value);

  const sleepHours = Number.isFinite(factsSource.sleep_h) ? Number(factsSource.sleep_h) : base.facts.sleep_h;

  return {
    gauges: {
      energy,
      srv,
      delta15m: { energy: energyDelta, srv: srvDelta },
      confidence,
    },
    device: {
      online: deviceSource.online ?? base.device.online,
      offline_min: offlineMinutes,
      battery,
      input: (deviceSource.input ?? base.device.input) as DeviceSnapshot['input'],
    },
    kpi: {
      wellbeing7: {
        value: wellbeingValue,
        badge: kpiSource.wellbeing7?.badge ?? badgeRules.wellbeing(wellbeingValue),
      },
      cardio: {
        value: cardioValue,
        badge: kpiSource.cardio?.badge ?? badgeRules.cardio(cardioValue),
      },
      risk: {
        value: riskValue,
        badge: kpiSource.risk?.badge ?? badgeRules.risk(riskValue),
      },
      arrhythmia: {
        value: arrhythmiaValue,
        badge: kpiSource.arrhythmia?.badge ?? badgeRules.arrhythmia(arrhythmiaValue),
      },
    },
    rings: {
      stress: clamp(ringsSource.stress ?? base.rings.stress),
      burnout: clamp(ringsSource.burnout ?? base.rings.burnout),
      fatigue: clamp(ringsSource.fatigue ?? base.rings.fatigue),
      heartAge: {
        value: clamp(ringsSource.heartAge?.value ?? base.rings.heartAge.value, 0, 120),
        badge: ringsSource.heartAge?.badge ?? base.rings.heartAge.badge,
      },
    },
    facts: {
      sleep_h: sleepHours,
      alcohol_yday: factsSource.alcohol_yday ?? base.facts.alcohol_yday,
      symptoms: factsSource.symptoms ?? base.facts.symptoms,
      energy_adj: Number.isFinite(factsSource.energy_adj)
        ? Math.round(Number(factsSource.energy_adj))
        : base.facts.energy_adj,
      late_meal: factsSource.late_meal ?? base.facts.late_meal,
    },
    notes: typeof snapshot.notes === 'string' ? snapshot.notes : base.notes,
  };
}

const fallbackSnapshot = sanitizeSnapshot(null);

function prepareInitialSnapshot(): DashboardSnapshot {
  const storedNotes = readStoredNotes();
  if (storedNotes != null) {
    return sanitizeSnapshot({ notes: storedNotes });
  }
  return fallbackSnapshot;
}

let state: DashboardSnapshot = prepareInitialSnapshot();

function emit() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('[dashboard] Listener failed', error);
    }
  });
}

function setSnapshot(next?: Partial<DashboardSnapshot>) {
  state = sanitizeSnapshot({ ...clone(state), ...clone(next ?? {}) });
  emit();
  return state;
}

function updateNotes(notes: string) {
  const nextNotes = typeof notes === 'string' ? notes : '';
  persistNotes(nextNotes);
  return setSnapshot({ ...state, notes: nextNotes });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const selectors = {
  gauges: (snapshot: DashboardSnapshot) => snapshot.gauges,
  device: (snapshot: DashboardSnapshot) => snapshot.device,
  kpi: (snapshot: DashboardSnapshot) => snapshot.kpi,
  rings: (snapshot: DashboardSnapshot) => snapshot.rings,
  facts: (snapshot: DashboardSnapshot) => snapshot.facts,
  notes: (snapshot: DashboardSnapshot) => snapshot.notes,
};

export function getSnapshot() {
  return state;
}

export function useDashboard<T>(selector: (snapshot: DashboardSnapshot) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(fallbackSnapshot));
}

export const dashboard = {
  fixture: fallbackSnapshot,
  getSnapshot,
  setSnapshot,
  updateNotes,
  subscribe,
  selectors,
};

export default dashboard;
