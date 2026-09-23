# Feature: Global Marketplace

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-02-06

## Overview
A public marketplace where users can share their introduction requests for broader visibility, allowing any registered user (or external visitor via public link) to claim and fulfill them. Includes claim verification, payout management, bot detection, and marketplace-specific rate limiting.

## Server Module
**Path:** `server/src/modules/global-marketplace/`

Subdirectories:
- `claim/` -- Claim processing and verification logic
- `controllers/` -- Route handlers for marketplace endpoints
- `dto/` -- Request validation DTOs
- `guards/` -- Bot detection and marketplace-specific auth guards
- `payout/` -- Payout calculation and disbursement
- `services/` -- Core marketplace business logic

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /marketplace | Yes | Browse available marketplace listings with filters and pagination |
| GET | /marketplace/filter-options | Yes | Retrieve available filter options (industries, bounty ranges, etc.) |
| POST | /marketplace/share/:requestId | Yes | Share an introduction request to the marketplace |
| DELETE | /marketplace/share/:requestId | Yes | Remove an introduction request from the marketplace |
| POST | /marketplace/claim/:requestId | Yes | Claim a marketplace listing as a connector |
| GET | /marketplace/my-claims | Yes | List requests the current user has claimed from the marketplace |
| GET | /marketplace/my-shared | Yes | List requests the current user has shared to the marketplace |
| GET | /marketplace/request/:id/:code | Public | View a shared request via public link (no auth required) |
| POST | /marketplace/request/:id/:code/track | Public | Track a public link visit for analytics |

### Key Services
- **MarketplaceService** -- Core listing, search, filtering, and share/unshare logic
- **MarketplaceClaimService** -- Handles claim creation, verification, conflict resolution, and status tracking
- **MarketplacePayoutService** -- Calculates and processes payouts for fulfilled marketplace claims

### Database Tables
| Table | Purpose |
|-------|---------|
| marketplace_shares | Records of introduction requests shared to the marketplace with visibility settings and public link codes |
| marketplace_claims | Tracks claims on marketplace listings including claimant, status, and verification state |
| marketplace_share_events | Analytics events for marketplace interactions (views, clicks, claims) |

## Client
### Pages
- **GlobalOpportunities** -- `client/src/pages/GlobalOpportunities.tsx` -- Main marketplace browse page with search, filters, and listing cards
- **PublicRequestPage** -- `client/src/pages/PublicRequestPage.tsx` -- Public-facing page for viewing a shared request via unique link (no auth required)
- **BrowseDealsTab** -- `client/src/components/BrowseDealsTab.tsx` -- Tab component within the marketplace for browsing available deals

### Hooks
- `useMarketplaceBrowse()` -- Fetches paginated marketplace listings with filter and sort parameters
- `useMarketplaceFilterOptions()` -- Fetches available filter options for marketplace search (industries, bounty ranges, locations)
- `useIntroductionClaim()` -- Mutation hook for claiming a marketplace listing
- `useMyClaims()` -- Lists marketplace requests the current user has claimed
- `useMySharedRequests()` -- Lists marketplace requests the current user has shared
- `use-pending-claim` -- Tracks the status of a pending claim awaiting verification
- `use-claim-verification` -- Manages the claim verification flow and status polling

### API Module
- `client/src/lib/api/marketplace.ts` -- Browse, share, claim, and analytics endpoints for the marketplace

## External Integrations
- None directly; leverages the introduction and payment modules for fulfillment and payout

## Business Logic
- Users can share their introduction requests to the marketplace, generating a unique public link with a short code
- Public links allow unauthenticated visitors to view request details; visits are tracked for analytics
- Any authenticated user can claim a marketplace listing, signaling intent to make the introduction
- Bot detection guard analyzes request patterns and headers to prevent automated claiming and scraping
- Marketplace-specific rate limiting is applied on top of global throttling to prevent abuse of browse and claim endpoints
- Claim verification ensures the claimant has a legitimate connection to the target before the claim is confirmed
- Payout management integrates with the payments module to disburse bounties for successfully fulfilled marketplace claims
- Share events (views, clicks, claims) are tracked for analytics and can be used to surface trending or popular requests

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-06 | Initial documentation | Claude Code |
