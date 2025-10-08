import { SharedStorage } from './sharedStorage.js';

const SECTION_ID = 'kpi-grid';
const LABEL_SELECTOR = '[data-kpi-rings-label]';

function resolveContainer() {
  return document.querySelector('[data-kpi-rings]') || document.getElementById(SECTION_ID);
}

function ensureStructure(container) {
  if (!container) return null;

  let wrapper = container.querySelector('[data-kpi-rings-wrapper]');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'kpi-rings__status';
    wrapper.dataset.kpiRingsWrapper = 'true';
    wrapper.innerHTML = `<p class="muted" data-kpi-rings-label>Monitoring daily completion…</p>`;
    container.appendChild(wrapper);
  } else if (!wrapper.querySelector(LABEL_SELECTOR)) {
    wrapper.innerHTML = `<p class="muted" data-kpi-rings-label>Monitoring daily completion…</p>`;
  }

  return container.querySelector(LABEL_SELECTOR);
}

function computeSnapshot() {
  const targets = SharedStorage.getTargets();
  const today = SharedStorage.aggregateDay(new Date());
  return {
    water: calculateProgress(today.water, targets.water),
    sleep: calculateProgress(today.sleep, targets.sleep),
    steps: calculateProgress(today.steps, targets.steps),
    caffeine: calculateProgressReverse(today.caffeine, targets.caffeine),
  };
}

function calculateProgress(value, target) {
  if (!target) return 0;
  const safeValue = Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round((safeValue / target) * 100)));
}

function calculateProgressReverse(value, target) {
  if (!target) return 0;
  const safeValue = Number.isFinite(value) ? value : 0;
  const percent = Math.max(0, Math.min(100, Math.round((safeValue / target) * 100)));
  return Math.max(0, 100 - percent);
}

function render(container) {
  const label = ensureStructure(container);
  if (!label) return;

  const snapshot = computeSnapshot();
  const segments = [
    `Water ${snapshot.water}%`,
    `Sleep ${snapshot.sleep}%`,
    `Steps ${snapshot.steps}%`,
    `Caffeine ${snapshot.caffeine}% budget`,
  ];
  label.textContent = segments.join(' · ');
}

export function initKpiRings() {
  const container = resolveContainer();
  if (!container) return;

  render(container);
  SharedStorage.onChange(() => render(container));
}

export default initKpiRings;

