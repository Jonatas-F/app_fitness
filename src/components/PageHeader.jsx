function PageHeader({ title, subtitle, primaryAction, secondaryAction }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-text">
          <h1>{title}</h1>
          <span>{subtitle}</span>
        </div>
      </div>

      <div className="hero-actions">
        <button className="secondary-button" type="button">
          {secondaryAction}
        </button>
        <button className="primary-button" type="button">
          {primaryAction}
        </button>
      </div>
    </header>
  );
}

export default PageHeader;