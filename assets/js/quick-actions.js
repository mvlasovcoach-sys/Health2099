import { pushLog, removeLog, onChange, getDB } from './sharedStorage.js';
import { showToast } from './ui.js';

const TOAST_DURATION = 10000;

const GROUPS = [
  {
    id: 'water',
    title: 'Water',
    unit: 'ml',
    summaryLabel: 'Today',
    targetKey: 'water_ml',
    timeframe: 'day',
    actions: [
      { id: 'water-200', value: 200, label: '+200 ml' },
      { id: 'water-300', value: 300, label: '+300 ml' },
      { id: 'water-500', value: 500, label: '+500 ml' },
    ],
  },
  {
    id: 'steps',
    title: 'Steps',
    unit: 'steps',
    summaryLabel: 'Today',
    targetKey: 'steps',
    timeframe: 'day',
    actions: [
      { id: 'steps-500', value: 500, label: '+500' },
      { id: 'steps-1k', value: 1000, label: '+1k' },
      { id: 'steps-2k', value: 2000, label: '+2k' },
    ],
  },
  {
    id: 'caffeine',
    title: 'Caffeine',
    unit: 'mg',
    summaryLabel: 'Week',
    targetKey: 'caffeine_mg',
    timeframe: 'week',
    actions: [
      { id: 'caffeine-50', value: 50, label: '+50 mg' },
      { id: 'caffeine-100', value: 100, label: '+100 mg' },
    ],
  },
];

const OTHER_ACTIONS = [
  { id: 'meds', type: 'med', value: 1, unit: 'dose', label: 'Take meds', hint: 'Mark taken', toast: 'Added meds' },
  { id: 'note', type: 'note', value: null, unit: null, label: 'Add note', hint: 'Remember this', toast: 'Added note' },
];

let summaries = {};
let unsubscribe = null;

export function initQuickActions() {
  const container = document.getElementById('quick-actions');
  if (!container) return;

  render(container);
  updateSummaries(getDB());

  if (typeof unsubscribe === 'function') {
    unsubscribe();
  }
  unsubscribe = onChange((db) => updateSummaries(db));
}

function render(container) {
  container.innerHTML = '';
  summaries = {};

  GROUPS.forEach((group) => {
    const section = document.createElement('div');
    section.className = 'quick-actions__section';
    section.dataset.group = group.id;

    const header = document.createElement('div');
    header.className = 'quick-actions__section-header';

    const title = document.createElement('h3');
    title.className = 'quick-actions__section-title';
    title.textContent = group.title;
    header.appendChild(title);

    const summary = document.createElement('p');
    summary.className = 'quick-actions__summary';
    summary.dataset.summaryFor = group.id;
    header.appendChild(summary);

    section.appendChild(header);

    const pillGrid = document.createElement('div');
    pillGrid.className = 'quick-actions__pills';
    group.actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quick-action card-hover card-press';
      button.dataset.actionId = action.id;
      button.dataset.group = group.id;
      button.textContent = action.label;
      button.addEventListener('click', () => logGroupAction(group, action));
      pillGrid.appendChild(button);
    });
    section.appendChild(pillGrid);
    container.appendChild(section);

    summaries[group.id] = summary;
  });

  const miscRow = document.createElement('div');
  miscRow.className = 'quick-actions__note';

  OTHER_ACTIONS.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-action quick-action--secondary card-hover card-press';
    button.dataset.actionId = action.id;
    button.innerHTML = `
      <span class="quick-action__label">
        <span class="quick-action__value">${action.label}</span>
      </span>
      <span class="quick-action__hint">${action.hint}</span>
    `;
    button.addEventListener('click', () => handleAction(action));
    miscRow.appendChild(button);
  });

  container.appendChild(miscRow);
}

function handleAction(action) {
  if (action.type === 'note') {
    const note = window.prompt('Add note');
    if (!note) return;
    const trimmed = note.trim();
    if (!trimmed) return;
    performLogAction(action, { note: trimmed });
    return;
  }
  performLogAction(action);
}

function logGroupAction(group, action) {
  const payload = {
    type: group.id,
    value: action.value,
    unit: group.unit,
  };
  performLogAction({ ...action, ...payload, label: action.label });
}

function performLogAction(action, extras = {}) {
  const payload = {
    type: action.type || action.id?.split('-')[0],
    value: action.value,
    unit: action.unit || null,
    note: extras.note || null,
  };
  const log = pushLog({ ...payload, source: navigator.onLine === false ? 'offline' : null });

  const label = extras.note ? 'note' : action.label || action.id;
  const message = action.toast || (extras.note ? 'Added note' : `Added ${label}`);
  showToast(message, {
    undoLabel: 'Undo',
    duration: TOAST_DURATION,
    onUndo: () => {
      removeLog(log.id);
    },
  });
}

function updateSummaries(db) {
  const logs = Array.isArray(db?.logs) ? db.logs : [];
  const targets = db?.targets || {};
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay);
  const day = startOfWeek.getDay();
  const diffToMonday = (day + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

  const totals = { water: 0, steps: 0, caffeine: 0 };

  logs.forEach((log) => {
    const time = new Date(log.createdAt).getTime();
    if (Number.isNaN(time) || log.value == null) return;
    if (log.type === 'water' && time >= startOfDay.getTime()) {
      totals.water += Number(log.value) || 0;
    }
    if (log.type === 'steps' && time >= startOfDay.getTime()) {
      totals.steps += Number(log.value) || 0;
    }
    if (log.type === 'caffeine' && time >= startOfWeek.getTime()) {
      totals.caffeine += Number(log.value) || 0;
    }
  });

  GROUPS.forEach((group) => {
    const summaryEl = summaries[group.id];
    if (!summaryEl) return;
    const total = Math.round(totals[group.id] || 0);
    const target = targets[group.targetKey] || null;
    const formattedTotal = `${total.toLocaleString()} ${group.unit}`;
    if (target) {
      const formattedTarget = `${Number(target).toLocaleString()} ${group.unit}`;
      const suffix = group.timeframe === 'week' ? 'ceiling' : 'target';
      summaryEl.textContent = `${group.summaryLabel}: ${formattedTotal} / ${formattedTarget} ${suffix}`;
    } else {
      summaryEl.textContent = `${group.summaryLabel}: ${formattedTotal}`;
    }
  });
}

function ready(callback) {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

ready(initQuickActions);
