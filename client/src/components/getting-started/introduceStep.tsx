import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Check,
  CheckCircle2,
  Mail,
  Search,
  Send,
  User,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GettingStartedStepSectionHeader } from "@/components/getting-started/connectSection";
import {
  importModalAccentGradientBr,
  importModalAccentGradientHover,
  importModalCtaShadow,
} from "@/components/getting-started/import-modal/modalStyles";

const sourceCardSpring =
  "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]";

const introActionCardHoverClassName = cn(
  "relative overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card",
  sourceCardSpring,
  "hover:-translate-y-[3px] hover:border-gs-amethyst/70 hover:shadow-md",
  "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:opacity-0 after:transition-opacity after:duration-300 after:content-[''] hover:after:opacity-100",
  "after:bg-gradient-to-r after:from-gs-accent-from after:to-gs-accent-to"
);

const payoutStepCardHoverClassName = cn(
  "rounded-xl border border-border bg-card transition-all duration-200",
  "hover:border-sky-500/40 hover:shadow-[0_4px_16px_rgba(36,170,222,0.08)]"
);

const payoutStepNumberBaseClassName =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold";

const REQUEST_CHECKLIST = [
  "Set payout + agenda",
  "Payout contingent on milestones",
  "Prospect books from your calendar",
] as const;

const BROWSE_CHECKLIST = [
  "First to accept wins the opportunity",
  "AI-assisted email drafting",
  "Increase trust-score with every successful introduction",
] as const;

type PayoutFlowFooter =
  | { type: "text"; label: string }
  | { type: "badge"; label: string };

type PayoutFlowStep = {
  n: number;
  title: string;
  body: string;
  statusItems: { icon: LucideIcon; label: string }[];
  footer: PayoutFlowFooter;
};

const payoutStepAccentClassName = "bg-brand-sky/10 text-brand-sky";

const PAYOUT_FLOW_STEPS: PayoutFlowStep[] = [
  {
    n: 1,
    title: "Request",
    body: "A request is posted and the funds are secured up front.",
    statusItems: [{ icon: Send, label: "Request initiated" }],
    footer: { type: "text", label: "Funds held in escrow" },
  },
  {
    n: 2,
    title: "Introduce",
    body: "A connector claims the request and makes the warm intro.",
    statusItems: [
      { icon: User, label: "Connector accepts" },
      { icon: Mail, label: "Intro email sent" },
    ],
    footer: { type: "badge", label: "Connector earns 5%" },
  },
  {
    n: 3,
    title: "Meet & get paid",
    body: "The meeting happens and the rest of the payout clears.",
    statusItems: [
      { icon: Calendar, label: "Prospect books" },
      { icon: CheckCircle2, label: "Meeting completed" },
      { icon: Wallet, label: "Connector paid" },
    ],
    footer: { type: "badge", label: "Remaining payout" },
  },
];

const introActionButtonClassName = cn(
  "border-0 text-brand-foreground shadow-none",
  importModalAccentGradientBr,
  importModalCtaShadow,
  importModalAccentGradientHover,
  "hover:scale-[1.02] hover:-translate-y-0.5"
);

function ChecklistRow({
  label,
  checkClassName,
}: {
  label: string;
  checkClassName: string;
}) {
  return (
    <li className="flex items-start gap-2.5 text-[13px] leading-snug text-muted-foreground">
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
          checkClassName
        )}
      >
        <Check className="h-2.5 w-2.5 stroke-[3]" aria-hidden />
      </span>
      <span>{label}</span>
    </li>
  );
}

function IntroActionCard({
  icon: Icon,
  iconWrapClassName,
  checkClassName,
  title,
  description,
  checklist,
  buttonLabel,
  onClick,
}: {
  icon: LucideIcon;
  iconWrapClassName: string;
  checkClassName: string;
  title: string;
  description: string;
  checklist: readonly string[];
  buttonLabel: string;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        introActionCardHoverClassName,
        "flex h-full flex-col p-4 sm:p-5"
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-10 w-10 items-center justify-center rounded-xl",
          iconWrapClassName
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mb-2 text-base font-bold leading-tight text-foreground">
        {title}
      </h3>
      <p className="mb-4 text-[13px] leading-snug text-muted-foreground">
        {description}
      </p>
      <ul className="mb-5 space-y-2.5">
        {checklist.map((item) => (
          <ChecklistRow
            key={item}
            label={item}
            checkClassName={checkClassName}
          />
        ))}
      </ul>
      <Button
        type="button"
        className={cn(
          "mt-auto h-auto w-full rounded-xl py-2.5 text-sm font-bold",
          introActionButtonClassName
        )}
        onClick={onClick}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}

function PayoutStatusRow({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2.5 text-[12px] text-muted-foreground">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          payoutStepAccentClassName
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span>{label}</span>
    </li>
  );
}

function PayoutFlowCard({ step }: { step: PayoutFlowStep }) {
  return (
    <div
      className={cn(
        payoutStepCardHoverClassName,
        "flex h-full flex-col p-4 sm:p-5"
      )}
    >
      <div className="mb-3">
        <span
          className={cn(
            payoutStepNumberBaseClassName,
            payoutStepAccentClassName
          )}
        >
          {step.n}
        </span>
        <h4 className="mt-2.5 text-sm font-bold leading-snug text-foreground">
          {step.title}
        </h4>
      </div>
      <p className="mb-4 text-[13px] leading-snug text-muted-foreground">
        {step.body}
      </p>
      <ul className="mb-4 space-y-2.5">
        {step.statusItems.map((item) => (
          <PayoutStatusRow
            key={item.label}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </ul>
      <div className="mt-auto">
        {step.footer.type === "text" ? (
          <p className="text-[11px] font-medium text-muted-foreground">
            {step.footer.label}
          </p>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-success/10 px-2 py-0.5 text-[11px] font-semibold text-brand-success">
            <span aria-hidden>$</span>
            {step.footer.label}
          </span>
        )}
      </div>
    </div>
  );
}

export function GettingStartedIntroduceStep() {
  const navigate = useNavigate();

  return (
    <section className="animate-fade-in mb-8">
      <GettingStartedStepSectionHeader
        title="Get introduced or help others connect"
        description="Request a warm introduction, or earn by helping others connect."
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <IntroActionCard
            icon={Send}
            iconWrapClassName="bg-brand-sky/10 text-brand-sky"
            checkClassName="bg-brand-sky/15 text-brand-sky"
            title="Request an Introduction"
            description="Find a prospect, set a payout amount, and share your agenda."
            checklist={REQUEST_CHECKLIST}
            buttonLabel="Start an Introduction Request"
            onClick={() => navigate("/prospecting/find-prospects")}
          />
          <IntroActionCard
            icon={Search}
            iconWrapClassName="bg-brand-success/10 text-brand-success"
            checkClassName="bg-brand-success/15 text-brand-success"
            title="Browse Requests and Earn"
            description="Accept requests where you know the right person to introduce."
            checklist={BROWSE_CHECKLIST}
            buttonLabel="Browse Open Requests"
            onClick={() => navigate("/prospecting/opportunities")}
          />
        </div>

        <div className="rounded-[14px] border border-border bg-card p-4 sm:p-6">
          <div className="mb-5 max-w-3xl">
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              How payouts work
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
              Prospectly uses milestone-based payments so requesters,
              connectors, and prospects all stay protected.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {PAYOUT_FLOW_STEPS.map((step) => (
              <PayoutFlowCard key={step.n} step={step} />
            ))}
          </div>

          <p className="mt-5 flex items-center justify-center gap-2 text-center text-[12px] leading-relaxed text-muted-foreground">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-success"
              aria-hidden
            />
            <span>
              The connector receives{" "}
              <strong className="font-semibold text-foreground">80%</strong> of
              the total payout (20% transaction fee)
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
