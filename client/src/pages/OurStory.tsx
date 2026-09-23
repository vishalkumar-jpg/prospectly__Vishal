import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import WebsiteFooter from "@/components/WebsiteFooter";
import { PageStructuredData } from "@/components/StructuredData";
import { OurStoryHero } from "@/components/our-story/Hero";
import { OurStoryVisionMission } from "@/components/our-story/VisionMission";
import { OurStoryWhoWeAre } from "@/components/our-story/WhoWeAre";
import { OurStoryFounderStory } from "@/components/our-story/FounderStory";
import { OurStoryValuesGrid } from "@/components/our-story/ValuesGrid";

const OurStory = () => {
  return (
    <div className="min-h-screen bg-home-bg text-home-fg">
      <SEO
        title="Our Story — The Warm Introduction Network | Prospectly"
        description="How Pranav Dalal and the Prospectly team are rebuilding business networking around trust, warm introductions, and community-driven growth."
        canonical="/our-story"
      />
      <PageStructuredData
        page="our-story"
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Our Story", path: "/our-story" },
        ]}
        includeOrganization
      />
      <Navigation marketingSurface />
      <main id="main-content">
        <OurStoryHero />
        <OurStoryVisionMission />
        <OurStoryWhoWeAre />
        <OurStoryFounderStory />
        <OurStoryValuesGrid />
      </main>
      <WebsiteFooter />
    </div>
  );
};

export default OurStory;
