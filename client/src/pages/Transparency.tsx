import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import WebsiteFooter from "@/components/WebsiteFooter";
import { PageStructuredData } from "@/components/StructuredData";
import { TransparencyHero } from "@/components/transparency/Hero";
import { TransparencyPillarsGrid } from "@/components/transparency/PillarsGrid";
import { TransparencyOpenPractices } from "@/components/transparency/OpenPractices";
import { TransparencyMetricsGrid } from "@/components/transparency/MetricsGrid";
import { TransparencyResourcesGrid } from "@/components/transparency/ResourcesGrid";
import { TransparencyPromisePanel } from "@/components/transparency/PromisePanel";

const Transparency = () => {
  return (
    <div className="min-h-screen bg-home-bg text-home-fg">
      <SEO
        title="Transparency — Open & Honest Practices | Prospectly"
        description="Prospectly publishes its policies, pricing, performance metrics, and decision-making openly so every member knows exactly where we stand."
        canonical="/transparency"
      />
      <PageStructuredData
        page="transparency"
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Transparency", path: "/transparency" },
        ]}
      />
      <Navigation marketingSurface />
      <main id="main-content">
        <TransparencyHero />
        <TransparencyPillarsGrid />
        <TransparencyOpenPractices />
        <TransparencyMetricsGrid />
        <TransparencyResourcesGrid />
        <TransparencyPromisePanel />
      </main>
      <WebsiteFooter />
    </div>
  );
};

export default Transparency;
