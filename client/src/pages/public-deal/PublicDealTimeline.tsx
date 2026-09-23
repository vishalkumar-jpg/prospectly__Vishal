import { forwardRef } from "react";
import {
  UserPlus,
  Contact,
  BadgeCheck,
  Handshake,
  Wallet,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicDealTimelineProps {
  isVisible: boolean;
}

// Static (JIT-detectable) stagger delays, one per step in order.
const REVEAL_DELAYS = [
  "delay-0",
  "delay-100",
  "delay-200",
  "delay-300",
  "delay-500",
];

const steps = [
  {
    icon: UserPlus,
    step: "Step 1",
    title: "Create your free account",
    description:
      "Sign up for Prospectly in a few seconds — it's free to get started.",
    tint: "bg-brand-amethyst/10 text-brand-amethyst",
  },
  {
    icon: Contact,
    step: "Step 2",
    title: "Import your contacts",
    description: "Add your contacts so we can see who you already know.",
    tint: "bg-brand-sky/10 text-brand-sky",
  },
  {
    icon: BadgeCheck,
    step: "Step 3",
    title: "We check the connection",
    description:
      "We quietly confirm this person is in your contacts. If they are, the opportunity is yours.",
    tint: "bg-brand-rose/10 text-brand-rose",
  },
  {
    icon: Handshake,
    step: "Step 4",
    title: "Introduce them",
    description:
      "Make the introduction and help the two of them set up a meeting.",
    tint: "bg-brand-amethyst/10 text-brand-amethyst",
  },
  {
    icon: Wallet,
    step: "Step 5",
    title: "Get paid",
    description:
      "Once the meeting takes place, your reward is sent straight to you.",
    tint: "bg-brand-success/10 text-brand-success",
  },
];

export const PublicDealTimeline = forwardRef<
  HTMLElement,
  PublicDealTimelineProps
>(({ isVisible }, ref) => {
  return (
    <section
      ref={ref}
      className="rounded-2xl border border-border bg-card p-6 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-brand-cta">
          <Target className="h-[18px] w-[18px]" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">
            How It Works
          </h2>
          <p className="text-[13px] text-muted-foreground">
            From sign-up to payout in five simple steps
          </p>
        </div>
      </div>

      <div className="flex flex-col">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div
              key={step.step}
              className={cn(
                "relative flex items-stretch gap-4 transition-all duration-500 ease-out",
                REVEAL_DELAYS[Math.min(i, REVEAL_DELAYS.length - 1)],
                isVisible
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-5 opacity-0"
              )}
            >
              {/* Icon + connector column */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "z-10 grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl border border-border bg-card",
                    step.tint
                  )}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                {!isLast && (
                  <div className="my-1 w-0.5 flex-1 rounded-full bg-brand-amethyst/20" />
                )}
              </div>
              <div className={cn("pt-0.5", !isLast && "pb-6")}>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  {step.step}
                </span>
                <h3 className="text-[15px] font-extrabold leading-tight">
                  {step.title}
                </h3>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});

PublicDealTimeline.displayName = "PublicDealTimeline";
