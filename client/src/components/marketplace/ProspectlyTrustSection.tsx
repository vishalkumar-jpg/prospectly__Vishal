import { cn } from "@/lib/utils";
import {
  type ProspectlyTrustSectionProps,
  platformStats,
  howItWorksSteps,
  trustBadges,
  testimonials,
  TrustStatsBar,
  HowItWorksSteps,
  TrustBadgesList,
  TestimonialCards,
  CompanyLogos,
  CompactTrustBar,
} from "./trust-section";

export type { ProspectlyTrustSectionProps } from "./trust-section";

export function ProspectlyTrustSection({
  variant = "hero",
  showHowItWorks = true,
  showStats = true,
  showTestimonials = false,
  className,
}: ProspectlyTrustSectionProps) {
  if (variant === "compact") {
    return <CompactTrustBar stats={platformStats} className={className} />;
  }

  return (
    <div
      className={cn(
        "bg-gradient-to-b from-violet-50 via-purple-50 to-white dark:from-slate-900 dark:via-purple-900/10 dark:to-slate-900",
        className
      )}
    >
      <div className="container mx-auto px-4 py-12">
        {/* Logo and Main Heading */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/prospectly-logo.png"
              alt="Prospectly"
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            The Trusted Platform for Professional Introductions
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect professionals, earn rewards, and grow your network with
            confidence. Every introduction is verified, secure, and rewarding.
          </p>
        </div>

        {showStats && <TrustStatsBar stats={platformStats} />}
        {showHowItWorks && <HowItWorksSteps steps={howItWorksSteps} />}
        <TrustBadgesList badges={trustBadges} />
        {showTestimonials && <TestimonialCards testimonials={testimonials} />}
        <CompanyLogos />
      </div>
    </div>
  );
}

export default ProspectlyTrustSection;
