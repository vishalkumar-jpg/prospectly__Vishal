import { Handshake, Heart, Users } from "lucide-react";
import { StaticPageHero } from "@/components/static/StaticPageHero";
import { StaticTrustPill } from "@/components/static/StaticTrustPill";

export function CommunityPledgeHero() {
  return (
    <StaticPageHero
      titleId="pledge-page-title"
      eyebrow={
        <>
          <Heart className="h-3.5 w-3.5" aria-hidden />
          Community First
        </>
      }
      eyebrowDotTone="rose"
      titleLine1={<>Community</>}
      titleLine2={<>is how we grow.</>}
      description={
        <>
          Our strength lies in respecting, helping, and growing together. This
          pledge defines how we uplift everyone.
        </>
      }
      pills={[
        <StaticTrustPill key="respect" tone="amethyst" icon={Heart}>
          Respect first
        </StaticTrustPill>,
        <StaticTrustPill key="help" tone="rose" icon={Handshake}>
          Help others
        </StaticTrustPill>,
        <StaticTrustPill key="grow" tone="trust-green" icon={Users}>
          Grow together
        </StaticTrustPill>,
      ]}
    />
  );
}
