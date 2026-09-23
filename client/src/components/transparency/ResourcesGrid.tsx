import { AlertCircle, ExternalLink, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";

interface Resource {
  icon: LucideIcon;
  title: string;
  description: string;
  link: string;
}

const RESOURCES: Resource[] = [
  {
    icon: Eye,
    title: "Privacy Portal",
    description: "Access and manage your data privacy settings.",
    link: "/privacy",
  },
  {
    icon: AlertCircle,
    title: "Security Center",
    description: "Learn about our security practices and certifications.",
    link: "/security",
  },
];

export function TransparencyResourcesGrid() {
  return (
    <StaticSection elevated ariaLabelledBy="transparency-resources-title">
      <StaticSectionHeading
        id="transparency-resources-title"
        eyebrow="Explore more"
        title="Transparency resources"
        description="Detailed information about our operations and practices."
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {RESOURCES.map((r) => (
          <Link
            key={r.title}
            to={r.link}
            className="group flex items-start gap-4 rounded-2xl border border-home-border bg-home-bg p-5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-amethyst focus-visible:ring-offset-2"
          >
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-home-amethyst/10 text-home-amethyst transition-colors group-hover:bg-home-amethyst/15"
              aria-hidden
            >
              <r.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-base font-extrabold tracking-tight text-home-fg group-hover:text-home-amethyst">
                {r.title}
              </h3>
              <p className="mb-2 text-sm text-home-muted">{r.description}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-home-amethyst">
                Visit resource
                <ExternalLink className="h-3 w-3" aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </StaticSection>
  );
}
