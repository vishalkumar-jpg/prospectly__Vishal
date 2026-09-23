# Implementation Plan: Introduction Failure & Refund Contract Mechanism

## Overview
This document outlines the implementation plan for integrating the Introduction Failure & Refund Contract mechanism into the Prospectly system. This feature allows connectors to mark introduction requests as "unfulfilled" when they cannot complete the introduction, triggering automatic refunds to the requester.

---

## Current System Understanding

### Payment Flow (Happy Path)
1. **Request Created** → Amount Authorized (100%) via dual PaymentIntents
2. **Connector Accepts** → Request status changes to `accepted`
3. **Intro Email Sent** → Capture 5% (`intro_email_sent` stage)
4. **Meeting Booked** → Capture remaining 95% (`meeting_booked` stage)
5. **Payout** → Connector receives 80% of total bounty

### Key Tables Involved
- `introduction_requests` - Main request table with `accepted_by`, `accepted_at`, `status`
- `introduction_potential_connectors` - Tracks potential connectors and their status
- `introduction_transactions` - Links request to payment intents
- `payment_stages` - Tracks individual payment stages (5% and 95%)
- `payout_history` - Tracks connector payouts

### Key Services
- `WorkflowService` - Handles accept/decline logic
- `PaymentsService` - Handles payment capture via Stripe
- `StripeService` - Direct Stripe API calls (has `cancelPaymentIntent` method)

---

## New Failure Paths to Support

| Scenario | Stage | Action Required |
|----------|-------|-----------------|
| A) Intro Sent → No response | `intro_sent` | Refund 5% + Release authorized 95% |
| B) Meeting Booked → No show | `meeting_booked` | Refund 5% + Refund 95% |
| C) Connector fails | Any | Another connector can retry |

---

## Database Changes

### 1. New Table: `payment_refunds`
Tracks all refund transactions with idempotency protection.

```sql
CREATE TABLE payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  introduction_request_id UUID NOT NULL REFERENCES introduction_requests(id) ON DELETE CASCADE,
  introduction_transaction_id UUID NOT NULL REFERENCES introduction_transactions(id) ON DELETE CASCADE,
  payment_stage_id UUID NOT NULL REFERENCES payment_stages(id) ON DELETE CASCADE,
  stripe_refund_id VARCHAR(100),
  refund_amount NUMERIC(10, 2) NOT NULL,
  refund_reason VARCHAR(50) NOT NULL,
  refund_status VARCHAR(30) DEFAULT 'pending',
  refunded_at TIMESTAMPTZ,
  initiated_by VARCHAR(20) NOT NULL, -- 'connector' or 'admin'
  initiated_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (payment_stage_id) -- Guarantees no double refund per stage
);

CREATE INDEX idx_payment_refunds_request ON payment_refunds(introduction_request_id);
CREATE INDEX idx_payment_refunds_status ON payment_refunds(refund_status);
```

### 2. New Table: `introduction_fulfillment_attempts`
Records why a connector failed to fulfill an introduction.

```sql
CREATE TABLE introduction_fulfillment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  introduction_request_id UUID NOT NULL REFERENCES introduction_requests(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  failure_stage VARCHAR(30) NOT NULL, -- 'intro_sent' or 'meeting_booked'
  failure_reason VARCHAR(50) NOT NULL, -- 'no_response', 'prospect_declined', 'scheduling_issues', 'no_show', 'other'
  failure_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fulfillment_attempts_request ON introduction_fulfillment_attempts(introduction_request_id);
CREATE INDEX idx_fulfillment_attempts_connector ON introduction_fulfillment_attempts(connector_id);
```

### 3. Update `introduction_requests` Status Check
Add new status value `unfulfilled` to the status check constraint:

```sql
ALTER TABLE introduction_requests DROP CONSTRAINT introduction_requests_status_check;
ALTER TABLE introduction_requests ADD CONSTRAINT introduction_requests_status_check 
  CHECK (status IN ('pending', 'accepted', 'declined', 'intro_sent', 'meeting_scheduled', 'meeting_booked', 'meeting_completed', 'peer_feedback', 'completed', 'email_failed', 'unfulfilled'));
```

### 4. Update `introduction_potential_connectors` Status
Add `failed` status option for connectors who couldn't fulfill.

---

## Backend Implementation

### File Structure (Following 200-line limit rule)

```
server/src/modules/introductions/
├── workflow/
│   ├── workflow.controller.ts          # Add mark-unfulfilled endpoint
│   ├── workflow.service.ts             # Orchestrates unfulfillment flow
│   ├── workflow.dto.ts                 # Add MarkUnfulfilledDto
│   └── workflow.constants.ts           # New file for failure reasons
├── refunds/                            # NEW MODULE
│   ├── refunds.module.ts
│   ├── refunds.service.ts              # Core refund logic
│   ├── refunds.constants.ts            # Refund status, reasons
│   └── refunds.dto.ts                  # Refund DTOs
└── fulfillment/                        # NEW MODULE
    ├── fulfillment.module.ts
    ├── fulfillment.service.ts          # Fulfillment attempt tracking
    └── fulfillment.dto.ts
```

### 1. New Constants File: `workflow.constants.ts`
```typescript
export const FAILURE_REASONS = {
  NO_RESPONSE: 'no_response',
  PROSPECT_DECLINED: 'prospect_declined',
  SCHEDULING_ISSUES: 'scheduling_issues',
  NO_SHOW: 'no_show',
  INVALID_EMAIL: 'invalid_email',
  OTHER: 'other',
} as const;

export const FAILURE_STAGES = {
  INTRO_SENT: 'intro_sent',
  MEETING_BOOKED: 'meeting_booked',
} as const;

export const UNFULFILLMENT_MESSAGES = {
  ERROR: {
    NOT_ACCEPTED_CONNECTOR: 'Only the connector who accepted this request can mark it as unfulfilled',
    INVALID_STAGE: 'Request can only be marked unfulfilled from intro_sent or meeting_booked stages',
    ALREADY_UNFULFILLED: 'This request has already been marked as unfulfilled',
    REFUND_ALREADY_PROCESSED: 'Refund has already been processed for this payment stage',
    PAYMENT_NOT_CAPTURED: 'Cannot refund - payment was not captured for this stage',
  },
  SUCCESS: {
    MARKED_UNFULFILLED: 'Introduction request marked as unfulfilled. Refund initiated.',
  },
};
```

### 2. New DTO: `MarkUnfulfilledDto`
```typescript
// Add to workflow.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { FAILURE_REASONS } from './workflow.constants';

export class MarkUnfulfilledDto {
  @IsEnum(Object.values(FAILURE_REASONS))
  failureReason: string;

  @IsOptional()
  @IsString()
  failureNotes?: string;
}
```

### 3. New Endpoint in `workflow.controller.ts`
```typescript
@Post(':id/mark-unfulfilled')
async markUnfulfilled(
  @Res() res: Response,
  @CurrentUser('userId') userId: string,
  @Param('id') requestId: string,
  @Body() dto: MarkUnfulfilledDto
) {
  // Implementation calls workflowService.markUnfulfilled()
}
```

### 4. WorkflowService: `markUnfulfilled` Method
```typescript
async markUnfulfilled(
  userId: string,
  requestId: string,
  dto: MarkUnfulfilledDto
): Promise<{ success: boolean; message: string; refundDetails?: RefundResult }> {
  // 1. Validate connector is the accepted connector
  // 2. Validate request is in valid stage (intro_sent or meeting_booked)
  // 3. Create fulfillment attempt record
  // 4. Update introduction_potential_connectors.status to 'failed'
  // 5. Clear introduction_requests.accepted_by and accepted_at
  // 6. Update introduction_requests.status to 'pending' (allow retry)
  // 7. Trigger refund via RefundsService
  // 8. Return result
}
```

### 5. New RefundsService
```typescript
@Injectable()
export class RefundsService {
  // Core method to process refunds
  async processRefundForUnfulfillment(
    requestId: string,
    failureStage: 'intro_sent' | 'meeting_booked',
    initiatedBy: 'connector' | 'admin',
    initiatedByUserId: string,
    failureReason: string
  ): Promise<RefundResult> {
    // 1. Get transaction and payment stages
    // 2. Validate payment was captured (not already refunded)
    // 3. Based on failure stage:
    //    - intro_sent: Refund 5% + Cancel 95% PaymentIntent
    //    - meeting_booked: Refund 5% + Refund 95%
    // 4. Create payment_refunds records
    // 5. Return result
  }

  // Stripe refund wrapper
  private async createStripeRefund(
    paymentIntentId: string,
    amount: number,
    reason: string
  ): Promise<Stripe.Refund> {
    // Call stripe.refunds.create()
  }
}
```

### 6. StripeService: Add Refund Method
```typescript
// Add to stripe.service.ts
async createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: string,
  metadata?: Stripe.MetadataParam
): Promise<Stripe.Refund> {
  return this.stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount, // In cents, optional for full refund
    reason: reason as Stripe.RefundCreateParams.Reason,
    metadata,
  });
}
```

### 7. Database Schema Files

#### `payment-refunds.ts`
```typescript
import { pgTable, uuid, varchar, numeric, timestamp, text, index, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { introductionRequests } from './introduction-requests';
import { introductionTransactions } from './introduction-transactions';
import { paymentStages } from './payment-stages';
import { users } from './users';

export const paymentRefunds = pgTable('payment_refunds', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  introductionRequestId: uuid('introduction_request_id').notNull()
    .references(() => introductionRequests.id, { onDelete: 'cascade' }),
  introductionTransactionId: uuid('introduction_transaction_id').notNull()
    .references(() => introductionTransactions.id, { onDelete: 'cascade' }),
  paymentStageId: uuid('payment_stage_id').notNull()
    .references(() => paymentStages.id, { onDelete: 'cascade' }),
  stripeRefundId: varchar('stripe_refund_id', { length: 100 }),
  refundAmount: numeric('refund_amount', { precision: 10, scale: 2 }).notNull(),
  refundReason: varchar('refund_reason', { length: 50 }).notNull(),
  refundStatus: varchar('refund_status', { length: 30 }).default('pending'),
  refundedAt: timestamp('refunded_at', { withTimezone: true }),
  initiatedBy: varchar('initiated_by', { length: 20 }).notNull(),
  initiatedByUserId: uuid('initiated_by_user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniquePaymentStage: unique('unique_payment_stage_refund').on(table.paymentStageId),
  requestIdx: index('idx_payment_refunds_request').on(table.introductionRequestId),
  statusIdx: index('idx_payment_refunds_status').on(table.refundStatus),
}));

export type PaymentRefund = typeof paymentRefunds.$inferSelect;
```

#### `introduction-fulfillment-attempts.ts`
```typescript
import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { introductionRequests } from './introduction-requests';
import { users } from './users';

export const introductionFulfillmentAttempts = pgTable('introduction_fulfillment_attempts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  introductionRequestId: uuid('introduction_request_id').notNull()
    .references(() => introductionRequests.id, { onDelete: 'cascade' }),
  connectorId: uuid('connector_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  failureStage: varchar('failure_stage', { length: 30 }).notNull(),
  failureReason: varchar('failure_reason', { length: 50 }).notNull(),
  failureNotes: text('failure_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  requestIdx: index('idx_fulfillment_attempts_request').on(table.introductionRequestId),
  connectorIdx: index('idx_fulfillment_attempts_connector').on(table.connectorId),
}));

export type IntroductionFulfillmentAttempt = typeof introductionFulfillmentAttempts.$inferSelect;
```

---

## Frontend Implementation

### 1. New Tab: "Unfulfilled" in IntroductionPipeline.tsx
Add a fourth tab beside "Archive" to show unfulfilled requests for the connector.

```tsx
// Add to TabsList
<TabsTrigger value="unfulfilled">
  <XCircle className="h-4 w-4" />
  <span>Unfulfilled</span>
  <Badge>{unfulfilledCount}</Badge>
</TabsTrigger>

// Add TabsContent
<TabsContent value="unfulfilled">
  <UnfulfilledTab />
</TabsContent>
```

### 2. New Component: `UnfulfilledTab.tsx`
Displays introduction requests that the current connector marked as unfulfilled.

### 3. "Mark Unfulfilled" Button in PipelineTab.tsx
Add button to cards in `intro_sent` and `meeting_booked` stages:

```tsx
{(intro.stage === 'intro_sent' || intro.stage === 'meeting_booked') && (
  <Button
    variant="destructive"
    size="sm"
    onClick={(e) => {
      e.stopPropagation();
      openUnfulfillmentModal(intro);
    }}
  >
    <XCircle className="h-4 w-4 mr-1" />
    Cannot Fulfill
  </Button>
)}
```

### 4. New Modal: `MarkUnfulfilledModal.tsx`
Modal with:
- Dropdown for failure reason (predefined options)
- Text area for additional notes
- Confirmation warning about refund
- Submit button

```tsx
interface MarkUnfulfilledModalProps {
  isOpen: boolean;
  onClose: () => void;
  introduction: ActiveIntroduction;
  onSuccess: () => void;
}

const FAILURE_REASON_OPTIONS = [
  { value: 'no_response', label: 'No response from prospect' },
  { value: 'prospect_declined', label: 'Prospect declined' },
  { value: 'scheduling_issues', label: 'Scheduling issues' },
  { value: 'no_show', label: 'No show at meeting' },
  { value: 'invalid_email', label: 'Invalid email address' },
  { value: 'other', label: 'Other' },
];
```

### 5. API Hook: `useMarkUnfulfilled.ts`
```typescript
export function useMarkUnfulfilled() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ requestId, failureReason, failureNotes }) => {
      const response = await fetch(`/api/introduction-requests/${requestId}/mark-unfulfilled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureReason, failureNotes }),
      });
      if (!response.ok) throw new Error('Failed to mark as unfulfilled');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/introduction-requests/connector/pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['/api/introduction-requests/introduction-pipeline/stats'] });
    },
  });
}
```

---

## Validation Rules

### Backend Validations
1. **Connector Authorization**: Only `introduction_requests.accepted_by` can mark unfulfilled
2. **Valid Stage**: Request must be in `intro_sent` or `meeting_booked` status
3. **Payment Captured**: Verify payment was actually captured before refunding
4. **No Double Refund**: Check `payment_refunds` table for existing refund on stage
5. **Idempotency**: Use database unique constraint on `payment_stage_id`

### Refund Logic by Stage

| Stage | 5% Payment | 95% Payment | Action |
|-------|------------|-------------|--------|
| `intro_sent` | Captured | Authorized (not captured) | Refund 5% + Cancel 95% intent |
| `meeting_booked` | Captured | Captured | Refund 5% + Refund 95% |

---

## Migration Steps

### 1. Database Migration
```bash
# Generate migration
npm run db:generate

# Run migration
npm run db:migrate
```

### 2. Backend Deployment Order
1. Deploy database schema changes
2. Deploy new modules (refunds, fulfillment)
3. Deploy updated workflow module
4. Deploy updated stripe service

### 3. Frontend Deployment
1. Deploy new components
2. Deploy updated PipelineTab
3. Deploy updated IntroductionPipeline

---

## Testing Checklist

### Unit Tests
- [ ] RefundsService.processRefundForUnfulfillment()
- [ ] WorkflowService.markUnfulfilled()
- [ ] Validation: only accepted connector can mark unfulfilled
- [ ] Validation: only valid stages allowed
- [ ] Validation: no double refunds

### Integration Tests
- [ ] Full flow: intro_sent → mark unfulfilled → refund 5% + cancel 95%
- [ ] Full flow: meeting_booked → mark unfulfilled → refund both
- [ ] Retry flow: after unfulfillment, another connector can accept
- [ ] Stripe webhook handling for refund events

### E2E Tests
- [ ] UI: Mark unfulfilled button appears only in correct stages
- [ ] UI: Modal shows correct options
- [ ] UI: Success toast after marking unfulfilled
- [ ] UI: Request moves to unfulfilled tab
- [ ] UI: Request becomes available for other connectors

---

## Files to Create/Modify

### New Files
1. `server/src/database/schema/payment-refunds.ts`
2. `server/src/database/schema/introduction-fulfillment-attempts.ts`
3. `server/src/modules/introductions/workflow/workflow.constants.ts`
4. `server/src/modules/introductions/refunds/refunds.module.ts`
5. `server/src/modules/introductions/refunds/refunds.service.ts`
6. `server/src/modules/introductions/refunds/refunds.constants.ts`
7. `server/src/modules/introductions/refunds/refunds.dto.ts`
8. `client/src/components/introduction/MarkUnfulfilledModal.tsx`
9. `client/src/components/introduction/UnfulfilledTab.tsx`
10. `client/src/hooks/useMarkUnfulfilled.ts`

### Modified Files
1. `server/src/database/schema/index.ts` - Export new schemas
2. `server/src/database/schema/relations.ts` - Add new relations
3. `server/src/modules/stripe/stripe.service.ts` - Add createRefund method
4. `server/src/modules/introductions/workflow/workflow.controller.ts` - Add endpoint
5. `server/src/modules/introductions/workflow/workflow.service.ts` - Add markUnfulfilled
6. `server/src/modules/introductions/workflow/workflow.dto.ts` - Add DTO
7. `server/src/modules/introductions/workflow/workflow.module.ts` - Import refunds module
8. `client/src/pages/IntroductionPipeline.tsx` - Add unfulfilled tab
9. `client/src/components/introduction/PipelineTab.tsx` - Add mark unfulfilled button

---

## Summary

This implementation provides:
1. **Connector Control**: Connectors can mark requests as unfulfilled with a reason
2. **Automatic Refunds**: System handles refunds based on which payments were captured
3. **Retry Mechanism**: Request returns to pending state for other connectors
4. **Audit Trail**: Full tracking of fulfillment attempts and refunds
5. **Idempotency**: Database constraints prevent double refunds
6. **UI Integration**: New tab and modal for connector workflow

**Awaiting your "Proceed" command to begin implementation.**
