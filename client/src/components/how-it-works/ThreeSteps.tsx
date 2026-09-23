import { CheckCircle, Handshake, Network, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";
import { cn } from "@/lib/utils";
import type { StaticIconTone } from "@/components/static/StaticIconCard";

interface Step {
  number: number;
  icon: LucideIcon;
  tone: StaticIconTone;
  title: string;
  description: string;
  bullets: string[];
}

const STEPS: Step[] = [
  {
    number: 1,
    icon: UserPlus,
    tone: "amethyst",
    title: "Join Free",
    description:
      "Create your profile and join our trusted network of 25,000+ professionals.",
    bullets: [
      "Free to join",
      "Build your trust score",
      "No credit card required",
    ],
  },
  {
    number: 2,
    icon: Network,
    tone: "sky",
    title: "Upload Your Network",
    description:
      "Import contacts from LinkedIn, Gmail, and other platforms. We'll find connections for you.",
    bullets: ["LinkedIn integration", "Gmail contacts", "CSV uploads"],
  },
  {
    number: 3,
    icon: Handshake,
    tone: "trust-green",
    title: "Get / Give Introductions",
    description:
      "Request warm introductions to prospects, or earn money by making introductions for others.",
    bullets: ["85% meeting rate", "Offer & earn referral payouts", "Automated workflow"],
  },
];

const toneWell: Record<StaticIconTone, string> = {
  amethyst: "bg-home-amethyst/10 text-home-amethyst",
  rose: "bg-home-rose/10 text-home-rose",
  sky: "bg-home-sky/10 text-home-sky",
  "trust-green": "bg-home-trust-green/10 text-home-trust-green",
  muted: "bg-home-bg-elevated text-home-muted",
};

export function HowItWorksThreeSteps() {
  return (
    <StaticSection
      elevated
      ariaLabelledBy="hiw-steps-title"
      withBackground
    >
      <StaticSectionHeading
        id="hiw-steps-title"
        eyebrow="Get started in minutes"
        title="Three simple steps to success"
        description="From sign-up to your first warm introduction — in minutes, not months."
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {STEPS.map((s) => (
          <article
            key={s.number}
            className="relative rounded-2xl border border-home-border bg-home-bg p-6 text-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5"
          >
            <span
              className="absolute -top-3 right-5 rounded-full bg-home-amethyst px-2.5 py-0.5 text-[10px] font-bold text-white"
              aria-hidden
            >
              Step {s.number}
            </span>
            <span
              className={cn(
                "mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full",
                toneWell[s.tone],
              )}
              aria-hidden
            >
              <s.icon className="h-7 w-7" strokeWidth={2} />
            </span>
            <h3 className="mb-2 text-lg font-extrabold tracking-tight text-home-fg">
              {s.title}
            </h3>
            <p className="mb-4 text-sm leading-relaxed text-home-muted">
              {s.description}
            </p>
            <ul className="space-y-1.5 text-left">
              {s.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-center justify-center gap-2 text-sm text-home-muted"
                >
                  <CheckCircle
                    className="h-4 w-4 shrink-0 text-home-trust-green"
                    aria-hidden
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </StaticSection>
  );
}
