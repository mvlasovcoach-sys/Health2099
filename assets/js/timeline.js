import { SharedStorage } from './sharedStorage.js';
import { iconForType, formatTime, isoToDate, unitLabel, formatNumber, pluralize } from './utils.js';

const TIMELINE_LIST_ID = 'timeline-list';
const FILTERS_ID = 'timeline-filters';
const RANGE_OPTIONS = [
  { id: 'today', label: 'Today', heading: 'Today', days: 1 },
  { id: '7d', label: '7d', heading: 'Last 7 days', days: 7 },
  { id: '30d', label: '30d', heading: 'Last 30 days', days: 30 },
];
const TYPE_OPTIONS = ['water', 'steps', 'sleep', 'caffeine', 'med', 'note'];

let currentRange = RANGE_OPTIONS[0];

export function initTimeline() {
  const list = document.getElementById(TIMELINE_LIST_ID);
  const headerCount = document.getElementById('timeline-count');
  const heading = document.getElementById('timeline-heading');
  const filtersHost = document.getElementById(FILTERS_ID);
  if (!list) return;

  setupFilters(filtersHost, () => render(list, headerCount, heading));
  render(list, headerCount, heading);

  SharedStorage.onChange((payload) => {
    if (!payload || payload.target === 'logs' || payload.target === 'queue') {
      render(list, headerCount, heading);
    }
  });
}

function render(list, headerCount, heading) {
  const logs = getLogsForRange(currentRange);
  renderTimeline(list, logs, currentRange);
  if (heading) heading.textContent = currentRange.heading;
  if (headerCount) headerCount.textContent = summarizeCount(logs.length, currentRange);
}

function setupFilters(container, onChange) {
  if (!container) return;
  container.innerHTML = '';
  RANGE_OPTIONS.forEach((range) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'timeline-filter card-press';
    button.dataset.range = range.id;
    button.textContent = range.label;
    button.setAttribute('aria-pressed', range.id === currentRange.id ? 'true' : 'false');
    if (range.id === currentRange.id) button.classList.add('is-active');
    button.addEventListener('click', () => {
      if (currentRange.id === range.id) return;
      currentRange = range;
      updateFilterState(container);
      if (typeof onChange === 'function') onChange();
    });
    container.appendChild(button);
  });
}

function updateFilterState(container) {
  const buttons = container.querySelectorAll('[data-range]');
  buttons.forEach((btn) => {
    const active = btn.dataset.range === currentRange.id;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function getLogsForRange(range) {
  const now = new Date();
  let since = SharedStorage.startOfDayISO(now);
  if (range.days > 1) {
    const sinceDate = new Date(now.getTime() - (range.days - 1) * 86400000);
    since = SharedStorage.startOfDayISO(sinceDate);
  }
  return SharedStorage.listLogs({ since });
}

function renderTimeline(list, logs, range) {
  list.innerHTML = '';
  if (!logs.length) {
    const empty = document.createElement('div');
    empty.className = 'timeline-empty';
    empty.innerHTML = `${emptyMessage(range)}<br /><button type="button" id="timeline-empty-add">Add hydration</button>`;
    list.appendChild(empty);
    const button = document.getElementById('timeline-empty-add');
    if (button) {
      button.addEventListener('click', () => SharedStorage.pushLog('water', 250));
    }
    return;
  }

  logs.forEach((log) => {
    const item = createTimelineItem(log);
    list.appendChild(item);
  });
}

function createTimelineItem(log) {
  const current = { ...log };
  const item = document.createElement('article');
  item.className = 'timeline-item card-hover';
  item.dataset.type = current.type;

  const time = document.createElement('time');
  time.className = 'timeline-time';
  time.dateTime = current.createdAt;
  time.textContent = formatTime(isoToDate(current.createdAt));

  const icon = document.createElement('span');
  icon.className = 'timeline-icon';
  icon.textContent = iconForType(current.type);
  icon.setAttribute('aria-hidden', 'true');

  const value = document.createElement('span');
  value.className = 'timeline-value';
  updateFieldDisplay(value, current, 'value');
  attachEditable(value, 'value', current, item);

  const type = document.createElement('span');
  type.className = 'timeline-type';
  updateFieldDisplay(type, current, 'type');
  attachEditable(type, 'type', current, item);

  const note = document.createElement('span');
  note.className = 'timeline-note';
  updateFieldDisplay(note, current, 'note');
  attachEditable(note, 'note', current, item);

  item.append(
    time,
    createDot(),
    icon,
    createDot(),
    value,
    type,
    createDot(),
    note,
  );

  return item;
}

function attachEditable(element, field, log, container) {
  element.tabIndex = 0;
  element.dataset.field = field;
  element.addEventListener('dblclick', () => startInlineEdit(element, field, log, container));
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      startInlineEdit(element, field, log, container);
    }
  });
}

function startInlineEdit(element, field, log, container) {
  if (element.dataset.editing === 'true') return;
  if (field === 'value' && log.value == null && log.type === 'note') {
    // Value field not relevant for note-only logs
    return;
  }
  element.dataset.editing = 'true';
  const editor = createEditor(field, log);
  if (!editor) {
    element.dataset.editing = 'false';
    return;
  }

  const original = element.textContent;
  element.innerHTML = '';
  element.appendChild(editor);
  editor.focus();
  if (editor.select) editor.select();

  let resolved = false;
  const finish = (callback) => {
    if (resolved) return;
    resolved = true;
    callback();
  };

  const commit = () => {
    finish(() => {
      const updates = collectUpdates(field, editor, log);
      if (!updates) {
        element.dataset.editing = 'false';
        element.innerHTML = '';
        updateFieldDisplay(element, log, field);
        return;
      }
      const updated = SharedStorage.updateLog(log.id, updates) || { ...log, ...updates };
      Object.assign(log, updated);
      element.dataset.editing = 'false';
      element.innerHTML = '';
      updateFieldDisplay(element, updated, field);
      container.dataset.type = updated.type;
    });
  };

  const cancel = () => {
    finish(() => {
      element.dataset.editing = 'false';
      element.textContent = original;
    });
  };

  editor.addEventListener('blur', commit);
  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  });
}

function createEditor(field, log) {
  if (field === 'value') {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'timeline-editor';
    input.value = log.value == null ? '' : String(log.value);
    input.min = '0';
    input.step = '1';
    return input;
  }
  if (field === 'type') {
    const select = document.createElement('select');
    select.className = 'timeline-editor';
    TYPE_OPTIONS.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      if (option === log.type) opt.selected = true;
      select.appendChild(opt);
    });
    return select;
  }
  if (field === 'note') {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'timeline-editor';
    input.value = log.note || '';
    input.placeholder = 'Add note';
    return input;
  }
  return null;
}

function collectUpdates(field, editor, log) {
  if (field === 'value') {
    const value = editor.value;
    const next = value === '' ? null : Number(value);
    if (Number.isNaN(next) || next === log.value) return null;
    return { value: next };
  }
  if (field === 'type') {
    const nextType = editor.value;
    if (!nextType || nextType === log.type) return null;
    const updates = { type: nextType };
    if (nextType === 'note') updates.value = null;
    return updates;
  }
  if (field === 'note') {
    const next = editor.value.trim();
    if (next === (log.note || '')) return null;
    return { note: next };
  }
  return null;
}

function updateFieldDisplay(element, log, field) {
  element.dataset.placeholder = 'false';
  if (field === 'value') {
    if (log.value == null) {
      element.textContent = '—';
      element.dataset.placeholder = 'true';
    } else {
      const unit = unitLabel(log.type);
      const formatted = formatNumber(log.value);
      element.textContent = unit ? `${formatted} ${unit}` : formatted;
    }
    return;
  }
  if (field === 'type') {
    element.textContent = capitalize(log.type);
    return;
  }
  if (field === 'note') {
    if (log.note && log.note.trim()) {
      element.textContent = log.note;
    } else {
      element.textContent = 'Add note';
      element.dataset.placeholder = 'true';
    }
  }
}

function summarizeCount(count, range) {
  if (!count) {
    if (range.id === 'today') return 'No events yet today';
    if (range.id === '7d') return 'No events in last 7 days';
    return 'No events in last 30 days';
  }
  return pluralize(count, 'event');
}

function emptyMessage(range) {
  if (range.id === 'today') return 'No activity yet today.';
  if (range.id === '7d') return 'No activity logged in the last 7 days.';
  return 'No activity logged in the last 30 days.';
}

function createDot() {
  const dot = document.createElement('span');
  dot.className = 'timeline-dot';
  dot.textContent = '•';
  dot.setAttribute('aria-hidden', 'true');
  return dot;
}

function capitalize(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default initTimeline;
