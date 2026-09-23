import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import WebsiteFooter from "@/components/WebsiteFooter";
import { PageStructuredData } from "@/components/StructuredData";
import { ConfidentialityHero } from "@/components/confidentiality/Hero";
import { ConfidentialityPrinciplesGrid } from "@/components/confidentiality/PrinciplesGrid";
import { ConfidentialityDataCategories } from "@/components/confidentiality/DataCategories";
import { ConfidentialityUserRightsGrid } from "@/components/confidentiality/UserRightsGrid";
import { ConfidentialityCommitmentsPanel } from "@/components/confidentiality/CommitmentsPanel";

const Confidentiality = () => {
  return (
    <div className="min-h-screen bg-home-bg text-home-fg">
      <SEO
        title="Confidentiality — Your Privacy Protected | Prospectly"
        description="Industry-leading privacy controls and transparent data practices — you own your information and decide exactly what to share."
        canonical="/confidentiality"
      />
      <PageStructuredData
        page="confidentiality"
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Confidentiality", path: "/confidentiality" },
        ]}
      />
      <Navigation marketingSurface />
      <main id="main-content">
        <ConfidentialityHero />
        <ConfidentialityPrinciplesGrid />
        <ConfidentialityDataCategories />
        <ConfidentialityUserRightsGrid />
        <ConfidentialityCommitmentsPanel />
      </main>
      <WebsiteFooter />
    </div>
  );
};

export default Confidentiality;
