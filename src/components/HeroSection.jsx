function HeroSection({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
}) {
  return (
    <section className="hero-card">
      <span className="eyebrow">{eyebrow}</span>

      <h2 className="hero-title">{title}</h2>

      <p className="hero-description">{description}</p>

      <div className="hero-actions">
        <button className="primary-button" type="button">
          {primaryAction}
        </button>
        <button className="ghost-button" type="button">
          {secondaryAction}
        </button>
      </div>
    </section>
  );
}

export default HeroSection;