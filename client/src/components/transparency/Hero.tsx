import { CheckCircle, Eye, MessageCircle } from "lucide-react";
import { StaticPageHero } from "@/components/static/StaticPageHero";
import { StaticTrustPill } from "@/components/static/StaticTrustPill";

export function TransparencyHero() {
  return (
    <StaticPageHero
      titleId="transparency-page-title"
      eyebrow={
        <>
          <Eye className="h-3.5 w-3.5" aria-hidden />
          Open & Honest
        </>
      }
      eyebrowDotTone="amethyst"
      titleLine1={<>Built on</>}
      titleLine2={<>radical transparency.</>}
      description={
        <>
          We share openly how we operate, make decisions, and serve our
          community — so you always know exactly where we stand.
        </>
      }
      pills={[
        <StaticTrustPill key="hidden" tone="amethyst" icon={CheckCircle}>
          No hidden practices
        </StaticTrustPill>,
        <StaticTrustPill key="comm" tone="sky" icon={MessageCircle}>
          Clear communication
        </StaticTrustPill>,
        <StaticTrustPill key="data" tone="trust-green" icon={CheckCircle}>
          Open data
        </StaticTrustPill>,
      ]}
    />
  );
}
