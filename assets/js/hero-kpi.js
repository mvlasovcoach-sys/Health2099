import { SharedStorage } from './sharedStorage.js';
import { badgeLabel, formatNumber, minutesToHours, percent, statusFromRules } from './utils.js';

const HERO_ID = 'hero-kpi';

const METRICS = [
  {
    id: 'hydration',
    label: 'Hydration',
    icon: '💧',
    totalKey: 'water_ml',
    targetKey: 'water_ml',
    statusType: 'hydration',
    better: 'high',
    formatAverage: (value) => `${formatNumber(Math.round(value))} ml avg`,
    formatTarget: (target) => `${formatNumber(target)} ml target`,
    formatTotal: (total, days) => hydrationTotalLabel(total, days),
  },
  {
    id: 'sleep',
    label: 'Sleep',
    icon: '🌙',
    totalKey: 'sleep_min',
    targetKey: 'sleep_min',
    statusType: 'sleep',
    better: 'high',
    formatAverage: (value) => `${minutesToHours(value)} avg`,
    formatTarget: (target) => `${minutesToHours(target)} target`,
    formatTotal: (total, days) => sleepTotalLabel(total, days),
  },
  {
    id: 'steps',
    label: 'Steps',
    icon: '👟',
    totalKey: 'steps',
    targetKey: 'steps',
    statusType: 'steps',
    better: 'high',
    formatAverage: (value) => `${formatNumber(Math.round(value))} steps avg`,
    formatTarget: (target) => `${formatNumber(target)} goal`,
    formatTotal: (total, days) => stepsTotalLabel(total, days),
  },
  {
    id: 'caffeine',
    label: 'Caffeine',
    icon: '☕',
    totalKey: 'caffeine_mg',
    targetKey: 'caffeine_mg',
    statusType: 'caffeine',
    better: 'low',
    formatAverage: (value) => `${formatNumber(Math.round(value))} mg avg`,
    formatTarget: (target) => `${formatNumber(target)} mg ceiling`,
    formatTotal: (total, days) => caffeineTotalLabel(total, days),
  },
];

const RANGE_CONFIG = {
  today: { key: 'today', days: 1, label: 'Today', previousLabel: 'yesterday' },
  '7d': { key: '7d', days: 7, label: 'Last 7 days', previousLabel: 'previous 7 days' },
  '30d': { key: '30d', days: 30, label: 'Last 30 days', previousLabel: 'previous 30 days' },
};

export function initHeroKpi() {
  let container = document.getElementById(HERO_ID);
  if (!container) return;

  const list = container.querySelector('#hero-kpi-list');
  const filters = Array.from(container.querySelectorAll('[data-range]'));
  if (list && list.children.length === 0) {
    METRICS.forEach((metric) => {
      const item = document.createElement('li');
      item.className = 'hero-kpi__item';
      item.dataset.type = metric.id;
      item.innerHTML = `
        <div class="hero-kpi__item-top">
          <span class="hero-kpi__icon" aria-hidden="true">${metric.icon}</span>
          <div class="hero-kpi__text">
            <span class="hero-kpi__item-label">${metric.label}</span>
            <span class="hero-kpi__item-values">
              <span data-value>—</span>
              <span data-target>—</span>
            </span>
          </div>
          <span class="hero-kpi__badge" data-badge>—</span>
        </div>
        <div class="hero-kpi__meter">
          <div class="hero-kpi__meter-fill" data-progress></div>
        </div>
        <div class="hero-kpi__item-foot">
          <span data-detail>—</span>
        </div>
      `;
      list.appendChild(item);
    });
  }

  const state = { range: 'today' };

  function updateFilters(rangeKey) {
    filters.forEach((button) => {
      const isActive = button.dataset.range === rangeKey;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function render() {
    container = document.getElementById(HERO_ID);
    if (!container) return;

    const currentList = container.querySelector('#hero-kpi-list');
    const currentScore = container.querySelector('#hero-kpi-score');
    const currentDelta = container.querySelector('#hero-kpi-delta');
    const currentCaption = container.querySelector('#hero-kpi-caption');
    const tz = resolveTimezone();
    const range = resolveRange(state.range, tz);
    const totals = SharedStorage.aggregateRange(range.start, range.end);
    const targets = SharedStorage.getTargets();

    const metricPayloads = METRICS.map((metric) => {
      const total = totals[metric.totalKey] || 0;
      const dailyTarget = targets[metric.targetKey] || 0;
      const aggregateTarget = dailyTarget * range.days;
      const progressPercent = aggregateTarget ? percent(total, aggregateTarget) : 0;
      const averageValue = range.days > 0 ? total / range.days : 0;
      const completion = metric.better === 'low'
        ? Math.max(0, 100 - Math.min(100, progressPercent))
        : Math.min(100, progressPercent);
      const status = statusFromRules(metric.statusType, averageValue, dailyTarget, {
        rangeDays: range.days,
      });
      return {
        id: metric.id,
        average: metric.formatAverage(averageValue),
        target: metric.formatTarget(dailyTarget),
        detail: metric.formatTotal(total, range.days),
        badge: badgeLabel(status),
        state: status,
        progress: Math.max(0, Math.min(100, progressPercent)),
        completion,
      };
    });

    const completionValues = metricPayloads
      .map((metric) => metric.completion)
      .filter((value) => Number.isFinite(value));
    const score = completionValues.length
      ? Math.round(completionValues.reduce((sum, value) => sum + value, 0) / completionValues.length)
      : 0;

    const previousRange = resolvePreviousRange(range, tz);
    let deltaInfo = null;
    if (previousRange) {
      const previousTotals = SharedStorage.aggregateRange(previousRange.start, previousRange.end);
      const previousCompletions = METRICS.map((metric) => {
        const total = previousTotals[metric.totalKey] || 0;
        const dailyTarget = targets[metric.targetKey] || 0;
        const aggregateTarget = dailyTarget * previousRange.days;
        const progressPercent = aggregateTarget ? percent(total, aggregateTarget) : 0;
        return metric.better === 'low'
          ? Math.max(0, 100 - Math.min(100, progressPercent))
          : Math.min(100, progressPercent);
      }).filter((value) => Number.isFinite(value));
      if (previousCompletions.length) {
        const prevScore = Math.round(
          previousCompletions.reduce((sum, value) => sum + value, 0) / previousCompletions.length,
        );
        deltaInfo = {
          delta: score - prevScore,
          label: previousRange.label,
        };
      }
    }

    if (currentScore) {
      currentScore.textContent = `${score}%`;
    }

    if (currentDelta) {
      if (deltaInfo && Number.isFinite(deltaInfo.delta)) {
        const rounded = Math.round(deltaInfo.delta);
        if (Math.abs(rounded) < 1) {
          currentDelta.textContent = `Level with ${deltaInfo.label}`;
          currentDelta.dataset.trend = 'flat';
        } else {
          const sign = rounded > 0 ? '+' : '';
          currentDelta.textContent = `${sign}${rounded}% vs ${deltaInfo.label}`;
          currentDelta.dataset.trend = rounded > 0 ? 'up' : 'down';
        }
      } else {
        currentDelta.textContent = 'Trend data unavailable';
        currentDelta.dataset.trend = 'flat';
      }
    }

    if (currentCaption) {
      currentCaption.textContent = `${range.label} · TZ ${formatTimezoneLabel(tz)}`;
    }

    if (currentList) {
      metricPayloads.forEach((payload) => {
        const item = currentList.querySelector(`[data-type="${payload.id}"]`);
        if (!item) return;
        item.dataset.state = payload.state;
        const valueEl = item.querySelector('[data-value]');
        const targetEl = item.querySelector('[data-target]');
        const detailEl = item.querySelector('[data-detail]');
        const badgeEl = item.querySelector('[data-badge]');
        const progressEl = item.querySelector('[data-progress]');
        if (valueEl) valueEl.textContent = payload.average;
        if (targetEl) targetEl.textContent = payload.target;
        if (detailEl) detailEl.textContent = payload.detail;
        if (badgeEl) {
          badgeEl.textContent = payload.badge;
          badgeEl.dataset.state = payload.state;
        }
        if (progressEl) {
          progressEl.style.width = `${payload.progress}%`;
        }
      });
    }
  }

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      const { range } = button.dataset;
      if (!range || range === state.range) return;
      state.range = range;
      updateFilters(state.range);
      render();
    });
  });

  updateFilters(state.range);
  render();

  SharedStorage.onChange((payload) => {
    if (!payload || ['logs', 'targets', 'settings'].includes(payload.target)) {
      render();
    }
  });
}

function resolveTimezone() {
  const settings = SharedStorage.getSettings();
  return settings?.tz || 'Europe/Amsterdam';
}

function resolveRange(key, tz) {
  const config = RANGE_CONFIG[key] || RANGE_CONFIG.today;
  const now = new Date();
  const end = endOfDayInTz(now, tz);
  const startReference = addDaysInTz(end, tz, -(config.days - 1));
  const start = startOfDayInTz(startReference, tz);
  return { ...config, start, end };
}

function resolvePreviousRange(range, tz) {
  if (!range) return null;
  const previousEndReference = addDaysInTz(range.start, tz, -1);
  const previousEnd = endOfDayInTz(previousEndReference, tz);
  const previousStartReference = addDaysInTz(range.start, tz, -range.days);
  const previousStart = startOfDayInTz(previousStartReference, tz);
  return {
    start: previousStart,
    end: previousEnd,
    days: range.days,
    label: range.previousLabel,
  };
}

function addDaysInTz(date, tz, amount) {
  const parts = zonedParts(date, tz);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount, parts.hour, parts.minute, parts.second));
}

function startOfDayInTz(date, tz) {
  const parts = zonedParts(date, tz);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
}

function endOfDayInTz(date, tz) {
  const parts = zonedParts(date, tz);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999));
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

function formatTimezoneLabel(tz) {
  if (!tz) return 'UTC';
  return tz.replace(/_/g, ' ');
}

function hydrationTotalLabel(total, days) {
  if (!total) {
    return days > 1 ? `0 ml across ${days} days` : '0 ml logged';
  }
  if (total >= 1000) {
    const liters = Math.round((total / 1000) * 10) / 10;
    return days > 1 ? `${liters.toFixed(1)} L across ${days} days` : `${liters.toFixed(1)} L logged`;
  }
  return days > 1
    ? `${formatNumber(Math.round(total))} ml across ${days} days`
    : `${formatNumber(Math.round(total))} ml logged`;
}

function sleepTotalLabel(total, days) {
  const label = minutesToHours(total);
  return days > 1 ? `${label} total across ${days} days` : `${label} logged`;
}

function stepsTotalLabel(total, days) {
  const value = formatNumber(Math.round(total));
  return days > 1 ? `${value} steps across ${days} days` : `${value} steps logged`;
}

function caffeineTotalLabel(total, days) {
  const value = formatNumber(Math.round(total));
  return days > 1 ? `${value} mg across ${days} days` : `${value} mg consumed`;
}

function ready(callback) {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

ready(initHeroKpi);
