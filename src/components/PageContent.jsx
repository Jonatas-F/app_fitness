import PageHeader from "./PageHeader";
import HeroSection from "./HeroSection";
import MetricsGrid from "./MetricsGrid";
import FeatureCardsGrid from "./FeatureCardsGrid";
import BottomSectionsGrid from "./BottomSectionsGrid";

function PageContent({ currentPage }) {
  return (
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

      <FeatureCardsGrid cards={currentPage.cards} />

      <BottomSectionsGrid sections={currentPage.bottomSections} />
    </div>
  );
}

export default PageContent;