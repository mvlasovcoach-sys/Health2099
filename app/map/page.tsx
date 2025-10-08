export const metadata = {
  title: 'Map • Health 2099',
};

export default function MapPage() {
  return (
    <div className="container flow">
      <header className="page-header">
        <div className="page-header__content">
          <span className="page-header__eyebrow">Exploration</span>
          <h1>Map</h1>
          <p>Interactive maps are temporarily offline while the legacy UI is restored.</p>
        </div>
      </header>
      <section className="card">
        <h2>Map unavailable</h2>
        <p>
          Navigation features will be re-enabled after the primary dashboard and cabinet are
          stabilised.
        </p>
      </section>
    </div>
  );
}
