import { SharedStorage } from './sharedStorage.js';

export function initSidebar() {
  const waterInput = document.getElementById('target-water');
  const stepsInput = document.getElementById('target-steps');
  const sleepInput = document.getElementById('target-sleep');
  const caffeineInput = document.getElementById('target-caffeine');
  const medsList = document.getElementById('meds-list');
  const addMedButton = document.getElementById('add-med');
  if (!waterInput || !stepsInput || !sleepInput || !caffeineInput || !medsList) return;

  const inputs = [waterInput, stepsInput, sleepInput, caffeineInput];
  const debouncedSave = debounce(saveTargets, 400);

  function render() {
    const targets = SharedStorage.getTargets();
    waterInput.value = targets.water_ml;
    stepsInput.value = targets.steps;
    sleepInput.value = targets.sleep_min;
    caffeineInput.value = targets.caffeine_mg;

    medsList.innerHTML = '';
    const meds = SharedStorage.getMedsToday();
    const takenLogs = SharedStorage.listLogs({ type: 'med', since: SharedStorage.startOfDayISO(new Date()) });

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

  inputs.forEach((input) => {
    input.addEventListener('input', () => debouncedSave(inputs));
  });

  if (addMedButton) {
    addMedButton.addEventListener('click', () => {
      const name = window.prompt('Medication name');
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const meds = SharedStorage.getMedsToday();
      meds.push({ id: createMedId(), title: trimmed, taken: false });
      SharedStorage.setMedsToday(meds);
    });
  }

  render();
  SharedStorage.onChange((payload) => {
    if (!payload || payload.target === 'targets' || payload.target === 'logs' || payload.target === 'meds') {
      render();
    }
  });
}

function saveTargets(inputs) {
  const [water_ml, steps, sleep_min, caffeine_mg] = inputs.map((input) => Number(input.value || 0));
  SharedStorage.setTargets({ water_ml, steps, sleep_min, caffeine_mg });
}

function toggleMed(med, checked) {
  if (checked) {
    SharedStorage.updateMedToday(med.id, { taken: true });
    const todays = SharedStorage.listLogs({ type: 'med', since: SharedStorage.startOfDayISO(new Date()) });
    const existing = todays.find((log) => log.note === med.title);
    if (!existing) {
      SharedStorage.pushLog('med', 1, { note: med.title });
    }
  } else {
    SharedStorage.updateMedToday(med.id, { taken: false });
    const todays = SharedStorage.listLogs({ type: 'med', since: SharedStorage.startOfDayISO(new Date()) });
    const targetLog = todays.find((log) => log.note === med.title);
    if (targetLog) {
      SharedStorage.removeLog(targetLog.id);
    }
  }
}

function editMedName(med) {
  const name = window.prompt('Update medication name', med.title);
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  const meds = SharedStorage.getMedsToday().map((item) =>
    item.id === med.id ? { ...item, title: trimmed } : item,
  );
  SharedStorage.setMedsToday(meds);
}

function removeMed(id) {
  const meds = SharedStorage.getMedsToday().filter((med) => med.id !== id);
  SharedStorage.setMedsToday(meds);
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function createMedId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `med_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
