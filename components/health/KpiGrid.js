import { badgeRules } from '../../health/dashboard-engine.js';

const KPI_LABELS = [
  { key: 'wellbeing7', title: 'Wellbeing score (week)' },
  { key: 'cardio', title: 'Cardio-vascular' },
  { key: 'risk', title: 'Risk of pathology' },
  { key: 'arrhythmia', title: 'Arrhythmias' },
];

function resolveBadge(key, badge, value) {
  if (badge) return badge;
  switch (key) {
    case 'wellbeing7':
      return badgeRules.wellbeing(value);
    case 'cardio':
      return badgeRules.cardio(value);
    case 'risk':
      return badgeRules.risk(value);
    case 'arrhythmia':
      return badgeRules.arrhythmia(value);
    default:
      return '—';
  }
}

export function createKpiGrid() {
  const section = document.createElement('section');
  section.className = 'card kpi-grid';
  const list = document.createElement('div');
  list.className = 'kpi-grid__items';

  KPI_LABELS.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'kpi-grid__card';
    card.dataset.key = item.key;
    card.innerHTML = `
      <header class="kpi-grid__header">
        <h3>${item.title}</h3>
        <span class="badge" data-badge>—</span>
      </header>
      <p class="kpi-grid__value" data-value>0</p>
    `;
    list.appendChild(card);
  });

  section.appendChild(list);

  function update(snapshot) {
    KPI_LABELS.forEach((item) => {
      const card = list.querySelector(`[data-key="${item.key}"]`);
      if (!card) return;
      const valueEl = card.querySelector('[data-value]');
      const badgeEl = card.querySelector('[data-badge]');
      const entry = snapshot ? snapshot[item.key] : null;
      const value = entry && Number.isFinite(entry.value) ? Math.round(entry.value) : null;
      if (valueEl) {
        valueEl.textContent = value == null ? '—' : `${value}`;
      }
      if (badgeEl) {
        const text = resolveBadge(item.key, entry?.badge, value ?? 0);
        badgeEl.textContent = text;
      }
    });
  }

  return { element: section, update };
}

export default createKpiGrid;
