import { CheckCircle, Lock, Shield } from "lucide-react";
import { StaticPageHero } from "@/components/static/StaticPageHero";
import { StaticTrustPill } from "@/components/static/StaticTrustPill";

export function ConfidentialityHero() {
  return (
    <StaticPageHero
      titleId="confidentiality-page-title"
      eyebrow={
        <>
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Privacy-First Platform
        </>
      }
      eyebrowDotTone="amethyst"
      titleLine1={<>Your confidentiality</>}
      titleLine2={<>matters to us.</>}
      description={
        <>
          Transparent privacy practices and complete control over your
          professional information — that&apos;s the baseline, not the perk.
        </>
      }
      pills={[
        <StaticTrustPill key="own" tone="amethyst" icon={CheckCircle}>
          You own your data
        </StaticTrustPill>,
        <StaticTrustPill key="nosell" tone="trust-green" icon={Shield}>
          No data selling
        </StaticTrustPill>,
        <StaticTrustPill key="control" tone="sky" icon={CheckCircle}>
          Full control
        </StaticTrustPill>,
      ]}
    />
  );
}
