export const FUNNEL_STAGES = [
  { key: "applied", label: "Applied" },
  { key: "screened", label: "Screened" },
  { key: "interviewed", label: "Interviewed" },
  { key: "hired", label: "Hired" },
] as const;

export const FUNNEL_STAGE_BAR_COLORS = [
  "bg-muted-foreground/55",
  "bg-brand-sky",
  "bg-brand-amethyst",
  "bg-brand-success",
] as const;
