// Support channel section is disabled on /contact — email is the only support
// path for now. Kept here so it can be restored without rewriting it.
/*
import { ArrowRight, Calendar, CreditCard, MessageCircle, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";
import type { StaticIconTone } from "@/components/static/StaticIconCard";
import { cn } from "@/lib/utils";

interface Channel {
  icon: LucideIcon;
  tone: StaticIconTone;
  title: string;
  description: string;
  action: string;
  onClick: (ctx: ChannelContext) => void;
}

interface ChannelContext {
  startChat: (type: string) => void;
  onOpenBooking: () => void;
  billingEmail: string;
  onOpenSecurityDocs: () => void;
}

const CHANNELS: Channel[] = [
  {
    icon: MessageCircle,
    tone: "sky",
    title: "Technical Issue",
    description: "Bug reports, errors, or platform issues.",
    action: "Start live chat",
    onClick: ({ startChat }) => startChat("technical"),
  },
  {
    icon: Calendar,
    tone: "trust-green",
    title: "Sales Question",
    description: "Pricing, plans, or schedule a demo.",
    action: "Book a meeting",
    onClick: ({ onOpenBooking }) => onOpenBooking(),
  },
  {
    icon: CreditCard,
    tone: "amethyst",
    title: "Billing & Payments",
    description: "Invoices, subscriptions, or payment issues.",
    action: "Contact billing",
    onClick: ({ billingEmail }) => {
      window.location.href = `mailto:${billingEmail}`;
    },
  },
  {
    icon: Shield,
    tone: "rose",
    title: "Security & Privacy",
    description: "Data protection, compliance, or security concerns.",
    action: "View docs",
    onClick: ({ onOpenSecurityDocs }) => onOpenSecurityDocs(),
  },
];

const toneWell: Record<StaticIconTone, string> = {
  amethyst: "bg-home-amethyst/10 text-home-amethyst",
  rose: "bg-home-rose/10 text-home-rose",
  sky: "bg-home-sky/10 text-home-sky",
  "trust-green": "bg-home-trust-green/10 text-home-trust-green",
  muted: "bg-home-bg-elevated text-home-muted",
};

interface SupportChannelsProps {
  startChat: (type: string) => void;
  onOpenBooking: () => void;
  onOpenSecurityDocs: () => void;
  billingEmail: string;
}

export function ContactSupportChannels(props: SupportChannelsProps) {
  return (
    <StaticSection ariaLabelledBy="contact-channels-title">
      <StaticSectionHeading
        id="contact-channels-title"
        eyebrow="Pick a channel"
        title="Choose your support channel"
        description="Select the category that best fits your need for the fastest help."
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {CHANNELS.map((c) => (
          <button
            key={c.title}
            type="button"
            onClick={() => c.onClick(props)}
            className={cn(
              "group flex h-full flex-col rounded-2xl border border-home-border bg-home-bg p-6 text-left",
              "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              "hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-amethyst focus-visible:ring-offset-2",
            )}
          >
            <span
              className={cn(
                "mb-4 grid h-12 w-12 shrink-0 place-items-center rounded-xl",
                toneWell[c.tone],
              )}
              aria-hidden
            >
              <c.icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <h3 className="mb-1.5 text-base font-extrabold tracking-tight text-home-fg">
              {c.title}
            </h3>
            <p className="mb-4 flex-1 text-sm text-home-muted">{c.description}</p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-home-amethyst transition-transform group-hover:translate-x-0.5">
              {c.action}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </button>
        ))}
      </div>
    </StaticSection>
  );
}
*/

export {};
