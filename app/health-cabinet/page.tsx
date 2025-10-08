import DeviceStatusBanner from '@/components/health/DeviceStatusBanner';
import DeviceStatusCard from '@/components/health/DeviceStatusCard';
import DualGauge from '@/components/health/DualGauge';
import FactsRow from '@/components/health/FactsRow';
import KpiGrid from '@/components/health/KpiGrid';
import NotesCard from '@/components/health/NotesCard';
import RingRow from '@/components/health/RingRow';
import VersionBadge from '@/components/version/VersionBadge';

export const metadata = {
  title: 'Health cabinet • Health 2099',
};

export default function HealthCabinetPage() {
  return (
    <div className="container flow health-dashboard" data-health-dashboard>
      <header className="page-header health-dashboard__hero">
        <div className="page-header__content">
          <span className="page-header__eyebrow">Health cabinet</span>
          <h1>Health cabinet</h1>
          <p>Live snapshot of wellness metrics powered by personal diary data and wearables.</p>
        </div>
        <div className="page-header__meta">
          <DeviceStatusBanner />
          <VersionBadge variant="page" />
        </div>
      </header>

      <section className="health-dashboard__top" data-section="top">
        <DualGauge />
        <DeviceStatusCard />
      </section>

      <section className="health-dashboard__kpi" data-section="kpi">
        <KpiGrid />
      </section>

      <section className="health-dashboard__rings" data-section="rings">
        <RingRow />
      </section>

      <section className="health-dashboard__facts" data-section="facts">
        <FactsRow />
      </section>

      <section className="health-dashboard__notes" data-section="notes">
        <NotesCard />
      </section>

      <section className="card card--settings" data-section="settings">
        <h2>Cache controls</h2>
        <p>Clear offline data and fetch the newest build if something looks outdated.</p>
        <button type="button" className="button ghost" data-action="reset-cache" disabled>
          Reset cache
        </button>
      </section>
    </div>
  );
}
