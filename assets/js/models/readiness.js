import { clamp } from '../utils.js';

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function computeReadiness(input = {}) {
  const hours = toNumber(input.hours, 7);
  const hrv = toNumber(input.hrv, 60);
  const rhr = toNumber(input.rhr, 60);
  const alcohol = Boolean(input.alcohol);
  const lateMeal = Boolean(input.lateMeal);
  const malaise = Boolean(input.malaise);

  const energy = clamp(
    50 + (hours - 7) * 4 + clamp((hrv - 60) / 2, -10, 10) - clamp((rhr - 60) / 2, -10, 10)
      - (alcohol ? 5 : 0)
      - (lateMeal ? 3 : 0)
      - (malaise ? 10 : 0),
    0,
    100,
  );

  const srv = clamp(
    50 + clamp((hrv - 55) / 1.5, -15, 15) - clamp((rhr - 60) / 2, -10, 10)
      - (alcohol ? 5 : 0)
      - (lateMeal ? 2 : 0)
      - (malaise ? 8 : 0),
    0,
    100,
  );

  return { energy: Math.round(energy), srv: Math.round(srv) };
}
