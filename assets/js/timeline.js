import { SharedStorage } from './sharedStorage.js';
import { iconForType, formatTime, isoToDate, unitLabel } from './utils.js';

const TIMELINE_LIST_ID = 'timeline-list';

export function initTimeline() {
  const list = document.getElementById(TIMELINE_LIST_ID);
  const headerCount = document.getElementById('timeline-count');
  if (!list) return;

  function render() {
    const logs = SharedStorage.listLogs({ since: startOfDayISO(new Date()) });
    list.innerHTML = '';
    if (headerCount) {
      headerCount.textContent = `${logs.length} events`;
    }
    if (!logs.length) {
      list.innerHTML = `<div class="timeline-empty">No activity yet today.<br /><button type="button" id="timeline-empty-add">Add hydration</button></div>`;
      const emptyBtn = document.getElementById('timeline-empty-add');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => {
          SharedStorage.pushLog('water', 250);
        });
      }
      return;
    }

    logs.forEach((log) => {
      const item = document.createElement('article');
      item.className = 'timeline-item card-hover';
      item.dataset.type = log.type;
      item.tabIndex = 0;
      item.addEventListener('dblclick', () => openEditor(item, log, render));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          openEditor(item, log, render);
        }
      });

      const icon = document.createElement('div');
      icon.className = 'timeline-icon';
      icon.textContent = iconForType(log.type);
      icon.setAttribute('aria-hidden', 'true');

      const content = document.createElement('div');
      content.className = 'timeline-content';

      const heading = document.createElement('strong');
      heading.textContent = formatValue(log);
      const meta = document.createElement('span');
      meta.className = 'timeline-meta';
      meta.textContent = `${log.type} · ${formatTime(isoToDate(log.createdAt))}`;
      content.append(heading, meta);

      if (log.note) {
        const note = document.createElement('span');
        note.className = 'timeline-note';
        note.textContent = log.note;
        content.appendChild(note);
      }

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'card-press';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openEditor(item, log, render));

      item.append(icon, content, editBtn);
      list.appendChild(item);
    });
  }

  render();
  SharedStorage.onChange((payload) => {
    if (!payload || payload.target === 'logs') {
      render();
    }
  });
}

function openEditor(container, log, onComplete) {
  container.innerHTML = '';
  container.classList.add('timeline-editable');

  const form = document.createElement('form');
  form.className = 'timeline-edit-form';

  const valueWrap = document.createElement('div');
  const valueLabel = document.createElement('label');
  valueLabel.textContent = 'Value';
  valueLabel.className = 'visually-hidden';
  const valueInput = document.createElement('input');
  valueInput.type = 'number';
  valueInput.value = log.value ?? 0;
  valueInput.min = 0;
  if (log.value == null) {
    valueInput.disabled = true;
  }
  valueWrap.append(valueLabel, valueInput);

  const typeWrap = document.createElement('div');
  const typeLabel = document.createElement('label');
  typeLabel.textContent = 'Type';
  typeLabel.className = 'visually-hidden';
  const typeSelect = document.createElement('select');
  ['water', 'steps', 'sleep', 'caffeine', 'meds', 'note'].forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    if (type === log.type) option.selected = true;
    typeSelect.appendChild(option);
  });
  typeWrap.append(typeLabel, typeSelect);

  const noteWrap = document.createElement('div');
  const noteLabel = document.createElement('label');
  noteLabel.textContent = 'Note';
  noteLabel.className = 'visually-hidden';
  const noteInput = document.createElement('textarea');
  noteInput.value = log.note || '';
  noteWrap.append(noteLabel, noteInput);

  const actions = document.createElement('div');
  actions.className = 'timeline-actions';
  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = 'Save';
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => {
    SharedStorage.removeLog(log.id);
  });
  cancelBtn.addEventListener('click', () => {
    if (typeof onComplete === 'function') onComplete();
  });
  actions.append(cancelBtn, saveBtn, deleteBtn);

  form.append(valueWrap, typeWrap, noteWrap, actions);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const newType = typeSelect.value;
    const newValue = valueInput.disabled ? null : Number(valueInput.value || 0);
    SharedStorage.updateLog(log.id, {
      type: newType,
      value: newValue,
      note: noteInput.value,
    });
    if (typeof onComplete === 'function') onComplete();
  });

  container.appendChild(form);

  typeSelect.addEventListener('change', () => {
    if (typeSelect.value === 'note') {
      valueInput.disabled = true;
      valueInput.value = '';
    } else {
      valueInput.disabled = false;
    }
  });
}

function formatValue(log) {
  if (log.value == null) {
    return log.note || log.type;
  }
  const unit = unitLabel(log.type);
  return `${log.value} ${unit}`;
}

function startOfDayISO(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
