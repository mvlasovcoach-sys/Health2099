'use client';

import { CSSProperties } from 'react';
import { badgeRules, selectors, useDashboard } from '@/stores/dashboard';

const RING_ITEMS = [
  { key: 'stress', title: 'Stress' },
  { key: 'burnout', title: 'Burnout' },
  { key: 'fatigue', title: 'Fatigue' },
] as const;

function ringStyle(value: number): CSSProperties {
  return {
    ['--progress' as '--progress']: Math.max(0, Math.min(100, Math.round(value ?? 0))),
  } as CSSProperties;
}

export function RingRow() {
  const rings = useDashboard(selectors.rings);

  return (
    <section className="card ring-row">
      <div className="ring-row__rings">
        {RING_ITEMS.map((item) => {
          const value = Number.isFinite(rings[item.key]) ? Math.round(rings[item.key] ?? 0) : null;
          return (
            <article className="ring-row__card" data-key={item.key} key={item.key}>
              <div className="ring" aria-hidden="true" style={ringStyle(value ?? 0)} />
              <div className="ring__content">
                <span className="ring__label">{item.title}</span>
                <span className="ring__value" data-value>
                  {value == null ? '—' : `${value}%`}
                </span>
              </div>
            </article>
          );
        })}
      </div>
      <article className="ring-row__card ring-row__card--heart">
        <div className="ring__content">
          <span className="ring__label">Heart age</span>
          <span className="ring__value" data-heart-value>
            {Number.isFinite(rings.heartAge?.value) ? Math.round(rings.heartAge.value) : '—'}
          </span>
          <span className="badge" data-heart-badge>
            {rings.heartAge?.badge ||
              (Number.isFinite(rings.heartAge?.value)
                ? badgeRules.cardio(Math.round(rings.heartAge.value))
                : '—')}
          </span>
        </div>
      </article>
    </section>
  );
}

export default RingRow;
