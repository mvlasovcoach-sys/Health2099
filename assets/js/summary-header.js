import { SharedStorage } from './sharedStorage.js';
import { formatDateRange } from './utils.js';

const HEADER_ID = 'summary-header';

export function initHeader() {
  const container = document.getElementById(HEADER_ID);
  if (!container) return;

  function ensureStructure() {
    if (container.dataset.ready) return;
    container.innerHTML = `
      <div class="summary-header__inner">
        <div class="summary-header__row">
          <div class="summary-header__meta">
            <span class="snapshot-pill">
              Wellness snapshot —
              <strong data-date>—</strong><span data-city></span>
            </span>
            <span class="snapshot-pill">Battery <strong data-battery>—%</strong></span>
          </div>
          <div class="summary-header__status">
            <div class="device-status" data-device-status data-state="green">
              <span aria-hidden="true" data-device-icon>🟢</span>
              <span data-device-label>Device status · Fresh</span>
            </div>
          </div>
        </div>
        <section class="hero-kpi" id="hero-kpi" aria-labelledby="hero-kpi-title">
          <header class="hero-kpi__header">
            <div>
              <h1 id="hero-kpi-title">Wellness pace</h1>
              <p class="hero-kpi__subtitle" id="hero-kpi-caption">Range —</p>
            </div>
            <div class="hero-kpi__filters" role="group" aria-label="Range selector">
              <button type="button" class="hero-kpi__filter is-active" data-range="today" aria-pressed="true">Today</button>
              <button type="button" class="hero-kpi__filter" data-range="7d" aria-pressed="false">7&nbsp;days</button>
              <button type="button" class="hero-kpi__filter" data-range="30d" aria-pressed="false">30&nbsp;days</button>
            </div>
          </header>
          <div class="hero-kpi__body">
            <div class="hero-kpi__score">
              <span class="hero-kpi__label">Goal completion</span>
              <span class="hero-kpi__value" id="hero-kpi-score">0%</span>
              <span class="hero-kpi__delta" id="hero-kpi-delta" data-trend="flat">Awaiting data</span>
            </div>
            <ul class="hero-kpi__list" id="hero-kpi-list"></ul>
          </div>
        </section>
      </div>
    `;
    container.dataset.ready = 'true';
  }

  function render() {
    ensureStructure();
    const settings = SharedStorage.getSettings();
    const now = new Date();
    const dateLabel = formatDateRange(now);
    const city = settings.city ? ` · ${settings.city}` : '';
    const battery = settings.batteryPct;
    const lastPing = settings.lastDevicePingISO ? new Date(settings.lastDevicePingISO) : null;
    const status = computeDeviceStatus(lastPing);

    const dateEl = container.querySelector('[data-date]');
    const cityEl = container.querySelector('[data-city]');
    const batteryEl = container.querySelector('[data-battery]');
    const statusEl = container.querySelector('[data-device-status]');
    const statusIconEl = container.querySelector('[data-device-icon]');
    const statusLabelEl = container.querySelector('[data-device-label]');

    if (dateEl) dateEl.textContent = dateLabel;
    if (cityEl) cityEl.textContent = city;
    if (batteryEl) batteryEl.textContent = Number.isFinite(battery) ? `${battery}%` : '—';
    if (statusEl) statusEl.dataset.state = status.color;
    if (statusIconEl) statusIconEl.textContent = status.icon;
    if (statusLabelEl) statusLabelEl.textContent = status.label;
  }

  render();
  SharedStorage.onChange((payload) => {
    if (!payload || payload.target === 'logs' || payload.target === 'settings') {
      render();
    }
  });
}

function computeDeviceStatus(lastPing) {
  if (!lastPing) {
    return { color: 'red', label: 'Device offline', icon: '⚠️' };
  }
  const diffMinutes = Math.floor((Date.now() - lastPing.getTime()) / 60000);
  if (diffMinutes <= 5) {
    return { color: 'green', label: 'Device status · Fresh', icon: '🟢' };
  }
  if (diffMinutes <= 10) {
    return { color: 'yellow', label: 'Device status · Slight delay', icon: '🟡' };
  }
  return { color: 'red', label: 'Device status · Needs sync', icon: '🔴' };
}
