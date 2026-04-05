import InfoCard from "./InfoCard";

function FeatureCardsGrid({ cards = [] }) {
  return (
    <section className="grid grid-3 mt-24">
      {cards.map((card) => (
        <InfoCard
          key={card.title}
          title={card.title}
          subtitle={card.subtitle}
          badge={card.badge}
          badgeClass="badge-primary"
          items={card.items}
        />
      ))}
    </section>
  );
}

export default FeatureCardsGrid;