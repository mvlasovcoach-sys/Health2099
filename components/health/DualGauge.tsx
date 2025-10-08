'use client';

import { CSSProperties, useMemo } from 'react';
import { selectors, useDashboard } from '@/stores/dashboard';

const ZONES: Array<{ max: number; className: string }> = [
  { max: 39, className: 'danger' },
  { max: 59, className: 'warning' },
  { max: 79, className: 'success' },
  { max: 100, className: 'primary' },
];

function resolveZone(value: number) {
  return ZONES.find((zone) => value <= zone.max) ?? ZONES[ZONES.length - 1];
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDelta(value: number) {
  if (!Number.isFinite(value) || value === 0) return '0';
  const rounded = Math.round(value);
  const prefix = rounded > 0 ? '+' : '';
  return `${prefix}${rounded}`;
}

function gaugeStyle(value: number): CSSProperties {
  return {
    ['--progress' as '--progress']: clampPercent(value),
  } as CSSProperties;
}

const CONFIDENCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  auto: 'Auto',
  timeout: 'Timeout',
};

export function DualGauge() {
  const gauges = useDashboard(selectors.gauges);

  const cards = useMemo(
    () => [
      {
        key: 'energy' as const,
        label: 'Energy',
        value: gauges.energy,
        delta: gauges.delta15m?.energy ?? 0,
      },
      {
        key: 'srv' as const,
        label: 'SRV',
        value: gauges.srv,
        delta: gauges.delta15m?.srv ?? 0,
      },
    ],
    [gauges.delta15m?.energy, gauges.delta15m?.srv, gauges.energy, gauges.srv],
  );

  const confidence = (gauges.confidence ?? 'manual').toString().toLowerCase();
  const confidenceLabel = CONFIDENCE_LABELS[confidence] ?? CONFIDENCE_LABELS.manual;

  return (
    <section className="card dual-gauge">
      <div className="dual-gauge__cards">
        {cards.map((card) => {
          const value = clampPercent(card.value ?? 0);
          const zone = resolveZone(value);
          const delta = formatDelta(card.delta ?? 0);
          return (
            <div className="dual-gauge__card" data-kind={card.key} key={card.key}>
              <div
                className="dual-gauge__ring"
                data-zone={zone.className}
                aria-hidden="true"
                style={gaugeStyle(value)}
              >
                <span className="dual-gauge__value" data-value>
                  {Number.isFinite(card.value) ? Math.round(card.value ?? 0) : '—'}
                </span>
              </div>
              <div className="dual-gauge__content">
                <span className="dual-gauge__label" data-label>
                  {card.label}
                </span>
                <span className="dual-gauge__delta" data-delta data-caption>
                  Δ 15m · {delta}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <footer className="dual-gauge__footer">
        <span className="badge" data-confidence data-mode={confidence}>
          ●●● {confidenceLabel}
        </span>
      </footer>
    </section>
  );
}

export default DualGauge;
