import { DollarSign, Handshake, Minimize, Target, TrendingUp, Upload } from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";
import { RoleColumn, type RoleStep } from "./RoleColumn";

const REQUESTER_STEPS: RoleStep[] = [
  {
    icon: Upload,
    title: "Add prospects & pay for intros",
    description: "Upload prospects, set rates. AI finds matches instantly.",
  },
  {
    icon: Target,
    title: "AI finds network matches",
    description: "AI identifies perfect connections in our 25,000+ network.",
  },
  {
    icon: Handshake,
    title: "Member makes introduction",
    description: "Warm introductions with an 85% vs 18% cold-outreach rate.",
  },
  {
    icon: TrendingUp,
    title: "You get more deals",
    description: "Close more deals faster with warm connections.",
  },
];

const CONNECTOR_STEPS: RoleStep[] = [
  {
    icon: Upload,
    title: "Upload your network",
    description: "Import contacts from all major platforms.",
  },
  {
    icon: Target,
    title: "AI finds connections",
    description: "AI matches prospects with your personal connections.",
  },
  {
    icon: Handshake,
    title: "Make introductions",
    description: "Make introductions, earn referral payouts.",
  },
  {
    icon: DollarSign,
    title: "Get paid",
    description: "Earn competitive referral payouts instantly.",
  },
];

export function HowItWorksRequesterConnector() {
  return (
    <StaticSection ariaLabelledBy="hiw-roles-title">
      <StaticSectionHeading
        id="hiw-roles-title"
        eyebrow="Two ways to succeed"
        title={
          <>
            Requester or{" "}
            <span className="home-text-brand-gradient">Connector</span> —
            pick your path.
          </>
        }
        description="Build your sales pipeline through warm connections, earn money helping others — or both."
      />
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[1fr_80px_1fr]">
        <RoleColumn
          tone="sky"
          badge="Requesters"
          title="Win deals with warm intros"
          description="Access 25,000+ verified professionals ready to introduce you to their networks."
          steps={REQUESTER_STEPS}
          footer="For sales reps, business developers & entrepreneurs"
        />
        <div className="relative flex flex-col items-center justify-center gap-2 py-2 max-[900px]:flex-row max-[900px]:py-2">
          <div className="h-full w-0.5 flex-1 rounded-sm bg-gradient-to-b from-home-sky/15 to-home-amethyst/15 max-[900px]:h-0.5 max-[900px]:w-full max-[900px]:bg-gradient-to-r" />
          <div className="relative z-[2] grid h-12 w-12 place-items-center rounded-full border-2 border-home-border bg-home-bg text-home-muted shadow-home-bridge">
            <Minimize className="h-5 w-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="h-full w-0.5 flex-1 rounded-sm bg-gradient-to-b from-home-sky/15 to-home-amethyst/15 max-[900px]:h-0.5 max-[900px]:w-full max-[900px]:bg-gradient-to-r" />
          <span
            className="absolute bottom-[10%] left-1/2 h-1.5 w-1.5 -translate-x-1/2 animate-home-bridge-up rounded-full bg-home-sky max-[900px]:hidden"
            aria-hidden
          />
          <span
            className="absolute left-1/2 top-[10%] h-1.5 w-1.5 -translate-x-1/2 animate-home-bridge-down rounded-full bg-home-amethyst max-[900px]:hidden"
            aria-hidden
          />
        </div>
        <RoleColumn
          tone="amethyst"
          badge="Connectors"
          title="Earn making introductions"
          description="Help others succeed while growing your income. Earn competitive referral payouts for successful intros."
          steps={CONNECTOR_STEPS}
          footer="For networkers, consultants & relationship builders"
        />
      </div>
    </StaticSection>
  );
}
