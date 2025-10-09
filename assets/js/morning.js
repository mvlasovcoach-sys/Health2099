import { pushLog, removeLog, getDB, onChange } from './sharedStorage.js';
import { showToast } from './ui.js';
import { formatTime } from './utils.js';
import { computeReadiness } from './models/readiness.js';

const TOAST_DURATION = 10000;

let elements = null;
let lastReadiness = computeReadiness();
let currentGroupId = null;
let currentLogIds = [];
let unsubscribe = null;

function ready(callback) {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

function getElements() {
  const card = document.querySelector('#morning-checkin .morning-card');
  if (!card) return null;
  const form = card.querySelector('#morning-form');
  const sleepInput = form?.elements?.sleep;
  const qualityInput = form?.elements?.quality;
  const rhrInput = form?.elements?.rhr;
  const hrvInput = form?.elements?.hrv;
  const energyPreview = card.querySelector('[data-preview="energy"]');
  const srvPreview = card.querySelector('[data-preview="srv"]');
  const qualityOutput = card.querySelector('#morning-quality-output');
  const compactMeta = card.querySelector('[data-compact="time"]');
  const compactSummary = card.querySelector('[data-compact="summary"]');
  const compactLink = card.querySelector('[data-compact="link"]');

  if (!form || !sleepInput || !qualityInput || !rhrInput || !hrvInput || !energyPreview || !srvPreview) {
    return null;
  }

  return {
    card,
    form,
    sleepInput,
    qualityInput,
    rhrInput,
    hrvInput,
    energyPreview,
    srvPreview,
    qualityOutput,
    compactMeta,
    compactSummary,
    compactLink,
  };
}

function setup() {
  elements = getElements();
  if (!elements) return;

  attachListeners();
  resetForm();
  if (elements.compactLink) {
    const href = elements.compactLink.getAttribute('href');
    if (href && typeof window !== 'undefined' && typeof window.withBase === 'function') {
      elements.compactLink.setAttribute('href', window.withBase(href));
    }
  }
  hydrate(getDB());

  if (typeof unsubscribe === 'function') unsubscribe();
  unsubscribe = onChange((db) => hydrate(db));
}

function attachListeners() {
  const { form, qualityInput } = elements;

  form.addEventListener('input', (event) => {
    if (event.target === qualityInput && elements.qualityOutput) {
      elements.qualityOutput.textContent = String(qualityInput.value);
    }
    updatePreview();
  });

  form.addEventListener('submit', handleSubmit);

  form.querySelectorAll('.morning-stepper').forEach((stepper) => {
    stepper.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-step]');
      if (!button) return;
      const step = Number(button.dataset.step || 0);
      const targetName = stepper.dataset.target;
      if (!targetName || !(targetName in form.elements)) return;
      const input = form.elements[targetName];
      adjustInputValue(input, step);
    });
  });
}

function adjustInputValue(input, step) {
  if (!input) return;
  const current = Number.parseFloat(input.value);
  const next = Number.isFinite(current) ? current + step : step;
  const stepSize = Number(input.step) || 1;
  const min = input.min === '' ? -Infinity : Number(input.min);
  const max = input.max === '' ? Infinity : Number(input.max);
  const rounded = Math.round(next / stepSize) * stepSize;
  const clamped = Math.min(Math.max(rounded, min), max);
  input.value = clamped.toFixed(stepSize < 1 ? 2 : 0);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function updatePreview() {
  const data = readForm();
  lastReadiness = computeReadiness({
    hours: data.hours,
    hrv: data.hrv,
    rhr: data.rhr,
    alcohol: data.alcohol,
    lateMeal: data.lateMeal,
    malaise: data.malaise,
  });
  elements.energyPreview.textContent = String(lastReadiness.energy);
  elements.srvPreview.textContent = String(lastReadiness.srv);
}

function readForm() {
  const { form, sleepInput, qualityInput, rhrInput, hrvInput } = elements;
  const hours = Number.parseFloat(sleepInput.value) || 0;
  const quality = Number.parseInt(qualityInput.value, 10) || 0;
  const rhr = Number.parseInt(rhrInput.value, 10) || 0;
  const hrv = Number.parseInt(hrvInput.value, 10) || 0;
  return {
    hours,
    minutes: Math.round(hours * 60),
    quality,
    rhr,
    hrv,
    alcohol: Boolean(form.elements.alcohol?.checked),
    lateMeal: Boolean(form.elements.late_meal?.checked),
    malaise: Boolean(form.elements.malaise?.checked),
  };
}

function handleSubmit(event) {
  event.preventDefault();
  const data = readForm();
  const tags = [];
  if (data.alcohol) tags.push('alcohol');
  if (data.lateMeal) tags.push('late_meal');
  if (data.malaise) tags.push('malaise');

  const gid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `morning_${Date.now()}`;
  const logIds = [];

  const baseMeta = { quality: data.quality };
  const sleepLog = pushLog({
    id: `${gid}-sleep`,
    type: 'sleep',
    value: data.minutes,
    unit: 'min',
    note: 'morning',
    meta: baseMeta,
  });
  logIds.push(sleepLog.id);

  const rhrLog = pushLog({
    id: `${gid}-rhr`,
    type: 'resting_hr',
    value: data.rhr,
    unit: 'bpm',
    note: 'morning',
  });
  logIds.push(rhrLog.id);

  const hrvLog = pushLog({
    id: `${gid}-hrv`,
    type: 'hrv',
    value: data.hrv,
    unit: 'ms',
    note: 'morning',
  });
  logIds.push(hrvLog.id);

  ['alcohol', 'late_meal', 'malaise'].forEach((tag) => {
    const key = tag === 'late_meal' ? 'lateMeal' : tag;
    if ((tag === 'late_meal' && data.lateMeal) || (tag === 'alcohol' && data.alcohol) || (tag === 'malaise' && data.malaise)) {
      const log = pushLog({
        id: `${gid}-${tag}`,
        type: 'tag',
        value: tag,
        note: 'morning',
      });
      logIds.push(log.id);
    }
  });

  const summaryLog = pushLog({
    id: gid,
    type: 'morning_checkin',
    value: 1,
    note: 'morning',
    meta: {
      hours: data.hours,
      minutes: data.minutes,
      quality: data.quality,
      rhr: data.rhr,
      hrv: data.hrv,
      tags,
      energy: lastReadiness.energy,
      srv: lastReadiness.srv,
    },
  });
  logIds.push(summaryLog.id);

  currentGroupId = gid;
  currentLogIds = [...logIds];

  setCompact(summaryLog);
  showToast('Morning saved', {
    undoLabel: 'Undo',
    duration: TOAST_DURATION,
    onUndo: () => {
      currentLogIds.forEach((id) => removeLog(id));
      currentGroupId = null;
      currentLogIds = [];
      resetForm();
      setFormState();
    },
  });

  form.reset();
  resetForm();
}

function hydrate(db) {
  const entry = findTodayEntry(db);
  if (!entry) {
    currentGroupId = null;
    currentLogIds = [];
    setFormState();
    return;
  }
  currentGroupId = entry.id;
  currentLogIds = collectGroupLogIds(db.logs, entry.id);
  setCompact(entry);
}

function findTodayEntry(db) {
  if (!db?.logs?.length) return null;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  return db.logs.find((log) => {
    if (log.type !== 'morning_checkin') return false;
    const time = new Date(log.createdAt).getTime();
    return time >= startOfDay.getTime() && time < endOfDay.getTime();
  }) || null;
}

function collectGroupLogIds(logs, groupId) {
  if (!Array.isArray(logs)) return [];
  return logs
    .filter((log) => log.id === groupId || (typeof log.id === 'string' && log.id.startsWith(`${groupId}-`)))
    .map((log) => log.id);
}

function setFormState() {
  if (!elements) return;
  elements.card.dataset.state = 'form';
  resetForm();
}

function setCompact(log) {
  if (!elements) return;
  elements.card.dataset.state = 'compact';
  const created = new Date(log.createdAt);
  const energy = log.meta?.energy ?? lastReadiness.energy;
  const srv = log.meta?.srv ?? lastReadiness.srv;
  lastReadiness = { energy, srv };
  if (elements.compactMeta) {
    elements.compactMeta.textContent = `Saved at ${formatTime(created)}`;
  }
  if (elements.compactSummary) {
    elements.compactSummary.textContent = `Energy ${energy}, SRV ${srv}`;
  }
}

function resetForm() {
  if (!elements) return;
  const { form, qualityInput, qualityOutput, sleepInput, rhrInput, hrvInput } = elements;
  if (form) {
    form.elements.alcohol && (form.elements.alcohol.checked = false);
    form.elements.late_meal && (form.elements.late_meal.checked = false);
    form.elements.malaise && (form.elements.malaise.checked = false);
  }
  if (qualityOutput) {
    qualityOutput.textContent = String(qualityInput.value);
  }
  if (sleepInput && !sleepInput.value) {
    sleepInput.value = '7';
  }
  if (rhrInput && !rhrInput.value) {
    rhrInput.value = '60';
  }
  if (hrvInput && !hrvInput.value) {
    hrvInput.value = '65';
  }
  updatePreview();
}

ready(setup);
