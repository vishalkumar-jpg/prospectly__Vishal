import { cn } from "@/lib/utils";

/**
 * Shared modal surface (radius, shadow, animation). Composed with width/scroll
 * behavior per dialog.
 */
export const importModalShellSurfaceClassName = cn(
  "w-full border-0 p-0 gap-0 rounded-[20px] max-sm:rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] focus:outline-none focus-visible:outline-none"
);

/** Matches getting_started.html `.modal` + `modalIn` animation — full shell scroll */
const importModalShellBase = cn(
  importModalShellSurfaceClassName,
  "max-h-[90vh] overflow-y-auto thin-scroll"
);

/** Wide CSV preview / field-mapping modal: same surface, flex column + inner scroll */
export const importModalPreviewDialogContentClassName = cn(
  importModalShellSurfaceClassName,
  "max-h-[90vh] max-w-[calc(100vw-2rem)] sm:max-w-6xl flex flex-col overflow-hidden"
);

/** Amethyst → rose accent — matches getting_started.html */
export const importModalAccentGradient =
  "bg-gradient-to-r from-gs-accent-from to-gs-accent-to";

export const importModalAccentGradientBr =
  "bg-gradient-to-br from-gs-accent-from to-gs-accent-to";

export const importModalAccentGradientHover =
  "hover:brightness-[1.03] active:brightness-[0.98]";

export const importModalCtaShadow = "shadow-gs-cta hover:shadow-gs-cta-lg";

export const importModalLinkedInBrandGradient =
  "bg-gradient-to-br from-[#0A66C2] to-[#003D7A]";

/** Single-purpose dialogs (e.g. compact OAuth) */
export const importModalDialogContentClassName = cn(
  importModalShellBase,
  "max-w-[480px] sm:max-w-[480px]"
);

/**
 * Tabbed provider modals: standard width for Automatic; wider Manual tab for CSV instructions.
 */
export function importModalTabbedDialogContentClassName(wide: boolean) {
  return cn(
    importModalShellBase,
    wide ? "sm:max-w-2xl" : "max-w-[480px] sm:max-w-[480px]"
  );
}

export const importModalHeaderClassName = "px-6 pb-2 pt-6 text-left";

/** Full-bleed body inside shell (matches `.modal-body` padding 24px) */
export const importModalBodyClassName = "p-6";

/** HTML `.modal-close`: 32px, top-right 16px */
export const importModalCloseButtonClassName = cn(
  "absolute right-4 top-4 z-[1] grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-base text-muted-foreground transition-colors",
  "hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
);

/** Centered body under modal titles — wider than old 340px cap so short lines often stay one row */
export const importModalHeroDescriptionClassName =
  "mx-auto w-full max-w-[min(100%,400px)] sm:max-w-[432px] text-[13px] leading-snug text-muted-foreground";
