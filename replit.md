# Prospectly - Business Introduction Platform

## Overview
Prospectly is a B2B warm introduction platform designed to monetize professional networking. It connects deal seekers with connectors to facilitate introductions to target prospects, automating the entire introduction lifecycle. Key features include bounty payments, multi-stage escrow, calendar integrations, and trust scores, aiming to set a new standard for professional warm introductions.

## User Preferences
- Preferred communication style: Simple, everyday language.
- **Do NOT create `attached_assets` folder:** When user passes attachments in prompts, do not save them to disk. Process attachments in memory only without creating the attached_assets folder.

## System Architecture

### UI/UX Decisions
The frontend is a mobile-first Single Page Application (SPA) built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui. It provides a consistent user experience, client-side routing with protected routes, a dashboard for authenticated users, and public marketing pages.

### Technical Implementations
The backend is a NestJS application utilizing secure cookie-based authentication (HttpOnly cookies, refresh token rotation, CSRF protection) and AES-256-GCM field-level encryption for sensitive data. Authentication is Google OAuth only - no password-based login. Performance is enhanced with selective field projection for list/search endpoints. Data is managed with PostgreSQL via Drizzle ORM, employing UUID primary keys, optimized indexes, foreign key constraints, JWT-based authentication, Role-Based Access Control (RBAC), and Row-Level Security (RLS). All database operations are exclusively handled through Drizzle ORM via NestJS services, with direct Supabase calls entirely removed.

### Authentication Token Management
The authentication system uses JWT-based tokens with automatic refresh:
- **Access Tokens:** 15-minute expiry, stored in HttpOnly cookie
- **Refresh Tokens:** 7-day expiry, database-backed storage with token rotation
- **Token Storage:** `refresh_tokens` table stores hashed tokens (SHA-256) with user_id, expiry, and revocation status
- **Auto-Refresh:** Frontend interceptor automatically refreshes tokens on 401 responses, retrying the original request
- **Session Invalidation:** On logout, tokens are revoked in database; failed refresh redirects to login page
- **Security Features:** Token rotation on each refresh, expired token cleanup, IP/user-agent tracking

**Key Files:**
- `server/src/services/refreshTokenService.ts` - Database-backed token storage and validation
- `server/src/database/schema/refresh-tokens.ts` - Drizzle schema for refresh_tokens table
- `src/lib/api.ts` - Frontend interceptor with automatic token refresh

### System Design Choices
The architecture prioritizes security, performance, and scalability. It features a multi-stage escrow payment flow, integrates with external calendar and email services, and uses `@nestjs/schedule` for cron jobs. Business logic resides strictly within service files, following clear code organization and TypeScript path aliases. Meeting bookings automatically generate calendar events with Google Meet links, and introduction emails use professional templates with booking functionality, with email sending managed via a verified domain and connector's email set as `reply_to`.

### Contact Data Security
All contact creation/update operations enforce a critical pattern: they must use a centralized encryption service ensuring consistent AES-256-GCM encryption and a dual-table storage approach. The `contacts` table stores masked data for display, while `contact_sensitive_data` stores encrypted sensitive fields (email, phone, LinkedIn). A unified `contactImportService.ts` handles all import sources (CSV, Google, Apple, Microsoft), and manual creation/updates utilize `importContacts()` or `encryptionService.ts` to guarantee no contact data bypasses encryption.

### Smart Contact Matching Engine
A dedicated `contactMatchingService.ts` provides intelligent duplicate detection for all contact imports (Google, Microsoft, Apple, CSV). This is the SINGLE entry point for all matching operations.

**Matching Strategy:**
1. **Primary Match (Auto-Match = 1.0)**: Exact matches on normalized email, normalized phone, or LinkedIn URL
   - Decrypts `normalized_email` and `normalized_phone` from `contact_sensitive_data` for comparison
   - If any primary field matches exactly, score = 1.0 (100% duplicate)

2. **Weighted Scoring (if no primary match)**:
   | Field | Weight | Logic |
   |-------|--------|-------|
   | Email | 25% | Exact=1.0, domain match=0.3, else Levenshtein similarity |
   | Phone | 15% | Exact=1.0, contains=0.8, else 0 |
   | Name | 30% | Levenshtein similarity (first + last combined) |
   | Company | 20% | Levenshtein similarity |
   | Title | 10% | Levenshtein similarity |
   | Location | +5% | Bonus if city matches exactly |

**Decision Threshold:**
- Score >= 0.82: Duplicate contact - do not import, only update missing fields
- Score < 0.82: New contact - import normally

**Performance Optimization:**
- All existing contacts loaded and decrypted ONCE at import start
- New contacts added to cache for within-batch duplicate detection
- Levenshtein algorithm uses O(min(m,n)) space optimization

**Key Functions:**
- `findMatchingContact()` - Main entry point for single contact matching
- `loadUserContactsForMatching()` - Load and decrypt contacts for matching session
- `updateContactMissingFields()` - Update existing contact with missing data only
- `levenshteinSimilarity()` - Calculate string similarity (0-1 score)

### Introduction Request Data Architecture
Data ownership for the introduction flow is structured as follows: `meeting_title` and `meeting_description` are stored in the `introduction_requests` table. Email-related data (subject, body, sent_at) is stored exclusively in the `introduction_email_logs` table, serving as the single source of truth for email information, preventing duplication in `introduction_requests`.

### Payment Workflow
The payment system employs a dual PaymentIntent workflow with milestone-based captures and trust-score-based payouts. Upon an introduction request, two Stripe PaymentIntents are created: 5% captured on email delivery, and 95% captured upon meeting booking. Payouts to connectors are immediate if their trust score is 90 or above; otherwise, they are deferred until peer feedback is submitted. The system uses a two-step direct bank payout flow (Stripe transfer then immediate payout). A dual-table database architecture (`introduction_requests` and `introduction_transactions`) separates core request data from detailed payment tracking for clarity and auditing.

### Background Payout Processing (Bull Queue)
Payout processing uses Bull Queue with Redis for non-blocking background job processing. This prevents UI freezes during Stripe API calls:
- **Queue Module:** `server/src/modules/payout-queue/` contains processor, service, constants, and types
- **Job Types:** `trust_score_payout` (immediate for trust >= 90) and `feedback_payout` (triggered after peer feedback)
- **Retry Logic:** 3 retries with exponential backoff (1min, 5min, 15min delays)
- **Status Tracking:** `payout_history.processing_status` tracks: pending, queued, processing, completed, failed
- **Environment:** Requires Redis configuration via environment variables:
  - `REDIS_HOST` (required) - Redis hostname
  - `REDIS_PORT` (optional, default: 6379) - Redis port
  - `REDIS_USERNAME` (optional, default: "default") - Redis username
  - `REDIS_PASSWORD` (optional, default: "") - Redis password
  - `REDIS_TLS` (optional, default: false) - Enable TLS (set to "true" or "1" to enable)
- **Flow:** `acknowledgeMeetingCompletion()` and `submitFeedback()` queue jobs instead of synchronous Stripe calls

### Circular Dependency Resolution Pattern
The `IntroductionsService` and `PayoutQueueService` have a bidirectional dependency. This is resolved using token-based injection with lazy loading:

**Pattern Used:**
1. Create injection tokens in separate files (e.g., `payout-queue.tokens.ts`, `introductions.tokens.ts`)
2. Use `@Inject(TOKEN)` instead of direct class injection in service constructors
3. Provide the token in module using `forwardRef(() => require('../path/to.service').ServiceClass)` with relative paths
4. Type the injected service as `AnyType` to avoid static import at file level

**Key Files:**
- `server/src/modules/payout-queue/payout-queue.tokens.ts` - Token for IntroductionsService
- `server/src/modules/introductions/introductions.tokens.ts` - Token for PayoutQueueService
- **IMPORTANT:** Use relative paths in `require()` calls (e.g., `../introductions/`) because module aliases don't work with CommonJS require after TypeScript compilation

### Financial Transparency System
This system offers users complete visibility into their transaction history, payment flows, and payouts through dedicated API endpoints. It exposes dual PaymentIntent details, platform fees, connector payouts, Stripe reference IDs, and the payment timeline, showing whether payouts were triggered by trust score or peer feedback.

### Locale-Aware Date/Time Formatting
All date/time displays use a centralized formatting system that adapts to user location:
- **India users** (detected via `Asia/Kolkata` timezone): `3 December 2025 4:30 PM` (day before month, no comma)
- **US/Other users**: `December 3, 2025 4:30 PM` (month before day, with comma)

**Key utilities** in `src/utils/dateFormatter.ts`:
- `formatLocalizedDateTime(date)` - Full format with long month name
- `formatLocalizedShortDateTime(date)` - Short format with abbreviated month
- `formatLocalizedDate(date)` - Date only with long month
- `formatLocalizedShortDate(date)` - Date only with short month
- `isIndianUser()` - Detects if user is from India based on timezone/locale

**Key utilities** in `src/utils/dateFormatting.ts` (for date-fns integration):
- `formatMeetingDate(date)` - Auto-localizes with timezone support
- `formatMeetingDateInLocalTimezone(date)` - Timezone-aware formatting
- `formatDateRange(start, end)` - Locale-aware date range formatting

Database stores dates in standard ISO format; formatting is only for display.

### Reusable UI Components
- **DateRangePicker** (`src/components/ui/date-range-picker.tsx`): A polished, reusable date range picker component with preset options (All Time, Last 7 Days, Last 30 Days, Last 3 Months, Last Year) and custom date range selection via calendar. Features `useDateRangeFilter` hook for easy integration with query parameters. Used in Transaction History and Payout History tables.

### API Best Practices
APIs are optimized to return only fields that the frontend actually uses. This improves performance and reduces data transfer:
- **Transaction API** (`/api/finances/transactions`): Returns only `requestId`, `contactName`, `meetingTitle`, `bountyAmount`, `status`, `createdAt`, `connector` (id, fullName, email), and `remainingPaymentStatus`.
- **Payout API** (`/api/finances/payouts`): Returns only `requestId`, `contactName`, `meetingTitle`, `requester` (id, fullName), `grossAmount`, `platformFee`, `netAmount`, `payoutStatus`, `payoutReleased`, and `payoutReleasedAt`.
- When modifying APIs, always check what fields are actually used on the frontend before adding new fields.
- Removed leftJoins that fetched data not needed in the response (e.g., payoutHistory join in transaction query).

### Profile Photo Storage
Profile photos are stored in AWS S3 and served via CloudFront CDN for optimal performance:
- **Upload:** Pre-signed PUT URLs allow direct uploads to S3 (`profiles/{userId}/{filename}`)
- **Read:** CloudFront CDN URL (`AWS_CLOUDFRONT_URL`) serves images with caching (no pre-signed URLs needed for reading)
- **Fallback:** If CloudFront URL is not configured, falls back to S3 pre-signed GET URLs

### Contact Photo Import (Microsoft Contacts)
When importing contacts from Microsoft/Outlook, profile photos are fetched and stored in S3:
- **Photo Detection:** Microsoft Graph API returns `photo["@odata.mediaContentType"]` when a contact has a photo
- **Batch Processing:** Photos are fetched in batches of 10 to avoid overwhelming the Graph API
- **Storage Path:** Photos are stored at `contacts/{userId}/{microsoftContactId}.{ext}` in S3
- **S3 Key Storage:** The `profile_photo_url` field stores the S3 key (not base64 or full URL)
- **Key Files:** `server/src/modules/contact-queue/microsoft/microsoft-contacts-queue.processor.ts` handles the import

## External Dependencies
-   **Payment Processing:** Stripe (Connect for payouts, dual Payment Intents for 5%/95% milestone-based escrow).
-   **Calendar Services:** Google Calendar API and Microsoft Graph API (Outlook Calendar) for OAuth and event management.
-   **Email Service:** Resend API (for transactional emails with webhooks).
-   **Contact Import Integrations:** Google Contacts API, Microsoft Contacts (People API), CSV import, and Apple iCloud Contact Sync via CardDAV.
-   **File Storage:** AWS S3 for profile photos, served via CloudFront CDN.
-   **Browser Extension:** Chrome Extension for LinkedIn contact detection.
-   **Background Jobs:** Bull Queue with Redis for async payout processing.