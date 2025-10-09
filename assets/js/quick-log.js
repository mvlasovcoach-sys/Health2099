import { pushLog, removeLog, getTargets, onChange, getDB } from './sharedStorage.js';
import { showToast } from './ui.js';
import { sumToday, sumWeek } from './metrics.js';
import {
  enqueue as enqueueOffline,
  remove as removeOffline,
  getQueue,
  onQueueChange,
  onFlush,
} from './offline-queue.js';
import { openGoalsSheet, initGoalsSheet } from './goals-sheet.js';

const TOAST_DURATION = 10000;

const PRESETS = {
  water: [200, 300, 500],
  steps: [500, 1000, 2000],
  caffeine: [50, 100],
};

const SUMMARY_FORMAT = {
  water: {
    formatter: new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    transform: (value) => Number(value || 0) / 1000,
    suffix: 'L',
  },
  steps: {
    formatter: new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }),
    transform: (value) => Number(value || 0),
    suffix: '',
  },
  caffeine: {
    formatter: new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }),
    transform: (value) => Number(value || 0),
    suffix: 'mg',
  },
};

const ariaFormat = new Intl.NumberFormat();

const GROUPS = [
  {
    id: 'water',
    label: 'Water',
    unit: 'ml',
    targetKey: 'water_ml',
    summaryLabel: 'Today',
    sum: (db) => sumToday('water', db),
  },
  {
    id: 'steps',
    label: 'Steps',
    unit: 'steps',
    targetKey: 'steps',
    summaryLabel: 'Today',
    sum: (db) => sumToday('steps', db),
  },
  {
    id: 'caffeine',
    label: 'Caffeine',
    unit: 'mg',
    targetKey: 'caffeine_mg',
    summaryLabel: 'Week',
    sum: (db) => sumWeek('caffeine', db),
  },
];

const SECONDARY_ACTIONS = [
  { id: 'meds', type: 'med', value: 1, unit: 'dose', label: 'Take meds', hint: 'Mark taken' },
  { id: 'note', type: 'note', value: null, unit: null, label: 'Add note', hint: 'Remember this' },
];

const summaryRefs = new Map();
const pendingStates = new Map();
const queueLookup = new Map();
const cleanupTimers = new Map();

let queueSnapshot = getQueue();
let lastDB = null;
let unsubscribeStore = null;
let unsubscribeQueue = null;
let unsubscribeFlush = null;

export function initQuickLog() {
  const container = document.getElementById('quick-log');
  const editGoals = document.getElementById('edit-goals');
  if (!container) return;

  initGoalsSheet();
  render(container);
  lastDB = getDB();
  updateSummaries(lastDB);

  if (editGoals) {
    editGoals.addEventListener('click', () => openGoalsSheet());
  }

  if (typeof unsubscribeStore === 'function') {
    unsubscribeStore();
  }
  unsubscribeStore = onChange((db) => {
    lastDB = db;
    updateSummaries(db);
  });

  if (typeof unsubscribeQueue === 'function') {
    unsubscribeQueue();
  }
  unsubscribeQueue = onQueueChange((snapshot) => {
    queueSnapshot = snapshot || [];
    updateSummaries(lastDB);
  });

  if (typeof unsubscribeFlush === 'function') {
    unsubscribeFlush();
  }
  unsubscribeFlush = onFlush(({ entry, log }) => {
    const stateId = queueLookup.get(entry.id);
    if (!stateId) return;
    queueLookup.delete(entry.id);
    const state = pendingStates.get(stateId);
    if (state) {
      state.committed = true;
      state.logId = log?.id || state.logId;
      state.queueId = null;
    }
  });
}

function render(container) {
  container.innerHTML = '';
  summaryRefs.clear();

  GROUPS.forEach((group) => {
    const section = document.createElement('section');
    section.className = 'quick-log__section';
    section.dataset.group = group.id;

    const header = document.createElement('div');
    header.className = 'quick-log__section-header';

    const title = document.createElement('h4');
    title.className = 'quick-log__section-title';
    title.textContent = group.label;
    header.appendChild(title);

    const summary = document.createElement('p');
    summary.className = 'quick-log__summary';
    summary.dataset.summaryFor = group.id;
    header.appendChild(summary);
    section.appendChild(header);

    const pillGrid = document.createElement('div');
    pillGrid.className = 'quick-log__pills pill-row';
    (PRESETS[group.id] || []).forEach((value) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quick-log__pill card-hover card-press pill--compact';
      button.dataset.value = String(value);
      button.dataset.group = group.id;
      button.textContent = formatPillDisplay(value);
      button.setAttribute('aria-label', buildAriaLabel(group, value));
      button.addEventListener('click', () => handlePrimaryAction(group, value));
      pillGrid.appendChild(button);
    });
    section.appendChild(pillGrid);

    summaryRefs.set(group.id, summary);
    container.appendChild(section);
  });

  const secondary = document.createElement('div');
  secondary.className = 'quick-log__secondary';
  SECONDARY_ACTIONS.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-log__pill quick-log__pill--secondary card-hover card-press';
    button.dataset.actionId = action.id;
    button.addEventListener('click', () => handleSecondaryAction(action));
    button.innerHTML = `
      <span class="quick-log__pill-label">${action.label}</span>
      <span class="quick-log__pill-hint">${action.hint}</span>
    `;
    secondary.appendChild(button);
  });
  container.appendChild(secondary);
}

function handlePrimaryAction(group, value) {
  const state = createState({
    type: group.id,
    value,
    unit: group.unit,
  });
  pendingStates.set(state.id, state);

  if (isOnline()) {
    const log = pushLog({ type: group.id, value, unit: group.unit, source: 'quick' });
    state.logId = log?.id || null;
    state.committed = true;
  } else {
    const entry = enqueueOffline({ type: group.id, value, unit: group.unit, source: 'quick' });
    state.queueId = entry.id;
    queueLookup.set(entry.id, state.id);
    queueSnapshot = getQueue();
  }

  updateSummaries(lastDB);
  showToast(`Added ${formatPillAnnouncement(value, group.unit)}`, {
    undoLabel: 'Undo',
    duration: TOAST_DURATION,
    onUndo: () => handleUndo(state.id),
  });
  scheduleCleanup(state.id);
}

function handleSecondaryAction(action) {
  if (action.type === 'note') {
    const note = window.prompt('Add note');
    if (!note) return;
    const trimmed = note.trim();
    if (!trimmed) return;
    const log = pushLog({ type: 'note', value: null, unit: null, note: trimmed, source: 'quick' });
    showToast('Added note', {
      undoLabel: 'Undo',
      duration: TOAST_DURATION,
      onUndo: () => removeLog(log.id),
    });
    return;
  }

  const log = pushLog({ type: action.type, value: action.value, unit: action.unit, source: 'quick' });
  showToast('Added meds', {
    undoLabel: 'Undo',
    duration: TOAST_DURATION,
    onUndo: () => removeLog(log.id),
  });
}

function handleUndo(stateId) {
  const state = pendingStates.get(stateId);
  if (!state) return;

  if (!state.committed && state.queueId) {
    removeOffline(state.queueId);
    queueLookup.delete(state.queueId);
    queueSnapshot = getQueue();
    cleanupState(stateId);
    updateSummaries(lastDB);
    return;
  }

  if (state.committed && state.logId) {
    removeLog(state.logId);
  }
  cleanupState(stateId);
}

function updateSummaries(db) {
  const snapshot = db || lastDB || getDB();
  const targets = snapshot?.targets || getTargets();
  const queueTotals = getQueueTotals(queueSnapshot);

  GROUPS.forEach((group) => {
    const summaryEl = summaryRefs.get(group.id);
    if (!summaryEl) return;
    const total = Number(group.sum(snapshot) || 0) + (queueTotals[group.id] || 0);
    const target = Number(targets[group.targetKey]) || 0;
    summaryEl.textContent = buildSummaryText(group, total, target);
  });
}

function buildSummaryText(group, total, target) {
  const config = SUMMARY_FORMAT[group.id] || SUMMARY_FORMAT.steps;
  const formattedTotal = config.formatter.format(config.transform(total));
  const suffix = config.suffix ? ` ${config.suffix}` : '';
  if (!target) {
    return `${group.label}: ${group.summaryLabel}: ${formattedTotal}${suffix}`;
  }
  const formattedTarget = config.formatter.format(config.transform(target));
  return `${group.label}: ${group.summaryLabel}: ${formattedTotal} / ${formattedTarget}${suffix}`;
}

function getQueueTotals(queue) {
  return (queue || []).reduce((acc, item) => {
    if (!item || typeof item.value !== 'number') return acc;
    if (!GROUPS.some((group) => group.id === item.type)) return acc;
    acc[item.type] = (acc[item.type] || 0) + Number(item.value || 0);
    return acc;
  }, {});
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatPillDisplay(value) {
  if (value >= 1000 && value % 1000 === 0) {
    const compact = value / 1000;
    return `+${Number(compact.toFixed(1)).toString().replace(/\.0$/, '')}k`;
  }
  return `+${formatNumber(value)}`;
}

function formatPillAnnouncement(value, unit) {
  return `+${formatNumber(value)} ${unit}`;
}

function buildAriaLabel(group, value) {
  const unitNames = {
    water: 'milliliters',
    steps: 'steps',
    caffeine: 'milligrams',
  };
  const targets = {
    water: 'water',
    steps: 'your steps',
    caffeine: 'your caffeine total',
  };
  const connectors = {
    water: 'of',
  };
  const amount = ariaFormat.format(value);
  const unit = unitNames[group.id] || group.unit;
  const connector = connectors[group.id] || 'to';
  const target = targets[group.id] || group.label.toLowerCase();
  return `Add ${amount} ${unit} ${connector} ${target}`;
}

function createState(data) {
  return {
    id: createId(),
    type: data.type,
    value: data.value,
    unit: data.unit,
    queueId: null,
    logId: null,
    committed: false,
  };
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `quick_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function isOnline() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

function scheduleCleanup(id) {
  clearCleanup(id);
  const timer = setTimeout(() => cleanupState(id), TOAST_DURATION + 500);
  cleanupTimers.set(id, timer);
}

function cleanupState(id) {
  clearCleanup(id);
  const state = pendingStates.get(id);
  if (state?.queueId) {
    queueLookup.delete(state.queueId);
  }
  pendingStates.delete(id);
}

function clearCleanup(id) {
  const timer = cleanupTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    cleanupTimers.delete(id);
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

ready(initQuickLog);
