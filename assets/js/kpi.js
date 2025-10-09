import { SharedStorage } from './sharedStorage.js';
import { lazySparkline } from './charts.js';
import { percent, badgeLabel, statusFromRules, minutesToHours, formatNumber } from './utils.js';

const KPI_GRID_ID = 'kpi-grid';

const KPI_CONFIG = [
  {
    id: 'hydration',
    label: 'Hydration',
    totalKey: 'water_ml',
    formatter: (value) => `${formatNumber(value)} ml`,
    goalFormatter: (goal) => `${formatNumber(goal)} ml`,
  },
  {
    id: 'sleep',
    label: 'Sleep',
    totalKey: 'sleep_min',
    formatter: (value) => minutesToHours(value),
    goalFormatter: (goal) => `${minutesToHours(goal)} target`,
  },
  {
    id: 'steps',
    label: 'Steps',
    totalKey: 'steps',
    formatter: (value) => formatNumber(value),
    goalFormatter: (goal) => `${formatNumber(goal)} goal`,
  },
  {
    id: 'caffeine',
    label: 'Caffeine',
    totalKey: 'caffeine_mg',
    formatter: (value) => `${formatNumber(value)} mg`,
    goalFormatter: (goal) => `${formatNumber(goal)} mg`,
  },
  {
    id: 'meds',
    label: 'Meds',
    totalKey: 'meds_taken',
    formatter: (value) => `${value} taken`,
    goalFormatter: (_, context) => `${context?.targetCount || 0} scheduled`,
  },
];

export function initKpi() {
  const grid = document.getElementById(KPI_GRID_ID);
  if (!grid) return;

  function render() {
    const targets = SharedStorage.getTargets();
    const today = SharedStorage.aggregateDay(new Date());
    const medsToday = SharedStorage.getMedsToday();
    const medsTarget = medsToday.length;
    const medsTaken = SharedStorage.listLogs({ type: 'med', since: SharedStorage.startOfDayISO(new Date()) }).length;
    const context = { targetCount: medsTarget, medsTaken, totalScheduled: medsTarget };

    grid.innerHTML = '';

    KPI_CONFIG.forEach((config) => {
      const targetValue = getTargetValue(config.id, targets, context);
      const totalValue = config.id === 'meds' ? medsTaken : today[config.totalKey] || 0;
      const statusType = config.id === 'hydration' ? 'hydration' : config.id;
      const status = statusFromRules(statusType, totalValue, targetValue, context);
      const badge = badgeLabel(status);
      const completion = targetValue ? percent(totalValue, targetValue) : 100;
      const card = document.createElement('article');
      card.className = 'kpi-card card-hover';
      if (status === 'on-track' && completion >= 100) {
        card.classList.add('goal-pulse');
        setTimeout(() => card.classList.remove('goal-pulse'), 700);
      }

      const header = document.createElement('header');
      const title = document.createElement('h3');
      title.textContent = config.label;
      const badgeEl = document.createElement('span');
      badgeEl.className = 'kpi-badge';
      if (status === 'warning') badgeEl.dataset.state = 'warning';
      if (status === 'danger') badgeEl.dataset.state = 'danger';
      badgeEl.textContent = badge;
      header.append(title, badgeEl);

      const value = document.createElement('div');
      value.className = 'kpi-value';
      value.textContent = config.formatter(totalValue, targetValue);

      const progress = document.createElement('div');
      progress.className = 'kpi-progress';
      progress.textContent = `${completion}% of ${config.goalFormatter(targetValue, context)}`;

      const sparkline = document.createElement('canvas');
      sparkline.className = 'sparkline';
      const series = computeSeries(config.totalKey);
      lazySparkline(sparkline, series, 'rgba(96, 165, 250, 0.6)');

      card.append(header, value, progress, sparkline);
      grid.appendChild(card);
    });
  }

  render();
  SharedStorage.onChange(() => render());
}

function computeSeries(totalKey) {
  const days = 7;
  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 86400000);
    const aggregate = SharedStorage.aggregateDay(date);
    series.push(aggregate[totalKey] || 0);
  }
  return series;
}

function getTargetValue(id, targets, context) {
  switch (id) {
    case 'hydration':
      return targets.water_ml;
    case 'sleep':
      return targets.sleep_min;
    case 'steps':
      return targets.steps;
    case 'caffeine':
      return targets.caffeine_mg;
    case 'meds':
      return context?.targetCount || 0;
    default:
      return 0;
  }
}

function ready(callback) {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

ready(initKpi);

