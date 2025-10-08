'use client';

import { selectors, useDashboard, badgeRules } from '@/stores/dashboard';

const KPI_LABELS = [
  { key: 'wellbeing7', title: 'Wellbeing score (week)' },
  { key: 'cardio', title: 'Cardio-vascular' },
  { key: 'risk', title: 'Risk of pathology' },
  { key: 'arrhythmia', title: 'Arrhythmias' },
] as const;

type KpiKey = (typeof KPI_LABELS)[number]['key'];

type BadgeResolver = (value: number) => string;

const FALLBACK_BADGES: Record<KpiKey, BadgeResolver> = {
  wellbeing7: badgeRules.wellbeing,
  cardio: badgeRules.cardio,
  risk: badgeRules.risk,
  arrhythmia: badgeRules.arrhythmia,
};

export function KpiGrid() {
  const kpi = useDashboard(selectors.kpi);

  return (
    <section className="card kpi-grid">
      <div className="kpi-grid__items">
        {KPI_LABELS.map((item) => {
          const entry = kpi[item.key];
          const value = Number.isFinite(entry?.value) ? Math.round(entry?.value ?? 0) : null;
          const badge = entry?.badge || FALLBACK_BADGES[item.key](value ?? 0);
          return (
            <article className="kpi-grid__card" data-key={item.key} key={item.key}>
              <header className="kpi-grid__header">
                <h3>{item.title}</h3>
                <span className="badge" data-badge>
                  {badge}
                </span>
              </header>
              <p className="kpi-grid__value" data-value>
                {value == null ? '—' : value}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default KpiGrid;
