import { useState } from "react";
import Sidebar from "./components/Sidebar";
import { navItems, pageContent } from "./data/appData";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const currentPage = pageContent[activePage];

  return (
    <div className="app-shell">
      <Sidebar
        navItems={navItems}
        activePage={activePage}
        onChangePage={setActivePage}
      />

      <main className="page-content">
        <div className="page-container">
          <header className="topbar">
            <div className="brand">
              <div className="brand-text">
                <h1>{currentPage.title}</h1>
                <span>{currentPage.subtitle}</span>
              </div>
            </div>

            <div className="hero-actions">
              <button className="secondary-button" type="button">
                {currentPage.secondaryAction}
              </button>
              <button className="primary-button" type="button">
                {currentPage.primaryAction}
              </button>
            </div>
          </header>

          <section className="hero-card">
            <span className="eyebrow">{currentPage.heroEyebrow}</span>

            <h2 className="hero-title">{currentPage.heroTitle}</h2>

            <p className="hero-description">{currentPage.heroDescription}</p>

            <div className="hero-actions">
              <button className="primary-button" type="button">
                {currentPage.primaryAction}
              </button>
              <button className="ghost-button" type="button">
                {currentPage.secondaryAction}
              </button>
            </div>
          </section>

          <section className="grid grid-4 mt-24">
            {currentPage.metrics.map((metric) => (
              <div key={metric.label} className="metric-card">
                <p className="metric-label">{metric.label}</p>
                <h3 className="metric-value">{metric.value}</h3>
                <p className="metric-trend">{metric.trend}</p>
              </div>
            ))}
          </section>

          <section className="grid grid-3 mt-24">
            {currentPage.cards.map((card) => (
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

          <section className="grid grid-2 mt-24">
            {currentPage.bottomSections.map((section) => (
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
        </div>

        <nav className="bottom-nav">
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.label}
              className={`nav-item ${activePage === item.label ? "active" : ""}`}
              type="button"
              onClick={() => setActivePage(item.label)}
            >
              <span className="nav-icon">{item.short}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}

export default App;