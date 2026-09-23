export const OUTCOME_VALUES = ["completed", "no_show", "cancelled"] as const;

export type OutcomeValue = (typeof OUTCOME_VALUES)[number];

export const OUTCOME_OPTIONS = [
  { value: "completed" as const, label: "Interview Completed" },
  { value: "no_show" as const, label: "Candidate No-Show" },
  { value: "cancelled" as const, label: "Interview Cancelled" },
] satisfies ReadonlyArray<{ value: OutcomeValue; label: string }>;
