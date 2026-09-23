/** Soft-tint badges using brand tokens (no hardcoded colors) */

export function getInviteStatusBadgeClass(statusUpper: string): string {
  switch (statusUpper) {
    case "ACCEPTED":
      return "bg-brand-success/10 text-brand-success";
    case "EXPIRED":
      return "bg-destructive/10 text-destructive";
    case "PENDING":
      return "bg-brand-warning/10 text-brand-warning";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getInvitePlanBadgeClass(planLabel: string): string {
  const p = planLabel.toLowerCase();
  if (p === "unknown") {
    return "bg-muted text-muted-foreground";
  }
  if (p.includes("free")) {
    return "bg-brand-sky/10 text-brand-sky";
  }
  if (p.includes("pro") || p.includes("pro+")) {
    return "bg-brand-amethyst/10 text-brand-amethyst";
  }
  return "bg-brand-rose/10 text-brand-rose";
}
