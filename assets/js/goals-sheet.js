import { getTargets, setTargets, onChange } from './sharedStorage.js';

const CONFIG = [
  {
    key: 'water_ml',
    label: 'Water goal',
    unit: 'ml',
    presets: [1500, 2000, 2500],
  },
  {
    key: 'steps',
    label: 'Steps goal',
    unit: 'steps',
    presets: [6000, 8000, 10000],
  },
  {
    key: 'caffeine_mg',
    label: 'Caffeine ceiling',
    unit: 'mg',
    presets: [200, 300, 400],
  },
];

let sheet = null;
let statusEl = null;
let initialized = false;
let detach = null;
const chipRefs = new Map();
const customRefs = new Map();
let statusTimer = null;

export function initGoalsSheet() {
  if (initialized) return;
  sheet = createSheet();
  document.body.appendChild(sheet);
  updateTargets(getTargets());
  detach = onChange((db) => updateTargets(db?.targets || getTargets()));
  initialized = true;
}

export function openGoalsSheet() {
  if (!initialized) {
    initGoalsSheet();
  }
  if (!sheet) return;
  sheet.dataset.state = 'open';
  sheet.setAttribute('aria-hidden', 'false');
  document.body.classList.add('goals-open');
  const focusTarget = sheet.querySelector('[data-focus-default]');
  if (focusTarget) {
    focusTarget.focus();
  }
}

function closeGoalsSheet() {
  if (!sheet) return;
  sheet.dataset.state = 'closed';
  sheet.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('goals-open');
}

function createSheet() {
  const wrapper = document.createElement('div');
  wrapper.className = 'goals-sheet';
  wrapper.id = 'goals-sheet';
  wrapper.dataset.state = 'closed';
  wrapper.setAttribute('aria-hidden', 'true');

  const backdrop = document.createElement('div');
  backdrop.className = 'goals-sheet__backdrop';
  backdrop.dataset.action = 'close';
  wrapper.appendChild(backdrop);

  const panel = document.createElement('div');
  panel.className = 'goals-sheet__panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'goals-sheet-title');
  wrapper.appendChild(panel);

  const header = document.createElement('header');
  header.className = 'goals-sheet__header';
  panel.appendChild(header);

  const title = document.createElement('h2');
  title.id = 'goals-sheet-title';
  title.textContent = 'Edit goals';
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'goals-sheet__close card-press';
  closeBtn.dataset.action = 'close';
  closeBtn.setAttribute('aria-label', 'Close goals');
  closeBtn.innerHTML = '&times;';
  header.appendChild(closeBtn);

  statusEl = document.createElement('div');
  statusEl.className = 'goals-sheet__status';
  statusEl.setAttribute('role', 'status');
  statusEl.setAttribute('aria-live', 'polite');
  panel.appendChild(statusEl);

  const content = document.createElement('div');
  content.className = 'goals-sheet__content';
  panel.appendChild(content);

  CONFIG.forEach((config, index) => {
    const section = document.createElement('section');
    section.className = 'goals-sheet__section';
    section.dataset.targetKey = config.key;

    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = config.label;
    section.appendChild(sectionTitle);

    const chipGroup = document.createElement('div');
    chipGroup.className = 'goals-sheet__chips';
    chipGroup.setAttribute('role', 'group');
    chipGroup.setAttribute('aria-label', `${config.label} presets`);

    const valueMap = new Map();
    config.presets.forEach((presetValue, idx) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'goals-sheet__chip card-press';
      chip.dataset.value = String(presetValue);
      chip.setAttribute('aria-pressed', 'false');
      if (index === 0 && idx === 0) {
        chip.dataset.focusDefault = 'true';
      }
      chip.textContent = `${presetValue.toLocaleString()} ${config.unit}`;
      chip.addEventListener('click', () => {
        applyGoal(config.key, presetValue);
      });
      chipGroup.appendChild(chip);
      valueMap.set(presetValue, chip);
    });

    const customChip = document.createElement('button');
    customChip.type = 'button';
    customChip.className = 'goals-sheet__chip goals-sheet__chip--custom card-press';
    customChip.dataset.action = 'custom';
    customChip.setAttribute('aria-pressed', 'false');
    customChip.innerHTML = '&hellip;';
    customChip.addEventListener('click', () => toggleCustom(section, true));
    chipGroup.appendChild(customChip);
    valueMap.set('custom', customChip);

    chipRefs.set(config.key, valueMap);

    section.appendChild(chipGroup);

    const custom = document.createElement('form');
    custom.className = 'goals-sheet__custom';
    custom.dataset.customFor = config.key;
    custom.hidden = true;

    const label = document.createElement('label');
    label.className = 'visually-hidden';
    const inputId = `goal-custom-${config.key}`;
    label.setAttribute('for', inputId);
    label.textContent = `Custom ${config.label}`;
    custom.appendChild(label);

    const row = document.createElement('div');
    row.className = 'goals-sheet__custom-row';
    custom.appendChild(row);

    const input = document.createElement('input');
    input.id = inputId;
    input.type = 'number';
    input.min = '0';
    input.inputMode = 'numeric';
    input.placeholder = `e.g. ${config.presets[config.presets.length - 1] + 100}`;
    row.appendChild(input);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'card-press';
    saveBtn.textContent = 'Save';
    row.appendChild(saveBtn);

    custom.addEventListener('submit', (event) => {
      event.preventDefault();
      const numeric = Number(input.value);
      if (!Number.isFinite(numeric) || numeric <= 0) return;
      applyGoal(config.key, Math.round(numeric));
      toggleCustom(section, false);
    });

    customRefs.set(config.key, { container: custom, input, toggle: (visible) => toggleCustom(section, visible) });
    section.appendChild(custom);

    content.appendChild(section);
  });

  wrapper.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.dataset.action === 'close') {
      event.preventDefault();
      closeGoalsSheet();
    }
  });

  wrapper.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeGoalsSheet();
    }
  });

  return wrapper;
}

function toggleCustom(section, visible) {
  const custom = section.querySelector('.goals-sheet__custom');
  const input = custom?.querySelector('input');
  if (!custom) return;
  custom.hidden = !visible;
  if (visible && input) {
    requestAnimationFrame(() => input.focus());
  }
}

function applyGoal(key, value) {
  const numeric = Math.max(0, Math.round(value || 0));
  setTargets({ [key]: numeric });
  announceSaved();
  const current = getTargets();
  updateTargets(current);
}

function updateTargets(targets) {
  CONFIG.forEach((config) => {
    const value = Number(targets?.[config.key]) || 0;
    const chips = chipRefs.get(config.key);
    const presets = new Set(config.presets);
    if (chips) {
      chips.forEach((chip, key) => {
        const isCustom = key === 'custom';
        const active = isCustom ? !presets.has(value) && value > 0 : Number(key) === value;
        chip.classList.toggle('is-active', active);
        chip.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }
    const custom = customRefs.get(config.key);
    if (custom?.input) {
      custom.input.value = value > 0 ? String(value) : '';
    }
    if (custom?.container) {
      const shouldShow = value > 0 && !presets.has(value);
      custom.container.hidden = !shouldShow;
    }
  });
}

function announceSaved() {
  if (!statusEl) return;
  statusEl.textContent = 'Saved';
  statusEl.classList.add('is-visible');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusEl.textContent = '';
    statusEl.classList.remove('is-visible');
  }, 2000);
}

export function destroyGoalsSheet() {
  if (typeof detach === 'function') {
    detach();
    detach = null;
  }
  if (sheet?.parentElement) {
    sheet.parentElement.removeChild(sheet);
  }
  sheet = null;
  initialized = false;
  chipRefs.clear();
  customRefs.clear();
}
