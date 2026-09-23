# Feature: Contact Management

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-02-06

## Overview
Manages user contacts including manual creation, multi-provider import (Google, Microsoft, Apple, LinkedIn), enrichment via Clay.com, email validation, duplicate detection, and encrypted PII storage. Contact imports are processed asynchronously via BullMQ queues.

## Server Module
**Path:** `server/src/modules/contacts/`

Additional queue/import modules:
- `server/src/modules/contacts-google/` -- Google Contacts import queue processor
- `server/src/modules/contacts-microsoft/` -- Microsoft Graph contacts import queue processor
- `server/src/modules/contacts-apple/` -- Apple iCloud contacts import queue processor
- `server/src/modules/contacts-linkedin/` -- LinkedIn ZIP archive contacts import queue processor
- `server/src/modules/contacts-enrichment/` -- Clay.com enrichment queue processor

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /contacts | Yes | Create a new contact manually |
| GET | /contacts | Yes | List contacts with pagination (max 100 per page) |
| GET | /contacts/search-global | Yes | Full-text search across all user contacts |
| GET | /contacts/:id | Yes | Retrieve a single contact by ID |
| PATCH | /contacts/:id | Yes | Update an existing contact |
| POST | /contacts/check-email | Yes, Throttled | Validate an email address for deliverability |
| POST | /contacts/import-csv | Yes | Import contacts from a CSV file upload |
| POST | /contacts/import-google | Yes | Trigger Google Contacts import via OAuth |
| POST | /contacts/import-microsoft | Yes | Trigger Microsoft Graph contacts import via OAuth |
| POST | /contacts/import-apple | Yes | Trigger Apple iCloud contacts import |
| POST | /contacts/import-linkedin | Yes | Trigger LinkedIn contacts import from uploaded ZIP |

### Key Services
- **ContactsService** -- Core CRUD operations, search, pagination, duplicate detection, and email validation
- **ContactsGoogleService** -- Fetches contacts from Google People API and enqueues import jobs
- **ContactsMicrosoftService** -- Fetches contacts from Microsoft Graph API and enqueues import jobs
- **ContactsAppleService** -- Parses Apple iCloud contact exports and enqueues import jobs
- **ContactsLinkedInService** -- Parses LinkedIn data export ZIP files and enqueues import jobs
- **ContactsEnrichmentService** -- Sends contacts to Clay.com for data enrichment and processes results

### Database Tables
| Table | Purpose |
|-------|---------|
| contacts | Primary contact records with name, email, company, title, source, and owner |
| contact_relationships | Maps relationships between contacts (e.g., colleague, friend) for introduction routing |
| contact_enrichments | Stores enrichment results from Clay.com including social profiles, company data |
| contacts_imports | Tracks import job metadata: provider, status, counts, errors |
| contacts_provider_tokens | Stores OAuth tokens for Google/Microsoft contact providers per user |
| contact_import_snapshots | Point-in-time snapshots of contact data at import for audit and rollback |
| contact_sensitive_data | Encrypted PII storage (phone numbers, addresses) separated from main contact table |
| queue_enrichments | BullMQ job tracking for Clay.com enrichment queue |

## Client
### Pages
- **MyContacts** -- `client/src/pages/MyContacts.tsx` -- Main contact list with search, filters, sorting, and pagination
- **ImportContacts** -- `client/src/pages/ImportContacts.tsx` -- Multi-provider import wizard (Google, Microsoft, Apple, LinkedIn, CSV)

### Hooks
- `useSecureContacts()` -- Fetches paginated contacts with decrypted sensitive data
- `useEnhancedSecureContacts()` -- Extends useSecureContacts with enrichment data merged in
- `useContactSearch()` -- Debounced global contact search
- `useContactSourceStatus()` -- Tracks connected import sources and their sync status
- `useContactImportBadges()` -- Returns badge counts for pending/in-progress imports per provider
- `useImportContacts()` -- Mutation hook for triggering contact imports by provider
- `useLinkedInImport()` -- Specialized hook for LinkedIn ZIP upload and processing flow

### API Module
- `client/src/lib/api/contacts.ts` -- CRUD operations, search, import triggers, and enrichment status

## External Integrations
- **Google Contacts API (People API)** -- Fetches user contacts after OAuth consent for import
- **Microsoft Graph API** -- Fetches user contacts from Outlook/Microsoft 365 for import
- **Apple iCloud** -- Parses exported vCard/CSV contact files from iCloud
- **LinkedIn** -- Parses the LinkedIn data export ZIP archive to extract connections
- **Clay.com** -- Third-party enrichment service for augmenting contact data with social profiles, company info, and verified emails
- **AWS S3** -- Stores uploaded CSV and LinkedIn ZIP files for async processing

## Business Logic
- Multi-provider import uses BullMQ queues for async processing; each provider has its own queue and processor to handle rate limits and retries
- Contact enrichment via Clay.com is triggered after import and runs as a separate queue job; enrichment results are stored in a dedicated table
- Email validation checks deliverability before allowing a contact email to be used in introductions
- Duplicate detection runs on email and name+company combination during import; duplicates are flagged for user review rather than silently merged
- A bounty is awarded per verified contact relationship, incentivizing users to build and maintain their network
- PII (phone numbers, physical addresses) is stored in an encrypted separate table (`contact_sensitive_data`) to limit exposure in case of data breach
- Imports track snapshots for audit and potential rollback of bulk operations
- Pagination is capped at 100 records per page to prevent performance issues

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-06 | Initial documentation | Claude Code |
