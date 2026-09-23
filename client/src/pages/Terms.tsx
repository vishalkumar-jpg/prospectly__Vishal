import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import WebsiteFooter from "@/components/WebsiteFooter";
import { PageStructuredData } from "@/components/StructuredData";
import { StaticLegalShell } from "@/components/static/StaticLegalShell";
import { TERMS_TOC } from "@/components/terms/toc";
import { TermsSectionsA } from "@/components/terms/SectionsA";
import { TermsSectionsB } from "@/components/terms/SectionsB";

const Terms = () => {
  return (
    <div className="min-h-screen bg-home-bg text-home-fg">
      <SEO
        title="Terms of Service — Prospectly"
        description="The terms that govern your use of Prospectly's AI-powered lead generation platform and peer-to-peer warm introduction marketplace."
        canonical="/terms"
      />
      <PageStructuredData
        page="terms"
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Terms of Service", path: "/terms" },
        ]}
      />
      <Navigation marketingSurface />
      <main id="main-content">
        <StaticLegalShell
          eyebrow="Terms of Service"
          titleLine1={<>The ground rules</>}
          titleLine2={<>for using Prospectly.</>}
          description={
            <>
              Plain-language terms that govern our platform and the warm
              introduction marketplace.
            </>
          }
          lastUpdated="01 Jan 2026"
          sections={TERMS_TOC}
        >
          <TermsSectionsA />
          <TermsSectionsB />
        </StaticLegalShell>
      </main>
      <WebsiteFooter />
    </div>
  );
};

export default Terms;
