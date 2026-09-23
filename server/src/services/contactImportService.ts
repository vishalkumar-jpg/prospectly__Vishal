import {
  encryptContactFields,
  maskEmail,
  maskPhone,
  encryptData,
} from "services/encryptionService";
import { toUTC } from "utils/dayjs";
import { db } from "database/db";
import {
  contacts,
  contactSensitiveData,
  contactRelationships,
  contactImportSnapshots,
  contactEnrichments,
} from "database/schema";
import { eq, and } from "drizzle-orm";
import { Logger } from "@nestjs/common";
import { AnyType } from "types/common";
import { v4 as uuidv4 } from "uuid";
import {
  findMatchingContact,
  updateContactMissingFields,
  type IncomingContact,
  type DecryptedContactCache,
  generateContactHashes,
} from "./contactMatchingService";
import { filterDisposableEmails } from "./emailValidationService";

const logger = new Logger("ContactImportService");

// Type for database transaction - extract from db.transaction callback parameter
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Normalize email for matching: trim whitespace + lowercase
 * Example: "Rohit.Sharma@Acme.Co" → "rohit.sharma@acme.co"
 */
export function normalizeEmail(
  email: string | undefined | null
): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

/**
 * Normalize phone for matching: remove all non-digit characters except +
 * Example: "(123) 456-7890" → "1234567890"
 * Example: "+1 (555) 123-4567" → "+15551234567"
 */
export function normalizePhone(
  phone: string | undefined | null
): string | null {
  if (!phone) return null;
  // Keep only digits and + sign, remove spaces, brackets, dashes, dots, parentheses
  return phone.replace(/[\s\-().[\]]/g, "");
}

/**
 * Encrypt normalized email after normalization
 */
export async function encryptNormalizedEmail(
  email: string | undefined | null
): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return await encryptData(normalized);
}

/**
 * Encrypt normalized phone after normalization
 */
export async function encryptNormalizedPhone(
  phone: string | undefined | null
): Promise<string | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return await encryptData(normalized);
}

/**
 * Encrypt normalized secondary email after normalization
 */
export async function encryptNormalizedSecondaryEmail(
  secondaryEmail: string | undefined | null
): Promise<string | null> {
  const normalized = normalizeEmail(secondaryEmail);
  if (!normalized) return null;
  return await encryptData(normalized);
}

/**
 * Contact Import Service
 *
 * Reusable service for importing contacts from any source (CSV, Google, Microsoft, etc.)
 * Handles encryption, deduplication, batch processing, and database persistence.
 *
 * Features:
 * - AES-256-GCM encryption for sensitive data
 * - Email/phone masking for display
 * - Smart duplicate detection
 * - Batch processing for performance
 * - Source tracking for audit trail
 */

export interface ContactImportRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  company?: string;
  title?: string;
  industry?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedin?: string;
  linkedin_connections?: string;
  website?: string;
  secondary_email?: string;
  profile_photo_url?: string;
  source?: string; // Track individual contact source (e.g., "contacts", "gmail_from", "calendar_attendee")
  // Enrichment fields for bounty calculation
  company_domain?: string;
  company_industry?: string;
  company_description?: string;
  company_type?: string;
  location?: string;
  company_linkedin_url?: string;
}

export interface ImportOptions {
  userId: string;
  source: string;
  batchSize?: number;
  allowUpdates?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  duplicates: number;
  errors: number;
  errorMessages: string[];
  totalProcessed: number;
  filtered?: number; // Number of contacts filtered out due to disposable emails
  importedContactIds: number[]; // IDs of newly imported contacts for enrichment queue
  updatedContactIds: number[]; // IDs of existing contacts that had NULL fields updated
}

/**
 * Process result from smart matching
 */
interface ProcessContactResult {
  isDuplicate: boolean;
  wasUpdated: boolean;
  newContactCache: (DecryptedContactCache & { userId: string }) | null;
  relationshipCreated: boolean;
  newContactId: number | null; // ID of newly created contact for enrichment
  existingContactId: number | null; // ID of matched existing contact (for duplicates)
}

/**
 * Ensure a contact_import_snapshot entry exists for a relationship and source
 * Creates the snapshot if it doesn't exist, skips if it already exists
 *
 * @param relationshipId - ID of the contact relationship
 * @param source - Original source value from import
 * @param tx - Optional transaction context (defaults to db)
 * @returns True if snapshot exists/was created, false on error
 */
async function ensureContactImportSnapshot(
  relationshipId: number,
  source: string,
  tx: typeof db | DbTransaction = db
): Promise<boolean> {
  try {
    // Check if snapshot already exists for this relationship and source
    const existingSnapshot = await tx
      .select()
      .from(contactImportSnapshots)
      .where(
        and(
          eq(contactImportSnapshots.relationshipId, relationshipId),
          eq(contactImportSnapshots.sourceType, source)
        )
      )
      .limit(1);

    if (existingSnapshot.length > 0) {
      // Snapshot already exists - do not update, keep existing
      return true;
    }

    // Create new snapshot
    await tx.insert(contactImportSnapshots).values({
      relationshipId,
      sourceType: source,
    });

    return true;
  } catch (error: unknown) {
    // Handle unique constraint violation gracefully (race condition)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      // Snapshot was created by another process - this is fine
      return true;
    }
    // Log error but don't fail the import
    return false;
  }
}

/**
 * Ensure a contact_relationship entry exists for a user and contact
 * Creates the entry if it doesn't exist, returns the relationship ID
 * Source tracking is handled separately via contact_import_snapshots.
 *
 * @param contactId - ID of the contact
 * @param userId - ID of the user
 * @param bountyAmount - Optional bounty amount to set for this relationship
 * @param contactData - Optional contact data to populate relationship-specific fields (firstName, lastName, company, title)
 * @param tx - Optional transaction context (defaults to db)
 * @returns Relationship ID if relationship exists/was created, null on error
 */
async function ensureContactRelationship(
  contactId: number,
  userId: string,
  bountyAmount?: number | null,
  contactData?: {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    title?: string | null;
  },
  tx: typeof db | DbTransaction = db
): Promise<number | null> {
  try {
    // Check if relationship already exists
    const existingRelationship = await tx
      .select()
      .from(contactRelationships)
      .where(
        and(
          eq(contactRelationships.contactId, contactId),
          eq(contactRelationships.userId, userId)
        )
      )
      .limit(1);

    if (existingRelationship.length > 0) {
      const relationshipId = existingRelationship[0].id;
      const relationship = existingRelationship[0];
      const updateData: AnyType = {};

      // Update bounty amount ONLY if:
      // 1. A new bounty is provided (bountyAmount is not undefined/null)
      // 2. The existing bounty is 0 (never set before)
      // This preserves manually updated bounties on reimport
      const existingBounty = Number(relationship.bountyAmount || 0);
      if (
        bountyAmount !== undefined &&
        bountyAmount !== null &&
        existingBounty === 0 &&
        bountyAmount > 0
      ) {
        updateData.bountyAmount = bountyAmount.toString();
      }

      // Update relationship-specific fields if provided and not already set
      // This preserves connector-specific data if already set, but populates on first import
      if (contactData) {
        if (
          contactData.firstName !== undefined &&
          contactData.firstName !== null &&
          !relationship.firstName
        ) {
          updateData.firstName = contactData.firstName;
        }
        if (
          contactData.lastName !== undefined &&
          contactData.lastName !== null &&
          !relationship.lastName
        ) {
          updateData.lastName = contactData.lastName;
        }
        if (
          contactData.company !== undefined &&
          contactData.company !== null &&
          !relationship.company
        ) {
          updateData.company = contactData.company;
        }
        if (
          contactData.title !== undefined &&
          contactData.title !== null &&
          !relationship.title
        ) {
          updateData.title = contactData.title;
        }
      }

      if (Object.keys(updateData).length > 0) {
        updateData.updatedAt = toUTC();
        await tx
          .update(contactRelationships)
          .set(updateData)
          .where(eq(contactRelationships.id, relationshipId));
        // Note: Bounty calculation is deferred to cron job after enrichment
      }

      return relationshipId;
    }

    // Create new relationship with bounty amount, bounty status, and relationship-specific fields
    const relationshipValues: AnyType = {
      contactId,
      userId,
      bountyAmount:
        bountyAmount !== undefined && bountyAmount !== null
          ? bountyAmount.toString()
          : "0",
      bountyStatus: "pending", // Will be updated after bounty calculation
    };

    // Add relationship-specific fields if provided
    if (contactData) {
      if (
        contactData.firstName !== undefined &&
        contactData.firstName !== null
      ) {
        relationshipValues.firstName = contactData.firstName;
      }
      if (contactData.lastName !== undefined && contactData.lastName !== null) {
        relationshipValues.lastName = contactData.lastName;
      }
      if (contactData.company !== undefined && contactData.company !== null) {
        relationshipValues.company = contactData.company;
      }
      if (contactData.title !== undefined && contactData.title !== null) {
        relationshipValues.title = contactData.title;
      }
    }

    const insertedRelationships = await tx
      .insert(contactRelationships)
      .values(relationshipValues)
      .returning({ id: contactRelationships.id });

    const relationshipId = insertedRelationships[0].id;
    // Note: Bounty calculation is deferred to cron job after enrichment

    return relationshipId;
  } catch (error: unknown) {
    // Handle unique constraint violation gracefully (race condition)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      // Relationship was created by another process, fetch it
      const existingRelationship = await tx
        .select()
        .from(contactRelationships)
        .where(
          and(
            eq(contactRelationships.contactId, contactId),
            eq(contactRelationships.userId, userId)
          )
        )
        .limit(1);

      if (existingRelationship.length > 0) {
        return existingRelationship[0].id;
      }
    }
    return null;
  }
}

/**
 * Process a single contact using the Smart Contact Matching Engine
 *
 * This function implements GLOBAL DEDUPLICATION:
 * 1. Uses the smart matching engine to find duplicates GLOBALLY (across all users)
 * 2. If duplicate found:
 *    - Updates missing fields on the existing contact
 *    - Creates a contact_relationship entry for the importing user
 * 3. If new contact:
 *    - Creates the contact in the database with enrichment_request_id for later enrichment
 *    - Creates a contact_relationship entry for the importing user
 *
 * This ensures:
 * - No duplicate contacts in the main contacts table
 * - Every user importing that contact gets their own mapping entry
 * - Contact data becomes richer over time as different users fill in missing fields
 * - New contacts are queued for enrichment via enrichment_request_id
 *
 * All database operations are wrapped in a transaction to ensure atomicity.
 * If any operation fails, all changes are rolled back.
 *
 * Note: Bounty calculation is deferred to a separate cron job after enrichment completes.
 *
 * @param contact - Contact data to import
 * @param userId - User ID doing the import
 * @param source - Import source (google, microsoft, apple, csv)
 * @param allowUpdates - Whether to update existing contacts with missing fields
 * @returns Processing result with duplicate status, new contact cache, and new contact ID
 */
async function processContactWithSmartMatching(
  contact: ContactImportRow,
  userId: string,
  source: string,
  allowUpdates: boolean
): Promise<ProcessContactResult> {
  // Convert ContactImportRow to IncomingContact format
  const incomingContact: IncomingContact = {
    firstName: contact.first_name,
    lastName: contact.last_name,
    email: contact.email,
    phone: contact.phone_number,
    company: contact.company,
    title: contact.title,
    city: contact.city,
    linkedin: contact.linkedin,
    secondaryEmail: contact.secondary_email,
    industry: contact.industry,
    state: contact.state,
    country: contact.country,
    website: contact.website,
    profilePhotoUrl: contact.profile_photo_url,
  };

  // PRE-COMPUTE all encryption and hashing OUTSIDE the transaction
  // This avoids holding DB locks during expensive crypto operations
  const maskedEmail = contact.email ? maskEmail(contact.email) : null;
  const maskedPhone = contact.phone_number
    ? maskPhone(contact.phone_number)
    : null;

  const encryptedFields = await encryptContactFields({
    email: contact.email,
    phone_number: contact.phone_number,
    linkedin: contact.linkedin,
    secondary_email: contact.secondary_email,
  });

  const encryptedNormalizedEmail = await encryptNormalizedEmail(contact.email);
  const encryptedNormalizedPhone = await encryptNormalizedPhone(
    contact.phone_number
  );
  const encryptedNormalizedSecondaryEmail =
    await encryptNormalizedSecondaryEmail(contact.secondary_email);

  const hashes = generateContactHashes(incomingContact);

  // Wrap ALL operations (including matching) in a transaction to ensure atomicity
  // This prevents race conditions where two concurrent imports could both see "no match"
  return await db.transaction(async (tx) => {
    try {
      // Use the Smart Contact Matching Engine to find duplicates GLOBALLY
      // Hash-based lookup runs INSIDE the transaction for consistency
      const matchResult = await findMatchingContact(incomingContact, null, tx);

      // CASE 1: Match found globally (score >= threshold)
      if (matchResult.isMatch) {
        // Always create/ensure contact_relationship for the importing user
        // Pass contact data to populate relationship-specific fields
        // Note: bountyAmount is not set here - will be calculated via cron after enrichment
        const relationshipId = await ensureContactRelationship(
          matchResult.existingContactId!,
          userId,
          null, // bountyAmount - deferred to cron job
          {
            firstName: contact.first_name || null,
            lastName: contact.last_name || null,
            company: contact.company || null,
            title: contact.title || null,
          },
          tx
        );

        // Relationship creation is required - fail the transaction if it couldn't be created
        if (relationshipId === null) {
          throw new Error(
            `Failed to create contact relationship for contact ${matchResult.existingContactId} and user ${userId}`
          );
        }

        // Track import snapshot for this source
        const snapshotCreated = await ensureContactImportSnapshot(
          relationshipId,
          source,
          tx
        );
        if (!snapshotCreated) {
          throw new Error(
            `Failed to create import snapshot for relationship ${relationshipId} and source ${source}`
          );
        }

        // If updates allowed and there are missing fields to update
        if (
          allowUpdates &&
          Object.keys(matchResult.fieldsToUpdate).length > 0
        ) {
          await updateContactMissingFields(
            matchResult.existingContactId!,
            matchResult.existingSensitiveDataId,
            matchResult.fieldsToUpdate,
            tx
          );

          return {
            isDuplicate: true,
            wasUpdated: true,
            newContactCache: null,
            relationshipCreated: true,
            newContactId: null, // Duplicate - no new contact created
            existingContactId: matchResult.existingContactId!,
          };
        }

        // Match found but no updates needed or allowed
        // Still update the contact's updatedAt timestamp to reflect that it was "touched" during resync
        // This ensures all contacts processed during resync get their timestamp updated to current UTC time
        await tx
          .update(contacts)
          .set({ updatedAt: toUTC() })
          .where(eq(contacts.id, matchResult.existingContactId!));

        return {
          isDuplicate: true,
          wasUpdated: false,
          newContactCache: null,
          relationshipCreated: true,
          newContactId: null, // Duplicate - no new contact created
          existingContactId: matchResult.existingContactId!,
        };
      }

      // CASE 2: New contact (score < threshold) - Import and create relationship
      // Generate unique enrichment_request_id for Clay API enrichment
      const enrichmentRequestId = uuidv4();

      // Prepare contact data (including masked email/phone for display)
      // Note: originalImporterId is the first user who creates/imports the contact
      // Note: Other users access this contact via contact_relationships table
      // Note: secondaryEmail is stored only in contact_sensitive_data table (not in contacts table)
      // Note: bountyAmount is set to "0" initially - calculated via cron after enrichment
      // Note: Explicitly set createdAt and updatedAt using toUTC() to ensure UTC timestamps
      // instead of relying on database defaultNow() which may use server's local timezone
      const contactData = {
        originalImporterId: userId,
        firstName: contact.first_name!,
        lastName: contact.last_name || "",
        email: maskedEmail || null,
        phoneNumber: maskedPhone || null,
        company: contact.company || null,
        title: contact.title || null,
        linkedin: contact.linkedin || null,
        website: contact.website || null,
        city: contact.city || null,
        state: contact.state || null,
        country: contact.country || null,
        industry: contact.industry || null,
        profilePhotoUrl: contact.profile_photo_url || null,
        source,
        bountyAmount: "0", // Deferred - calculated via cron after enrichment
        createdAt: toUTC(),
        updatedAt: toUTC(),
      };

      // Insert new contact
      const insertedContacts = await tx
        .insert(contacts)
        .values(contactData)
        .returning({ id: contacts.id });

      const contactId = insertedContacts[0].id;

      // Create enrichment record for this contact
      await tx.insert(contactEnrichments).values({
        contactId,
        enrichmentStatus: "pending", // Will be updated during enrichment process
        enrichmentRequestId, // Unique ID for Clay API webhook response matching
        enrichmentSource: "apollo",
      });

      // Use pre-computed encrypted values for sensitive data
      const sensitiveData = {
        contactId,
        email: encryptedFields.email,
        phone: encryptedFields.phone,
        linkedin: encryptedFields.linkedin,
        secondaryEmail: encryptedFields.secondaryEmail,
        normalizedEmail: encryptedNormalizedEmail,
        normalizedPhone: encryptedNormalizedPhone,
        normalizedSecondaryEmail: encryptedNormalizedSecondaryEmail,
        normalizedEmailHash: hashes.normalizedEmailHash,
        normalizedPhoneHash: hashes.normalizedPhoneHash,
        linkedinHash: hashes.linkedinHash,
        normalizedSecondaryEmailHash: hashes.normalizedSecondaryEmailHash,
      };

      // Insert new sensitive data
      const insertedSensitive = await tx
        .insert(contactSensitiveData)
        .values(sensitiveData)
        .returning({ id: contactSensitiveData.id });

      // Create contact_relationship entry for the importing user
      // Pass contact data to populate relationship-specific fields
      // Note: bountyAmount is not set here - will be calculated via cron after enrichment
      const relationshipId = await ensureContactRelationship(
        contactId,
        userId,
        null, // bountyAmount - deferred to cron job
        {
          firstName: contact.first_name || null,
          lastName: contact.last_name || null,
          company: contact.company || null,
          title: contact.title || null,
        },
        tx
      );

      // Relationship creation is required - fail the transaction if it couldn't be created
      if (relationshipId === null) {
        throw new Error(
          `Failed to create contact relationship for contact ${contactId} and user ${userId}`
        );
      }

      // Track import snapshot for this source
      const snapshotCreated = await ensureContactImportSnapshot(
        relationshipId,
        source,
        tx
      );
      if (!snapshotCreated) {
        throw new Error(
          `Failed to create import snapshot for relationship ${relationshipId} and source ${source}`
        );
      }

      // Create cache entry for newly added contact (for subsequent matching in same batch)
      const newContactCache: DecryptedContactCache & { userId: string } = {
        userId,
        contactId,
        sensitiveDataId: insertedSensitive[0].id,
        email: contact.email || null,
        phone: contact.phone_number || null,
        linkedin: contact.linkedin || null,
        normalizedEmail: normalizeEmail(contact.email),
        normalizedPhone: normalizePhone(contact.phone_number),
        secondaryEmail: contact.secondary_email || null,
        normalizedSecondaryEmail: normalizeEmail(contact.secondary_email),
        firstName: contact.first_name || null,
        lastName: contact.last_name || null,
        company: contact.company || null,
        title: contact.title || null,
        city: contact.city || null,
        industry: contact.industry || null,
        state: contact.state || null,
        country: contact.country || null,
        website: contact.website || null,
        profilePhotoUrl: contact.profile_photo_url || null,
      };

      return {
        isDuplicate: false,
        wasUpdated: false,
        newContactCache,
        relationshipCreated: true,
        newContactId: contactId, // Return new contact ID for enrichment queue
        existingContactId: null,
      };
    } catch (error: unknown) {
      // Log error for debugging and auditing
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(
        `Transaction failed for contact import (userId: ${userId}, source: ${source}, email: ${contact.email || "N/A"}): ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      // Re-throw error to trigger transaction rollback
      throw error;
    }
  });
}

/**
 * Import contacts from any source
 *
 * This function now uses the Smart Contact Matching Engine for intelligent
 * duplicate detection based on:
 * 1. Primary matching (exact email/phone/LinkedIn)
 * 2. Weighted scoring (name, company, title similarity)
 *
 * Note: Bounty calculation is deferred to a separate cron job that runs after
 * enrichment is completed. Each new contact is assigned an enrichment_request_id
 * for tracking through the Clay API enrichment process.
 *
 * @param contactRows - Array of contact data to import
 * @param options - Import configuration options
 * @returns Import result summary including IDs of newly imported contacts
 */
export async function importContacts(
  contactRows: ContactImportRow[],
  options: ImportOptions
): Promise<ImportResult> {
  const { userId, source, batchSize = 50, allowUpdates = true } = options;

  let importedCount = 0;
  let updatedCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  const importedContactIds: number[] = []; // Track newly imported contact IDs for enrichment
  const updatedContactIds: number[] = []; // Track updated existing contact IDs for Typesense sync

  // Filter out contacts with disposable emails BEFORE processing
  // This ensures filtered contacts are excluded from totalProcessed count
  const { filtered: validContacts, filteredCount } =
    await filterDisposableEmails(contactRows);

  // GLOBAL DEDUPLICATION: Handled via hash-based lookups in processContactWithSmartMatching
  // No need to load all contacts into memory anymore

  // Process contacts in batches for performance
  for (let i = 0; i < validContacts.length; i += batchSize) {
    const batch = validContacts.slice(i, i + batchSize);

    for (const [idx, contact] of batch.entries()) {
      const rowNum = i + idx + 1;

      try {
        // Validate required fields: first_name AND (email OR phone_number OR linkedin)
        if (
          !contact.first_name ||
          (!contact.email && !contact.phone_number && !contact.linkedin)
        ) {
          errors.push(
            `Row ${rowNum}: Missing required fields (first_name and either email, phone_number, or linkedin)`
          );
          errorCount++;
          continue;
        }

        // Process and import the contact using smart matching
        // Note: Bounty calculation is deferred to cron job after enrichment
        const result = await processContactWithSmartMatching(
          contact,
          userId,
          source,
          allowUpdates
        );

        if (result.isDuplicate) {
          duplicateCount++;
          if (result.wasUpdated) {
            updatedCount++;
            if (result.existingContactId !== null) {
              updatedContactIds.push(result.existingContactId);
            }
          }
        } else {
          importedCount++;
          // Track new contact ID for enrichment queue
          if (result.newContactId !== null) {
            importedContactIds.push(result.newContactId);
          }
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${rowNum}: ${errorMessage}`);
        errorCount++;
      }
    }
  }

  return {
    success: true,
    imported: importedCount,
    updated: updatedCount,
    duplicates: duplicateCount,
    errors: errorCount,
    errorMessages: errors.slice(0, 10), // Return first 10 errors
    totalProcessed: validContacts.length, // Only count valid (non-disposable) contacts
    filtered: filteredCount, // Number of contacts filtered out due to disposable emails
    importedContactIds, // IDs of newly imported contacts for enrichment queue
    updatedContactIds, // IDs of existing contacts that had NULL fields updated
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[+]?[\d\s\-()]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate LinkedIn URL format
 */
export function isValidLinkedIn(linkedin: string): boolean {
  if (!linkedin || !linkedin.trim()) {
    return false;
  }

  const linkedinUrl = linkedin.trim().toLowerCase();

  // Accept LinkedIn URLs in various formats:
  // - https://www.linkedin.com/in/username
  // - https://linkedin.com/in/username
  // - http://www.linkedin.com/in/username
  // - linkedin.com/in/username
  // - /in/username (relative path)
  const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+/i;
  return linkedinRegex.test(linkedinUrl);
}

/**
 * Clean and validate contact data before import
 */
export function validateAndCleanContact(contact: ContactImportRow): {
  isValid: boolean;
  errors: string[];
  cleaned: ContactImportRow;
} {
  const errors: string[] = [];
  const cleaned: ContactImportRow = { ...contact };

  // Validate required fields
  if (!contact.first_name || !contact.first_name.trim()) {
    errors.push("First name is required");
  }

  // Require either email OR phone_number OR linkedin
  if (!contact.email && !contact.phone_number && !contact.linkedin) {
    errors.push("Either email, phone number, or LinkedIn URL is required");
  }

  // Validate email if provided
  if (contact.email && contact.email.trim()) {
    if (!isValidEmail(contact.email)) {
      errors.push("Invalid email format");
    } else {
      cleaned.email = contact.email.toLowerCase().trim();
    }
  }

  // Validate phone if provided
  if (contact.phone_number && contact.phone_number.trim()) {
    if (!isValidPhone(contact.phone_number)) {
      errors.push("Invalid phone number format");
    }
  }

  // Validate LinkedIn URL if provided
  if (contact.linkedin && contact.linkedin.trim()) {
    if (!isValidLinkedIn(contact.linkedin)) {
      errors.push("Invalid LinkedIn URL format");
    } else {
      // Normalize LinkedIn URL (remove trailing slashes, query parameters)
      cleaned.linkedin = contact.linkedin.trim();
    }
  }

  // Clean optional fields
  if (contact.first_name) {
    cleaned.first_name = contact.first_name.trim();
  }

  if (contact.last_name) {
    cleaned.last_name = contact.last_name.trim();
  }

  if (contact.secondary_email && !isValidEmail(contact.secondary_email)) {
    errors.push("Invalid secondary email format");
  } else if (contact.secondary_email) {
    cleaned.secondary_email = contact.secondary_email.toLowerCase().trim();
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleaned,
  };
}
