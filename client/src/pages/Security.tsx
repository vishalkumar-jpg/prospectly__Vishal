import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import WebsiteFooter from "@/components/WebsiteFooter";
import { PageStructuredData } from "@/components/StructuredData";
import { SecurityHero } from "@/components/security/Hero";
import { SecurityPillarsGrid } from "@/components/security/PillarsGrid";
import { SecurityCertificationsGrid } from "@/components/security/CertificationsGrid";
import { SecurityCommitmentPanel } from "@/components/security/CommitmentPanel";

const Security = () => {
  return (
    <div className="min-h-screen bg-home-bg text-home-fg">
      <SEO
        title="Security — Enterprise-Grade Protection | Prospectly"
        description="Prospectly employs bank-level encryption, SOC 2 Type II controls, and 24/7 threat monitoring to protect your professional network."
        canonical="/security"
      />
      <PageStructuredData
        page="security"
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Security", path: "/security" },
        ]}
      />
      <Navigation marketingSurface />
      <main id="main-content">
        <SecurityHero />
        <SecurityPillarsGrid />
        <SecurityCertificationsGrid />
        <SecurityCommitmentPanel />
      </main>
      <WebsiteFooter />
    </div>
  );
};

export default Security;
