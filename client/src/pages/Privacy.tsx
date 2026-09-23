import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import WebsiteFooter from "@/components/WebsiteFooter";
import { PageStructuredData } from "@/components/StructuredData";
import { StaticLegalShell } from "@/components/static/StaticLegalShell";
import { PRIVACY_TOC } from "@/components/privacy/toc";
import { PrivacySectionsA } from "@/components/privacy/SectionsA";
import { PrivacySectionsB } from "@/components/privacy/SectionsB";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-home-bg text-home-fg">
      <SEO
        title="Privacy Policy — Prospectly"
        description="How Prospectly collects, uses, and protects your data. Transparent privacy practices for the AI-powered warm introduction network."
        canonical="/privacy"
      />
      <PageStructuredData
        page="privacy"
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Privacy Policy", path: "/privacy" },
        ]}
      />
      <Navigation marketingSurface />
      <main id="main-content">
        <StaticLegalShell
          eyebrow="Privacy Policy"
          titleLine1={<>Your privacy,</>}
          titleLine2={<>protected by design.</>}
          description={
            <>
              How we collect, use, and protect your data — in plain language.
            </>
          }
          lastUpdated="01 Jan 2026"
          sections={PRIVACY_TOC}
        >
          <PrivacySectionsA />
          <PrivacySectionsB />
        </StaticLegalShell>
      </main>
      <WebsiteFooter />
    </div>
  );
};

export default Privacy;
