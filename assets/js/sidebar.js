import { listLogs, pushLog, removeLog, onChange } from './sharedStorage.js';
import { getMedsToday, setMedsToday, updateMedToday, startOfDayISO } from './data-layer.js';

export function initSidebar() {
  const medsList = document.getElementById('meds-list');
  const addMedButton = document.getElementById('add-med');
  if (!medsList) return;

  function render() {
    medsList.innerHTML = '';
    const meds = getMedsToday();
    const takenLogs = listLogs({ type: 'med', since: startOfDayISO(new Date()) });

    meds.forEach((med) => {
      const item = document.createElement('div');
      item.className = 'meds-item';
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = med.taken || takenLogs.some((log) => log.note === med.title);
      checkbox.addEventListener('change', () => toggleMed(med, checkbox.checked));
      const span = document.createElement('span');
      span.textContent = med.title;
      span.tabIndex = 0;
      span.addEventListener('dblclick', () => editMedName(med));
      span.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          editMedName(med);
        }
      });
      label.append(checkbox, span);
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = 'Remove';
      removeBtn.className = 'card-press';
      removeBtn.addEventListener('click', () => removeMed(med.id));
      item.append(label, removeBtn);
      medsList.appendChild(item);
    });
  }

  if (addMedButton) {
    addMedButton.addEventListener('click', () => {
      const name = window.prompt('Medication name');
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const meds = getMedsToday();
      meds.push({ id: createMedId(), title: trimmed, taken: false });
      setMedsToday(meds);
    });
  }

  render();
  onChange(render);
}

function toggleMed(med, checked) {
  if (checked) {
    updateMedToday(med.id, { taken: true });
    const todays = listLogs({ type: 'med', since: startOfDayISO(new Date()) });
    const existing = todays.find((log) => log.note === med.title);
    if (!existing) {
      pushLog({ type: 'med', value: 1, note: med.title });
    }
  } else {
    updateMedToday(med.id, { taken: false });
    const todays = listLogs({ type: 'med', since: startOfDayISO(new Date()) });
    const targetLog = todays.find((log) => log.note === med.title);
    if (targetLog) {
      removeLog(targetLog.id);
    }
  }
}

function editMedName(med) {
  const name = window.prompt('Update medication name', med.title);
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  const meds = getMedsToday().map((item) =>
    item.id === med.id ? { ...item, title: trimmed } : item,
  );
  setMedsToday(meds);
}

function removeMed(id) {
  const meds = getMedsToday().filter((med) => med.id !== id);
  setMedsToday(meds);
}

function createMedId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `med_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function ready(callback) {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

ready(initSidebar);
