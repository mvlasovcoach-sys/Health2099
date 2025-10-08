import { badgeRules } from '../../health/dashboard-engine.js';

const RING_ITEMS = [
  { key: 'stress', title: 'Stress' },
  { key: 'burnout', title: 'Burnout' },
  { key: 'fatigue', title: 'Fatigue' },
];

export function createRingRow() {
  const section = document.createElement('section');
  section.className = 'card ring-row';
  const ringsContainer = document.createElement('div');
  ringsContainer.className = 'ring-row__rings';

  RING_ITEMS.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'ring-row__card';
    card.dataset.key = item.key;
    card.innerHTML = `
      <div class="ring" aria-hidden="true"></div>
      <div class="ring__content">
        <span class="ring__label">${item.title}</span>
        <span class="ring__value" data-value>0%</span>
      </div>
    `;
    ringsContainer.appendChild(card);
  });

  const heartCard = document.createElement('article');
  heartCard.className = 'ring-row__card ring-row__card--heart';
  heartCard.innerHTML = `
    <div class="ring__content">
      <span class="ring__label">Heart age</span>
      <span class="ring__value" data-heart-value>0</span>
      <span class="badge" data-heart-badge>—</span>
    </div>
  `;

  section.appendChild(ringsContainer);
  section.appendChild(heartCard);

  function update(snapshot) {
    RING_ITEMS.forEach((item) => {
      const card = ringsContainer.querySelector(`[data-key="${item.key}"]`);
      if (!card) return;
      const value = snapshot && Number.isFinite(snapshot[item.key]) ? Math.max(0, Math.min(100, Math.round(snapshot[item.key]))) : null;
      const valueEl = card.querySelector('[data-value]');
      const ring = card.querySelector('.ring');
      if (valueEl) {
        valueEl.textContent = value == null ? '—' : `${value}%`;
      }
      if (ring) {
        const percent = value == null ? 0 : value;
        ring.style.setProperty('--progress', percent);
      }
    });

    const heartValueEl = heartCard.querySelector('[data-heart-value]');
    const heartBadgeEl = heartCard.querySelector('[data-heart-badge]');
    const heart = snapshot?.heartAge;
    const heartValue = heart && Number.isFinite(heart.value) ? Math.round(heart.value) : null;
    if (heartValueEl) {
      heartValueEl.textContent = heartValue == null ? '—' : `${heartValue}`;
    }
    if (heartBadgeEl) {
      const badge = heart?.badge || (heartValue == null ? '—' : badgeRules.cardio(heartValue));
      heartBadgeEl.textContent = badge;
    }
  }

  return { element: section, update };
}

export default createRingRow;
