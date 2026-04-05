function FeatureCardsGrid({ cards = [] }) {
  return (
    <section className="grid grid-3 mt-24">
      {cards.map((card) => (
        <article key={card.title} className="glass-card card-padding">
          <div className="card-header">
            <div>
              <h3 className="card-title">{card.title}</h3>
              <p className="card-subtitle">{card.subtitle}</p>
            </div>
            <span className="badge badge-primary">{card.badge}</span>
          </div>

          <div className="data-list">
            {card.items.map((item) => (
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

export default FeatureCardsGrid;