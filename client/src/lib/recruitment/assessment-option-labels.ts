/** Phase-1 choice option ids — includes legacy approve/decline from older jobs. */
const PHASE1_OPTION_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
  approve: "Yes",
  decline: "No",
};

/**
 * Display label for assessment options. Always shows Yes/No for Phase-1
 * choice ids (yes/no and legacy approve/decline).
 */
export function getAssessmentOptionDisplayLabel(option: {
  id: string;
  label: string;
}): string {
  const byId = PHASE1_OPTION_LABELS[option.id];
  if (byId) return byId;

  const trimmed = option.label.trim();
  if (/^(approve|yes)$/i.test(trimmed)) return "Yes";
  if (/^(decline|no)$/i.test(trimmed)) return "No";

  return option.label;
}
