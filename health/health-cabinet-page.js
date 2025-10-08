import { dashboard } from '../stores/dashboard.js';
import { bootstrapDashboardPage } from './dashboard-engine.js';
import { createDualGauge } from '../components/health/DualGauge.js';
import { createDeviceStatus } from '../components/health/DeviceStatus.js';
import { createKpiGrid } from '../components/health/KpiGrid.js';
import { createRingRow } from '../components/health/RingRow.js';
import { createFactsRow } from '../components/health/FactsRow.js';
import { createNotesCard } from '../components/health/NotesCard.js';

const subscribers = [];

function mountComponents(root) {
  const topRow = root.querySelector('[data-section="top"]');
  const kpiRow = root.querySelector('[data-section="kpi"]');
  const ringRowContainer = root.querySelector('[data-section="rings"]');
  const factsRowContainer = root.querySelector('[data-section="facts"]');
  const notesContainer = root.querySelector('[data-section="notes"]');

  const dualGauge = createDualGauge();
  const deviceStatus = createDeviceStatus();
  const kpiGrid = createKpiGrid();
  const ringRow = createRingRow();
  const factsRow = createFactsRow();
  const notesCard = createNotesCard();

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
