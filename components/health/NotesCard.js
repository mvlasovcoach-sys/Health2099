import { dashboard } from '../../stores/dashboard.js';

const SAVE_DELAY = 600;

export function createNotesCard() {
  const section = document.createElement('section');
  section.className = 'card notes-card';
  section.innerHTML = `
    <header class="notes-card__header">
      <h2>Notes</h2>
      <p>Recommendations will appear later (based on Energy / SRV / Stress).</p>
    </header>
    <label class="notes-card__field">
      <span class="visually-hidden">Notes</span>
      <textarea rows="4" data-notes placeholder="Add personal observations..." spellcheck="false"></textarea>
      <span class="notes-card__status" aria-live="polite" data-status></span>
    </label>
  `;

  const textarea = section.querySelector('[data-notes]');
  const statusEl = section.querySelector('[data-status]');
  let saveTimer = null;
  let lastValue = '';
  let isFocused = false;

  function scheduleSave(value) {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    if (statusEl) {
      statusEl.textContent = 'Saving…';
    }
    saveTimer = setTimeout(() => {
      dashboard.updateNotes(value);
      if (statusEl) {
        statusEl.textContent = 'Saved';
      }
      saveTimer = null;
    }, SAVE_DELAY);
  }

  if (textarea) {
    textarea.addEventListener('input', (event) => {
      const value = event.target.value;
      lastValue = value;
      scheduleSave(value);
    });
    textarea.addEventListener('focus', () => {
      isFocused = true;
    });
    textarea.addEventListener('blur', () => {
      isFocused = false;
      if (saveTimer || !statusEl) return;
      statusEl.textContent = '';
    });
  }

  function update(notes) {
    const nextValue = typeof notes === 'string' ? notes : '';
    if (textarea && !isFocused) {
      textarea.value = nextValue;
      lastValue = nextValue;
    }
    if (!nextValue && statusEl) {
      statusEl.textContent = '';
    }
  }

  return { element: section, update };
}

export default createNotesCard;
