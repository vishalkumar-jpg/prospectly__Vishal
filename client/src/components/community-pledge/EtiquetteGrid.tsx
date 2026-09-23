import { Clock, Heart, Target, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";
import { cn } from "@/lib/utils";

type EtiquetteType = "Do" | "Don't";

interface EtiquetteItem {
  type: EtiquetteType;
  icon: LucideIcon;
  title: string;
  description: string;
}

const ITEMS: EtiquetteItem[] = [
  {
    type: "Do",
    icon: UserCheck,
    title: "Be an active listener",
    description:
      "Focus on understanding others rather than waiting for your turn. Ask questions. Show interest. It builds trust and often reveals how you can best help.",
  },
  {
    type: "Don't",
    icon: Target,
    title: "Push too hard",
    description:
      "Avoid being overly salesy, forceful, or demanding. If you share, do so with respect for the other person's space and timing.",
  },
  {
    type: "Do",
    icon: Heart,
    title: "Mind your manners",
    description:
      "Simple courtesies go a long way: being on time, using polite greetings, acknowledging contributions. It sets a tone of mutual respect.",
  },
  {
    type: "Don't",
    icon: Clock,
    title: "Forget follow-through",
    description:
      "Timely follow-ups — whether a note, an introduction, or a recommendation — solidify relationships and demonstrate reliability.",
  },
];

export function CommunityPledgeEtiquetteGrid() {
  return (
    <StaticSection
      elevated
      ariaLabelledBy="pledge-etiquette-title"
      withBackground
    >
      <StaticSectionHeading
        id="pledge-etiquette-title"
        eyebrow="Best practices"
        title="Etiquette in action"
        description="Turning values into everyday behavior."
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {ITEMS.map((item) => {
          const isDo = item.type === "Do";
          return (
            <article
              key={item.title}
              className={cn(
                "rounded-2xl border bg-home-bg p-6 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                "hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5",
                isDo ? "border-home-trust-green/30" : "border-home-rose/30",
              )}
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                    isDo
                      ? "bg-home-trust-green/10 text-home-trust-green"
                      : "bg-home-rose/10 text-home-rose",
                  )}
                  aria-hidden
                >
                  <item.icon className="h-5 w-5" />
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    isDo
                      ? "bg-home-trust-green/10 text-home-trust-green"
                      : "bg-home-rose/10 text-home-rose",
                  )}
                >
                  {item.type}
                </span>
              </div>
              <h3 className="mb-2 text-base font-extrabold tracking-tight text-home-fg">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-home-muted">
                {item.description}
              </p>
            </article>
          );
        })}
      </div>
    </StaticSection>
  );
}
