import { AiEngineSection } from "./AiEngineSection";
import { AudienceSection } from "./AudienceSection";
import { CtaSection } from "./CtaSection";
import { GiveToGet } from "./GiveToGet";
import { Hero } from "./Hero";
import { NetworkSimulator } from "./NetworkSimulator";
import { PledgeSection } from "./PledgeSection";
import { ResultsSection } from "./ResultsSection";
import { TrustedLogos } from "./TrustedLogos";

export function HomePage() {
  return (
    <main className="bg-home-bg text-home-fg">
      <Hero />
      <TrustedLogos />
      <GiveToGet />
      <NetworkSimulator />
      <ResultsSection />
      <AudienceSection />
      <AiEngineSection />
      <PledgeSection />
      <CtaSection />
    </main>
  );
}
