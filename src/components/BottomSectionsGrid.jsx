function BottomSectionsGrid({ sections = [] }) {
  return (
    <section className="grid grid-2 mt-24">
      {sections.map((section) => (
        <article key={section.title} className="glass-card card-padding">
          <div className="card-header">
            <div>
              <h3 className="card-title">{section.title}</h3>
              <p className="card-subtitle">{section.subtitle}</p>
            </div>
            <span className={`badge ${section.badgeClass}`}>{section.badge}</span>
          </div>

          <div className="data-list">
            {section.items.map((item) => (
              <div key={item} className="data-row">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

export default BottomSectionsGrid;