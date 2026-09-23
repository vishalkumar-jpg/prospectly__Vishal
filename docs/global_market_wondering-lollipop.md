# Getting Started + Verify Connection Integration (Revised v2)

## Overview

Simplify Getting Started page and integrate Verify Connection flow with new verification states.

**Key Constraints:**
- Only NEW users can claim opportunities (no existing contacts to check)
- Show verify section once per claim (remove when resolved)
- No real-time polling - manual refresh button for status updates
- DO NOT modify existing import card components
- No source selector in verify banner - just guide user to import below

---

## Phase 1: Frontend UI Changes

### 1.1 Remove Verbose Sections from All 3 Steps

**File:** `client/src/pages/GettingStarted.tsx`

**REMOVE completely (lines ~1099-1322):**
- Security Section with PrivacyPromiseCard components
- Step-specific SecurityFeature lists
- Industry Certifications section (SOC 2, GDPR badges)
- PrivacyModelExplainer collapsible
- Benefits Section with benefits list
- Time Investment card
- TechnicalSecurityColumn component
- Two-column layout with ImportInstructions

**KEEP minimal header only:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Icon]  Step Title                                    Step X/3        │
│  Brief one-line description                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Redesigned VerifyConnectionBanner (No Source Selector)

**Placement:** Same width as LinkedIn card, directly above it

**REMOVED:** Source selector buttons - user imports from any source below

**New Layout:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  🛡️ VERIFY YOUR CONNECTION                                  [Refresh ↻]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Verifying connection to:                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  👤 John Smith                                                  │   │
│  │     VP of Sales at Acme Corp                                   │   │
│  │                                          💰 $500 when verified │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  VERIFICATION STATUS                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  [Status Icon]  [Status Message]                               │   │
│  │                                                                 │   │
│  │  [Guidance text / sources checked indicator]                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  📋 Import your contacts from any source below. We'll automatically    │
│     check if the prospect exists in your network.                      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Verification States:**

| State | Icon | Message | Detail |
|-------|------|---------|--------|
| `pending` | ⏳ | Waiting for contact import | Import contacts from any source below to start verification |
| `in_progress` | 🔄 | Checking your contacts... | Import in progress. Click refresh to see latest status |
| `claimed_completed` | ✅ | Opportunity Claimed! | Connection verified successfully. Proceed with introduction |
| `not_claimed_failed` | ❌ | Prospect Not Found | Not found in any network. All sources checked: ✓ LinkedIn ✓ Google ✓ Microsoft ✓ Apple ✓ CSV |

**Sources Checked Indicator (shown when relevant):**
```
Sources checked: ✓ LinkedIn  ✓ Google  ○ Microsoft  ○ Apple  ○ CSV
```

**Display Logic:**
- Show when `hasActiveClaim && !claimResolved`
- Hide when status = `claimed_completed` OR `not_claimed_failed`
- Mark as failed only after ALL 5 sources attempted

### 1.3 Updated Step 1 Structure (Single Column)

```jsx
{currentStep === 1 && (
  <div className="space-y-6">

    {/* Verify Connection Banner - Same width as LinkedIn */}
    {shouldShowVerifyBanner && (
      <VerifyConnectionBanner
        claim={activeClaim}
        status={verificationStatus}
        sourcesChecked={sourcesChecked}
        onRefresh={handleRefreshStatus}
      />
    )}

    {/* LinkedIn Connections Section - UNCHANGED */}
    <div data-section="linkedin">
      <LinkedInConnectionsSection />
    </div>

    {/* Contact Import Options Card - UNCHANGED */}
    <Card>
      {/* Google, Microsoft, Apple, CSV options */}
    </Card>

  </div>
)}
```

### 1.4 Files to Modify

| File | Change |
|------|--------|
| `src/pages/GettingStarted.tsx` | Remove Security/Benefits sections (lines 1099-1322), simplify header, remove two-column layout |
| `src/components/getting-started/VerifyConnectionBanner.tsx` | Redesign: remove source selector, add states, add refresh button, add sources checked indicator |
| `src/components/getting-started/ImportInstructions.tsx` | **DELETE** (no longer needed) |
| `src/contexts/RequestClaimContext.tsx` | Add: `verificationStatus`, `sourcesChecked[]`, `refreshStatus()`, `markSourceChecked()` |

### 1.5 RequestClaimContext Updates

```typescript
interface ClaimState {
  activeClaim: {
    requestId: string;
    sharerCode: string;
    prospect: { name: string; title: string; company: string };
    bountyAmount: number;
  } | null;

  // NEW fields
  verificationStatus: 'pending' | 'in_progress' | 'claimed_completed' | 'not_claimed_failed';
  sourcesChecked: ('linkedin' | 'google' | 'microsoft' | 'apple' | 'csv')[];
  claimResolved: boolean;  // true when completed or failed
}

// NEW methods
refreshStatus(): Promise<void>;  // Fetch latest status from API
markSourceChecked(source: string): void;  // Called after import completes
```

---

## Phase 2: Backend Planning (Implement After Frontend Verified)

### 2.1 Database Schema

**New table: `claim_verifications`**
```sql
CREATE TABLE claim_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  request_id VARCHAR(255) NOT NULL,
  sharer_code VARCHAR(255) NOT NULL,

  -- Prospect info
  prospect_name VARCHAR(255),
  prospect_company VARCHAR(255),
  prospect_title VARCHAR(255),
  bounty_amount DECIMAL(10,2),

  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  -- Values: pending, in_progress, claimed_completed, not_claimed_failed

  -- Sources tracking
  sources_checked TEXT[] DEFAULT '{}',
  -- e.g., ['linkedin', 'google', 'microsoft', 'apple', 'csv']

  -- Match result (if found)
  matched_contact_id INTEGER REFERENCES contacts(id),
  matched_source VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,

  UNIQUE(user_id, request_id)
);
```

### 2.2 Verification Flow

```
1. User claims request from public marketplace
   → Create claim_verifications record (status: pending)
   → Redirect to /dashboard/getting-started

2. User imports contacts (any source)
   → Backend import job runs
   → After import completes, trigger verification check

3. Verification check:
   → Search imported contacts for prospect match
   → Match criteria: LinkedIn profile URL OR email (if ANY match found → claimed)

4. If FOUND:
   → status = 'claimed_completed'
   → Store matched_contact_id, matched_source
   → resolved_at = NOW()

5. If NOT FOUND:
   → Add source to sources_checked[]
   → If all 5 sources in sources_checked[]:
       → status = 'not_claimed_failed'
       → resolved_at = NOW()
   → Else: status remains 'pending'
```

### 2.3 API Endpoints

```
GET /api/claims/active
→ Returns current claim + verification status

Response: {
  hasClaim: boolean,
  claim?: {
    requestId: string,
    sharerCode: string,
    prospect: { name, title, company },
    bountyAmount: number,
    status: 'pending' | 'in_progress' | 'claimed_completed' | 'not_claimed_failed',
    sourcesChecked: string[],
    matchedSource?: string,
    resolved: boolean
  }
}

POST /api/claims/refresh-status
→ Called by refresh button, returns latest status

Response: {
  status: string,
  sourcesChecked: string[],
  matchedSource?: string,
  resolved: boolean
}
```

### 2.4 Import Job Integration

**Location:** Contact import completion handler (all sources)

**Add after existing import logic:**
```javascript
// After contacts imported successfully
if (user.hasActiveClaim) {
  const claim = await getClaimVerification(user.id);
  if (claim && claim.status === 'pending') {
    // Update status to in_progress during check
    await updateClaimStatus(claim.id, 'in_progress');

    // Search for prospect match by LinkedIn URL or email
    const match = await findProspectMatch(claim.prospect, importedContacts);
    // Match logic: Check if prospect.linkedinUrl OR prospect.email exists in imported contacts

    if (match) {
      await updateClaimStatus(claim.id, 'claimed_completed', {
        matchedContactId: match.id,
        matchedSource: importSource
      });
    } else {
      await addSourceChecked(claim.id, importSource);

      // Check if all sources tried
      if (claim.sourcesChecked.length >= 5) {
        await updateClaimStatus(claim.id, 'not_claimed_failed');
      } else {
        await updateClaimStatus(claim.id, 'pending');
      }
    }
  }
}
```

---

## Implementation Order

### Phase 1: Frontend (DO FIRST)
1. Simplify `GettingStarted.tsx`:
   - Remove Security & Benefits sections (lines 1099-1322)
   - Simplify step header to minimal version
   - Remove two-column layout, keep single column
2. Redesign `VerifyConnectionBanner.tsx`:
   - Remove source selector completely
   - Add new status states (pending, in_progress, claimed_completed, not_claimed_failed)
   - Add refresh button
   - Add sources checked indicator
3. Delete `ImportInstructions.tsx`
4. Update `RequestClaimContext.tsx`:
   - Add verificationStatus, sourcesChecked state
   - Add refreshStatus() method
5. Test with mock data by setting localStorage

### Phase 2: Backend (AFTER FRONTEND APPROVED)
1. Create migration for claim_verifications table
2. Add GET /api/claims/active endpoint
3. Add POST /api/claims/refresh-status endpoint
4. Add verification hook to import completion jobs
5. Implement prospect matching (LinkedIn URL OR email match)
6. Test end-to-end flow

---

## Key Files

**Modify:**
- `client/src/pages/GettingStarted.tsx`
- `client/src/components/getting-started/VerifyConnectionBanner.tsx`
- `client/src/contexts/RequestClaimContext.tsx`

**Delete:**
- `client/src/components/getting-started/ImportInstructions.tsx`

**Unchanged:**
- All import card components (LinkedIn, Google, Microsoft, Apple, CSV)
- Import modals

---

## Verification Checklist

### Frontend
- [ ] Getting Started has minimal step header (no Security/Benefits sections)
- [ ] All 3 steps simplified
- [ ] VerifyConnectionBanner above LinkedIn section (same width)
- [ ] NO source selector in banner
- [ ] Shows verification status with correct states
- [ ] Refresh button fetches latest status
- [ ] Sources checked indicator shows progress
- [ ] Banner hidden after claim resolved
- [ ] Import cards completely unchanged

### Backend (Phase 2)
- [ ] claim_verifications table created
- [ ] /api/claims/active returns correct data
- [ ] /api/claims/refresh-status works
- [ ] Import completion triggers verification check
- [ ] Prospect matching works (LinkedIn URL OR email)
- [ ] All 5 sources must fail before marking as failed
