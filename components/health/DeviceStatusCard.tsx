'use client';

import { selectors, useDashboard } from '@/stores/dashboard';

const INPUT_LABELS: Record<string, string> = {
  manual: 'Manual',
  auto: 'Auto',
  timeout: 'Timeout',
};

function formatBattery(value: number) {
  if (!Number.isFinite(value)) return '—';
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export function DeviceStatusCard() {
  const device = useDashboard(selectors.device);
  const onlineLabel = device.online
    ? 'Online'
    : (() => {
        const minutes = Number.isFinite(device.offline_min)
          ? Math.max(1, Math.round(device.offline_min))
          : 0;
        return minutes ? `Offline ${minutes}+ min` : 'Offline';
      })();
  const mode = typeof device.input === 'string' ? device.input.toLowerCase() : 'manual';
  const inputLabel = INPUT_LABELS[mode] || INPUT_LABELS.manual;

  return (
    <section className="card device-status">
      <header className="device-status__header">
        <h2>Device status</h2>
      </header>
      <div className="device-status__badges">
        <span className="badge" data-online data-status={device.online ? 'online' : 'offline'}>
          {onlineLabel}
        </span>
        <span className="badge" data-battery>
          Battery: {formatBattery(device.battery)}
        </span>
        <span className="badge" data-input data-mode={mode}>
          ●○○ {inputLabel}
        </span>
      </div>
    </section>
  );
}

export default DeviceStatusCard;
