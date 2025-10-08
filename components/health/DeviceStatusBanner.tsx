'use client';

import { useMemo } from 'react';
import { selectors, useDashboard } from '@/stores/dashboard';

export function DeviceStatusBanner() {
  const device = useDashboard(selectors.device);
  const text = useMemo(() => {
    const parts: string[] = [];
    if (device.online) {
      parts.push('Device: Online');
    } else {
      const minutes = Number.isFinite(device.offline_min) ? Math.max(1, Math.round(device.offline_min)) : 0;
      parts.push(minutes ? `Device: Offline ${minutes}+ min` : 'Device: Offline');
    }
    if (Number.isFinite(device.battery)) {
      const percent = Math.max(0, Math.min(100, Math.round(device.battery)));
      parts.push(`Battery ${percent}%`);
    }
    const mode = typeof device.input === 'string' ? device.input.toLowerCase() : 'manual';
    const label =
      mode === 'auto' ? '●●● auto' : mode === 'timeout' ? '●○● timeout' : '●○○ manual';
    parts.push(label);
    return parts.join(' · ');
  }, [device.battery, device.input, device.offline_min, device.online]);
  return (
    <span className="badge page-header__badge" data-device-status>
      {text}
    </span>
  );
}

export default DeviceStatusBanner;
