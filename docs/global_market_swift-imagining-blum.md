# Global Marketplace Production-Ready Implementation Plan

## Executive Summary

The Global Marketplace feature is ~60% complete. The backend is production-ready but the frontend uses mock data. A critical blocker is that database migrations haven't been generated. Additionally, "deal" terminology needs to be renamed to "request" throughout the codebase.

---

## Critical Issues

| Priority | Issue | Impact |
|----------|-------|--------|
| 🔴 P0 | Database migrations not generated | Tables don't exist - runtime errors |
| 🔴 P0 | Frontend uses mock data | Browse/MyShares tabs show static content |
| 🟡 P1 | "deal" terminology everywhere | Needs rename to "request" (50+ files) |
| 🟡 P1 | Rate limiting uses in-memory store | Resets on server restart |

---

## Phase 1: Database Migrations (Critical)

### Commands to Run
```bash
cd server
npx drizzle-kit generate   # Generate migration file
npx drizzle-kit migrate    # Apply migration
```

### Tables to Create
1. `marketplace_shares` - Share links with platform/UTM tracking
2. `marketplace_claims` - Claim lifecycle and earnings
3. `marketplace_share_events` - Analytics events

### Columns to Add to `introduction_requests`
- `marketplace_share_code` VARCHAR(50)
- `marketplace_claimed_by` UUID (FK → users)
- `marketplace_claimed_at` TIMESTAMP
- `marketplace_sharer_earnings` NUMERIC(10,2)
- `marketplace_claimer_earnings` NUMERIC(10,2)

### Verification
```bash
psql $DATABASE_URL -c "\dt marketplace*"
```

---

## Phase 2: Rename "deal" → "request"

### 2.1 Backend Changes (13 files)

**DTOs (rename files):**
- `dto/claim-deal.dto.ts` → `dto/claim-request.dto.ts`
- `dto/share-deal.dto.ts` → `dto/share-request.dto.ts`

**Routes to change:**
- `GET /marketplace/deal/:dealId/:sharerCode` → `GET /marketplace/request/:requestId/:sharerCode`
- `POST /marketplace/deal/:dealId/:sharerCode/track` → `POST /marketplace/request/:requestId/:sharerCode/track`
- `DELETE /marketplace/deal/:dealId` → `DELETE /marketplace/request/:requestId`

**Files to modify:**
- `server/src/modules/global-marketplace/dto/index.ts`
- `server/src/modules/global-marketplace/global-marketplace.constants.ts`
- `server/src/modules/global-marketplace/global-marketplace.service.ts`
- `server/src/modules/global-marketplace/controllers/marketplace-public.controller.ts`
- `server/src/modules/global-marketplace/controllers/marketplace-protected.controller.ts`
- `server/src/modules/global-marketplace/services/marketplace-browse.service.ts`
- `server/src/modules/global-marketplace/services/marketplace-claim.service.ts`

### 2.2 Frontend Changes (35+ files)

**Routes:**
- `/deal/:dealId/:sharerCode` → `/request/:requestId/:sharerCode`

**Files/folders to rename:**
| Old | New |
|-----|-----|
| `contexts/DealClaimContext.tsx` | `contexts/RequestClaimContext.tsx` |
| `pages/PublicDealPage.tsx` | `pages/PublicRequestPage.tsx` |
| `pages/public-deal/` (10 files) | `pages/public-request/` |
| `components/marketplace/DealDetailsModal.tsx` | `RequestDetailsModal.tsx` |
| `components/marketplace/ClaimDealOnboarding.tsx` | `ClaimRequestOnboarding.tsx` |
| `components/marketplace/MySharedDealsTab.tsx` | `MySharedRequestsTab.tsx` |
| `components/marketplace/deal-details/` | `request-details/` |
| `components/marketplace/my-shared-deals/` | `my-shared-requests/` |
| `pages/marketplace/BrowseDealsTab.tsx` | `BrowseRequestsTab.tsx` |

**Key files requiring internal changes:**
- `client/src/App.tsx` - Update route and provider
- `client/src/lib/api.ts` - Update endpoint URLs and method names
- `client/src/hooks/use-pending-claim.ts` - Change `dealId` → `requestId`
- `client/src/components/marketplace/index.ts` - Update exports
- `client/src/components/marketplace/marketplace-card/types.ts` - Rename `MarketplaceDeal` → `MarketplaceRequest`

---

## Phase 3: Frontend API Integration

### 3.1 Create New Hooks

**Files to create:**
- `client/src/hooks/useMarketplaceBrowse.ts` - Fetch browse data from API
- `client/src/hooks/useMarketplaceFilterOptions.ts` - Fetch filter options
- `client/src/hooks/useMySharedRequests.ts` - Fetch user's shared requests
- `client/src/hooks/useMyClaims.ts` - Fetch user's claims
- `client/src/lib/marketplace-transformers.ts` - Transform API responses

### 3.2 Replace Mock Data

**Files using mock data that need API integration:**

| File | Current State | Required Change |
|------|--------------|-----------------|
| `pages/GlobalOpportunities.tsx` | Imports `mockMarketplaceDeals` | Use `useMarketplaceBrowse()` |
| `pages/marketplace/BrowseDealsTab.tsx` | Uses mock array | Use hook data with pagination |
| `pages/marketplace/useMarketplaceFilters.ts` | Client-side filtering on mock | Pass filters to API |
| `components/marketplace/MySharedDealsTab.tsx` | Uses `mockSharedDeals` | Use `useMySharedRequests()` |
| `components/marketplace/ClaimDealOnboarding.tsx` | Uses `Math.random()` | Use real `triggerVerification()` |

### 3.3 Add My Claims Tab

Create `client/src/components/marketplace/MyClaimsTab.tsx` showing user's claim history.

### 3.4 Data Transformation

Backend returns:
```typescript
{ id, contactName, meetingTitle, bountyAmount, isUrgent, expiredAt }
```

Frontend expects:
```typescript
{ id, prospect: { name, title, company }, meetingAgenda: { title }, bountyAmount, urgency, daysRemaining }
```

Create transformer in `marketplace-transformers.ts`.

---

## Phase 4: Files to Delete

After migration, remove mock data files:
- `client/src/pages/marketplace/mock-data.ts`
- Mock data exports from `my-shared-deals/mock-data.ts`

---

## Implementation Order

1. **Generate database migrations** (blocks everything)
2. **Backend renaming** (deal → request)
3. **Frontend API hooks creation** (no breaking changes)
4. **Frontend renaming** (deal → request)
5. **Connect frontend to APIs** (replace mock data)
6. **Add My Claims tab**
7. **Remove mock data files**
8. **Testing & verification**

---

## Verification Checklist

### Database
- [ ] Run `npx drizzle-kit generate` - migration file created
- [ ] Run `npx drizzle-kit migrate` - tables created
- [ ] Verify tables: `\dt marketplace*`

### Backend
- [ ] `npm run build` compiles without errors
- [ ] API routes respond at `/marketplace/request/*`
- [ ] Old `/marketplace/deal/*` routes return 404

### Frontend
- [ ] `npm run build` compiles without errors
- [ ] `/request/:id/:code` route loads PublicRequestPage
- [ ] Browse tab loads real data from API
- [ ] My Shared Requests tab loads real data
- [ ] Claim flow uses real verification (no Math.random)
- [ ] Filters/search/pagination work with API

### End-to-End
- [ ] Share a request → get valid share URL with `/request/`
- [ ] Open public request page → data loads from API
- [ ] Claim flow completes successfully
- [ ] Analytics events tracked correctly

---

## Security (Already Implemented)

- JWT authentication on protected endpoints
- Rate limiting (needs Redis for production)
- Bot detection (honeypot, user-agent, timing)
- CAPTCHA on claim start
- IP hashing for analytics privacy

---

## File Count Summary

| Category | Files to Modify/Create |
|----------|----------------------|
| Database | 1 migration file |
| Backend | 13 files |
| Frontend | 35+ files |
| **Total** | ~50 files |

---

## Critical Files Reference

**Backend:**
- `server/src/modules/global-marketplace/controllers/marketplace-protected.controller.ts`
- `server/src/modules/global-marketplace/services/marketplace-browse.service.ts`
- `server/src/modules/global-marketplace/dto/claim-deal.dto.ts`

**Frontend:**
- `client/src/App.tsx`
- `client/src/contexts/DealClaimContext.tsx`
- `client/src/lib/api.ts`
- `client/src/pages/GlobalOpportunities.tsx`
- `client/src/pages/marketplace/useMarketplaceFilters.ts`
- `client/src/components/marketplace/ClaimDealOnboarding.tsx`
