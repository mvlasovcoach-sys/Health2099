import { SharedStorage } from './sharedStorage.js';
import { minutesToHours } from './utils.js';

let lastStreaks = { water: 0, steps: 0, sleep: 0 };

export function initStreaks() {
  const list = document.getElementById('streak-list');
  const badgeContainer = document.getElementById('badge-collection');
  if (!list || !badgeContainer) return;

  function render() {
    const targets = SharedStorage.getTargets();
    const streakMap = SharedStorage.streaks(14);
    const entries = Array.from(streakMap.entries());
    const metrics = [
      { id: 'water', label: 'Hydration streak', target: targets.water, formatter: (value) => `${value} ml` },
      { id: 'steps', label: 'Steps streak', target: targets.steps, formatter: (value) => `${value} steps` },
      { id: 'sleep', label: 'Sleep streak', target: targets.sleep, formatter: (value) => minutesToHours(value) },
    ];

    list.innerHTML = '';
    const newStreaks = {};

    metrics.forEach((metric) => {
      const streakValue = computeStreak(entries, metric.id, metric.target);
      newStreaks[metric.id] = streakValue;
      const todayValue = entries.length ? entries[0][1][metric.id] : 0;
      const row = document.createElement('div');
      row.className = 'streak card-hover';
      row.innerHTML = `
        <span aria-hidden="true">${metricIcon(metric.id)}</span>
        <div>
          <strong>${metric.label}</strong>
          <div class="timeline-meta">${streakValue} day streak · Today ${metric.formatter(todayValue)}</div>
        </div>
        <span>${badgeLabel(streakValue)}</span>
      `;
      if (streakValue > (lastStreaks[metric.id] || 0)) {
        row.classList.add('goal-pulse');
      }
      list.appendChild(row);
    });

    badgeContainer.innerHTML = '';
    const badges = buildBadges(newStreaks);
    badges.forEach((badge) => {
      const chip = document.createElement('span');
      chip.className = 'badge-chip badge-animate';
      chip.textContent = badge;
      badgeContainer.appendChild(chip);
    });

    lastStreaks = newStreaks;
  }

  render();
  SharedStorage.onChange((payload) => {
    if (!payload || payload.target === 'logs' || payload.target === 'targets') {
      render();
    }
  });
}

function computeStreak(entries, metric, target) {
  let streak = 0;
  for (let i = 0; i < entries.length; i += 1) {
    const value = entries[i][1][metric] || 0;
    const success = metric === 'caffeine' ? value <= target : value >= target;
    if (success) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function buildBadges(streaks) {
  const badges = [];
  Object.entries(streaks).forEach(([metric, value]) => {
    if (value >= 14) {
      badges.push(`${titleCase(metric)} Ascendant`);
    } else if (value >= 7) {
      badges.push(`${titleCase(metric)} Guardian`);
    } else if (value >= 3) {
      badges.push(`${titleCase(metric)} Builder`);
    }
  });
  return badges;
}

function badgeLabel(streak) {
  if (streak >= 14) return 'Legendary';
  if (streak >= 7) return 'Great';
  if (streak >= 3) return 'Building';
  return 'Getting started';
}

function metricIcon(metric) {
  switch (metric) {
    case 'water':
      return '💧';
    case 'steps':
      return '🔥';
    case 'sleep':
      return '🌙';
    default:
      return '⭐';
  }
}

function titleCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
