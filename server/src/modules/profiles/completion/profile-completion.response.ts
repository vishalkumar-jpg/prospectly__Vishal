import { ProfileCompletionStep } from "./profile-completion.constants";

/** Suggested value for a missing step, derived server-side (e.g. from the client IP). */
export interface CountrySuggestion {
  /** Raw detected ISO alpha-2 code, or null when detection was unavailable. */
  detected: string | null;
  /** True only when `detected` is one of the supported payout countries. */
  supported: boolean;
}

export interface ProfileCompletionSuggestions {
  country?: CountrySuggestion;
}

export interface CurrentOrganization {
  id: string;
  name: string;
  isActive: boolean;
  isVerified: boolean;
}

export interface ProfileCompletionCurrentValues {
  organization: CurrentOrganization | null;
}

export interface ProfileCompletionStatus {
  /** Reflects required steps only — optional steps never block. */
  isComplete: boolean;
  missingSteps: ProfileCompletionStep[];
  /** Optional steps still worth prompting for. */
  optionalSteps: ProfileCompletionStep[];
  /** Present only on the GET, and only for steps that are actually missing. */
  suggestions?: ProfileCompletionSuggestions;
  current?: ProfileCompletionCurrentValues;
}
