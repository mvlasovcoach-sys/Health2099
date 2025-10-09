import { getTargets, onChange } from './sharedStorage.js';
import { aggregateDay } from './data-layer.js';
import { percent, formatNumber } from './utils.js';

export function initInsights() {
  const container = document.getElementById('insights');
  if (!container) return;

  function render() {
    const items = computeInsights();
    container.innerHTML = '';
    const limited = items.slice(0, 3);
    if (!limited.length) {
      const empty = document.createElement('div');
      empty.className = 'insight-item';
      empty.innerHTML = `<strong>Everything synced</strong><span>You're meeting today's targets so far.</span>`;
      container.appendChild(empty);
      return;
    }

    limited.forEach((insight) => {
      const el = document.createElement('div');
      el.className = 'insight-item';
      el.innerHTML = `<strong>${insight.title}</strong><span>${insight.detail}</span>`;
      container.appendChild(el);
    });
  }

  render();
  onChange(render);
}

function computeInsights() {
  const insights = [];
  const now = new Date();
  const hour = now.getHours();
  const today = aggregateDay(now);
  const targets = getTargets();

  const waterTarget = targets.water_ml || 0;
  const waterPct = waterTarget ? percent(today.water_ml, waterTarget) : 0;
  if (hour >= 18 && waterTarget && waterPct < 60) {
    const remaining = Math.max(0, waterTarget - today.water_ml);
    const rounded = Math.max(250, Math.round(remaining / 250) * 250);
    insights.push({
      title: 'Hydration nudge',
      detail: `Ещё ~${formatNumber(rounded)} ml до цели 💧`,
    });
  }

  const desiredSleep = Math.max(420, targets.sleep_min || 0);
  if (hour >= 21 && today.sleep_min < desiredSleep) {
    const diffMinutes = Math.max(0, desiredSleep - today.sleep_min);
    const rounded = Math.max(10, Math.round(diffMinutes / 10) * 10);
    insights.push({
      title: 'Sleep prep',
      detail: `${formatNumber(rounded)} мин до 7 часов 😴`,
    });
  }

  const caffeineCap = targets.caffeine_mg || 0;
  if (caffeineCap && today.caffeine_mg > caffeineCap) {
    insights.push({
      title: 'Caffeine check',
      detail: 'Старайся не превышать норму ☕',
    });
  }

  return insights;
}

function ready(callback) {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

ready(initInsights);
