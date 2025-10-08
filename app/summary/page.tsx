export const metadata = {
  title: 'Summary • Health 2099',
};

export default function SummaryPage() {
  return (
    <div className="container flow">
      <header className="page-header">
        <div className="page-header__content">
          <span className="page-header__eyebrow">Overview</span>
          <h1>Summary</h1>
          <p>High level overview of diary and wellness highlights.</p>
        </div>
      </header>
      <section className="card">
        <h2>Coming soon</h2>
        <p>The summary experience is being restored. Check back soon for diary highlights.</p>
      </section>
    </div>
  );
}
