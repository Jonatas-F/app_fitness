import { useState } from "react";
import "./index.css";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import PageHeader from "./components/PageHeader";
import HeroSection from "./components/HeroSection";
import MetricsGrid from "./components/MetricsGrid";
import FeatureCardsGrid from "./components/FeatureCardsGrid";
import BottomSectionsGrid from "./components/BottomSectionsGrid";
import { navItems, pageContent } from "./data/appData";

function ProfilePlaceholder() {
  return (
    <section className="glass-card card-padding mt-24">
      <div className="card-header">
        <div>
          <h3 className="card-title">Página de Perfil temporária</h3>
          <p className="card-subtitle">
            A importação da página grande foi isolada para testar se ela está
            quebrando o layout global.
          </p>
        </div>
        <span className="badge badge-warning">Teste</span>
      </div>

      <div className="data-list">
        <div className="data-row">
          <span>Objetivo</span>
          <strong>Validar a base visual</strong>
        </div>
        <div className="data-row">
          <span>Status</span>
          <strong>Placeholder ativo</strong>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const currentPage = pageContent[activePage];
  const isProfilePage = activePage === "Perfil";

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

          {isProfilePage ? (
            <ProfilePlaceholder />
          ) : (
            <>
              <HeroSection
                eyebrow={currentPage.heroEyebrow}
                title={currentPage.heroTitle}
                description={currentPage.heroDescription}
                primaryAction={currentPage.primaryAction}
                secondaryAction={currentPage.secondaryAction}
              />

              <MetricsGrid metrics={currentPage.metrics} />

              <FeatureCardsGrid cards={currentPage.cards} />

              <BottomSectionsGrid sections={currentPage.bottomSections} />
            </>
          )}
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