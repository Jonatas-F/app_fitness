import InfoCard from "./InfoCard";

function BottomSectionsGrid({ sections = [] }) {
  return (
    <section className="grid grid-2 mt-24">
      {sections.map((section) => (
        <InfoCard
          key={section.title}
          title={section.title}
          subtitle={section.subtitle}
          badge={section.badge}
          badgeClass={section.badgeClass}
          items={section.items}
        />
      ))}
    </section>
  );
}

export default BottomSectionsGrid;