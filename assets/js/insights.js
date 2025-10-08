import { SharedStorage } from './sharedStorage.js';
import { percent, minutesToHours } from './utils.js';

export function initInsights() {
  const container = document.getElementById('insights');
  if (!container) return;

  function render() {
    const items = computeInsights();
    container.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'insight-item';
      empty.innerHTML = `<strong>Everything synced</strong><span>You're meeting today's targets so far.</span>`;
      container.appendChild(empty);
      return;
    }

    items.slice(0, 3).forEach((insight) => {
      const el = document.createElement('div');
      el.className = 'insight-item';
      el.innerHTML = `<strong>${insight.title}</strong><span>${insight.detail}</span>`;
      container.appendChild(el);
    });
  }

  render();
  SharedStorage.onChange((payload) => {
    if (!payload || payload.target === 'logs' || payload.target === 'targets') {
      render();
    }
  });
}

function computeInsights() {
  const insights = [];
  const now = new Date();
  const hour = now.getHours();
  const today = SharedStorage.aggregateDay(now);
  const targets = SharedStorage.getTargets();
  const waterPct = percent(today.water, targets.water || 1);
  const sleepHours = today.sleep / 60;
  const caffeine = today.caffeine;
  const stepsPct = percent(today.steps, targets.steps || 1);

  if (hour >= 18 && waterPct < 60) {
    insights.push({
      title: 'Hydration lagging',
      detail: `Only ${waterPct}% of hydration goal reached. Consider a glass of water to stay on track.`,
    });
  }

  if (hour >= 21 && sleepHours < 7) {
    insights.push({
      title: 'Prepare for better sleep',
      detail: `Logged ${minutesToHours(today.sleep)} so far. Aim for ${minutesToHours(targets.sleep)} tonight.`,
    });
  }

  if (caffeine > 300) {
    insights.push({
      title: 'Caffeine nearing limit',
      detail: `You've logged ${caffeine} mg today. Slow down intake to avoid restless sleep.`,
    });
  }

  if (stepsPct < 50 && hour >= 15) {
    insights.push({
      title: 'Movement break suggested',
      detail: `Only ${stepsPct}% of your steps goal so far. A short walk could keep the streak alive.`,
    });
  }

  if (!insights.length && today.meds === 0 && Array.isArray(targets.meds) && targets.meds.length) {
    insights.push({
      title: 'Medication reminder',
      detail: 'No medications logged yet today. Mark as taken once completed.',
    });
  }

  return insights;
}
