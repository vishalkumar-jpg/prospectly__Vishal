# Feature: Apollo Contact Enrichment (More Info Flow)

**Version:** 1.4
**Status:** Active
**Last Updated:** 2026-03-28

## Overview
Apollo Contact Enrichment enriches contacts via Apollo's `/people/match` API when a user clicks "More Info" in the search-and-request page. It fills missing contact data (person + company fields), stores encrypted sensitive data, and syncs to Typesense — all before the existing bounty calculator runs. Each contact is enriched exactly once; subsequent "More Info" clicks skip all API calls.

## Server Module
**Path:** `server/src/modules/introductions/contact-enrichment/`

### Directory Structure
```
contact-enrichment/
├── contact-enrichment.constants.ts
├── contact-enrichment.types.ts
├── contact-enrichment.dto.ts
├── contact-enrichment.helpers.ts
├── contact-enrichment.controller.ts
├── contact-enrichment.module.ts
└── services/
    ├── index.ts                               (barrel export)
    ├── contact-enrichment.service.ts          (orchestrator)
    ├── contact-enrichment-apollo.service.ts   (Apollo API calls)
    ├── contact-enrichment-db.service.ts       (DB operations)
    └── contact-enrichment-typesense.service.ts (Typesense sync)
```

### API Endpoints
| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | /introductions/contact-enrichment/enrich | JWT | 10/60s | Enrich a contact via Apollo and return full contact details (sans PII) |

### Request DTO
```typescript
{ id: string, source: "contacts" | "apollo", linkedin_url?: string }
```

### Key Services (in `services/` subfolder)
- **ContactEnrichmentService** — Orchestrator: guards against duplicate enrichment, resolves match params, calls Apollo, runs DB transaction, triggers Typesense sync
- **ContactEnrichmentApolloService** — Calls Apollo `/api/v1/people/match` API
- **ContactEnrichmentDbService** — All DB operations: create/update contacts, sensitive data, enrichment records, `findContactByExternalPersonId()` for apollo-source guard
- **ContactEnrichmentTypesenseService** — Queues Typesense full document sync via BullMQ

### Database Tables
| Table | Operation | Purpose |
|-------|-----------|---------|
| contacts | UPDATE (contacts source) / INSERT (apollo source) | Fill nullable person + org fields |
| contact_sensitive_data | UPSERT | Store encrypted email, phone, LinkedIn + hashes |
| contact_enrichments | UPSERT (unique on contactId) | Track enrichment status, source, sanitized response, and external person ID |

## Two Source Flows

### Source: "contacts" (record exists in DB)
1. Fetch LinkedIn URL from DB (or use from DTO)
2. Call Apollo `/people/match` with `linkedin_url`
3. **UPDATE** existing contact: fill nullable fields only (never overwrite)
4. Upsert sensitive data + enrichment record

### Source: "apollo" (record NOT in DB)
1. Use DTO `id` as Apollo person ID
2. Call Apollo `/people/match` with `id`
3. **Extract emails** via `extractEmailsFromApollo()` — collects from all 4 Apollo email sources (see Multi-Source Email Extraction below)
4. **Multi-step dedup check** via `findExistingContact()`:
   - **Step 1**: Normalize LinkedIn URL via `normalizeLinkedIn()` (strips http/https, www, trailing slashes, extracts username slug like `jitendra-bavaliya-35b600121`) → hash → lookup in `contact_sensitive_data.linkedinHash`
   - **Step 2 (fallback)**: If no LinkedIn match, iterate ALL extracted emails → normalize → hash → check each against both `normalizedEmailHash` AND `normalizedSecondaryEmailHash` (cross-match). Returns on first match.
   - **Match found**: switch to update flow (same as contacts source)
   - **No match on any email**: **CREATE** new contact + sensitive data
5. Upsert enrichment record

## Field Mapping (Apollo → contacts table)
| Apollo Field | Contacts Column | Condition |
|---|---|---|
| person.first_name | firstName | Only if null |
| person.last_name | lastName | Only if null |
| person.title | title | Only if null |
| person.city | city | Only if null |
| person.state | state | Only if null |
| person.country | country | Only if null |
| person.formatted_address | location | Only if null |
| person.linkedin_url | linkedin | Only if null |
| person.photo_url | profilePhotoUrl | Only if null |
| organization.name | company | Only if null |
| organization.primary_domain | companyDomain | Only if null |
| organization.industry | companyIndustry | Only if null |
| organization.short_description | companyDescription | Only if null |
| organization.linkedin_url | companyLinkedinUrl | Only if null |
| organization.estimated_num_employees | employees (string) | Only if null |
| organization.website_url | website | Only if null |

## Multi-Source Email Extraction
Apollo returns emails in 4 locations. The `extractEmailsFromApollo()` helper in `contact-enrichment.helpers.ts` collects, normalizes (lowercase + trim), deduplicates, and returns them in priority order:

| Priority | Apollo Source | Type | Notes |
|----------|-------------|------|-------|
| 1 (highest) | `person.email` | Work email | Root-level, most reliable |
| 2 | `person.contact.email` | Work email | Nested contact object, not always present |
| 3 | `person.contact.contact_emails[].email` | Mixed | Array with per-email `email_status`; all statuses accepted |
| 4 (lowest) | `person.personal_emails[]` | Personal | Gmail, hotmail, etc. No per-email status field |

### TypeScript Types
- `ApolloContactEmail` — `{ email?, email_status? }` for `contact_emails[]` entries
- `ApolloNestedContact` — `{ email?, contact_emails?, phone_numbers?, sanitized_phone? }` for nested contact object
- `ApolloMatchPerson.contact?` — optional field typed as `ApolloNestedContact`

### Email Slot Assignment Logic

**UPDATE path (existing `contact_sensitive_data` row):**
1. If primary email slot is empty → fill with `extractedEmails[0]`
   - If secondary also empty AND 2+ extracted emails → fill secondary with `extractedEmails[1]` via `fillSecondaryEmail()`
2. If primary email exists AND secondary is empty → find first extracted email different from primary (by hash comparison via `findDifferentEmail()`) → fill secondary
3. If both slots populated → skip

**INSERT path (new `contact_sensitive_data` row):**
1. Primary = `extractedEmails[0]` (encrypted + normalized + hashed)
2. Secondary = `extractedEmails[1]` if exists and different (encrypted + normalized + hashed)

**Masked email (`contacts.email` column):**
- `updateContactNullableFields()` now fills `contacts.email` with `maskEmail(extractedEmails[0])` if null
- `createNewContact()` uses `extractedEmails[0] ?? apolloData.email` for the masked email

### Helper Methods (in `ContactEnrichmentDbService`)
- **`findDifferentEmail(extractedEmails, existingPrimaryHash)`** — iterates extracted emails, returns the first one whose hash differs from the existing primary email hash
- **`fillSecondaryEmail(updates, email)`** — encrypts + normalizes + hashes an email and populates the secondary email fields in the updates object

## PII Handling
- **Stored in contact_enrichments.enrichment_response**: Full Apollo response with person PII stripped. Root-level: `email`, `personal_emails`, `phone` removed. Nested `person.contact`: `email`, `contact_emails`, `phone_numbers`, `sanitized_phone` removed. Org-level phone kept (public business info).
- **Stored in contact_sensitive_data**: Encrypted email, phone, LinkedIn, secondary email + normalized hashes for dedup. Both primary and secondary email slots can be populated in a single enrichment pass.
- **API response to frontend**: No email or phone returned. Full contact details otherwise.

## Client

### New Components (Contact Profile Modal)
- **ContactProfileModal** — `client/src/components/prospect-hub/ContactProfileModal.tsx` — Replaces RequestToMeetDialog. Near-fullscreen (95% w, 90% h) two-page modal:
  - **Page 1**: Contact Profile — shows enrichment data (hero section, about, company, experience timeline)
  - **Page 2**: Introduction Form — same fields as old dialog, redesigned two-column layout
  - Slide left/right animation between pages, sticky header bar
  - Props include `onEnrichmentComplete` callback — fires after enrichment with `(originalId, enrichedId)` so parent can update search results state
- **ContactProfilePage** — `client/src/components/prospect-hub/ContactProfilePage.tsx` — Presentational component for Page 1
- **IntroductionForm** — `client/src/components/introduction/IntroductionForm.tsx` — Extracted form from RequestToMeetDialog (Page 2, to be created)

### Pages
- **ProspectHub** — `client/src/pages/ProspectHub.tsx` — Uses ContactProfileModal (replaces RequestToMeetDialog)

### API Endpoints Used
| Method | Endpoint | When |
|--------|----------|------|
| POST | `/introductions/contact-enrichment/enrich` | More Info click, not yet enriched |
| GET | `/introductions/contact-enrichment/:id/details` | After enrichment or when already enriched. Response includes `connectorCount` (total contact_relationships rows for this contact) |
| POST | `/introductions/bounty-calculator/calculate` | After enrichment, for bounty |

### API Module
- `client/src/lib/api/contacts.ts` — `enrichContact()`, `getContactDetails()`, `calculateBounty()`

## Enrichment Guards (Duplicate Call Prevention)

### Backend Guards
Both source types are guarded to prevent redundant Apollo API calls:

- **Source "contacts"**: Checks `contact_enrichments` by `contactId`. If `enrichmentStatus === "completed"`, returns existing contact data (200) immediately — no Apollo API call, no DB writes.
- **Source "apollo"**: Checks `contact_enrichments` by `externalPersonId` (indexed column). If a completed enrichment exists for that external person ID, returns the linked contact data (200) immediately — no Apollo API call. Uses `findContactByExternalPersonId()` method with B-tree index lookup, efficient at any table size.

### Frontend Guard
- **ContactProfileModal** checks `contact.enrichmentStatus === "completed"` before calling the `/enrich` API. If already enriched, skips to `getContactDetails()` directly.
- **ProspectHub** updates `webResults` and `selectedContact` state after enrichment via `onEnrichmentComplete` callback from the modal. This sets `enrichmentStatus: "completed"`, `source: "contacts"`, and the new DB `id` on the contact — so subsequent "More Info" clicks on the same card skip enrichment without needing a re-search.
- The `onComplete` callback from the enrichment status poller also includes `enrichmentStatus: "completed"` and `source: "contacts"` in the result.

## External Integrations
- **Apollo.io** — `/api/v1/people/match` endpoint with `run_waterfall_email=false`, `run_waterfall_phone=false`, `reveal_personal_emails=true`, `reveal_phone_number=false`. Uses existing `ApolloApiService` and config.

## Apollo Cache Cleanup
After apollo-source enrichment, the `apollo_people_cache` Typesense document is deleted (by Apollo person ID) to prevent duplicate search results. The contact now exists only in the `contacts` Typesense collection. Direct Typesense client delete call, wrapped in try/catch — failure doesn't affect enrichment. Not triggered for contacts-source enrichment.

## Dedup Strategy (Multi-step Hash Lookup)
For apollo-source contacts, `findExistingContact(linkedinUrl?, emails?: string[])` checks:
1. **LinkedIn hash** — normalize URL via `normalizeLinkedIn()` (strips http/https, www, extracts slug) → hash → lookup in `contact_sensitive_data.linkedinHash`
2. **Email hash (fallback)** — iterate ALL extracted emails (from all 4 Apollo sources) → normalize each → hash → check against both `normalizedEmailHash` AND `normalizedSecondaryEmailHash`. Returns on first match.
3. **No match on any** — create new contact

This prevents duplicates from protocol differences (http vs https), catches contacts imported via non-LinkedIn sources, and catches matches via personal emails stored as secondary.

## Business Logic
- One enrichment per contact (unique constraint on `contact_enrichments.contactId`)
- Only fills nullable fields — never overwrites existing non-null values
- Multi-step dedup (LinkedIn hash + email hash fallback) prevents duplicate contacts
- New contacts created via apollo-source enrichment get `source: "apollo_enrichment"` in the contacts table (constant: `CONTACT_ENRICHMENT_CONSTANTS.CONTACT_SOURCE`)
- `originalImporterId` is null for system-created contacts (apollo source, no dedup match)
- No contact_relationships or contact_import_snapshots entries created
- DB transaction wraps all data operations; Typesense sync is best-effort after commit
- If Apollo API fails, enrichment fails and bounty calc is skipped; user can retry
- `externalPersonId` (generic, provider-agnostic column) stores the external provider's person ID (e.g. Apollo person ID) in `contact_enrichments` for fast duplicate lookup — indexed via B-tree
- Frontend updates `webResults` state after enrichment (`enrichmentStatus`, `source`, `id`) so subsequent "More Info" clicks skip the enrichment API entirely
- `enrichedContactId` is merged into the `enrichedContact` object (as a Number) before passing to IntroductionForm, ensuring the form always uses the DB contact ID — not the original search result ID
- `connectorCount` from the details API response determines whether to call the estimates API and whether to show the marketplace banner vs the Intro Acceptance Probability section

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-23 | Initial implementation — Apollo enrichment in More Info flow | Claude Code |
| 1.1 | 2026-03-26 | Fix duplicate Apollo API calls — added `externalPersonId` column with index for backend apollo-source guard, frontend state update after enrichment via `onEnrichmentComplete` callback | Claude Code |
| 1.2 | 2026-03-27 | Set contact source to `apollo_enrichment` instead of default `manual` for apollo-source created contacts | Claude Code |
| 1.3 | 2026-03-27 | Fix estimates API wrong ID bug (merge enrichedContactId into enrichedContact), add connectorCount to details API, skip estimates call and show marketplace banner when connectorCount is 0 | Claude Code |
| 1.4 | 2026-03-28 | Multi-source email extraction — collect emails from 4 Apollo response locations (`person.email`, `person.contact.email`, `person.contact.contact_emails[]`, `person.personal_emails[]`), fill both primary + secondary email slots in single enrichment pass, enhanced dedup checking all extracted emails, PII stripping for nested contact object | Claude Code |
