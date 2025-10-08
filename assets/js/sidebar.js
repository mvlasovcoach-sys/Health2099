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
    waterInput.value = targets.water;
    stepsInput.value = targets.steps;
    sleepInput.value = targets.sleep;
    caffeineInput.value = targets.caffeine;

    medsList.innerHTML = '';
    const meds = Array.isArray(targets.meds) ? targets.meds : [];
    const takenLogs = SharedStorage.listLogs({ type: 'meds', since: SharedStorage.startOfDayISO(new Date()) });

    meds.forEach((med) => {
      const item = document.createElement('div');
      item.className = 'meds-item';
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = takenLogs.some((log) => log.note === med.name);
      checkbox.addEventListener('change', () => toggleMed(med, checkbox.checked));
      const span = document.createElement('span');
      span.textContent = med.name;
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
      const targets = SharedStorage.getTargets();
      const meds = Array.isArray(targets.meds) ? [...targets.meds] : [];
      meds.push({ id: crypto.randomUUID(), name });
      SharedStorage.setTargets({ ...targets, meds });
    });
  }

  render();
  SharedStorage.onChange((payload) => {
    if (!payload || payload.target === 'targets' || payload.target === 'logs') {
      render();
    }
  });
}

function saveTargets(inputs) {
  const [water, steps, sleep, caffeine] = inputs.map((input) => Number(input.value || 0));
  SharedStorage.setTargets({ water, steps, sleep, caffeine });
}

function toggleMed(med, checked) {
  if (checked) {
    SharedStorage.pushLog('meds', 1, { note: med.name });
  } else {
    const todays = SharedStorage.listLogs({ type: 'meds', since: SharedStorage.startOfDayISO(new Date()) });
    const targetLog = todays.find((log) => log.note === med.name);
    if (targetLog) {
      SharedStorage.removeLog(targetLog.id);
    }
  }
}

function editMedName(med) {
  const name = window.prompt('Update medication name', med.name);
  if (!name) return;
  const targets = SharedStorage.getTargets();
  const meds = Array.isArray(targets.meds) ? targets.meds.map((item) => (item.id === med.id ? { ...item, name } : item)) : [];
  SharedStorage.setTargets({ ...targets, meds });
}

function removeMed(id) {
  const targets = SharedStorage.getTargets();
  const meds = Array.isArray(targets.meds) ? targets.meds.filter((med) => med.id !== id) : [];
  SharedStorage.setTargets({ ...targets, meds });
}


function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
