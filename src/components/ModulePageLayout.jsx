import './ModulePageLayout.css';

function ListCard({ title, description, items }) {
  return (
    <article className="module-card glass-panel">
      <h3 className="module-card__title">{title}</h3>

      {description ? (
        <p className="module-card__description">{description}</p>
      ) : null}

      <ul className="module-card__list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

export default function ModulePageLayout({
  title,
  subtitle,
  badge,
  stats = [],
  primaryCard,
  secondaryCards = [],
  asideTitle,
  asideItems = [],
  footerNote,
}) {
  return (
    <section className="module-page">
      <header className="module-page__hero glass-panel">
        <div>
          <span className="module-page__badge">{badge}</span>
          <h1 className="module-page__title">{title}</h1>
          <p className="module-page__subtitle">{subtitle}</p>
        </div>
      </header>

      <section className="module-page__stats">
        {stats.map((stat) => (
          <article key={stat.label} className="module-stat glass-panel">
            <span className="module-stat__label">{stat.label}</span>
            <strong className="module-stat__value">{stat.value}</strong>
            <span className="module-stat__helper">{stat.helper}</span>
          </article>
        ))}
      </section>

      <section className="module-page__content">
        <div className="module-page__main">
          <article className="module-card module-card--primary glass-panel">
            <h2 className="module-card__title">{primaryCard.title}</h2>
            <p className="module-card__description">
              {primaryCard.description}
            </p>

            <ul className="module-card__list">
              {primaryCard.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <div className="module-page__secondary">
            {secondaryCards.map((card) => (
              <ListCard
                key={card.title}
                title={card.title}
                description={card.description}
                items={card.items}
              />
            ))}
          </div>
        </div>

        <aside className="module-card module-card--aside glass-panel">
          <h3 className="module-card__title">{asideTitle}</h3>

          <ul className="module-card__list">
            {asideItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      {footerNote ? (
        <p className="module-page__footer-note">{footerNote}</p>
      ) : null}
    </section>
  );
}