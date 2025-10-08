const INPUT_LABELS = {
  manual: 'Manual',
  auto: 'Auto',
};

function formatBattery(value) {
  if (!Number.isFinite(value)) return '—';
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export function createDeviceStatus() {
  const section = document.createElement('section');
  section.className = 'card device-status';
  section.innerHTML = `
    <header class="device-status__header">
      <h2>Device status</h2>
    </header>
    <div class="device-status__badges">
      <span class="badge" data-online>Online</span>
      <span class="badge" data-battery>Battery</span>
      <span class="badge" data-input>●○○ Manual</span>
    </div>
  `;

  function update(snapshot) {
    if (!snapshot) return;
    const online = section.querySelector('[data-online]');
    const battery = section.querySelector('[data-battery]');
    const input = section.querySelector('[data-input]');

    if (online) {
      if (snapshot.online) {
        online.textContent = 'Online';
        online.dataset.status = 'online';
      } else {
        const minutes = Number.isFinite(snapshot.offline_min) ? Math.max(1, Math.round(snapshot.offline_min)) : 0;
        online.textContent = minutes ? `Offline ${minutes}+ min` : 'Offline';
        online.dataset.status = 'offline';
      }
    }

    if (battery) {
      battery.textContent = `Battery: ${formatBattery(snapshot.battery)}`;
    }

    if (input) {
      const label = INPUT_LABELS[snapshot.input] || 'Manual';
      input.textContent = `●○○ ${label}`;
      input.dataset.mode = snapshot.input || 'manual';
    }
  }

  return { element: section, update };
}

export default createDeviceStatus;
