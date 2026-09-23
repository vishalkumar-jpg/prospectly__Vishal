export function formatReferCandidateLabel(referCount?: number): string {
  const count = referCount ?? 0;
  if (count > 0) {
    return `Refer a Candidate (${count})`;
  }
  return "Refer a Candidate";
}

export function formatShareJobLabel(): string {
  return "Share Job";
}
