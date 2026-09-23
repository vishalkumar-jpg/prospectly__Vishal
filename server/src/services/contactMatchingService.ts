/**
 * ============================================================================
 * SMART CONTACT MATCHING ENGINE v2.0
 * ============================================================================
 *
 * This service provides intelligent duplicate detection for contact imports.
 * It is the SINGLE entry point for all contact matching operations across
 * all import sources (Google, Microsoft, Apple, CSV, manual).
 *
 * MATCHING STRATEGY:
 * 1. Primary Match (Auto-Match = 1.0): Exact matches on:
 *    - Email (primary ↔ primary, primary ↔ secondary, secondary ↔ primary)
 *    - Phone (with international format normalization)
 *    - LinkedIn (profile slug extraction)
 *
 * 2. Weighted Scoring: Fuzzy matching when no primary match found
 *    - Email similarity with domain matching
 *    - Phone similarity with country code handling
 *    - Name similarity with nickname/initial detection
 *    - Company similarity with suffix normalization (Inc, LLC, Ltd)
 *    - Title similarity
 *    - Location bonus
 *
 * THRESHOLD: Score >= 0.75 = Duplicate (update missing fields only)
 *            Score <  0.75 = New contact (import normally)
 *
 * v2.0 ENHANCEMENTS:
 * - Cross-email matching (primary ↔ secondary)
 * - International phone format handling
 * - Company suffix normalization
 * - Common nickname detection
 * - LinkedIn profile slug extraction
 * - Improved email domain matching for typos
 *
 * ============================================================================
 */

import { db } from "database/db";
import { contacts, contactSensitiveData } from "database/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { createHash } from "node:crypto";
import {
  decryptData,
  encryptData,
  maskEmail,
  maskPhone,
} from "./encryptionService";

// Type for database transaction - extract from db.transaction callback parameter
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/** Threshold for considering a contact as duplicate */
const MATCH_THRESHOLD = 0.75;

/** High confidence threshold (for display purposes) */
const HIGH_CONFIDENCE_THRESHOLD = 0.9;

/** Weight configuration for scoring formula */
const WEIGHTS = {
  EMAIL: 0.3, // Increased - email is most reliable
  PHONE: 0.15,
  NAME: 0.25, // Decreased slightly - names can vary
  COMPANY: 0.18, // Decreased - company names vary a lot
  TITLE: 0.07, // Decreased - titles are very variable
  LOCATION_BONUS: 0.05,
  SECONDARY_EMAIL_MATCH: 0.25, // New: bonus for secondary email match
} as const;

/** Common company suffixes to normalize */
const COMPANY_SUFFIXES = [
  "inc",
  "inc.",
  "incorporated",
  "llc",
  "l.l.c.",
  "l.l.c",
  "ltd",
  "ltd.",
  "limited",
  "corp",
  "corp.",
  "corporation",
  "co",
  "co.",
  "company",
  "plc",
  "p.l.c.",
  "gmbh",
  "ag",
  "sa",
  "sarl",
  "pvt",
  "pvt.",
  "private",
  "pty",
  "pty.",
  "intl",
  "intl.",
  "international",
  "group",
  "holdings",
] as const;

/** Common nickname mappings */
const NICKNAME_MAP: Record<string, string[]> = {
  william: ["will", "bill", "billy", "willy", "liam"],
  robert: ["rob", "bob", "bobby", "robbie"],
  richard: ["rick", "dick", "ricky", "rich"],
  michael: ["mike", "mikey", "mick"],
  james: ["jim", "jimmy", "jamie"],
  john: ["jon", "johnny", "jack"],
  joseph: ["joe", "joey", "jo"],
  thomas: ["tom", "tommy"],
  charles: ["charlie", "chuck", "chas"],
  christopher: ["chris", "kit", "topher"],
  daniel: ["dan", "danny"],
  matthew: ["matt", "matty"],
  anthony: ["tony", "ant"],
  elizabeth: ["liz", "lizzy", "beth", "betty", "eliza", "libby"],
  jennifer: ["jen", "jenny", "jenn"],
  margaret: ["maggie", "meg", "peggy", "margie"],
  katherine: ["kate", "katie", "kathy", "kay", "kat"],
  catherine: ["cathy", "cat", "kate"],
  patricia: ["pat", "patty", "trish"],
  jessica: ["jess", "jessie"],
  stephanie: ["steph", "stephie"],
  nicholas: ["nick", "nicky"],
  alexander: ["alex", "xander", "alec"],
  benjamin: ["ben", "benny", "benji"],
  jonathan: ["jon", "jonny", "nathan"],
  samuel: ["sam", "sammy"],
  david: ["dave", "davy"],
  edward: ["ed", "eddie", "ted", "teddy", "ned"],
  andrew: ["andy", "drew"],
  steven: ["steve", "stevie"],
  stephen: ["steve", "stevie"],
  timothy: ["tim", "timmy"],
  gregory: ["greg", "gregg"],
  raymond: ["ray"],
  joshua: ["josh"],
  kenneth: ["ken", "kenny"],
  patrick: ["pat", "paddy"],
  peter: ["pete"],
  ronald: ["ron", "ronnie"],
  donald: ["don", "donnie"],
  douglas: ["doug", "dougie"],
  lawrence: ["larry", "lars"],
  phillip: ["phil"],
  philip: ["phil"],
  gerald: ["jerry", "gerry"],
  dennis: ["denny"],
  frank: ["frankie"],
  frederick: ["fred", "freddy", "freddie"],
  henry: ["hank", "harry"],
  walter: ["walt", "wally"],
  arthur: ["art", "artie"],
  albert: ["al", "bert", "bertie"],
  prashant: ["pj"],
  pranav: ["pj", "pranavji"],
  rohit: ["ro"],
  sandeep: ["sandy"],
  suresh: ["suri"],
  rajesh: ["raj", "raju"],
  mukesh: ["muki"],
  vikram: ["vik", "vicky"],
  sachin: ["sachi"],
  amit: ["amie"],
};

// ============================================================================
// HASHING UTILITIES
// ============================================================================

/**
 * Generate a SHA-256 hash for data
 *
 * @param data - Data to hash
 * @returns Hex string of hash or null if data is empty
 */
export function hashData(data: string | null | undefined): string | null {
  if (!data) return null;
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Generate all hashes for a contact
 */
export function generateContactHashes(contact: IncomingContact): {
  normalizedEmailHash: string | null;
  normalizedPhoneHash: string | null;
  linkedinHash: string | null;
  normalizedSecondaryEmailHash: string | null;
} {
  const normalizedEmail = normalizeEmail(contact.email);
  const normalizedPhone = normalizePhone(contact.phone);
  const normalizedSecondaryEmail = normalizeEmail(contact.secondaryEmail);
  const normalizedLinkedIn = normalizeLinkedIn(contact.linkedin);

  return {
    normalizedEmailHash: hashData(normalizedEmail),
    normalizedPhoneHash: hashData(normalizedPhone),
    linkedinHash: hashData(normalizedLinkedIn),
    normalizedSecondaryEmailHash: hashData(normalizedSecondaryEmail),
  };
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Incoming contact data for matching
 */
export interface IncomingContact {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  city?: string | null;
  linkedin?: string | null;
  secondaryEmail?: string | null;
  industry?: string | null;
  state?: string | null;
  country?: string | null;
  website?: string | null;
  profilePhotoUrl?: string | null;
  // Hashes for efficient matching
  normalizedEmailHash?: string | null;
  normalizedPhoneHash?: string | null;
  linkedinHash?: string | null;
  normalizedSecondaryEmailHash?: string | null;
}

/**
 * Match types for result reporting
 */
export type MatchType =
  | "primary_email" // Exact email match (primary ↔ primary)
  | "secondary_email_match" // Incoming primary matches existing secondary
  | "cross_email_match" // Incoming secondary matches existing primary
  | "secondary_to_secondary_match" // Incoming secondary matches existing secondary
  | "primary_phone" // Exact phone match
  | "core_phone_match" // Phone match via core digits
  | "primary_linkedin" // LinkedIn profile match
  | "weighted" // Weighted scoring match
  | "none"; // No match found

/**
 * Result of the contact matching operation
 */
export interface MatchResult {
  isMatch: boolean;
  score: number;
  matchType: MatchType;
  existingContactId: number | null;
  existingSensitiveDataId: number | null;
  fieldsToUpdate: Partial<IncomingContact>;
  /** Confidence level: 'high' (>=0.90), 'medium' (0.75-0.90), 'low' (<0.75) */
  confidence: "high" | "medium" | "low";
  /** Debug info for match explanation */
  matchDetails?: {
    emailScore: number;
    phoneScore: number;
    nameScore: number;
    companyScore: number;
    titleScore: number;
  };
}

/**
 * Decrypted contact cache for performance optimization
 */
export interface DecryptedContactCache {
  contactId: number;
  sensitiveDataId: number | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
  secondaryEmail: string | null;
  normalizedSecondaryEmail: string | null; // For efficient secondary email matching
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  title: string | null;
  city: string | null;
  industry: string | null;
  state: string | null;
  country: string | null;
  website: string | null;
  profilePhotoUrl: string | null;
}

// ============================================================================
// STRING NORMALIZATION UTILITIES
// ============================================================================

/**
 * Normalize email address for consistent comparison
 * - Converts to lowercase
 * - Trims whitespace
 *
 * @param email - Raw email address
 * @returns Normalized email or null if invalid
 */
export function normalizeEmail(
  email: string | null | undefined
): string | null {
  if (!email) return null;
  return email.toLowerCase().trim();
}

/**
 * Normalize phone number for consistent comparison
 * - Removes all characters except digits and leading +
 * - Preserves country code indicator (+)
 * - Handles international formats (00 prefix, spaces, brackets)
 * - Extracts the last 10 digits as the core number for comparison
 *
 * @param phone - Raw phone number
 * @returns Normalized phone (digits only with optional +) or null if invalid
 */
export function normalizePhone(
  phone: string | null | undefined
): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[\s[\]\-()./\\]/g, "");

  // Handle 00 international prefix (convert to +)
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // Keep + only if it's at the start
  if (cleaned.startsWith("+")) {
    return "+" + cleaned.slice(1).replace(/\D/g, "");
  }

  return cleaned.replace(/\D/g, "");
}

/**
 * Extract core phone number for comparison (last 10 digits)
 * This helps match numbers with/without country codes
 *
 * @param normalizedPhone - Already normalized phone
 * @returns Core phone digits (last 10 digits)
 */
export function extractCorePhone(
  normalizedPhone: string | null
): string | null {
  if (!normalizedPhone) return null;

  // Extract only digits
  const digits = normalizedPhone.replace(/\D/g, "");

  // If less than 10 digits, return as is
  if (digits.length <= 10) return digits;

  // Return last 10 digits (removes country code)
  return digits.slice(-10);
}

/**
 * Normalize LinkedIn URL for consistent comparison
 * - Extracts the profile slug/username
 * - Handles various LinkedIn URL formats
 * - Removes trailing slashes, query parameters, and locale prefixes
 *
 * @param linkedin - Raw LinkedIn URL or username
 * @returns Normalized LinkedIn profile slug or null if invalid
 */
export function normalizeLinkedIn(
  linkedin: string | null | undefined
): string | null {
  if (!linkedin) return null;

  let url = linkedin.toLowerCase().trim();

  // Remove protocol and www
  url = url.replace(/^https?:\/\/(www\.)?/, "");

  // Remove linkedin.com domain variations
  url = url.replace(/^([\w-]+\.)?linkedin\.com\/?/, "");

  // Remove locale prefixes (e.g., /in/, /uk/, /de/)
  url = url.replace(/^[a-z]{2}\//, "");

  // Remove /in/ prefix for profile URLs
  url = url.replace(/^in\//, "");

  // Remove trailing slashes and query strings
  url = url.replace(/\?.*$/, "").replace(/\/+$/, "");

  // Remove any remaining path components after the username
  // e.g., "johnsmith/detail/recent-activity" -> "johnsmith"
  const parts = url.split("/").filter(Boolean);
  if (parts.length > 0) {
    url = parts[0];
  }

  // If it's just a username (no slashes), return it
  return url || null;
}

/**
 * Normalize company name for comparison
 * - Removes common suffixes (Inc, LLC, Ltd, Corp, etc.)
 * - Normalizes whitespace and case
 * - Handles "The" prefix
 *
 * @param company - Raw company name
 * @returns Normalized company name
 */
export function normalizeCompany(company: string | null | undefined): string {
  if (!company) return "";

  let normalized = company.toLowerCase().trim();

  // Remove "The" prefix
  normalized = normalized.replace(/^the\s+/i, "");

  // Remove common suffixes
  for (const suffix of COMPANY_SUFFIXES) {
    // Match suffix at end of string, possibly preceded by comma or space
    const regex = new RegExp(`[,\\s]+${suffix.replace(/\./g, "\\.")}$`, "i");
    normalized = normalized.replace(regex, "");
  }

  // Also try without comma/space prefix
  for (const suffix of COMPANY_SUFFIXES) {
    const regex = new RegExp(`\\s*${suffix.replace(/\./g, "\\.")}$`, "i");
    normalized = normalized.replace(regex, "");
  }

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Check if two names might be nickname variations
 *
 * @param name1 - First name
 * @param name2 - Second name
 * @returns True if names are nickname matches
 */
export function areNicknameVariants(
  name1: string | null,
  name2: string | null
): boolean {
  if (!name1 || !name2) return false;

  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  // Exact match
  if (n1 === n2) return true;

  // Check if one is a nickname of the other
  for (const entry of Object.entries(NICKNAME_MAP)) {
    const [formal, nicknames] = entry;
    if (n1 === formal && nicknames.includes(n2)) return true;
    if (n2 === formal && nicknames.includes(n1)) return true;
    if (nicknames.includes(n1) && nicknames.includes(n2)) return true;
  }

  return false;
}

/**
 * Normalize a generic string for comparison
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple spaces
 *
 * @param str - Input string
 * @returns Normalized string or empty string if null
 */
function normalizeString(str: string | null | undefined): string {
  if (!str) return "";
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

// ============================================================================
// LEVENSHTEIN DISTANCE ALGORITHM
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 * This is the minimum number of single-character edits (insertions, deletions,
 * or substitutions) required to change one string into the other.
 *
 * Uses dynamic programming with O(min(m,n)) space optimization.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance (0 = identical)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Early exit for identical strings
  if (s1 === s2) return 0;

  // Early exit for empty strings
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  // Ensure s1 is the shorter string for space optimization
  const [shorter, longer] = s1.length <= s2.length ? [s1, s2] : [s2, s1];

  // Use single array instead of matrix (space optimization)
  let previousRow = Array.from({ length: shorter.length + 1 }, (_, i) => i);

  for (let i = 1; i <= longer.length; i++) {
    const currentRow = [i];

    for (let j = 1; j <= shorter.length; j++) {
      const cost = longer[i - 1] === shorter[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        previousRow[j] + 1, // deletion
        currentRow[j - 1] + 1, // insertion
        previousRow[j - 1] + cost // substitution
      );
    }

    previousRow = currentRow;
  }

  return previousRow[shorter.length];
}

/**
 * Calculate similarity score based on Levenshtein distance
 *
 * Formula: similarity = 1 - (levenshtein_distance / max(len(str1), len(str2)))
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score between 0 (completely different) and 1 (identical)
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  // Handle empty strings
  if (!s1 && !s2) return 1; // Both empty = perfect match
  if (!s1 || !s2) return 0; // One empty = no match

  const maxLength = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);

  return 1 - distance / maxLength;
}

// ============================================================================
// INDIVIDUAL FIELD SCORING FUNCTIONS
// ============================================================================

/** Common email domain typos and their corrections */
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmaill.com": "gmail.com",
  "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "homail.com": "hotmail.com",
  "hotamil.com": "hotmail.com",
  "outloook.com": "outlook.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.co": "outlook.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yhoo.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahho.com": "yahoo.com",
  "yaoo.com": "yahoo.com",
  "iclould.com": "icloud.com",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
  "icloud.co": "icloud.com",
  "aol.co": "aol.com",
  "protonmal.com": "protonmail.com",
  "protonmai.com": "protonmail.com",
};

/**
 * Normalize email domain (fix common typos)
 *
 * @param domain - Email domain
 * @returns Corrected domain or original if no typo detected
 */
function normalizeDomain(domain: string): string {
  const lower = domain.toLowerCase();
  return DOMAIN_TYPOS[lower] || lower;
}

/**
 * Check if two domains are similar (accounting for typos)
 *
 * @param domain1 - First domain
 * @param domain2 - Second domain
 * @returns True if domains are the same or typo variants
 */
function areDomainsSimilar(domain1: string, domain2: string): boolean {
  const norm1 = normalizeDomain(domain1);
  const norm2 = normalizeDomain(domain2);

  // Exact match after normalization
  if (norm1 === norm2) return true;

  // Check Levenshtein similarity for domains (allow 1 character difference)
  if (levenshteinDistance(norm1, norm2) <= 1) return true;

  return false;
}

/**
 * Calculate email similarity score
 *
 * Scoring Rules:
 * - Exact match: 1.0
 * - Same local part + similar domain (typo): 0.95
 * - Same domain (exact or typo-corrected): 0.35
 * - High local part similarity + same domain: 0.6
 * - Otherwise: Levenshtein similarity
 *
 * @param incoming - Incoming email
 * @param existing - Existing email
 * @returns Score between 0 and 1
 */
function scoreEmail(incoming: string | null, existing: string | null): number {
  const incomingNorm = normalizeEmail(incoming);
  const existingNorm = normalizeEmail(existing);

  // If either is missing, no match possible
  if (!incomingNorm || !existingNorm) return 0;

  // Exact match
  if (incomingNorm === existingNorm) return 1.0;

  // Split into local part and domain
  const [incomingLocal, incomingDomain] = incomingNorm.split("@");
  const [existingLocal, existingDomain] = existingNorm.split("@");

  if (!incomingDomain || !existingDomain) return 0;

  // Check domain similarity (including typos)
  const domainsSimilar = areDomainsSimilar(incomingDomain, existingDomain);

  // Same local part with similar domain (likely a typo in domain)
  if (incomingLocal === existingLocal && domainsSimilar) {
    return 0.95;
  }

  // Same domain - check local part similarity
  if (domainsSimilar) {
    const localSimilarity = levenshteinSimilarity(incomingLocal, existingLocal);

    // High local part similarity (same person, different email format)
    if (localSimilarity >= 0.85) {
      return 0.6;
    }

    // Same domain gives a base score
    return 0.35;
  }

  // Fallback to full email Levenshtein similarity
  return levenshteinSimilarity(incomingNorm, existingNorm);
}

/**
 * Calculate phone similarity score
 *
 * Scoring Rules:
 * - Exact match (normalized): 1.0
 * - Core phone match (last 10 digits): 0.95
 * - One contains the other: 0.85 (handles country code differences)
 * - Otherwise: 0
 *
 * @param incoming - Incoming phone
 * @param existing - Existing phone
 * @returns Score between 0 and 1
 */
function scorePhone(incoming: string | null, existing: string | null): number {
  const incomingNorm = normalizePhone(incoming);
  const existingNorm = normalizePhone(existing);

  // If either is missing, no match possible
  if (!incomingNorm || !existingNorm) return 0;

  // Exact match
  if (incomingNorm === existingNorm) return 1.0;

  // Check core phone match (last 10 digits - most reliable for different formats)
  const incomingCore = extractCorePhone(incomingNorm);
  const existingCore = extractCorePhone(existingNorm);

  if (incomingCore && existingCore && incomingCore === existingCore) {
    return 0.95;
  }

  // Check if one contains the other (handles country code differences)
  const incomingDigits = incomingNorm.replace(/\D/g, "");
  const existingDigits = existingNorm.replace(/\D/g, "");

  if (incomingDigits.length >= 7 && existingDigits.length >= 7) {
    if (
      incomingDigits.includes(existingDigits) ||
      existingDigits.includes(incomingDigits)
    ) {
      return 0.85;
    }
  }

  return 0;
}

/**
 * Calculate name similarity score
 *
 * Combines first name and last name for comparison.
 * Uses Levenshtein similarity with nickname detection.
 *
 * Scoring Strategy:
 * 1. Check if first names are nickname variants (0.95)
 * 2. Check first initial match with last name match (0.85)
 * 3. Fall back to Levenshtein similarity
 *
 * @param incomingFirst - Incoming first name
 * @param incomingLast - Incoming last name
 * @param existingFirst - Existing first name
 * @param existingLast - Existing last name
 * @returns Similarity score between 0 and 1
 */
function scoreName(
  incomingFirst: string | null,
  incomingLast: string | null,
  existingFirst: string | null,
  existingLast: string | null
): number {
  const incomingFull = `${incomingFirst || ""} ${incomingLast || ""}`.trim();
  const existingFull = `${existingFirst || ""} ${existingLast || ""}`.trim();

  // If both are empty, consider it a match
  if (!incomingFull && !existingFull) return 1;

  // If only one is empty, no match
  if (!incomingFull || !existingFull) return 0;

  // Calculate last name similarity first
  const lastNameSimilarity = levenshteinSimilarity(
    incomingLast || "",
    existingLast || ""
  );

  // Check for nickname variants in first name
  if (areNicknameVariants(incomingFirst, existingFirst)) {
    // Nickname match - high confidence if last name also matches
    if (lastNameSimilarity > 0.8) {
      return 0.95;
    }
    return 0.7; // Nickname match but different last name
  }

  // Check first initial match with strong last name match
  const incomingFirstInitial = (incomingFirst || "")[0]?.toLowerCase();
  const existingFirstInitial = (existingFirst || "")[0]?.toLowerCase();

  if (
    incomingFirstInitial &&
    existingFirstInitial &&
    incomingFirstInitial === existingFirstInitial &&
    lastNameSimilarity > 0.85
  ) {
    // "J. Smith" matches "John Smith"
    return 0.85;
  }

  // Fall back to full name Levenshtein similarity
  const fullNameSimilarity = levenshteinSimilarity(incomingFull, existingFull);

  // Weight individual components: first name (40%), last name (60%)
  const firstNameSimilarity = levenshteinSimilarity(
    incomingFirst || "",
    existingFirst || ""
  );
  const componentScore = firstNameSimilarity * 0.4 + lastNameSimilarity * 0.6;

  // Return the higher of the two approaches
  return Math.max(fullNameSimilarity, componentScore);
}

/**
 * Calculate company similarity score
 *
 * Uses Levenshtein similarity after normalizing company names
 * (removing suffixes like Inc, LLC, Ltd, Corp, etc.)
 *
 * @param incoming - Incoming company
 * @param existing - Existing company
 * @returns Similarity score between 0 and 1
 */
function scoreCompany(
  incoming: string | null,
  existing: string | null
): number {
  // Normalize company names (removes Inc, LLC, Ltd, etc.)
  const incomingNorm = normalizeCompany(incoming);
  const existingNorm = normalizeCompany(existing);

  // If both empty, perfect match
  if (!incomingNorm && !existingNorm) return 1;

  // If one is empty, no match
  if (!incomingNorm || !existingNorm) return 0;

  // Exact match after normalization
  if (incomingNorm === existingNorm) return 1.0;

  // Check if one contains the other (e.g., "Google" matches "Google Cloud")
  if (
    incomingNorm.includes(existingNorm) ||
    existingNorm.includes(incomingNorm)
  ) {
    const shorter = Math.min(incomingNorm.length, existingNorm.length);
    const longer = Math.max(incomingNorm.length, existingNorm.length);
    // Return a score based on how much of the name matches
    return 0.7 + 0.3 * (shorter / longer);
  }

  return levenshteinSimilarity(incomingNorm, existingNorm);
}

/**
 * Calculate title similarity score
 *
 * Uses Levenshtein similarity after normalization.
 *
 * @param incoming - Incoming title
 * @param existing - Existing title
 * @returns Similarity score between 0 and 1
 */
function scoreTitle(incoming: string | null, existing: string | null): number {
  return levenshteinSimilarity(incoming || "", existing || "");
}

/**
 * Calculate location bonus
 *
 * Returns bonus if city matches exactly (case-insensitive).
 *
 * @param incomingCity - Incoming city
 * @param existingCity - Existing city
 * @returns 0.05 if cities match, 0 otherwise
 */
function scoreLocation(
  incomingCity: string | null,
  existingCity: string | null
): number {
  const incomingNorm = normalizeString(incomingCity);
  const existingNorm = normalizeString(existingCity);

  if (incomingNorm && existingNorm && incomingNorm === existingNorm) {
    return WEIGHTS.LOCATION_BONUS;
  }

  return 0;
}

// ============================================================================
// WEIGHTED SCORING CALCULATOR
// ============================================================================

/**
 * Score details for debugging and transparency
 */
interface ScoreDetails {
  emailScore: number;
  phoneScore: number;
  nameScore: number;
  companyScore: number;
  titleScore: number;
}

/**
 * Calculate the weighted match score between incoming and existing contact
 *
 * Formula (v2.0):
 * Total Score = (Email × 0.30) + (Phone × 0.15) + (Name × 0.25)
 *             + (Company × 0.18) + (Title × 0.07) + Location Bonus
 *
 * @param incoming - Incoming contact data
 * @param existing - Existing contact with decrypted sensitive data
 * @returns Weighted score between 0 and 1 (plus potential location bonus)
 */
/**
 * Calculate the weighted match score with detailed breakdown
 *
 * @param incoming - Incoming contact data
 * @param existing - Existing contact with decrypted sensitive data
 * @returns Object with total score and individual component scores
 */
function calculateWeightedScoreWithDetails(
  incoming: IncomingContact,
  existing: DecryptedContactCache
): { score: number; details: ScoreDetails } {
  // Calculate individual field scores
  const emailScore = scoreEmail(incoming.email, existing.email);
  const phoneScore = scorePhone(incoming.phone, existing.phone);
  const nameScore = scoreName(
    incoming.firstName,
    incoming.lastName,
    existing.firstName,
    existing.lastName
  );
  const companyScore = scoreCompany(incoming.company, existing.company);
  const titleScore = scoreTitle(incoming.title, existing.title);
  const locationBonus = scoreLocation(incoming.city, existing.city);

  // NEW: Check for secondary email match (adds bonus)
  let secondaryEmailBonus = 0;
  const incomingSecondaryNorm = normalizeEmail(incoming.secondaryEmail);
  const existingNormEmail = normalizeEmail(existing.email);
  const existingSecondaryNorm = normalizeEmail(existing.secondaryEmail);

  if (incomingSecondaryNorm) {
    // Check if incoming secondary matches existing primary or secondary
    if (existingNormEmail && incomingSecondaryNorm === existingNormEmail) {
      secondaryEmailBonus = WEIGHTS.SECONDARY_EMAIL_MATCH;
    } else if (
      existingSecondaryNorm &&
      incomingSecondaryNorm === existingSecondaryNorm
    ) {
      secondaryEmailBonus = WEIGHTS.SECONDARY_EMAIL_MATCH * 0.8; // Slightly lower for secondary-to-secondary
    }
  }

  // Apply weights
  let weightedScore =
    emailScore * WEIGHTS.EMAIL +
    phoneScore * WEIGHTS.PHONE +
    nameScore * WEIGHTS.NAME +
    companyScore * WEIGHTS.COMPANY +
    titleScore * WEIGHTS.TITLE +
    locationBonus +
    secondaryEmailBonus;

  // Cap score at 1.0
  weightedScore = Math.min(weightedScore, 1.0);

  return {
    score: weightedScore,
    details: {
      emailScore,
      phoneScore,
      nameScore,
      companyScore,
      titleScore,
    },
  };
}

// ============================================================================
// PRIMARY MATCHING (EXACT MATCHES)
// ============================================================================

/** Match types for primary matching */
type PrimaryMatchType =
  | "primary_email"
  | "secondary_email_match" // Incoming primary matches existing secondary
  | "cross_email_match" // Incoming secondary matches existing primary
  | "secondary_to_secondary_match" // Incoming secondary matches existing secondary
  | "primary_phone"
  | "core_phone_match" // Phone match via core digits (country code difference)
  | "primary_linkedin";

/**
 * Strength ranking for primary matches (lower wins).
 *
 * Several contacts can legitimately carry the same LinkedIn URL or phone
 * number, so "first primary match encountered" is not safe — the candidate
 * list has no guaranteed order.
 *
 * Order of confidence:
 *  1. Email — the account identity, unique per user.
 *  2. LinkedIn — one URL identifies one profile.
 *  3. Phone — weakest: numbers get recycled between people, and
 *     `core_phone_match` compares only the trailing digits, so it can collide
 *     across country codes.
 */
const PRIMARY_MATCH_PRIORITY: Record<PrimaryMatchType, number> = {
  primary_email: 0,
  secondary_email_match: 1,
  cross_email_match: 2,
  secondary_to_secondary_match: 3,
  primary_linkedin: 4,
  primary_phone: 5,
  core_phone_match: 6,
};

/**
 * Check for exact primary match on email, phone, or LinkedIn
 *
 * This is the first pass of matching. If any primary field matches exactly,
 * the contact is considered a 100% duplicate.
 *
 * Email matching scenarios:
 * - Primary ↔ Primary: Incoming primary email matches existing primary email
 * - Primary ↔ Secondary: Incoming primary email matches existing secondary email
 * - Secondary ↔ Primary: Incoming secondary email matches existing primary email
 * - Secondary ↔ Secondary: Incoming secondary email matches existing secondary email
 *
 * Phone matching:
 * - Exact match after normalization
 * - Core digits match (last 10 digits - handles country code differences)
 *
 * LinkedIn matching:
 * - Profile slug extraction and comparison
 *
 * @param incoming - Incoming contact
 * @param existing - Existing contact with decrypted data
 * @returns Match type if found, null otherwise
 */
function checkPrimaryMatch(
  incoming: IncomingContact,
  existing: DecryptedContactCache
): PrimaryMatchType | null {
  // Normalize all email fields upfront
  const incomingNormEmail = normalizeEmail(incoming.email);
  const incomingNormSecondaryEmail = normalizeEmail(incoming.secondaryEmail);
  const existingNormSecondaryEmail =
    existing.normalizedSecondaryEmail ||
    normalizeEmail(existing.secondaryEmail);

  // =========================================================================
  // EMAIL MATCHING (All 4 scenarios per SMART_CONTACT_MATCHING_ENGINE.md)
  // =========================================================================

  // Scenario 1: Primary ↔ Primary (incoming primary vs existing primary)
  if (incomingNormEmail && existing.normalizedEmail) {
    if (incomingNormEmail === existing.normalizedEmail) {
      return "primary_email";
    }
  }

  // Scenario 2: Primary ↔ Secondary (incoming primary vs existing secondary)
  if (incomingNormEmail && existingNormSecondaryEmail) {
    if (incomingNormEmail === existingNormSecondaryEmail) {
      return "secondary_email_match";
    }
  }

  // Scenario 3: Secondary ↔ Primary (incoming secondary vs existing primary)
  if (incomingNormSecondaryEmail && existing.normalizedEmail) {
    if (incomingNormSecondaryEmail === existing.normalizedEmail) {
      return "cross_email_match";
    }
  }

  // Scenario 4: Secondary ↔ Secondary (incoming secondary vs existing secondary)
  // This is CRITICAL for detecting duplicates when only secondary email matches!
  if (incomingNormSecondaryEmail && existingNormSecondaryEmail) {
    if (incomingNormSecondaryEmail === existingNormSecondaryEmail) {
      return "secondary_to_secondary_match";
    }
  }

  // =========================================================================
  // LINKEDIN MATCHING
  // =========================================================================

  const incomingLinkedIn = normalizeLinkedIn(incoming.linkedin);
  const existingLinkedIn = normalizeLinkedIn(existing.linkedin);
  if (incomingLinkedIn && existingLinkedIn && incomingLinkedIn.length >= 3) {
    if (incomingLinkedIn === existingLinkedIn) {
      return "primary_linkedin";
    }
  }

  // =========================================================================
  // PHONE MATCHING
  // =========================================================================

  const incomingNormPhone = normalizePhone(incoming.phone);
  if (incomingNormPhone && existing.normalizedPhone) {
    // Exact match after normalization
    if (incomingNormPhone === existing.normalizedPhone) {
      return "primary_phone";
    }

    // Core phone match (last 10 digits - handles country code differences)
    const incomingCore = extractCorePhone(incomingNormPhone);
    const existingCore = extractCorePhone(existing.normalizedPhone);
    if (
      incomingCore &&
      existingCore &&
      incomingCore.length >= 10 &&
      incomingCore === existingCore
    ) {
      return "core_phone_match";
    }
  }

  return null;
}

// ============================================================================
// MISSING FIELDS DETECTION
// ============================================================================

/**
 * Identify fields that exist in incoming contact but are missing in existing contact
 *
 * These fields should be updated on the existing contact.
 *
 * @param incoming - Incoming contact data
 * @param existing - Existing contact data
 * @returns Object containing only the fields that should be updated
 */
function identifyMissingFields(
  incoming: IncomingContact,
  existing: DecryptedContactCache
): Partial<IncomingContact> {
  const fieldsToUpdate: Partial<IncomingContact> = {};

  // Check each field - only update if existing is empty/null and incoming has value
  if (!existing.firstName && incoming.firstName) {
    fieldsToUpdate.firstName = incoming.firstName;
  }
  if (!existing.lastName && incoming.lastName) {
    fieldsToUpdate.lastName = incoming.lastName;
  }
  if (!existing.email && incoming.email) {
    fieldsToUpdate.email = incoming.email;
  }
  if (!existing.phone && incoming.phone) {
    fieldsToUpdate.phone = incoming.phone;
  }
  if (!existing.company && incoming.company) {
    fieldsToUpdate.company = incoming.company;
  }
  if (!existing.title && incoming.title) {
    fieldsToUpdate.title = incoming.title;
  }
  if (!existing.city && incoming.city) {
    fieldsToUpdate.city = incoming.city;
  }
  if (!existing.linkedin && incoming.linkedin) {
    fieldsToUpdate.linkedin = incoming.linkedin;
  }
  if (!existing.secondaryEmail && incoming.secondaryEmail) {
    fieldsToUpdate.secondaryEmail = incoming.secondaryEmail;
  }
  if (!existing.industry && incoming.industry) {
    fieldsToUpdate.industry = incoming.industry;
  }
  if (!existing.state && incoming.state) {
    fieldsToUpdate.state = incoming.state;
  }
  if (!existing.country && incoming.country) {
    fieldsToUpdate.country = incoming.country;
  }
  if (!existing.website && incoming.website) {
    fieldsToUpdate.website = incoming.website;
  }
  if (!existing.profilePhotoUrl && incoming.profilePhotoUrl) {
    fieldsToUpdate.profilePhotoUrl = incoming.profilePhotoUrl;
  }

  return fieldsToUpdate;
}

// ============================================================================
// CONTACT DATA LOADING & DECRYPTION
// ============================================================================

/**
 * Load all contacts for a user and decrypt their sensitive data
 *
 * This function fetches all contacts with their sensitive data and decrypts
 * the normalized fields for matching. The result is cached for the duration
 * of the import operation.
 *
 * @param userId - User ID to load contacts for
 * @returns Array of decrypted contact cache objects
 */
export async function loadUserContactsForMatching(
  userId: string
): Promise<DecryptedContactCache[]> {
  // Fetch all active contacts with their sensitive data
  const contactsWithSensitive = await db
    .select({
      contact: {
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        company: contacts.company,
        title: contacts.title,
        city: contacts.city,
        linkedin: contacts.linkedin,
        industry: contacts.industry,
        state: contacts.state,
        country: contacts.country,
        website: contacts.website,
        profilePhotoUrl: contacts.profilePhotoUrl,
      },
      sensitive: {
        id: contactSensitiveData.id,
        email: contactSensitiveData.email,
        phone: contactSensitiveData.phone,
        linkedin: contactSensitiveData.linkedin,
        secondaryEmail: contactSensitiveData.secondaryEmail,
        normalizedEmail: contactSensitiveData.normalizedEmail,
        normalizedPhone: contactSensitiveData.normalizedPhone,
        normalizedSecondaryEmail: contactSensitiveData.normalizedSecondaryEmail,
      },
    })
    .from(contacts)
    .leftJoin(
      contactSensitiveData,
      eq(contacts.id, contactSensitiveData.contactId)
    )
    .where(
      and(eq(contacts.originalImporterId, userId), isNull(contacts.deletedAt))
    );

  // Decrypt normalized fields for each contact
  const decryptedContacts: DecryptedContactCache[] = await Promise.all(
    contactsWithSensitive.map(async (row) => {
      let normalizedEmail: string | null = null;
      let normalizedPhone: string | null = null;
      let normalizedSecondaryEmail: string | null = null;
      let email: string | null = null;
      let phone: string | null = null;
      let linkedin: string | null = null;
      let secondaryEmail: string | null = null;

      if (row.sensitive) {
        // Decrypt the normalized fields for matching
        if (row.sensitive.normalizedEmail) {
          try {
            normalizedEmail = await decryptData(row.sensitive.normalizedEmail);
          } catch {
            // Failed to decrypt normalized email - continue without it
          }
        }

        if (row.sensitive.normalizedPhone) {
          try {
            normalizedPhone = await decryptData(row.sensitive.normalizedPhone);
          } catch {
            // Failed to decrypt normalized phone - continue without it
          }
        }

        // Decrypt normalized secondary email for matching
        if (row.sensitive.normalizedSecondaryEmail) {
          try {
            normalizedSecondaryEmail = await decryptData(
              row.sensitive.normalizedSecondaryEmail
            );
          } catch {
            // Failed to decrypt normalized secondary email - continue without it
          }
        }

        // Decrypt primary fields for weighted matching
        if (row.sensitive.email) {
          try {
            email = await decryptData(row.sensitive.email);
          } catch {
            // Failed to decrypt email - continue without it
          }
        }

        if (row.sensitive.phone) {
          try {
            phone = await decryptData(row.sensitive.phone);
          } catch {
            // Failed to decrypt phone - continue without it
          }
        }

        if (row.sensitive.linkedin) {
          try {
            linkedin = await decryptData(row.sensitive.linkedin);
          } catch {
            // Failed to decrypt linkedin - continue without it
          }
        }

        if (row.sensitive.secondaryEmail) {
          try {
            secondaryEmail = await decryptData(row.sensitive.secondaryEmail);
          } catch {
            // Failed to decrypt secondary email - continue without it
          }
        }
      }

      return {
        contactId: row.contact.id,
        sensitiveDataId: row.sensitive?.id || null,
        email,
        phone,
        linkedin,
        normalizedEmail,
        normalizedPhone,
        secondaryEmail,
        normalizedSecondaryEmail,
        firstName: row.contact.firstName,
        lastName: row.contact.lastName,
        company: row.contact.company,
        title: row.contact.title,
        city: row.contact.city,
        industry: row.contact.industry,
        state: row.contact.state,
        country: row.contact.country,
        website: row.contact.website,
        profilePhotoUrl: row.contact.profilePhotoUrl,
      };
    })
  );

  return decryptedContacts;
}

// ============================================================================
// MAIN MATCHING FUNCTION
// ============================================================================

/**
 * Calculate confidence level based on score
 */
function getConfidenceLevel(score: number): "high" | "medium" | "low" {
  if (score >= HIGH_CONFIDENCE_THRESHOLD) return "high";
  if (score >= MATCH_THRESHOLD) return "medium";
  return "low";
}

/**
 * Find a matching contact for the incoming contact data
 *
 * This is the MAIN ENTRY POINT for all contact matching operations.
 * All import sources (Google, Microsoft, Apple, CSV) must use this function.
 *
 * MATCHING ALGORITHM (v2.0):
 * 1. Primary Match: Check exact matches on:
 *    - Email (primary ↔ primary, primary ↔ secondary, secondary ↔ primary)
 *    - Phone (with core digit matching for country code differences)
 *    - LinkedIn (profile slug extraction)
 *    If found: Score = 1.0, Match = true
 *
 * 2. Weighted Score: If no primary match, calculate weighted similarity:
 *    - Email (30%): exact=1.0, domain=0.3, else Levenshtein
 *    - Phone (15%): exact=1.0, core=0.95, contains=0.85, else 0
 *    - Name (25%): Levenshtein with nickname detection
 *    - Company (18%): Levenshtein with suffix normalization
 *    - Title (7%): Levenshtein similarity
 *    - Location: +5% bonus if city matches
 *
 * 3. Decision:
 *    - Score >= 0.75: Duplicate (update missing fields only)
 *    - Score <  0.75: New contact (import normally)
 *
 * @param incoming - Incoming contact data to match
 * @param existingContacts - Pre-loaded and decrypted user contacts
 * @returns MatchResult with score, match type, confidence, and fields to update
 */
export async function findMatchingContact(
  incoming: IncomingContact,
  existingContacts?: DecryptedContactCache[] | null,
  tx?: typeof db | DbTransaction
): Promise<MatchResult> {
  const candidates =
    existingContacts || (await findCandidatesByHash(incoming, tx));

  let bestMatch: MatchResult = {
    isMatch: false,
    score: 0,
    matchType: "none",
    existingContactId: null,
    existingSensitiveDataId: null,
    fieldsToUpdate: {},
    confidence: "low",
  };

  // Strongest primary match seen so far. We cannot return on the first one:
  // when two contacts share a LinkedIn URL, the one that ALSO matches on email
  // is the real person, and it may come second in the candidate list.
  let bestPrimary: {
    existing: DecryptedContactCache;
    matchType: PrimaryMatchType;
  } | null = null;

  // Iterate through all existing contacts to find the best match
  for (const existing of candidates) {
    // Step 1: Check for primary match (exact email/phone/LinkedIn)
    const primaryMatchType = checkPrimaryMatch(incoming, existing);

    if (primaryMatchType) {
      // Primary match found - this is a definite duplicate. Keep scanning so a
      // stronger match type can still win. Ties break on the lowest contact id
      // so the outcome never depends on DB row order.
      const incomingRank = PRIMARY_MATCH_PRIORITY[primaryMatchType];
      const bestRank = bestPrimary
        ? PRIMARY_MATCH_PRIORITY[bestPrimary.matchType]
        : Number.POSITIVE_INFINITY;

      if (
        incomingRank < bestRank ||
        (incomingRank === bestRank &&
          bestPrimary !== null &&
          existing.contactId < bestPrimary.existing.contactId)
      ) {
        bestPrimary = { existing, matchType: primaryMatchType };
      }
      continue;
    }

    // Step 2: Calculate weighted score
    const { score: weightedScore, details } = calculateWeightedScoreWithDetails(
      incoming,
      existing
    );

    // Track the best scoring contact
    if (weightedScore > bestMatch.score) {
      bestMatch = {
        isMatch: weightedScore >= MATCH_THRESHOLD,
        score: weightedScore,
        matchType: "weighted",
        existingContactId: existing.contactId,
        existingSensitiveDataId: existing.sensitiveDataId,
        fieldsToUpdate: identifyMissingFields(incoming, existing),
        confidence: getConfidenceLevel(weightedScore),
        matchDetails: details,
      };
    }
  }

  // A primary match is a definite duplicate and always outranks any weighted
  // score, so it is resolved first.
  if (bestPrimary) {
    return {
      isMatch: true,
      score: 1.0,
      matchType: bestPrimary.matchType,
      existingContactId: bestPrimary.existing.contactId,
      existingSensitiveDataId: bestPrimary.existing.sensitiveDataId,
      fieldsToUpdate: identifyMissingFields(incoming, bestPrimary.existing),
      confidence: "high",
    };
  }

  // Return the best match result
  // If score >= 0.75, it's a match; otherwise, it's a new contact
  if (bestMatch.score < MATCH_THRESHOLD) {
    return {
      isMatch: false,
      score: bestMatch.score,
      matchType: "none",
      existingContactId: null,
      existingSensitiveDataId: null,
      fieldsToUpdate: {},
      confidence: "low",
      matchDetails: bestMatch.matchDetails,
    };
  }

  return bestMatch;
}

// ============================================================================
// UPDATE MISSING FIELDS
// ============================================================================

/**
 * Update an existing contact with missing fields from incoming data
 *
 * This function is called when a duplicate is found and we want to
 * enrich the existing contact with new data that was missing.
 *
 * @param contactId - ID of the existing contact
 * @param sensitiveDataId - ID of the sensitive data record (if exists)
 * @param fieldsToUpdate - Fields to update on the contact
 * @param tx - Optional transaction context (defaults to db)
 * @returns True if update was successful
 */
export async function updateContactMissingFields(
  contactId: number,
  sensitiveDataId: number | null,
  fieldsToUpdate: Partial<IncomingContact>,
  tx: typeof db | DbTransaction = db
): Promise<boolean> {
  // Separate contact fields from sensitive fields
  const contactFields: Record<string, unknown> = {};
  const sensitiveFields: Record<string, string> = {};

  // Map incoming fields to database fields
  if (fieldsToUpdate.firstName)
    contactFields.firstName = fieldsToUpdate.firstName;
  if (fieldsToUpdate.lastName) contactFields.lastName = fieldsToUpdate.lastName;
  if (fieldsToUpdate.company) contactFields.company = fieldsToUpdate.company;
  if (fieldsToUpdate.title) contactFields.title = fieldsToUpdate.title;
  if (fieldsToUpdate.city) contactFields.city = fieldsToUpdate.city;
  if (fieldsToUpdate.industry) contactFields.industry = fieldsToUpdate.industry;
  if (fieldsToUpdate.state) contactFields.state = fieldsToUpdate.state;
  if (fieldsToUpdate.country) contactFields.country = fieldsToUpdate.country;
  if (fieldsToUpdate.website) contactFields.website = fieldsToUpdate.website;
  if (fieldsToUpdate.profilePhotoUrl)
    contactFields.profilePhotoUrl = fieldsToUpdate.profilePhotoUrl;

  // Handle sensitive fields that need encryption
  // Also update masked values in main contacts table for display purposes
  if (fieldsToUpdate.email) {
    sensitiveFields.email = fieldsToUpdate.email;
    // Update masked email in contacts table for display
    contactFields.email = maskEmail(fieldsToUpdate.email);
  }
  if (fieldsToUpdate.phone) {
    sensitiveFields.phone = fieldsToUpdate.phone;
    // Update masked phone in contacts table for display
    contactFields.phoneNumber = maskPhone(fieldsToUpdate.phone);
  }
  if (fieldsToUpdate.linkedin) {
    sensitiveFields.linkedin = fieldsToUpdate.linkedin;
    // Also update linkedin in contacts table (LinkedIn is not masked)
    contactFields.linkedin = fieldsToUpdate.linkedin;
  }
  if (fieldsToUpdate.secondaryEmail) {
    sensitiveFields.secondaryEmail = fieldsToUpdate.secondaryEmail;
    // Note: secondaryEmail is only stored in contact_sensitive_data, not in contacts table
  }

  // Update contact table if there are any fields to update (including masked sensitive fields)
  // This ensures phone_number and email columns in contacts table are updated for display
  if (Object.keys(contactFields).length > 0) {
    contactFields.updatedAt = toUTC();
    contactFields.isTypesenseSynced = false;
    await tx
      .update(contacts)
      .set(contactFields)
      .where(eq(contacts.id, contactId));
  }

  // Update sensitive data if there are sensitive fields
  // Note: If sensitiveDataId is null, we skip updating sensitive data but still update contacts table
  if (Object.keys(sensitiveFields).length > 0 && sensitiveDataId) {
    const encryptedUpdates: Record<string, unknown> = {
      updatedAt: toUTC(),
    };

    // Encrypt each sensitive field
    if (sensitiveFields.email) {
      encryptedUpdates.email = await encryptData(sensitiveFields.email);
      encryptedUpdates.normalizedEmail = await encryptData(
        normalizeEmail(sensitiveFields.email) || ""
      );
    }
    if (sensitiveFields.phone) {
      encryptedUpdates.phone = await encryptData(sensitiveFields.phone);
      encryptedUpdates.normalizedPhone = await encryptData(
        normalizePhone(sensitiveFields.phone) || ""
      );
    }
    if (sensitiveFields.linkedin) {
      encryptedUpdates.linkedin = await encryptData(sensitiveFields.linkedin);
    }
    if (sensitiveFields.secondaryEmail) {
      encryptedUpdates.secondaryEmail = await encryptData(
        sensitiveFields.secondaryEmail
      );
      // Also update normalized secondary email for efficient matching
      encryptedUpdates.normalizedSecondaryEmail = await encryptData(
        normalizeEmail(sensitiveFields.secondaryEmail) || ""
      );
    }

    // Generate hashes for updated fields to enable efficient hash-based matching
    const hashes = generateContactHashes({
      email: sensitiveFields.email || undefined,
      phone: sensitiveFields.phone || undefined,
      linkedin: sensitiveFields.linkedin || undefined,
      secondaryEmail: sensitiveFields.secondaryEmail || undefined,
    });

    // Add hash updates to encryptedUpdates for efficient matching
    if (sensitiveFields.email && hashes.normalizedEmailHash) {
      encryptedUpdates.normalizedEmailHash = hashes.normalizedEmailHash;
    }
    if (sensitiveFields.phone && hashes.normalizedPhoneHash) {
      encryptedUpdates.normalizedPhoneHash = hashes.normalizedPhoneHash;
    }
    if (sensitiveFields.linkedin && hashes.linkedinHash) {
      encryptedUpdates.linkedinHash = hashes.linkedinHash;
    }
    if (sensitiveFields.secondaryEmail && hashes.normalizedSecondaryEmailHash) {
      encryptedUpdates.normalizedSecondaryEmailHash =
        hashes.normalizedSecondaryEmailHash;
    }

    await tx
      .update(contactSensitiveData)
      .set(encryptedUpdates)
      .where(eq(contactSensitiveData.id, sensitiveDataId));
  }

  return true;
}

// ============================================================================
// BATCH MATCHING FOR IMPORT OPERATIONS
// ============================================================================

/**
 * Process a batch of contacts and determine which should be imported
 *
 * This is a convenience function for import operations that need to
 * check multiple contacts at once.
 *
 * @param incomingContacts - Array of incoming contacts
 * @param userId - User ID for loading existing contacts
 * @returns Array of match results for each incoming contact
 */
export async function batchFindMatchingContacts(
  incomingContacts: IncomingContact[],
  userId: string
): Promise<MatchResult[]> {
  // Load and decrypt all existing contacts once
  const existingContacts = await loadUserContactsForMatching(userId);

  // Process each incoming contact
  const results: MatchResult[] = [];

  for (const incoming of incomingContacts) {
    const result = await findMatchingContact(incoming, existingContacts);
    results.push(result);
  }

  return results;
}

// ============================================================================
// GLOBAL/CROSS-USER DEDUPLICATION
// ============================================================================

/**
 * Result from global duplicate check
 */
export interface GlobalDuplicateResult {
  /** Whether a duplicate was found globally */
  hasDuplicate: boolean;
  /** Match score if duplicate found */
  score: number;
  /** User ID who owns the duplicate contact */
  ownerUserId: string | null;
  /** Contact ID of the duplicate */
  existingContactId: number | null;
  /** Match type */
  matchType: MatchType;
  /** Number of users who have this contact */
  userCount: number;
}

/**
 * Load ALL contacts across ALL users for global deduplication
 *
 * ⚠️ WARNING: This is an expensive operation and should be used sparingly.
 * Consider using this only for:
 * - Initial bulk imports
 * - Periodic deduplication jobs
 * - Admin operations
 *
 * @returns Array of all contacts with user ownership info
 */
/**
 * Find matching contact by hash primarily, then fall back to weighted check on candidates
 *
 * @param incoming - Incoming contact with hashes
 * @returns Decrypted candidates that matched by hash
 */
async function findCandidatesByHash(
  incoming: IncomingContact,
  tx: typeof db | DbTransaction = db
): Promise<(DecryptedContactCache & { userId: string })[]> {
  const hashes = generateContactHashes(incoming);
  const conditions = [];

  if (hashes.normalizedEmailHash) {
    conditions.push(
      eq(contactSensitiveData.normalizedEmailHash, hashes.normalizedEmailHash)
    );
    // Also check secondary email hash against primary email hash (cross-match)
    conditions.push(
      eq(
        contactSensitiveData.normalizedSecondaryEmailHash,
        hashes.normalizedEmailHash
      )
    );
  }

  if (hashes.normalizedPhoneHash) {
    conditions.push(
      eq(contactSensitiveData.normalizedPhoneHash, hashes.normalizedPhoneHash)
    );
  }

  if (hashes.linkedinHash) {
    conditions.push(eq(contactSensitiveData.linkedinHash, hashes.linkedinHash));
  }

  if (hashes.normalizedSecondaryEmailHash) {
    conditions.push(
      eq(
        contactSensitiveData.normalizedSecondaryEmailHash,
        hashes.normalizedSecondaryEmailHash
      )
    );
    // Also check primary email hash against secondary email hash (cross-match)
    conditions.push(
      eq(
        contactSensitiveData.normalizedEmailHash,
        hashes.normalizedSecondaryEmailHash
      )
    );
  }

  if (conditions.length === 0) return [];

  // Query DB for any contacts matching these hashes
  const rows = await tx
    .select({
      contact: contacts,
      sensitive: contactSensitiveData,
    })
    .from(contacts)
    .innerJoin(
      contactSensitiveData,
      eq(contacts.id, contactSensitiveData.contactId)
    )
    .where(and(isNull(contacts.deletedAt), or(...conditions)))
    .limit(20); // Limit candidates to avoid performance issues if hash matches too many (unlikely given collision resistance)

  // Map to DecryptedContactCache structure
  // Note: We need to decrypt them to run the full scoring logic (weighted scoring needs plaintext)
  // This is still much more efficient than decrypting EVERYTHING
  const candidates: (DecryptedContactCache & { userId: string })[] = [];

  for (const row of rows) {
    let normalizedEmail: string | null = null;
    let normalizedPhone: string | null = null;
    let normalizedSecondaryEmail: string | null = null;
    let email: string | null = null;
    let phone: string | null = null;
    let linkedin: string | null = null;
    let secondaryEmail: string | null = null;

    if (row.sensitive) {
      try {
        if (row.sensitive.normalizedEmail) {
          normalizedEmail = await decryptData(row.sensitive.normalizedEmail);
        }
        if (row.sensitive.normalizedPhone) {
          normalizedPhone = await decryptData(row.sensitive.normalizedPhone);
        }
        if (row.sensitive.normalizedSecondaryEmail) {
          normalizedSecondaryEmail = await decryptData(
            row.sensitive.normalizedSecondaryEmail
          );
        }
        if (row.sensitive.email) {
          email = await decryptData(row.sensitive.email);
        }
        if (row.sensitive.phone) {
          phone = await decryptData(row.sensitive.phone);
        }
        if (row.sensitive.linkedin) {
          linkedin = await decryptData(row.sensitive.linkedin);
        }
        if (row.sensitive.secondaryEmail) {
          secondaryEmail = await decryptData(row.sensitive.secondaryEmail);
        }
      } catch {
        // Failed to decrypt data - continue without it
      }
    }

    candidates.push({
      userId: row.contact.originalImporterId!,
      contactId: row.contact.id,
      sensitiveDataId: row.sensitive?.id || null,
      email,
      phone,
      linkedin,
      normalizedEmail,
      normalizedPhone,
      secondaryEmail,
      normalizedSecondaryEmail,
      firstName: row.contact.firstName,
      lastName: row.contact.lastName,
      company: row.contact.company,
      title: row.contact.title,
      city: row.contact.city,
      industry: row.contact.industry,
      state: row.contact.state,
      country: row.contact.country,
      website: row.contact.website,
      profilePhotoUrl: row.contact.profilePhotoUrl,
    });
  }
  return candidates;
}

/**
 * Check if a contact exists globally across all users
 *
 * This is useful for:
 * - Preventing true duplicates in the system
 * - Identifying if a contact is already known
 * - Cross-user contact suggestions
 *
 * @param incoming - Incoming contact to check
 * @param globalContacts - Pre-loaded global contacts (optional, will load if not provided)
 * @returns Global duplicate check result
 */
export async function checkGlobalDuplicate(
  incoming: IncomingContact
): Promise<GlobalDuplicateResult> {
  // Find candidates by hash
  const candidates = await findCandidatesByHash(incoming);

  if (candidates.length === 0) {
    return {
      hasDuplicate: false,
      score: 0,
      ownerUserId: null,
      existingContactId: null,
      matchType: "none",
      userCount: 0,
    };
  }

  let bestMatch: GlobalDuplicateResult = {
    hasDuplicate: false,
    score: 0,
    ownerUserId: null,
    existingContactId: null,
    matchType: "none",
    userCount: 0,
  };

  // Track unique users who have matching contacts
  const matchingUsers = new Set<string>();

  for (const existing of candidates) {
    // Check primary match first
    const primaryMatchType = checkPrimaryMatch(incoming, existing);

    if (primaryMatchType) {
      matchingUsers.add(existing.userId);

      if (bestMatch.score < 1.0) {
        bestMatch = {
          hasDuplicate: true,
          score: 1.0,
          ownerUserId: existing.userId,
          existingContactId: existing.contactId,
          matchType: primaryMatchType,
          userCount: matchingUsers.size,
        };
      }
      continue;
    }

    // Calculate weighted score
    const { score } = calculateWeightedScoreWithDetails(incoming, existing);

    if (score >= MATCH_THRESHOLD) {
      matchingUsers.add(existing.userId);

      if (score > bestMatch.score) {
        bestMatch = {
          hasDuplicate: true,
          score,
          ownerUserId: existing.userId,
          existingContactId: existing.contactId,
          matchType: "weighted",
          userCount: matchingUsers.size,
        };
      }
    }
  }

  // Update user count with final tally
  bestMatch.userCount = matchingUsers.size;

  return bestMatch;
}

/**
 * Get matching statistics for a contact across all users
 *
 * @param incoming - Contact to check
 * @returns Statistics about how this contact matches across the system
 */
export async function getContactMatchStats(incoming: IncomingContact): Promise<{
  totalMatches: number;
  uniqueUsers: number;
  matchTypes: Record<MatchType, number>;
  topMatches: Array<{
    userId: string;
    contactId: number;
    score: number;
    matchType: MatchType;
  }>;
}> {
  const candidates = await findCandidatesByHash(incoming);

  const matches: Array<{
    userId: string;
    contactId: number;
    score: number;
    matchType: MatchType;
  }> = [];
  const matchTypeCounts: Record<MatchType, number> = {
    primary_email: 0,
    secondary_email_match: 0,
    cross_email_match: 0,
    secondary_to_secondary_match: 0,
    primary_phone: 0,
    core_phone_match: 0,
    primary_linkedin: 0,
    weighted: 0,
    none: 0,
  };

  const uniqueUsers = new Set<string>();

  for (const existing of candidates) {
    const primaryMatchType = checkPrimaryMatch(incoming, existing);

    if (primaryMatchType) {
      uniqueUsers.add(existing.userId);
      matchTypeCounts[primaryMatchType]++;
      matches.push({
        userId: existing.userId,
        contactId: existing.contactId,
        score: 1.0,
        matchType: primaryMatchType,
      });
      continue;
    }

    const { score } = calculateWeightedScoreWithDetails(incoming, existing);

    if (score >= MATCH_THRESHOLD) {
      uniqueUsers.add(existing.userId);
      matchTypeCounts["weighted"]++;
      matches.push({
        userId: existing.userId,
        contactId: existing.contactId,
        score,
        matchType: "weighted",
      });
    }
  }

  // Sort by score descending and take top 10
  matches.sort((a, b) => b.score - a.score);

  return {
    totalMatches: matches.length,
    uniqueUsers: uniqueUsers.size,
    matchTypes: matchTypeCounts,
    topMatches: matches.slice(0, 10),
  };
}

// ============================================================================
// EXPORTS SUMMARY (v2.0)
// ============================================================================
//
// PUBLIC FUNCTIONS:
// - findMatchingContact()          : Main entry point for single contact matching
// - batchFindMatchingContacts()    : Batch matching for import operations
// - updateContactMissingFields()   : Update existing contact with missing data
// - loadUserContactsForMatching()  : Load and decrypt contacts for matching
//
// GLOBAL DEDUPLICATION:
// - loadAllContactsForGlobalMatching() : Load all contacts across all users
// - checkGlobalDuplicate()             : Check if contact exists globally
// - getContactMatchStats()             : Get matching statistics
//
// UTILITY FUNCTIONS:
// - normalizeEmail()             : Normalize email for comparison
// - normalizePhone()             : Normalize phone for comparison
// - extractCorePhone()           : Extract last 10 digits from phone
// - normalizeLinkedIn()          : Normalize LinkedIn URL for comparison
// - normalizeCompany()           : Normalize company name (remove suffixes)
// - areNicknameVariants()        : Check if names are nickname variants
// - levenshteinDistance()        : Calculate edit distance
// - levenshteinSimilarity()      : Calculate similarity score
//
// ============================================================================
