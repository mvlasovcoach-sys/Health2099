export function formatDateRange(date) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  return formatter.format(date);
}

export function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function minutesToHours(minutes) {
  if (!minutes) return '0h';
  const hours = minutes / 60;
  return `${(Math.round(hours * 10) / 10).toFixed(1)}h`;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function percent(value, target) {
  if (!target) return 0;
  return clamp(Math.round((value / target) * 100), 0, 300);
}

export function statusFromRules(type, total, target, context = {}) {
  const pct = target ? percent(total, target) : 0;
  switch (type) {
    case 'hydration':
    case 'sleep':
    case 'steps': {
      if (!target) return 'neutral';
      if (pct >= 100) return 'on-track';
      if (pct >= 60) return 'warning';
      return 'danger';
    }
    case 'caffeine': {
      if (!target) return 'neutral';
      const ratio = target ? total / target : 0;
      if (ratio <= 0.8) return 'on-track';
      if (ratio <= 1) return 'warning';
      return 'danger';
    }
    case 'meds': {
      if (!context.totalScheduled) return 'neutral';
      return context.medsTaken >= context.totalScheduled ? 'on-track' : 'danger';
    }
    default:
      return 'neutral';
  }
}

export function badgeLabel(status) {
  switch (status) {
    case 'on-track':
      return 'On track';
    case 'warning':
      return 'Warning';
    case 'danger':
      return 'Missed';
    default:
      return 'In progress';
  }
}

export function iconForType(type) {
  switch (type) {
    case 'water':
      return '💧';
    case 'steps':
      return '👟';
    case 'sleep':
      return '🌙';
    case 'caffeine':
      return '☕';
    case 'med':
      return '💊';
    default:
      return '🧠';
  }
}

export function unitLabel(type) {
  switch (type) {
    case 'water':
      return 'ml';
    case 'steps':
      return 'steps';
    case 'sleep':
      return 'min';
    case 'caffeine':
      return 'mg';
    case 'med':
      return 'dose';
    default:
      return '';
  }
}

export function isoToDate(iso) {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function pluralize(value, unit) {
  if (value === 1) return `${value} ${unit}`;
  return `${value} ${unit}s`;
}

export function formatNumber(num, options = {}) {
  const formatter = new Intl.NumberFormat(undefined, options);
  return formatter.format(num || 0);
}
