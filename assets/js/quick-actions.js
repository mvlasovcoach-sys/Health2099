import { SharedStorage } from './sharedStorage.js';
import { showToast } from './ui.js';

const ACTIONS = [
  { id: 'water-250', type: 'water', value: 250, label: '+250 ml', hint: 'Hydration boost' },
  { id: 'water-500', type: 'water', value: 500, label: '+500 ml', hint: 'Tall glass' },
  { id: 'steps-1k', type: 'steps', value: 1000, label: '+1k steps', hint: 'Quick walk' },
  { id: 'sleep-8h', type: 'sleep', value: 480, label: '+8h sleep', hint: 'Log rest' },
  { id: 'meds', type: 'meds', value: 1, label: 'Take meds', hint: 'Mark taken' },
];

export function initQuickActions() {
  const container = document.getElementById('quick-actions');
  const noteButton = document.getElementById('action-note');
  if (!container) return;

  container.innerHTML = '';
  ACTIONS.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-action card-hover card-press';
    button.dataset.type = action.type;
    button.dataset.value = action.value;
    button.innerHTML = `<span>${action.label}</span><small>${action.hint}</small>`;
    button.addEventListener('click', () => handleAction(action));
    container.appendChild(button);
  });

  if (noteButton) {
    noteButton.addEventListener('click', () => {
      const note = window.prompt('Add note');
      if (!note) return;
      const log = SharedStorage.pushLog('note', null, { note });
      showToast('Note added', {
        onUndo: () => SharedStorage.removeLog(log.id),
      });
    });
  }

  window.addEventListener('online', flushQueue);
  flushQueue();
}

function handleAction(action) {
  const payload = { type: action.type, value: action.value };
  if (navigator.onLine === false) {
    SharedStorage.addQueue({ kind: 'log', payload });
    showToast(`${action.label} queued`, {
      undoLabel: 'Undo',
      onUndo: () => cancelQueued(payload),
    });
    return;
  }
  const log = SharedStorage.pushLog(action.type, action.value);
  showToast(`Added ${action.label}`, {
    undoLabel: 'Undo',
    onUndo: () => SharedStorage.removeLog(log.id),
  });
}

function cancelQueued(payload) {
  SharedStorage.removeQueue((item) => item.kind === 'log' && item.payload.type === payload.type && item.payload.value === payload.value);
}

function flushQueue() {
  SharedStorage.flushQueue((items) => {
    items.forEach((item) => {
      if (item.kind === 'log') {
        SharedStorage.pushLog(item.payload.type, item.payload.value, { source: 'queue' });
      }
    });
  });
}
