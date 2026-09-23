import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import WebsiteFooter from "@/components/WebsiteFooter";
import { PageStructuredData } from "@/components/StructuredData";
import { HowItWorksHero } from "@/components/how-it-works/Hero";
import { HowItWorksThreeSteps } from "@/components/how-it-works/ThreeSteps";
import { HowItWorksRequesterConnector } from "@/components/how-it-works/RequesterConnector";
import { HowItWorksResultsStats } from "@/components/how-it-works/ResultsStats";

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-home-bg text-home-fg">
      <SEO
        title="How It Works — AI-Powered Warm Introductions | Prospectly"
        description="See how Prospectly transforms cold prospects into warm connections — three steps from sign-up to your first introduction, plus our peer-to-peer referral payout marketplace."
        canonical="/how-it-works"
      />
      <PageStructuredData
        page="how-it-works"
        crumbs={[
          { name: "Home", path: "/" },
          { name: "How It Works", path: "/how-it-works" },
        ]}
      />
      <Navigation marketingSurface />
      <main id="main-content">
        <HowItWorksHero />
        <HowItWorksThreeSteps />
        <HowItWorksRequesterConnector />
        <HowItWorksResultsStats />
      </main>
      <WebsiteFooter />
    </div>
  );
};

export default HowItWorks;
