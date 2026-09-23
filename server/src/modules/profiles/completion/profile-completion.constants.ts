/**
 * Profile fields collected by the completion gate.
 *
 * Required steps block the app; optional steps are prompted once and can be
 * skipped, after which they are never shown again.
 */
export const PROFILE_COMPLETION_STEPS = {
  COUNTRY: "country",
  ORGANIZATION: "organization",
} as const;

export type ProfileCompletionStep =
  (typeof PROFILE_COMPLETION_STEPS)[keyof typeof PROFILE_COMPLETION_STEPS];

/** Ordered required steps. Drives `isComplete`. */
export const REQUIRED_PROFILE_STEPS: readonly ProfileCompletionStep[] = [
  PROFILE_COMPLETION_STEPS.COUNTRY,
];

/** Ordered optional steps. Prompted once, never part of `isComplete`. */
export const OPTIONAL_PROFILE_STEPS: readonly ProfileCompletionStep[] = [
  PROFILE_COMPLETION_STEPS.ORGANIZATION,
];

export const ORGANIZATION_NAME_MIN_LENGTH = 2;
export const ORGANIZATION_NAME_MAX_LENGTH = 255;

/** Requires at least one letter or digit, so punctuation-only names are rejected. */
export const ORGANIZATION_NAME_PATTERN = /[\p{L}\p{N}]/u;

/**
 * Defaults for an organisation created from the gate. It stays inactive until an
 * admin reviews it.
 */
export const NEW_ORGANIZATION_DEFAULTS = {
  IS_ACTIVE: false,
} as const;

export const ORGANIZATION_LIST_DEFAULT_LIMIT = 20;
export const ORGANIZATION_LIST_MAX_LIMIT = 50;

export const PROFILE_COMPLETION_MESSAGES = {
  ERROR: {
    PROFILE_NOT_FOUND: "Profile not found",
    NO_FIELDS_PROVIDED: "At least one profile detail must be provided",
    COUNTRY_REQUIRED: "Please select your country to continue",
    COUNTRY_INVALID: "Country must be a supported payout country",
    ORGANIZATION_AMBIGUOUS:
      "Provide either an existing organization or a new organization name, not both",
    ORGANIZATION_ALREADY_SET: "Your organization has already been set",
    ORGANIZATION_NOT_FOUND: "Organization not found",
    ORGANIZATION_NAME_TAKEN:
      "An organization with this name already exists. Please select it from the list",
    ORGANIZATION_NAME_INVALID: "Please enter a valid organization name",
    ORGANIZATION_LIMIT_REACHED:
      "You have already created an organization. Please select one from the list",
  },
};
