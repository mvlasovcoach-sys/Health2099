import DiagnosticsPanel from '@/components/diagnostics/DiagnosticsPanel';

export const metadata = {
  title: 'Diagnostics • Health 2099',
};

export default function DiagnosticsPage() {
  return (
    <div className="container flow">
      <header className="page-header">
        <div className="page-header__content">
          <span className="page-header__eyebrow">System</span>
          <h1>Diagnostics</h1>
          <p>Route manifest, build metadata, and CSS visibility for quick debugging.</p>
        </div>
      </header>
      <DiagnosticsPanel />
    </div>
  );
}
