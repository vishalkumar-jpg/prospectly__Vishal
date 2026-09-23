import Navigation from "@/components/Navigation";
import WebsiteFooter from "@/components/WebsiteFooter";
import SEO from "@/components/SEO";
import StructuredData, {
  buildOrganization,
  getPageOrigin,
} from "@/components/StructuredData";
import { HomePage } from "@/components/home/Index";

const Index = () => {
  const origin = getPageOrigin();

  return (
    <div className="min-h-screen bg-home-bg">
      <SEO
        title="Prospectly - AI-Powered Warm Introductions | Skip Cold Outreach Forever"
        description="AI finds your ideal prospects in our trusted network and orchestrates perfect warm introductions automatically. 5x higher response rates than cold outreach."
        canonical="/"
      />
      <StructuredData id="home-org" data={buildOrganization(origin)} />
      <StructuredData
        id="home-website"
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Prospectly",
          url: origin || "https://prospectly.com",
          potentialAction: {
            "@type": "SearchAction",
            target: `${origin || "https://prospectly.com"}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <Navigation marketingSurface />
      <main id="main-content">
        <HomePage />
      </main>
      <WebsiteFooter />
    </div>
  );
};

export default Index;
