import { SharedStorage } from './sharedStorage.js';
import { formatDateRange } from './utils.js';

const HEADER_ID = 'summary-header';

export function initHeader() {
  const container = document.getElementById(HEADER_ID);
  if (!container) return;

  function render() {
    const settings = SharedStorage.getSettings();
    const now = new Date();
    const dateLabel = formatDateRange(now);
    const city = settings.city ? ` · ${settings.city}` : '';
    const battery = settings.deviceBattery ?? 0;
    const lastPing = settings.lastDevicePing ? new Date(settings.lastDevicePing) : null;
    const status = computeDeviceStatus(lastPing);
    container.innerHTML = `
      <div class="summary-header__inner">
        <div class="summary-header__meta">
          <span class="snapshot-pill">Wellness snapshot — <strong>${dateLabel}</strong>${city}</span>
          <span class="snapshot-pill">Battery <strong>${battery}%</strong></span>
        </div>
        <div class="summary-header__status">
          <div class="device-status" data-state="${status.color}">
            <span aria-hidden="true">${status.icon}</span>
            <span>${status.label}</span>
          </div>
        </div>
      </div>
    `;
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
