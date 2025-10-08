import { SharedStorage } from './sharedStorage.js';
import { showToast } from './ui.js';

const TOAST_DURATION = 10000;

const ACTIONS = [
  { id: 'water-250', type: 'water', value: 250, label: '+250 ml water', hint: 'Hydration boost' },
  { id: 'water-500', type: 'water', value: 500, label: '+500 ml water', hint: 'Tall glass' },
  { id: 'steps-1k', type: 'steps', value: 1000, label: '+1k steps', hint: 'Quick walk' },
  { id: 'sleep-8h', type: 'sleep', value: 480, label: '+8h sleep', hint: 'Log rest' },
  { id: 'meds', type: 'meds', value: 1, label: 'Take meds', hint: 'Mark taken' },
  { id: 'note', type: 'note', value: null, label: 'Add note', hint: 'Remember this' },
];

export function initQuickActions() {
  const container = document.getElementById('quick-actions');
  if (!container) return;

  container.innerHTML = '';
  ACTIONS.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-action card-hover card-press';
    button.dataset.actionId = action.id;
    button.innerHTML = `
      <span class="quick-action__label">${action.label}</span>
      <span class="quick-action__hint">${action.hint}</span>
    `;
    button.addEventListener('click', () => handleAction(action));
    container.appendChild(button);
  });

  window.addEventListener('online', flushQueue);
  flushQueue();
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

function performLogAction(action, extras = {}) {
  const payload = {
    type: action.type,
    value: action.value,
    note: extras.note || null,
  };

  const offline = navigator.onLine === false;
  let log;
  if (offline) {
    log = SharedStorage.pushLog(payload.type, payload.value, {
      note: payload.note,
      source: 'offline',
    });
    SharedStorage.addQueue({ kind: 'log-sync', payload, logId: log.id });
  } else {
    log = SharedStorage.pushLog(payload.type, payload.value, { note: payload.note });
  }

  const message = action.type === 'note' ? 'Added note' : `Added ${action.label}`;
  showToast(message, {
    undoLabel: 'Undo',
    duration: TOAST_DURATION,
    onUndo: () => {
      SharedStorage.removeLog(log.id);
      SharedStorage.removeQueue((item) => item.kind === 'log-sync' && item.logId === log.id);
    },
  });
}

function flushQueue() {
  if (navigator.onLine === false) return;
  SharedStorage.flushQueue((items) => {
    items.forEach((item) => {
      if (item.kind !== 'log-sync') return;
      SharedStorage.updateLog(item.logId, { source: 'manual' });
    });
  });
}
