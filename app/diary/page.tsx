export const metadata = {
  title: 'Diary • Health 2099',
};

export default function DiaryPage() {
  return (
    <div className="container flow">
      <header className="page-header">
        <div className="page-header__content">
          <span className="page-header__eyebrow">Journal</span>
          <h1>Diary</h1>
          <p>Daily entries will return once the migration is complete.</p>
        </div>
      </header>
      <section className="card">
        <h2>Diary data is not yet connected</h2>
        <p>
          While the new interface is restored you can explore the Health cabinet for real-time
          metrics and diagnostics.
        </p>
      </section>
    </div>
  );
}
