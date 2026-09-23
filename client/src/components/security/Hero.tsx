import { CheckCircle, Lock, Shield } from "lucide-react";
import { StaticPageHero } from "@/components/static/StaticPageHero";
import { StaticTrustPill } from "@/components/static/StaticTrustPill";

export function SecurityHero() {
  return (
    <StaticPageHero
      titleId="security-page-title"
      eyebrow={
        <>
          <Shield className="h-3.5 w-3.5" aria-hidden />
          Enterprise-Grade Security
        </>
      }
      eyebrowDotTone="amethyst"
      titleLine1={<>Your data&apos;s</>}
      titleLine2={<>security is our priority.</>}
      description={
        <>
          Bank-level controls across encryption, identity, and monitoring —
          built into every feature so your professional network stays
          confidential.
        </>
      }
      pills={[
        <StaticTrustPill key="soc2" tone="amethyst" icon={CheckCircle}>
          SOC 2 Type II
        </StaticTrustPill>,
        <StaticTrustPill key="enc" tone="sky" icon={Lock}>
          256-bit Encryption
        </StaticTrustPill>,
        <StaticTrustPill key="gdpr" tone="trust-green" icon={Shield}>
          GDPR & CCPA
        </StaticTrustPill>,
      ]}
    />
  );
}
