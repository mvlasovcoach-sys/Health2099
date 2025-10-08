import { dashboard } from '../stores/dashboard.js';

const clamp = (value, min = 0, max = 100) => {
  const num = Number.isFinite(value) ? value : 0;
  if (num < min) return min;
  if (num > max) return max;
  return Math.round(num);
};

const badgeRules = {
  wellbeing(value) {
    if (value >= 85) return 'Excellent';
    if (value >= 75) return 'Good';
    if (value >= 60) return 'Normal';
    return 'Low';
  },
  cardio(value) {
    if (value >= 85) return 'Excellent';
    if (value >= 70) return 'Within acceptable';
    if (value >= 50) return 'Needs attention';
    return 'Low';
  },
  risk(value) {
    if (value <= 35) return 'Low';
    if (value <= 65) return 'System acceptable';
    return 'Elevated';
  },
  arrhythmia(value) {
    if (value <= 10) return 'Within normal';
    if (value <= 25) return 'Watch';
    return 'Elevated';
  },
  sleep(hours) {
    if (hours == null) return '—';
    if (hours >= 7 && hours <= 9) return 'Within normal';
    if (hours < 7) return 'Short';
    return 'Long';
  },
};

function computePlaceholderSnapshot() {
  const base = dashboard.fixture;
  const current = dashboard.getSnapshot();

  const gauges = {
    energy: clamp(current?.gauges?.energy ?? base.gauges.energy),
    srv: clamp(current?.gauges?.srv ?? base.gauges.srv),
    delta15m: {
      energy: Number.isFinite(current?.gauges?.delta15m?.energy)
        ? Math.round(current.gauges.delta15m.energy)
        : base.gauges.delta15m.energy,
      srv: Number.isFinite(current?.gauges?.delta15m?.srv)
        ? Math.round(current.gauges.delta15m.srv)
        : base.gauges.delta15m.srv,
    },
    confidence: current?.gauges?.confidence || base.gauges.confidence,
  };

  const device = {
    online: current?.device?.online ?? base.device.online,
    offline_min: Number.isFinite(current?.device?.offline_min)
      ? Math.max(0, Math.round(current.device.offline_min))
      : base.device.offline_min,
    battery: clamp(current?.device?.battery ?? base.device.battery),
    input: current?.device?.input || base.device.input,
  };

  const wellbeingValue = clamp(current?.kpi?.wellbeing7?.value ?? base.kpi.wellbeing7.value);
  const cardioValue = clamp(current?.kpi?.cardio?.value ?? base.kpi.cardio.value);
  const riskValue = clamp(current?.kpi?.risk?.value ?? base.kpi.risk.value);
  const arrhythmiaValue = clamp(current?.kpi?.arrhythmia?.value ?? base.kpi.arrhythmia.value);

  const rings = {
    stress: clamp(current?.rings?.stress ?? base.rings.stress),
    burnout: clamp(current?.rings?.burnout ?? base.rings.burnout),
    fatigue: clamp(current?.rings?.fatigue ?? base.rings.fatigue),
    heartAge: {
      value: clamp(current?.rings?.heartAge?.value ?? base.rings.heartAge.value, 0, 120),
      badge: current?.rings?.heartAge?.badge || base.rings.heartAge.badge,
    },
  };

  const sleepHours = Number.isFinite(current?.facts?.sleep_h) ? current.facts.sleep_h : base.facts.sleep_h;

  const facts = {
    sleep_h: sleepHours,
    alcohol_yday:
      current?.facts?.alcohol_yday == null ? base.facts.alcohol_yday : current.facts.alcohol_yday,
    symptoms: current?.facts?.symptoms == null ? base.facts.symptoms : current.facts.symptoms,
    energy_adj: Number.isFinite(current?.facts?.energy_adj)
      ? Math.round(current.facts.energy_adj)
      : base.facts.energy_adj,
    late_meal: current?.facts?.late_meal == null ? base.facts.late_meal : current.facts.late_meal,
  };

  return {
    gauges,
    device,
    kpi: {
      wellbeing7: { value: wellbeingValue, badge: badgeRules.wellbeing(wellbeingValue) },
      cardio: { value: cardioValue, badge: badgeRules.cardio(cardioValue) },
      risk: { value: riskValue, badge: badgeRules.risk(riskValue) },
      arrhythmia: { value: arrhythmiaValue, badge: badgeRules.arrhythmia(arrhythmiaValue) },
    },
    rings,
    facts: {
      ...facts,
    },
    notes: typeof current?.notes === 'string' ? current.notes : base.notes,
  };
}

export function recomputeDashboard(now = new Date()) {
  void now;
  const snapshot = computePlaceholderSnapshot();
  dashboard.set(snapshot);
  return snapshot;
}

export function bootstrapDashboardPage() {
  recomputeDashboard(new Date());
  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('health:changed', handleExternalChange);
  return () => {
    window.removeEventListener('focus', handleFocus);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('health:changed', handleExternalChange);
  };
}

function handleFocus() {
  recomputeDashboard(new Date());
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    recomputeDashboard(new Date());
  }
}

function handleExternalChange(event) {
  const target = event && event.detail ? event.detail.target : undefined;
  if (!target || target === 'events' || target === 'settings') {
    recomputeDashboard(new Date());
  }
}

export { badgeRules };
