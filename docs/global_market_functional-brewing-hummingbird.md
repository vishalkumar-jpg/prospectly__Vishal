# Marketplace Backend Integration - Implementation Plan

## Overview
Connect the existing marketplace frontend (currently using mock data) to the fully built backend APIs. Focus on the claim verification flow for new users signing up from public deal pages.

---

## Current State

### Backend (Built - Ready to Use)
- Controllers: `marketplace-public.controller.ts`, `marketplace-protected.controller.ts`
- Services: `marketplace-claim.service.ts`, `marketplace-claim-verify.service.ts`, `marketplace-share.service.ts`
- Database: `marketplace_claims`, `marketplace_shares`, `marketplace_share_events` tables
- Security: Rate limiting, bot detection, CAPTCHA guards in place

### Frontend (Mock Data - Needs Connection)
- `PublicDealPage.tsx` - Uses mock deal data
- `VerifyConnection.tsx` - UI complete, uses simulated verification
- `DealClaimContext.tsx` - Uses localStorage simulation
- `PendingClaimBanner.tsx` - Basic implementation exists
- `api.ts` - Missing all marketplace methods

---

## Requirements Summary

| Requirement | Decision |
|-------------|----------|
| Post-Signup Redirect | `/verify-connection` (existing page) |
| Verification Steps | Keep all 5: signup, linkedin, google, microsoft, verification |
| Sticky Banner | Progress %, spinner, prospect name, dismissable per session |
| Verification Logic | Background queue, refresh button to check status |
| User Eligibility | New users only (no prior claims) |
| Bounty Split | 50/50 claimer/sharer (backend handles this) |
| Menu Visibility | Hide verify-connection after claim resolved |

---

## Implementation Tasks

### Task 1: Add Marketplace API Methods
**File:** `/client/src/lib/api.ts`

Add new `marketplace` namespace with these methods:

```typescript
marketplace: {
  // Public (no auth)
  getPublicDeal: (dealId, sharerCode) => GET /marketplace/deal/:dealId/:sharerCode
  trackEvent: (dealId, sharerCode, event) => POST /marketplace/deal/:dealId/:sharerCode/track

  // Protected (auth required)
  browse: (params) => GET /marketplace/browse
  getFilters: () => GET /marketplace/browse/filters
  shareDeal: (data) => POST /marketplace/share
  getMyShares: (params) => GET /marketplace/my-shares
  getShareAnalytics: (shareId) => GET /marketplace/my-shares/:shareId/analytics
  startClaim: (data) => POST /marketplace/claim/start
  verifyClaim: (data) => POST /marketplace/claim/verify
  completeClaim: (claimId) => POST /marketplace/claim/complete
  getMyClaims: (params) => GET /marketplace/my-claims
  getClaimStatus: (claimId) => GET /marketplace/claim/:claimId/status (NEW - needs backend)
}
```

---

### Task 2: Update AuthCallback for Pending Claims
**File:** `/client/src/pages/AuthCallback.tsx`

**Changes:**
1. Import `usePendingClaim` hook
2. After successful auth, check for pending claim
3. Redirect to `/verify-connection` if pending claim exists, else `/dashboard`

```typescript
// After user authenticated:
if (hasPendingClaim) {
  navigate("/verify-connection", { replace: true });
} else {
  navigate("/dashboard", { replace: true });
}
```

---

### Task 3: Update DealClaimContext with Real API
**File:** `/client/src/contexts/DealClaimContext.tsx`

**Changes:**
1. Add new methods:
   - `startClaimFromPending()` - Calls `api.marketplace.startClaim()`
   - `refreshClaimStatus(claimId)` - Calls backend for current status
   - `checkEligibility()` - Verify user has no prior claims

2. Map backend status to frontend steps:
```typescript
// Backend: pending | verifying | verified | completed | failed
// Frontend: signup | linkedin | google | microsoft | verification

"pending" → linkedin: "in_progress"
"verifying" → verification: "in_progress"
"verified"/"completed" → all steps: "completed"
"failed" → verification: "failed"
```

3. Add `claimId` to ActiveDealClaim interface for tracking

---

### Task 4: Connect VerifyConnection to Backend
**File:** `/client/src/pages/VerifyConnection.tsx`

**Changes:**
1. On mount, call `startClaimFromPending()` if pending claim exists
2. After contact import success, trigger verification API
3. Add refresh button to poll claim status
4. Remove dev testing controls (or hide behind feature flag)

```typescript
const handleRefreshStatus = async () => {
  if (activeClaim?.claimId) {
    await refreshClaimStatus(activeClaim.claimId);
  }
};
```

---

### Task 5: Enhance PendingClaimBanner
**File:** `/client/src/components/marketplace/PendingClaimBanner.tsx`

**Enhancements:**
1. Show progress percentage: `{completedStepsCount}/5 steps`
2. Add spinner for in-progress verification
3. Session-based dismissal (sessionStorage, not localStorage)
4. Add refresh button to check status
5. Only show when `outcome === "pending"`

```typescript
// Dismissal logic:
const [dismissed, setDismissed] = useState(() =>
  sessionStorage.getItem("banner_dismissed") === "true"
);

// Show condition:
if (!hasActiveClaim || activeClaim?.outcome !== "pending" || dismissed) {
  return null;
}
```

---

### Task 6: Connect PublicDealPage to API
**File:** `/client/src/pages/PublicDealPage.tsx`

**Changes:**
1. Replace `mockDealData` with `api.marketplace.getPublicDeal()` call
2. Track page view via `api.marketplace.trackEvent()`
3. Keep pending claim flow (already works)

---

### Task 7: Conditional Verify-Connection Menu
**File:** Sidebar navigation component

**Logic:**
```typescript
// Only show menu item when:
const showVerifyConnection = hasActiveClaim && activeClaim?.outcome === "pending";
```

---

### Task 8: Backend - Add Claim Status Endpoint
**File:** `/server/src/modules/global-marketplace/controllers/marketplace-protected.controller.ts`

**New endpoint needed:**
```typescript
@Get('claim/:claimId/status')
async getClaimStatus(@Param('claimId') claimId: string) {
  return this.claimService.getClaimStatus(claimId);
}
```

---

## State Flow

```
PublicDealPage ("Claim Deal" click)
         │
         ▼
   setPendingClaim (localStorage)
         │
         ▼
   Redirect to /signin
         │
         ▼
   OAuth Sign Up/In
         │
         ▼
   AuthCallback
         │
   hasPendingClaim? ──Yes──► /verify-connection
         │
        No
         │
         ▼
   /dashboard

/verify-connection Flow:
         │
         ▼
   startClaim API call (creates marketplace_claims record)
         │
         ▼
   Import contacts (LinkedIn/Google/Microsoft)
         │
         ▼
   Backend verification (background queue)
         │
         ▼
   Refresh button to check status
         │
   ├── verified ──► completeClaim ──► "claimed" ──► Success UI
   │
   └── failed ──► "not_claimed" ──► Failure UI + retry option
```

---

## Files to Modify

| File | Priority | Changes |
|------|----------|---------|
| `client/src/lib/api.ts` | P0 | Add marketplace namespace |
| `client/src/contexts/DealClaimContext.tsx` | P0 | API integration |
| `client/src/pages/AuthCallback.tsx` | P0 | Pending claim redirect |
| `client/src/pages/PublicDealPage.tsx` | P1 | Use real API |
| `client/src/pages/VerifyConnection.tsx` | P1 | Connect verification |
| `client/src/components/marketplace/PendingClaimBanner.tsx` | P1 | Progress + refresh |
| `server/.../marketplace-protected.controller.ts` | P1 | Add status endpoint |
| Sidebar component | P2 | Conditional menu |

---

## Backend Endpoints Required

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /marketplace/deal/:id/:code` | Exists | Public deal fetch |
| `POST /marketplace/claim/start` | Exists | Initiates claim |
| `POST /marketplace/claim/verify` | Exists | Verifies connection |
| `POST /marketplace/claim/complete` | Exists | Finalizes claim |
| `GET /marketplace/claim/:id/status` | **NEEDS CREATE** | Poll claim status |
| `GET /marketplace/my-claims` | Exists | User's claims |
| `GET /marketplace/browse` | Exists | Browse deals |

---

## Verification Checklist

- [ ] API methods added to `api.ts`
- [ ] AuthCallback redirects to verify-connection for pending claims
- [ ] DealClaimContext uses real API calls
- [ ] VerifyConnection initiates claim on mount
- [ ] Contact import triggers verification
- [ ] Refresh button polls claim status
- [ ] Banner shows progress and is session-dismissable
- [ ] Menu hidden after claim resolved
- [ ] Public deal page uses real API
- [ ] Backend status endpoint created
