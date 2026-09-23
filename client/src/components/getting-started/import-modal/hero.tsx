import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  importModalHeroDescriptionClassName,
  importModalLinkedInBrandGradient,
} from "@/components/getting-started/import-modal/modalStyles";

export type ImportModalHeroVariant =
  | "linkedin"
  | "upload"
  | "success"
  | "google"
  | "microsoft"
  | "apple"
  | "neutral";

const variantIconWrap: Record<ImportModalHeroVariant, string> = {
  linkedin: cn("text-white", importModalLinkedInBrandGradient),
  upload: "bg-gs-amethyst/10 text-foreground",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  google: "bg-[#FEF3E2]",
  microsoft: "bg-[#E8F0FE]",
  apple: "bg-secondary",
  neutral: "bg-amber-500/10",
};

interface ImportModalHeroProps {
  variant: ImportModalHeroVariant;
  icon: ReactNode;
  title: string;
  description: ReactNode;
  /** e.g. "~ 2 minutes total" */
  badge?: ReactNode;
  className?: string;
}

export function ImportModalHero({
  variant,
  icon,
  title,
  description,
  badge,
  className,
}: ImportModalHeroProps) {
  return (
    <div className={cn("mb-5 text-center", className)}>
      <div
        className={cn(
          "mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl text-[28px] leading-none",
          variantIconWrap[variant]
        )}
      >
        {icon}
      </div>
      <h3 className="mb-1 text-xl font-extrabold tracking-tight text-foreground">
        {title}
      </h3>
      <p className={importModalHeroDescriptionClassName}>{description}</p>
      {badge != null && badge !== false ? (
        <div className="mt-2 inline-flex items-center gap-1 rounded-xl bg-gs-amethyst/10 px-2.5 py-1 text-[11px] font-semibold text-gs-amethyst">
          {badge}
        </div>
      ) : null}
    </div>
  );
}
