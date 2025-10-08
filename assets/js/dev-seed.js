import { SharedStorage } from './sharedStorage.js';

export function initDevSeed() {
  const button = document.getElementById('seed-demo');
  if (!button) return;
  button.addEventListener('click', () => {
    const days = 7;
    const entries = [];
    const now = new Date();
    for (let d = 0; d < days; d += 1) {
      const dayDate = new Date(now.getTime() - d * 86400000);
      ['water', 'steps', 'sleep', 'caffeine', 'meds'].forEach((type) => {
        const count = type === 'meds' ? 1 : 2;
        for (let i = 0; i < count; i += 1) {
          const timestamp = new Date(dayDate);
          timestamp.setHours(8 + i * 4, Math.floor(Math.random() * 60), 0, 0);
          entries.push({ type, value: valueForType(type), createdAt: timestamp.toISOString(), note: noteForType(type) });
        }
      });
    }
    entries.forEach((entry) => {
      SharedStorage.pushLog(entry.type, entry.value, { createdAt: entry.createdAt, note: entry.note });
    });
    SharedStorage.setSettings({
      city: 'Amsterdam',
      deviceBattery: 82,
      lastDevicePing: new Date().toISOString(),
    });
  });
}

function valueForType(type) {
  switch (type) {
    case 'water':
      return 250 + Math.floor(Math.random() * 400);
    case 'steps':
      return 2000 + Math.floor(Math.random() * 4000);
    case 'sleep':
      return 360 + Math.floor(Math.random() * 120);
    case 'caffeine':
      return 80 + Math.floor(Math.random() * 60);
    case 'meds':
      return 1;
    default:
      return 0;
  }
}

function noteForType(type) {
  switch (type) {
    case 'meds':
      return 'Daily med';
    case 'water':
      return 'Hydration';
    case 'steps':
      return 'Move';
    case 'sleep':
      return 'Rest';
    case 'caffeine':
      return 'Coffee';
    default:
      return '';
  }
}
