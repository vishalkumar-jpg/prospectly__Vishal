import { Handshake, Network, Target } from "lucide-react";
import { StaticPageHero } from "@/components/static/StaticPageHero";
import { StaticTrustPill } from "@/components/static/StaticTrustPill";

export function HowItWorksHero() {
  return (
    <StaticPageHero
      titleId="how-it-works-page-title"
      eyebrow={
        <>
          <Network className="h-3.5 w-3.5" aria-hidden />
          Warm Introduction Network
        </>
      }
      eyebrowDotTone="amethyst"
      titleLine1={<>How Prospectly</>}
      titleLine2={<>turns cold to warm.</>}
      description={
        <>
          A step-by-step look at how we transform cold prospects into warm
          connections through a trusted peer-to-peer introduction system.
        </>
      }
      pills={[
        <StaticTrustPill key="skip" tone="amethyst" icon={Target}>
          Skip cold outreach
        </StaticTrustPill>,
        <StaticTrustPill key="warm" tone="rose" icon={Handshake}>
          Warm connections
        </StaticTrustPill>,
        <StaticTrustPill key="earn" tone="trust-green" icon={Network}>
          Earn commissions
        </StaticTrustPill>,
      ]}
    />
  );
}
