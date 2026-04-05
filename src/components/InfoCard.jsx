function InfoCard({
  title,
  subtitle,
  badge,
  badgeClass = "badge-primary",
  items = [],
}) {
  return (
    <article className="glass-card card-padding">
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          <p className="card-subtitle">{subtitle}</p>
        </div>
        <span className={`badge ${badgeClass}`}>{badge}</span>
      </div>

      <div className="data-list">
        {items.map((item) => (
          <div key={item} className="data-row">
            <span>{item}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

export default InfoCard;