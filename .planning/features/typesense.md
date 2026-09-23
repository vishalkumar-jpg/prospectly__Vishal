# Feature: Typesense Search Integration

**Version:** 1.3
**Status:** Partially Implemented
**Last Updated:** 2026-03-27

## Overview

Typesense is integrated as a full-text search engine for contacts, replacing the previous database-based `searchGlobal` endpoint with faster, relevance-ranked search. Contacts are synced to a Typesense collection during import (CSV, Google, Microsoft, Apple, LinkedIn) **and on manual edits**, then searched via a dedicated API endpoint. A client-side feature flag (`VITE_SEARCH_ENGINE`) allows switching between Typesense and database search per environment.

**Current state:** Core infrastructure is complete (sync + search + update sync), but missing privacy filtering, bounty filtering, connector enrichment, advanced filtering/sorting, and pagination. Production currently uses database search until Typesense is fully validated.

## Server Module

**Path:** `server/src/modules/typesense/`

The module is split into three sub-modules:

| Sub-module | Path | Purpose |
|------------|------|---------|
| Core | `typesense/core/` | Typesense client provider, bulk upsert service, types, constants |
| Search | `typesense/search/` | Search controller, service, DTO for querying contacts |
| Sync Queue | `typesense/sync-queue/` | BullMQ queue processor for syncing contacts after import |

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /typesense/search/contacts | Yes | Full-text search across Typesense contacts collection |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | No | General search query (searches all 16 fields) |
| `linkedinUrl` | string | No | LinkedIn profile URL (extracts username, searches `linkedin` field only) |
| `name` | string | No | Person's full name |
| `company` | string | No | Company name |
| `website` | string | No | Website URL |
| `limit` | string | No | Max results (default 50, clamped to 100) |

### Key Services

- **TypesenseService** (`core/typesense.service.ts`) -- Handles bulk upsert with chunking (500 docs/chunk) and retry logic (3 retries, exponential backoff)
- **TypesenseSearchService** (`search/typesense-search.service.ts`) -- Two search paths: LinkedIn-specific (username extraction) and text search (combines all params across 16 fields)
- **TypesenseSyncQueueService** (`sync-queue/typesense-sync-queue.service.ts`) -- Enqueues BullMQ sync jobs after contact imports or manual edits
- **TypesenseSyncQueueProcessor** (`sync-queue/typesense-sync-queue.processor.ts`) -- Worker that fetches contacts from PostgreSQL in batches, transforms to Typesense docs, and bulk upserts with progress tracking

### Database Tables

| Table | Purpose |
|-------|---------|
| contacts | Source of truth for all contact data synced to Typesense |
| contact_enrichments | Enrichment status per contact (joined via leftJoin on contactId) |
| contact_relationships | Links contacts to users (needed for future privacy filtering) |
| introduction_potential_connectors | Tracks connector counts (needed for future enrichment) |

### Typesense Collection Schema

**Collection name:** `contacts`

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| id | string | contacts.id | Document ID |
| first_name | string | contacts.firstName | |
| last_name | string | contacts.lastName | |
| title | string | contacts.title | |
| linkedin | string | contacts.linkedin | |
| linkedin_connections | string | contacts.linkedinConnections | |
| location | string | contacts.location | Direct from DB `location` column (v1.1: was previously computed from city/state/country) |
| city | string | contacts.city | |
| state | string | contacts.state | |
| country | string | contacts.country | |
| industry | string | contacts.industry | |
| company | string | contacts.company | |
| company_description | string | contacts.companyDescription | |
| company_type | string | contacts.companyType | |
| company_industry | string | contacts.companyIndustry | |
| company_domain | string | contacts.companyDomain | |
| company_linkedin_url | string | contacts.companyLinkedinUrl | |
| employees | string | contacts.employees | |
| website | string | contacts.website | |
| has_email | boolean | Derived | `true` if email exists, email itself not indexed |
| has_linkedin | boolean | Derived | `true` if linkedin URL exists, used as search filter on contacts collection |
| profile_photo_url | string | contacts.profilePhotoUrl | |
| bounty_amount | number | contacts.bountyAmount | Float, from numeric DB column |
| enrichment_status | string | contact_enrichments.enrichmentStatus | Defaults to "pending" if no enrichment record. Values: pending, in_progress, completed, failed, insufficient_data |

## Client

### Feature Flag

**Env var:** `VITE_SEARCH_ENGINE`

| Value | Behavior |
|-------|----------|
| `"typesense"` | Uses `api.contacts.searchTypesense()` endpoint |
| `"database"` (default) | Uses `api.contacts.searchGlobal()` endpoint |
| unset | Falls back to database search |

**Current settings:**
- `client/.env` -- `database` (dev default)
- `client/.env.production` -- `database` (production safe default)
- `client/.env.example` -- `database`

### Pages

- **ProspectHub** -- `client/src/pages/ProspectHub.tsx` (line 279) -- Reads `VITE_SEARCH_ENGINE` and calls appropriate search API. Both endpoints return same shape, so the result mapping code works for both.

### API Module

- `client/src/lib/api/contacts.ts` -- Exposes both:
  - `searchGlobal(params)` (line 31) -- Database search, accepts `q`, `name`, `company`, `website`, `email`, `limit`
  - `searchTypesense(params)` (line 81) -- Typesense search, accepts `q`, `linkedinUrl`, `name`, `company`, `website`, `limit`

**Note:** `searchGlobal` accepts an `email` param that Typesense does not support.

## External Integrations

- **Typesense Cloud** -- Hosted Typesense instance for full-text contact search
  - Config: `server/src/config/typesense.config.ts`
  - Env vars: `TYPESENSE_HOST`, `TYPESENSE_API_KEY`, `TYPESENSE_PORT` (default 443), `TYPESENSE_PROTOCOL` (default "https"), `TYPESENSE_CONNECTION_TIMEOUT` (default 10s)
- **BullMQ / Redis** -- Queue for async contact sync jobs after imports

## Business Logic

### Sync Flow

Typesense sync is triggered by **two categories** of events:

#### A. Import Sync (new + updated contacts)
1. Contact import completes (CSV, Google, Microsoft, Apple, or LinkedIn)
2. `importContacts()` in `contactImportService.ts` returns both `importedContactIds` (new) and `updatedContactIds` (existing contacts whose NULL fields were filled during dedup)
3. Each import processor combines both arrays: `[...importedContactIds, ...updatedContactIds]`
4. Calls `TypesenseSyncQueueService.enqueueSyncJob()` with combined IDs, user ID, and source

**Import sources and their sync code locations:**

| Source | File | Sync location |
|--------|------|---------------|
| Google | `contact-queue/google/google-contacts-queue.processor.ts` | After import, ~line 444 |
| Microsoft | `contact-queue/microsoft/microsoft-contacts-queue.processor.ts` | After import, ~line 508 |
| Apple | `contact-queue/apple/apple-contacts-queue.processor.ts` | After import, ~line 243 |
| LinkedIn | `contact-queue/linkedin/linkedin-contacts-queue.processor.ts` | After import, ~line 446 |
| CSV | `contacts/contacts.service.ts` `importCSVContacts()` | After import, ~line 2110 |

#### B. Enrichment Update Sync
1. Clay enrichment webhook fires (`clay-import-webhook.service.ts`)
2. After updating `enrichmentStatus` in the `contact_enrichments` table, enqueues a Typesense sync job
3. Source is `"enrichment_update"`
4. Wrapped in try/catch — enrichment processing succeeds even if sync fails (non-blocking)
5. Uses `CreditAwardHelper.getContactOwnerId()` to resolve the userId for the sync job

#### C. Manual Edit Sync
1. User edits a contact via `PATCH /contacts/:id`
2. `updateContact()` in `contacts.service.ts` (~line 1271) enqueues a sync job for that single contact ID
3. Source is `"manual_edit"`
4. Wrapped in try/catch -- edit succeeds even if sync fails (non-blocking)

#### D. Worker Processing (shared for all sync triggers)
1. BullMQ queues job to `typesense-sync` queue
2. Worker processor fetches contacts from PostgreSQL in 500-doc batches (only non-deleted contacts)
3. Transforms DB fields to Typesense document format (snake_case, direct location from DB, has_email boolean)
4. Bulk upserts to Typesense with chunking and retry logic
5. Progress updates: 0-50% fetch, 50-90% upsert, 90-100% retry

### Update Paths Tracked for Sync

| # | Update Path | File | Synced? | Reason |
|---|---|---|---|---|
| 1 | Manual user edit (PATCH /contacts/:id) | `contacts.service.ts` `updateContact()` | **YES** | User changes firstName, lastName, email, phone, linkedin |
| 2 | Import duplicate -- fill NULL fields | `contactImportService.ts` via `updateContactMissingFields()` | **YES** | Re-import fills missing company, title, etc. |
| 3 | Manual bounty update (PATCH /contacts/:id/bounty-amount) | `contacts.service.ts` | No | Bounty not a priority for search sync |
| 4 | Clay enrichment webhook | `clay-import-webhook.service.ts` | **YES** | Syncs enrichment_status to Typesense after enrichment completes |
| 5 | Cron bounty calculation | `bounty-database-updater.service.ts` | No | Bounty not a priority |
| 6 | Bounty median recalculation | `bountyCalculationUtils.ts` | No | Triggered by #5 |

### Key Implementation Details

**Tracking updated duplicate IDs during import (`contactImportService.ts`):**
- `ProcessContactResult` interface includes `existingContactId: number | null` -- carries the ID of matched existing contacts
- `ImportResult` interface includes `updatedContactIds: number[]` -- IDs of existing contacts that had NULL fields updated
- `importContacts()` populates `updatedContactIds` when `result.isDuplicate && result.wasUpdated && result.existingContactId !== null`

**TypesenseSyncQueueService is `@Optional()` everywhere** -- sync gracefully no-ops if Redis/queues are disabled

### Search Flow
1. User types search in ProspectHub
2. Client checks `VITE_SEARCH_ENGINE` env var
3. If `"typesense"`: calls `GET /typesense/search/contacts` with params
4. If `"database"` or unset: calls `GET /contacts/search-global` with params
5. Both return `{ contacts: [...], count: number, query: string }` with camelCase fields
6. ProspectHub maps response to display format

## Known Gaps (TODO)

| Gap | Description | Priority |
|-----|-------------|----------|
| Privacy filtering | Search returns ALL contacts in index regardless of user permissions/relationships | High |
| Connector enrichment | `potentialConnectorCount` is hard-coded to `0` in search response instead of querying `introduction_potential_connectors` table | High |
| Bounty filtering | `bounty_amount` is indexed but not exposed as a search filter parameter | Medium |
| Advanced filtering | No support for filtering by industry, location, company type etc. (Typesense supports this) | Medium |
| Sorting | No sorting options (by relevance, bounty, date). Typesense supports this but not exposed | Medium |
| Pagination | No offset/page support, returns all results up to limit | Medium |
| Email search | Email converted to `has_email` boolean only, not searchable by email address | Low |

## Module Registration

- **AppModule** (`server/src/app.module.ts`) -- Imports `TypesenseModule` (global) and `TypesenseSyncQueueModule` (conditional on Redis/queues)
- **WorkerModule** (`server/src/worker/worker.module.ts`) -- Registers `TypesenseSyncQueueProcessor`, `TypesenseSyncQueueService`, imports `TypesenseModule`, registers BullMQ queue

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.3 | 2026-03-27 | Added has_linkedin boolean field to Typesense documents; all contact search modes filter by has_linkedin:true | Claude |
| 1.2 | 2026-03-18 | Added enrichment_status field to Typesense documents, Clay webhook triggers Typesense re-sync on enrichment status change | Claude |
| 1.1 | 2026-03-18 | Added sync on contact updates: manual edit sync, import duplicate update tracking, location field fix (direct from DB instead of computed) | Claude |
| 1.0 | 2026-03-18 | Initial documentation covering core sync, search, and feature flag | Claude |
