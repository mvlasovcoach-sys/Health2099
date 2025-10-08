'use client';

import { badgeRules, selectors, useDashboard } from '@/stores/dashboard';

const CHIP_ITEMS = [
  { key: 'alcohol_yday', label: 'Alcohol (yesterday)' },
  { key: 'symptoms', label: 'Illness symptoms' },
  { key: 'energy_adj', label: 'Energy adj.' },
  { key: 'late_meal', label: 'Late meal' },
] as const;

type ChipKey = (typeof CHIP_ITEMS)[number]['key'];

type ChipValue = number | boolean | null | undefined;

function formatChipValue(key: ChipKey, value: ChipValue) {
  if (key === 'energy_adj') {
    if (!Number.isFinite(value as number)) return '0';
    const rounded = Math.round(Number(value));
    const prefix = rounded > 0 ? '+' : '';
    return `${prefix}${rounded}`;
  }
  if (value == null) return '—';
  return value ? 'Yes' : 'No';
}

export function FactsRow() {
  const facts = useDashboard(selectors.facts);

  const sleepHours = Number.isFinite(facts.sleep_h) ? Number(facts.sleep_h) : null;
  const sleepValue = sleepHours == null ? '—' : `${sleepHours.toFixed(1)} h`;
  const sleepBadge = badgeRules.sleep(sleepHours);

  return (
    <section className="card facts-row">
      <div className="facts-row__primary">
        <article className="facts-row__sleep">
          <h3>Sleep</h3>
          <p className="facts-row__sleep-value" data-sleep-value>
            {sleepValue}
          </p>
          <span className="badge" data-sleep-badge>
            {sleepBadge}
          </span>
        </article>
        <div className="facts-row__chips" data-chips>
          {CHIP_ITEMS.map((item) => (
            <span className="chip" data-key={item.key} key={item.key}>
              <span className="chip__label">{item.label}</span>
              <span className="chip__value" data-value>
                {formatChipValue(item.key, facts[item.key])}
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FactsRow;
