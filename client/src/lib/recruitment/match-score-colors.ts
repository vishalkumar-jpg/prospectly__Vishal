/** Connector / refer-candidate pipeline match score badge classes. */
export function getMatchScoreBadgeClass(score: number): string {
  if (score >= 85) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (score >= 60) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-600";
}
