import { useState } from "react";
import "./index.css";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import PageHeader from "./components/PageHeader";
import HeroSection from "./components/HeroSection";
import MetricsGrid from "./components/MetricsGrid";
import FeatureCardsGrid from "./components/FeatureCardsGrid";
import BottomSectionsGrid from "./components/BottomSectionsGrid";
import ProfileSetupPage from "./pages/profile/ProfileSetupPage";
import { navItems, pageContent } from "./data/appData";

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
            <ProfileSetupPage />
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