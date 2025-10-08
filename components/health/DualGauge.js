const ZONES = [
  { max: 39, className: 'danger' },
  { max: 59, className: 'warning' },
  { max: 79, className: 'success' },
  { max: 100, className: 'primary' },
];

function resolveZone(value) {
  const num = Number.isFinite(value) ? value : 0;
  return ZONES.find((zone) => num <= zone.max) || ZONES[ZONES.length - 1];
}

function formatDelta(value) {
  if (!Number.isFinite(value) || value === 0) return '0';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value}`;
}

function setRing(el, value) {
  if (!el) return;
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  el.style.setProperty('--progress', clamped);
  const zone = resolveZone(clamped);
  el.dataset.zone = zone.className;
}

function updateCard(card, { label, value, delta }) {
  if (!card) return;
  const valueEl = card.querySelector('[data-value]');
  const deltaEl = card.querySelector('[data-delta]');
  const gaugeEl = card.querySelector('.dual-gauge__ring');
  const labelEl = card.querySelector('[data-label]');
  if (labelEl) labelEl.textContent = label;
  if (valueEl) valueEl.textContent = Number.isFinite(value) ? Math.round(value).toString() : '—';
  if (deltaEl) {
    deltaEl.textContent = `Δ 15m · ${formatDelta(delta)}`;
    deltaEl.dataset.trend = !Number.isFinite(delta)
      ? 'neutral'
      : delta > 0
        ? 'up'
        : delta < 0
          ? 'down'
          : 'neutral';
  }
  setRing(gaugeEl, value);
}

function updateConfidence(container, confidence) {
  if (!container) return;
  const confidenceEl = container.querySelector('[data-confidence]');
  if (!confidenceEl) return;
  const value = confidence === 'auto' ? 'Auto' : confidence === 'timeout' ? 'Timeout' : 'Manual';
  confidenceEl.textContent = `●●● ${value}`;
  confidenceEl.dataset.mode = confidence || 'manual';
}

export function createDualGauge() {
  const section = document.createElement('section');
  section.className = 'card dual-gauge';
  section.innerHTML = `
    <div class="dual-gauge__cards">
      <div class="dual-gauge__card" data-kind="energy">
        <div class="dual-gauge__ring" aria-hidden="true"><span class="dual-gauge__value" data-value>0</span></div>
        <div class="dual-gauge__content">
          <span class="dual-gauge__label" data-label>Energy</span>
          <span class="dual-gauge__delta" data-delta data-caption>Δ 15m · 0</span>
        </div>
      </div>
      <div class="dual-gauge__card" data-kind="srv">
        <div class="dual-gauge__ring" aria-hidden="true"><span class="dual-gauge__value" data-value>0</span></div>
        <div class="dual-gauge__content">
          <span class="dual-gauge__label" data-label>SRV</span>
          <span class="dual-gauge__delta" data-delta data-caption>Δ 15m · 0</span>
        </div>
      </div>
    </div>
    <footer class="dual-gauge__footer">
      <span class="badge" data-confidence data-mode="manual">●●● Manual</span>
    </footer>
  `;

  const cards = {
    energy: section.querySelector('[data-kind="energy"]'),
    srv: section.querySelector('[data-kind="srv"]'),
  };

  function update(snapshot) {
    if (!snapshot) return;
    updateCard(cards.energy, {
      label: 'Energy',
      value: snapshot.energy,
      delta: snapshot.delta15m ? snapshot.delta15m.energy : 0,
    });
    updateCard(cards.srv, {
      label: 'SRV',
      value: snapshot.srv,
      delta: snapshot.delta15m ? snapshot.delta15m.srv : 0,
    });
    updateConfidence(section, snapshot.confidence);
  }

  return { element: section, update };
}

export default createDualGauge;
