import { badgeRules } from '../../health/dashboard-engine.js';

const CHIP_ITEMS = [
  { key: 'alcohol_yday', label: 'Alcohol (yesterday)' },
  { key: 'symptoms', label: 'Illness symptoms' },
  { key: 'energy_adj', label: 'Energy adj.' },
  { key: 'late_meal', label: 'Late meal' },
];

function formatChipValue(key, value) {
  if (key === 'energy_adj') {
    if (!Number.isFinite(value)) return '0';
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value}`;
  }
  if (value == null) return '—';
  return value ? 'Yes' : 'No';
}

export function createFactsRow() {
  const section = document.createElement('section');
  section.className = 'card facts-row';
  section.innerHTML = `
    <div class="facts-row__primary">
      <article class="facts-row__sleep">
        <h3>Sleep</h3>
        <p class="facts-row__sleep-value" data-sleep-value>—</p>
        <span class="badge" data-sleep-badge>—</span>
      </article>
      <div class="facts-row__chips" data-chips></div>
    </div>
  `;

  const chipsContainer = section.querySelector('[data-chips]');
  if (chipsContainer) {
    CHIP_ITEMS.forEach((item) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.dataset.key = item.key;
      chip.innerHTML = `<span class="chip__label">${item.label}</span><span class="chip__value" data-value>—</span>`;
      chipsContainer.appendChild(chip);
    });
  }

  function update(snapshot) {
    const sleepValueEl = section.querySelector('[data-sleep-value]');
    const sleepBadgeEl = section.querySelector('[data-sleep-badge]');
    const hours = snapshot && Number.isFinite(snapshot.sleep_h) ? snapshot.sleep_h : null;
    if (sleepValueEl) {
      sleepValueEl.textContent = hours == null ? '—' : `${hours.toFixed(1)} h`;
    }
    if (sleepBadgeEl) {
      sleepBadgeEl.textContent = badgeRules.sleep(hours);
    }

    CHIP_ITEMS.forEach((item) => {
      const chip = chipsContainer ? chipsContainer.querySelector(`[data-key="${item.key}"]`) : null;
      if (!chip) return;
      const valueEl = chip.querySelector('[data-value]');
      const raw = snapshot ? snapshot[item.key] : null;
      if (valueEl) {
        valueEl.textContent = formatChipValue(item.key, raw);
      }
    });
  }

  return { element: section, update };
}

export default createFactsRow;
