import { useState } from "react";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import PageHeader from "./components/PageHeader";
import HeroSection from "./components/HeroSection";
import MetricsGrid from "./components/MetricsGrid";
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
          <PageHeader
            title={currentPage.title}
            subtitle={currentPage.subtitle}
            primaryAction={currentPage.primaryAction}
            secondaryAction={currentPage.secondaryAction}
          />

          <HeroSection
            eyebrow={currentPage.heroEyebrow}
            title={currentPage.heroTitle}
            description={currentPage.heroDescription}
            primaryAction={currentPage.primaryAction}
            secondaryAction={currentPage.secondaryAction}
          />

          <MetricsGrid metrics={currentPage.metrics} />

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

        <BottomNav
          navItems={navItems}
          activePage={activePage}
          onChangePage={setActivePage}
        />
      </main>
    </div>
  );
}

export default App;