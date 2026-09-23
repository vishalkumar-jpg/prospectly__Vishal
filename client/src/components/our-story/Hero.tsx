import { Globe, Sparkles, Zap } from "lucide-react";
import { StaticPageHero } from "@/components/static/StaticPageHero";
import { StaticTrustPill } from "@/components/static/StaticTrustPill";

export function OurStoryHero() {
  return (
    <StaticPageHero
      titleId="our-story-page-title"
      eyebrow={
        <>
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Our Journey
        </>
      }
      eyebrowDotTone="amethyst"
      titleLine1={<>Transforming networking</>}
      titleLine2={<>through warm introductions.</>}
      description={
        <>
          How we&apos;re rebuilding how businesses grow — trust first,
          community-driven, and AI-powered.
        </>
      }
      pills={[
        <StaticTrustPill key="pros" tone="amethyst" icon={Sparkles}>
          25,000+ professionals
        </StaticTrustPill>,
        <StaticTrustPill key="global" tone="sky" icon={Globe}>
          Global network
        </StaticTrustPill>,
        <StaticTrustPill key="innovate" tone="trust-green" icon={Zap}>
          Innovation-driven
        </StaticTrustPill>,
      ]}
    />
  );
}
