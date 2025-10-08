import { dashboard } from '../stores/dashboard.js';
import { bootstrapDashboardPage } from './dashboard-engine.js';
import { createDualGauge } from '../components/health/DualGauge.js';
import { createDeviceStatus } from '../components/health/DeviceStatus.js';
import { createKpiGrid } from '../components/health/KpiGrid.js';
import { createRingRow } from '../components/health/RingRow.js';
import { createFactsRow } from '../components/health/FactsRow.js';
import { createNotesCard } from '../components/health/NotesCard.js';

const subscribers = [];

function clampPercent(value) {
  if (!Number.isFinite(value)) return null;
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return clamped;
}

function formatDeviceStatus(device) {
  const fallback = dashboard.fixture?.device || {};
  const snapshot = { ...fallback, ...(device || {}) };

  const parts = [];
  if (snapshot.online) {
    parts.push('Device: Online');
  } else {
    const minutes = Number.isFinite(snapshot.offline_min) ? Math.max(1, Math.round(snapshot.offline_min)) : 0;
    parts.push(minutes ? `Device: Offline ${minutes}+ min` : 'Device: Offline');
  }

  const battery = clampPercent(snapshot.battery);
  if (battery != null) {
    parts.push(`Battery ${battery}%`);
  }

  const mode = typeof snapshot.input === 'string' ? snapshot.input.toLowerCase() : 'manual';
  const indicator =
    mode === 'auto' ? '●●● auto' : mode === 'timeout' ? '●○● timeout' : '●○○ manual';
  parts.push(indicator);

  return parts.join(' · ');
}

function updateDeviceStatusBanner(element, device) {
  if (!element) return;
  try {
    element.textContent = formatDeviceStatus(device);
  } catch (err) {
    console.warn('[health] Failed to update device status banner', err);
  }
}

function applyVersionBadge(element) {
  if (!element) return;
  const info = window.__BUILD_INFO__ || {};
  const version = info.commitShort || 'dev';
  element.textContent = `v:${version}`;
  const lines = [];
  if (info.commit) {
    lines.push(`Commit ${info.commit}`);
  }
  if (info.builtAt) {
    try {
      const builtDate = new Date(info.builtAt);
      lines.push(
        Number.isNaN(builtDate.getTime()) ? `Built ${info.builtAt}` : `Built ${builtDate.toLocaleString()}`,
      );
    } catch (err) {
      lines.push(`Built ${info.builtAt}`);
    }
  }
  if (lines.length) {
    element.title = lines.join('\n');
  }
}

function mountComponents(root) {
  const topRow = root.querySelector('[data-section="top"]');
  const kpiRow = root.querySelector('[data-section="kpi"]');
  const ringRowContainer = root.querySelector('[data-section="rings"]');
  const factsRowContainer = root.querySelector('[data-section="facts"]');
  const notesContainer = root.querySelector('[data-section="notes"]');
  const deviceBanner = root.querySelector('[data-device-status]');
  const versionBadge = root.querySelector('[data-version-badge]');

  const dualGauge = createDualGauge();
  const deviceStatus = createDeviceStatus();
  const kpiGrid = createKpiGrid();
  const ringRow = createRingRow();
  const factsRow = createFactsRow();
  const notesCard = createNotesCard();

  applyVersionBadge(versionBadge);
  updateDeviceStatusBanner(deviceBanner, dashboard.getSnapshot()?.device);
  if (typeof window !== 'undefined' && versionBadge) {
    const handleBuildInfo = () => applyVersionBadge(versionBadge);
    window.addEventListener('build:info', handleBuildInfo);
    subscribers.push(() => window.removeEventListener('build:info', handleBuildInfo));
  }

  if (topRow) {
    topRow.appendChild(dualGauge.element);
    topRow.appendChild(deviceStatus.element);
  }
  if (kpiRow) {
    kpiRow.appendChild(kpiGrid.element);
  }
  if (ringRowContainer) {
    ringRowContainer.appendChild(ringRow.element);
  }
  if (factsRowContainer) {
    factsRowContainer.appendChild(factsRow.element);
  }
  if (notesContainer) {
    notesContainer.appendChild(notesCard.element);
  }

  function render(snapshot) {
    const gauges = dashboard.selectors.gauges(snapshot);
    const device = dashboard.selectors.device(snapshot);
    const kpi = dashboard.selectors.kpi(snapshot);
    const rings = dashboard.selectors.rings(snapshot);
    const facts = dashboard.selectors.facts(snapshot);
    const notes = dashboard.selectors.notes(snapshot);

    dualGauge.update(gauges);
    deviceStatus.update(device);
    kpiGrid.update(kpi);
    ringRow.update(rings);
    factsRow.update(facts);
    notesCard.update(notes);
    updateDeviceStatusBanner(deviceBanner, device);
  }

  render(dashboard.getSnapshot());
  const unsubscribe = dashboard.subscribe(render);
  subscribers.push(unsubscribe);

  const teardown = bootstrapDashboardPage();
  subscribers.push(teardown);
}

function init() {
  const root = document.querySelector('[data-health-dashboard]');
  if (!root) return;
  mountComponents(root);
  wireControls();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('beforeunload', () => {
  while (subscribers.length) {
    const fn = subscribers.pop();
    if (typeof fn === 'function') {
      try {
        fn();
      } catch (err) {
        console.error('[health] Failed to dispose listener', err);
      }
    }
  }
});

function wireControls() {
  const resetButton = document.querySelector('[data-action="reset-cache"]');
  if (!resetButton) return;
  if (!('caches' in window) || !('serviceWorker' in navigator)) {
    resetButton.disabled = true;
    resetButton.title = 'Offline cache not supported in this browser';
    return;
  }
  resetButton.addEventListener('click', async () => {
    resetButton.disabled = true;
    resetButton.textContent = 'Clearing…';
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch (error) {
      console.warn('[health] Failed to reset caches', error);
    } finally {
      window.location.reload(true);
    }
  });
}
