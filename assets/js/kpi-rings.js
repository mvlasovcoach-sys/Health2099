import { SharedStorage } from './sharedStorage.js';
import { formatNumber, minutesToHours } from './utils.js';

const SECTION_ID = 'kpi-grid';

const METRICS = [
  { id: 'hydration', label: 'Hydration', totalKey: 'water_ml', targetKey: 'water_ml', unit: 'ml' },
  { id: 'sleep', label: 'Sleep', totalKey: 'sleep_min', targetKey: 'sleep_min', unit: 'min' },
  { id: 'steps', label: 'Steps', totalKey: 'steps', targetKey: 'steps', unit: 'steps' },
  { id: 'caffeine', label: 'Caffeine', totalKey: 'caffeine_mg', targetKey: 'caffeine_mg', unit: 'mg' },
  { id: 'meds', label: 'Meds', totalKey: 'meds_taken', targetKey: null, unit: 'dose' },
];

function resolveContainer() {
  return document.querySelector('[data-kpi-rings]') || document.getElementById(SECTION_ID);
}

function ensureHost(container) {
  if (!container) return null;
  let host = container.querySelector('[data-kpi-rings-host]');
  if (!host) {
    host = document.createElement('div');
    host.className = 'kpi-rings';
    host.dataset.kpiRingsHost = 'true';
    host.setAttribute('role', 'list');
    host.setAttribute('aria-label', 'Daily wellness progress rings');
    container.insertBefore(host, container.firstChild);
  }
  return host;
}

function computeMetrics() {
  const now = new Date();
  const targets = SharedStorage.getTargets();
  const today = SharedStorage.aggregateDay(now);
  const medsToday = SharedStorage.getMedsToday();
  const medsScheduled = medsToday.length;
  const medsTaken = SharedStorage.listLogs({
    type: 'med',
    since: SharedStorage.startOfDayISO(now),
  }).length;

  return METRICS.map((metric) => {
    const targetValue = getTargetValue(metric, targets, medsScheduled);
    const actualValue = metric.id === 'meds' ? medsTaken : today[metric.totalKey] || 0;
    const percent = computePercent(metric.id, actualValue, targetValue, medsScheduled);
    const cappedDegrees = toDegrees(metric.id, percent);
    const status = resolveStatus(metric.id, actualValue, targetValue, percent, {
      medsScheduled,
      medsTaken,
    });
    return {
      ...metric,
      actualValue,
      targetValue,
      percent,
      cappedDegrees,
      status,
      display: formatDisplay(metric.id, actualValue, targetValue, {
        medsScheduled,
        medsTaken,
      }),
      overTarget: metric.id === 'caffeine' && targetValue > 0 ? actualValue > targetValue : false,
      complete: metric.id === 'meds'
        ? medsScheduled > 0 && medsTaken >= medsScheduled
        : percent >= 100 && targetValue > 0,
    };
  });
}

function getTargetValue(metric, targets, medsScheduled) {
  switch (metric.id) {
    case 'hydration':
      return targets.water_ml || 0;
    case 'sleep':
      return targets.sleep_min || 0;
    case 'steps':
      return targets.steps || 0;
    case 'caffeine':
      return targets.caffeine_mg || 0;
    case 'meds':
      return medsScheduled;
    default:
      return 0;
  }
}

function computePercent(id, actual, target, medsScheduled) {
  if (id === 'meds') {
    if (!medsScheduled) return 100;
    return Math.round(Math.min((actual / medsScheduled) * 100, 150));
  }
  if (!target) return 0;
  const ratio = actual / target;
  return Math.round(Math.max(0, ratio * 100));
}

function toDegrees(id, percent) {
  const cap = id === 'meds' ? 100 : 130;
  const normalized = Math.min(Math.max(percent, 0), cap);
  const limited = Math.min(normalized, 100);
  return (limited / 100) * 360;
}

function resolveStatus(id, actual, target, percent, context) {
  switch (id) {
    case 'hydration':
    case 'sleep':
    case 'steps': {
      if (!target) return { tone: 'neutral', label: 'Set goal' };
      if (percent >= 100) return { tone: 'on-track', label: 'On track' };
      if (percent >= 60) return { tone: 'warning', label: 'Warning' };
      return { tone: 'danger', label: 'Missed' };
    }
    case 'caffeine': {
      if (!target) return { tone: 'neutral', label: 'Set goal' };
      const ratio = target ? actual / target : 0;
      if (ratio <= 0.8) return { tone: 'on-track', label: 'On track' };
      if (ratio <= 1) return { tone: 'warning', label: 'Warning' };
      return { tone: 'danger', label: 'Danger' };
    }
    case 'meds': {
      if (!context.medsScheduled) return { tone: 'neutral', label: 'No meds' };
      if (context.medsTaken >= context.medsScheduled) return { tone: 'on-track', label: 'On track' };
      return { tone: 'danger', label: 'Danger' };
    }
    default:
      return { tone: 'neutral', label: 'Set goal' };
  }
}

function formatDisplay(id, actual, target, context) {
  switch (id) {
    case 'hydration':
      return target ? `${formatNumber(actual)} / ${formatNumber(target)} ml` : `${formatNumber(actual)} ml`;
    case 'sleep': {
      const formattedActual = minutesToHours(actual);
      return target ? `${formattedActual} / ${minutesToHours(target)}` : formattedActual;
    }
    case 'steps':
      return target ? `${formatNumber(actual)} / ${formatNumber(target)} steps` : `${formatNumber(actual)} steps`;
    case 'caffeine':
      return target ? `${formatNumber(actual)} / ${formatNumber(target)} mg` : `${formatNumber(actual)} mg`;
    case 'meds': {
      const scheduled = context.medsScheduled || 0;
      if (!scheduled) return `${context.medsTaken || 0} / 0`;
      return `${context.medsTaken || 0} / ${scheduled}`;
    }
    default:
      return `${formatNumber(actual)}`;
  }
}

function render(container) {
  const host = ensureHost(container);
  if (!host) return;

  const metrics = computeMetrics();
  host.innerHTML = '';

  metrics.forEach((metric) => {
    const item = document.createElement('article');
    item.className = 'kpi-ring';
    item.dataset.tone = metric.status.tone;
    if (metric.complete) item.dataset.complete = 'true';
    if (metric.overTarget) item.dataset.over = 'true';
    item.setAttribute('role', 'listitem');
    item.setAttribute('aria-label', `${metric.label} ${metric.percent}%`);

    const circle = document.createElement('div');
    circle.className = 'kpi-ring__circle';

    const progress = document.createElement('div');
    progress.className = 'kpi-ring__progress';
    progress.style.setProperty('--fill', `${metric.cappedDegrees}`);

    const inner = document.createElement('div');
    inner.className = 'kpi-ring__inner';

    const percent = document.createElement('span');
    percent.className = 'kpi-ring__percent';
    const displayPercent = Number.isFinite(metric.percent) ? Math.max(0, metric.percent) : 0;
    percent.textContent = `${Math.min(999, Math.round(displayPercent))}%`;

    const measure = document.createElement('span');
    measure.className = 'kpi-ring__measure';
    measure.textContent = metric.display;

    const label = document.createElement('span');
    label.className = 'kpi-ring__label';
    label.textContent = metric.label;

    inner.append(percent, measure, label);
    progress.appendChild(inner);
    circle.appendChild(progress);
    item.appendChild(circle);

    const status = document.createElement('span');
    status.className = 'kpi-ring__status';
    status.dataset.tone = metric.status.tone;
    status.textContent = metric.status.label;

    item.appendChild(status);
    host.appendChild(item);
  });
}

export function initKpiRings() {
  const container = resolveContainer();
  if (!container) return;

  render(container);
  SharedStorage.onChange(() => render(container));
}

export default initKpiRings;

