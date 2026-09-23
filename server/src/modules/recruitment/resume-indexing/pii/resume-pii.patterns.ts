export const PII_PLACEHOLDER = {
  EMAIL: "[EMAIL]",
  PHONE: "[PHONE]",
  URL: "[URL]",
  ID: "[ID]",
  NAME: "[NAME]",
} as const;

/** Government / national identifiers. Matched before phones so counts stay accurate. */
export const GOVERNMENT_ID_PATTERNS: RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/g,
  /\b\d{4}\s\d{4}\s\d{4}\b/g,
  /\b[A-Z]{5}\d{4}[A-Z]\b/g,
  /\b(?:passport|national\s+id|nin|sin|tax\s+id)\s*(?:no\.?|number|#|:)\s*\S+/gi,
];

/** Personal detail lines removed wholesale. Line-anchored so they never fire mid-sentence. */
export const LABELLED_LINE_PATTERN =
  /^[ \t]*(?:date of birth|dob|birth\s?date|marital status|nationality|permanent address|residential address|home address|father'?s name|mother'?s name|spouse'?s name|gender|religion)[ \t]*[:-].*$/gim;

export const EMAIL_PATTERN = /[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.\p{L}{2,24}/giu;

/**
 * Only social / personal profile hosts are redacted. Company and product sites
 * are professional content and must survive.
 */
export const PROFILE_URL_HOSTS = [
  "linkedin.com",
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "medium.com",
  "behance.net",
  "dribbble.com",
  "stackoverflow.com",
  "leetcode.com",
  "hackerrank.com",
  "kaggle.com",
  "calendly.com",
  "t.me",
  "wa.me",
] as const;

const PROFILE_HOST_ALTERNATION = PROFILE_URL_HOSTS.map((host) =>
  host.replace(/\./g, "\\.")
).join("|");

export const PROFILE_URL_PATTERN = new RegExp(
  `(?:https?:\\/\\/)?(?:[\\w-]+\\.)*(?:${PROFILE_HOST_ALTERNATION})\\/[^\\s,;)\\]]*`,
  "gi"
);

/**
 * Deliberately permissive — every hit is re-checked by `isLikelyPhoneNumber`,
 * which is what keeps date ranges, versions and money out of the redactions.
 */
export const PHONE_CANDIDATE_PATTERN = /\+?\d[\d\s().-]{7,20}\d/g;

export const PHONE_LABELLED_PATTERN =
  /\b(?:phone|mobile|tel|telephone|cell|contact|whatsapp)\s*(?:no\.?|number|#)?\s*[:-]\s*[^\n]{0,25}/gi;

export const PHONE_SEPARATORS = new Set([" ", "(", ")", "-", ".", "+"]);

export const PHONE_MIN_DIGITS = 9;
export const PHONE_MAX_DIGITS = 15;

/** Below this, name stripping is too likely to eat a common word. */
export const NAME_TOKEN_MIN_LENGTH = 3;

/** Guards `to_tsvector`, which warns and skips on tokens above ~2 KB. */
export const MAX_TOKEN_LENGTH = 200;

/** Above this share of characters removed, the resume is flagged for review. */
export const HIGH_REMOVAL_RATIO = 0.25;
