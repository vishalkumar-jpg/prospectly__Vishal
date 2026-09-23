import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import WebsiteFooter from "@/components/WebsiteFooter";
import { PageStructuredData } from "@/components/StructuredData";
import { CommunityPledgeHero } from "@/components/community-pledge/Hero";
import { CommunityPledgeValuesGrid } from "@/components/community-pledge/ValuesGrid";
import { CommunityPledgeEtiquetteGrid } from "@/components/community-pledge/EtiquetteGrid";
import { CommunityPledgeReferralsSection } from "@/components/community-pledge/ReferralsSection";
import { CommunityPledgeGrid } from "@/components/community-pledge/PledgeGrid";

const CommunityPledge = () => {
  return (
    <div className="min-h-screen bg-home-bg text-home-fg">
      <SEO
        title="Community Pledge — Trust, Respect, Growth | Prospectly"
        description="Our commitment to building trust, respect, and meaningful connections in the Prospectly community through warm introductions and professional networking."
        canonical="/community-pledge"
      />
      <PageStructuredData
        page="community-pledge"
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Community Pledge", path: "/community-pledge" },
        ]}
      />
      <Navigation marketingSurface />
      <main id="main-content">
        <CommunityPledgeHero />
        <CommunityPledgeValuesGrid />
        <CommunityPledgeEtiquetteGrid />
        <CommunityPledgeReferralsSection />
        <CommunityPledgeGrid />
      </main>
      <WebsiteFooter />
    </div>
  );
};

export default CommunityPledge;
