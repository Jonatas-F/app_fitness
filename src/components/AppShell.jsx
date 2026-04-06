import { useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import PageHeader from "./PageHeader";
import HeroSection from "./HeroSection";
import MetricsGrid from "./MetricsGrid";
import FeatureCardsGrid from "./FeatureCardsGrid";
import BottomSectionsGrid from "./BottomSectionsGrid";
import ProfileSetupPage from "../pages/profile/ProfileSetupPage";
import AccountPage from "../pages/account/AccountPage";
import { navItems, pageContent } from "../data/appData";
import {
  getDashboardMetricsFromProfile,
  getProgressMetricsFromProfile,
} from "../data/profileDerivedData";

function AppShell() {
  const [activePage, setActivePage] = useState("Dashboard");

  const currentPage = pageContent[activePage];
  const isProfilePage = activePage === "Perfil";
  const isAccountPage = activePage === "Conta";

  const resolvedMetrics = useMemo(() => {
    if (activePage === "Dashboard") {
      return getDashboardMetricsFromProfile();
    }

    if (activePage === "Progresso") {
      return getProgressMetricsFromProfile();
    }

    return currentPage.metrics;
  }, [activePage, currentPage.metrics]);

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
          ) : isAccountPage ? (
            <AccountPage />
          ) : (
            <>
              <HeroSection
                eyebrow={currentPage.heroEyebrow}
                title={currentPage.heroTitle}
                description={currentPage.heroDescription}
                primaryAction={currentPage.primaryAction}
                secondaryAction={currentPage.secondaryAction}
              />

              <MetricsGrid metrics={resolvedMetrics} />

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

export default AppShell;