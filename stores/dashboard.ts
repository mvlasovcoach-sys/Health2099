export type GaugeConfidence = 'manual' | 'auto' | 'timeout';

export interface DashboardGaugeDelta {
  energy: number;
  srv: number;
}

export interface DashboardGauges {
  energy: number;
  srv: number;
  delta15m: DashboardGaugeDelta;
  confidence: GaugeConfidence;
}

export interface DashboardDeviceStatus {
  online: boolean;
  offline_min: number;
  battery: number;
  input: 'manual' | 'auto';
}

export interface DashboardBadge {
  value: number;
  badge: string;
}

export interface DashboardKpi {
  wellbeing7: DashboardBadge;
  cardio: DashboardBadge;
  risk: DashboardBadge;
  arrhythmia: DashboardBadge;
}

export interface DashboardRings {
  stress: number;
  burnout: number;
  fatigue: number;
  heartAge: DashboardBadge;
}

export interface DashboardFacts {
  sleep_h: number | null;
  alcohol_yday: boolean | null;
  symptoms: boolean | null;
  energy_adj: number;
  late_meal: boolean | null;
}

export interface DashboardSnapshot {
  gauges: DashboardGauges;
  device: DashboardDeviceStatus;
  kpi: DashboardKpi;
  rings: DashboardRings;
  facts: DashboardFacts;
  notes: string;
}

export interface DashboardSelectors {
  gauges: (snapshot: DashboardSnapshot) => DashboardGauges;
  device: (snapshot: DashboardSnapshot) => DashboardDeviceStatus;
  kpi: (snapshot: DashboardSnapshot) => DashboardKpi;
  rings: (snapshot: DashboardSnapshot) => DashboardRings;
  facts: (snapshot: DashboardSnapshot) => DashboardFacts;
  notes: (snapshot: DashboardSnapshot) => string;
}

export interface DashboardStore {
  fixture: DashboardSnapshot;
  getSnapshot: () => DashboardSnapshot;
  set: (snapshot: DashboardSnapshot) => DashboardSnapshot;
  updateNotes: (text: string) => DashboardSnapshot;
  subscribe: (listener: (snapshot: DashboardSnapshot) => void) => () => void;
  selectors: DashboardSelectors;
}

export { dashboard as default, dashboard } from './dashboard.js';
