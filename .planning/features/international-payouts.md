# Feature: International Payouts (Stripe Global Payouts)

**Version:** 2.0
**Status:** Active
**Last Updated:** 2026-06-27

## Overview
Connectors and candidates in **US, India, Philippines, Mexico, South Africa** add a local bank account and receive referral payouts in their local currency. Replaces the old US-only **Stripe Connect Express** integration with **Stripe Global Payouts** (v2 Money Management API, preview). Requesters are still charged in **USD**; Stripe converts to the recipient's local currency at payout time. Stripe's payout fees (standard + cross-border + FX) are **passed on to the recipient** (configurable). Payouts are **OutboundPayments** funded from the platform's USD Financial Account.

---

## Architecture at a glance
- **Onboarding:** user picks country → `POST /stripe/payouts/account` creates a v2 recipient account + returns a Stripe-hosted onboarding link → user adds local bank.
- **Pay out:** each rail computes the recipient amount → deducts fees (gross-up) → sends ONE `OutboundPayment` (USD→local) with an idempotency key.
- **Status/release:** the **v2 webhook** (`/webhooks/stripe/v2`) drives onboarding-complete detection and deferred-payout release.
- **Webhook-only** (no cron): deferred payouts release solely via the v2 webhook.

---

## Server

### Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /stripe/payouts/status | Yes | Onboarding/capability status, country, payout currency, payout method |
| POST | /stripe/payouts/account | Yes | Create recipient account (uses `users.country`) + Stripe-hosted onboarding link; returns `{url, alreadyConnected}` |
| GET | /stripe/payouts/account-link | Yes | Refresh onboarding link (returns `{url:null, alreadyConnected:true}` if already onboarded) |
| POST | /stripe/payouts/disconnect | Yes | Detach recipient account from the platform |
| POST | /webhooks/stripe/v2 | Public | v2 thin-event endpoint (signature-verified): account/capability + OutboundPayment events |
| POST | /webhooks/stripe | Public | v1 webhook (charges/subscriptions/refunds) — unchanged |

### Key services / files
- **`modules/stripe/stripe.service.ts`** — v2 calls via `stripe.rawRequest(...)` (the v2 Money Management API is NOT typed in stripe-node, so we use rawRequest + our own interfaces in `stripe-v2.types.ts`). Methods: `createRecipientAccount`, `createRecipientOnboardingLink`, `getRecipientAccount`, `getRecipientOnboardingState`, `listPayoutMethods`, `getDefaultPayoutMethodId`, `coercePayoutMethodId`, `createOutboundPayment`, `verifyV2WebhookEvent`, `fetchV2Resource`. v1 client (charges/subscriptions/refunds) unchanged.
- **`modules/stripe/stripe.controller.ts`** — `/stripe/payouts/*`; `getPayoutStatus` self-heals (persists onboarding flag + payout method); `reconcileOnboarding` helper.
- **Payout processors** (one `OutboundPayment` per payout, preserving row-lock idempotency + credits + splits + ONBOARDING_PENDING deferral):
  - `modules/payout-queue/payout-queue.processor.ts` (prospecting: trust-score + feedback)
  - `modules/recruitment/payout-queue/services/recruitment-payout-queue.processor.ts` (+ `recruitment-payout-stripe-handler.service.ts`) — connector **and** candidate
  - `modules/global-marketplace/payout/marketplace-payout-queue.processor.ts` (claimer/sharer split)
  - `modules/payments/payments.service.ts` (manual/admin payout path)
- **Fees:** `config/payout-fees.config.ts` (rates + revert flag) + `modules/payments/utils/payout-fees.util.ts` (`calculatePayoutFees`).
- **Webhook handlers** (`modules/webhooks/stripe/`):
  - `payout-account-updated.handler.ts` — onboarding complete → persist flag + payout method → release deferred payouts (all 3 rails).
  - `outbound-payment-status.handler.ts` — `posted`→completed; `failed`/`returned`→failed.
  - routing + event-type constants in `stripe-webhooks.service.ts` + `stripe.constants.ts`.

### Config (env)
| Key | Purpose |
|-----|---------|
| `STRIPE_SECRET_KEY` | Account with Global Payouts enabled |
| `STRIPE_FINANCIAL_ACCOUNT_ID` | Platform USD Financial Account funding OutboundPayments (**required**) |
| `STRIPE_V2_WEBHOOK_SECRET` | Signing secret for `/webhooks/stripe/v2` (**required** for release/status) |
| `STRIPE_WEBHOOK_SECRET` | v1 webhook secret (existing) |
| `DEDUCT_PAYOUT_FEES_FROM_RECIPIENT` | `true` (default) = recipient bears fees; `false` = platform bears (revert switch) |

### Database
| Table | Payout-relevant columns |
|-------|-------------------------|
| users | `country`, `payout_currency`, `stripe_recipient_account_id`, `stripe_payout_method_id`, `stripe_recipient_onboarding_complete` (Connect columns dropped) |
| payout_history | `recipient_account_id`, `stripe_outbound_payment_id`, `destination_currency`, `recipient_received_amount`, `payout_fee_breakdown` (jsonb) |
| recruitment_payout_history | `recipient_account_id`, `stripe_outbound_payment_id`, `recipient_received_amount`, `payout_fee_breakdown` (jsonb); `recipientId` = the paid user (connector OR candidate) |

Migrations: `0077_global_payouts_recipient_fields`, `0078_widen_global_payout_id_columns` (ids → varchar(255)). **Fee columns** (`recipient_received_amount`, `payout_fee_breakdown`) — schema updated; migration generated manually. `netAmount`/`recipientAmount` = **gross earned**; `recipient_received_amount` = amount actually sent (gross − fees).

---

## Client
- Payout setup UI: `client/src/components/finance/StripeConnectModal.tsx` + `StripeConnectSetup.tsx` (country selector US/IN/PH/MX/ZA → Stripe-hosted onboarding → status).
- Shared hook: `client/src/hooks/usePayoutStatus.ts` (React Query; focus-refetch + bounded polling; `refresh()`/`reconcile()`).
- API + helpers: `client/src/lib/api/payments.ts`, `client/src/lib/stripe-connect.ts`.

---

## Payout fees (per country)
Rates in `config/payout-fees.config.ts` (US-sender, local bank; editable). Standard fee **$1.50/payout** all countries.
| Country | Cross-border | FX |
|---|---|---|
| US | 0% | 0% |
| IN | 0.75% | 1% |
| PH | 1.00% | 1% |
| MX | 0.25% | 1% |
| ZA | 0.50% | 1% |

- Deducted from the **recipient's** share only (platform commission unchanged).
- Full breakdown saved to `payout_fee_breakdown` (jsonb); amount sent saved to `recipient_received_amount`.
- Revert to platform-bears-fees: set `DEDUCT_PAYOUT_FEES_FROM_RECIPIENT=false` (no code change).

---

## v2 webhook events (Stripe Dashboard → `/api/webhooks/stripe/v2`)
Routed by **exact** `event.type` (see `stripe.constants.ts`):
- **Account / onboarding** → `PayoutAccountUpdatedHandler`:
  `v2.core.account[configuration.recipient].capability_status_updated` (primary trigger), `…[configuration.recipient].updated`, `v2.core.account.created`, `v2.core.account.updated`.
- **OutboundPayment** → `OutboundPaymentStatusHandler`:
  `outbound_payment.created/posted/failed/canceled/returned`.
Unknown types → debug log, no-op (never mis-routed). Every event is **signature-verified first**.

---

## Deferred payout → auto-release flow (webhook-only)
When a payout is released but the recipient hasn't connected a bank → row set `ONBOARDING_PENDING` (keyed by the **recipient user id**). When that user connects → v2 capability event → `PayoutAccountUpdatedHandler` → `processDeferredPayouts*` re-queues → OutboundPayment sent.
- Works for: prospecting (trust + feedback), recruitment **connector AND candidate** (recipient-keyed, payout-type-agnostic), marketplace (claimer/sharer; `markPayoutRecordDeferred` + `releaseDeferredMarketplacePayoutsForUser`).
- Prospecting deferred query excludes `isMarketplaceDeal` rows (released by the marketplace rail instead).

---

## Thumb rules / gotchas (read before changing payout code)
1. **v2 API access:** all v2 calls go through `stripe.rawRequest` with an explicit `Stripe-Version: 2026-06-24.preview` header. `rawRequest` only accepts a params object on **POST** — for GET/DELETE, put query params in the path (handled in `v2Request`).
2. **Fees are billed on the SENT amount.** To make `sent + StripeFee(sent) = gross`, `calculatePayoutFees` uses an **iterative gross-up** (`net` floored, converges so platform never overpays; ≤1¢ residual stays with platform). Never compute the fee on the gross and subtract.
3. **`OutboundPayment.to.payout_method` is optional** — omit it to use the recipient's default destination. `createOutboundPayment` resolves a method best-effort and omits if none.
4. **Payout-method values can be objects** in the v2 response — always run through `coercePayoutMethodId` (never store/send `[object Object]`).
5. **"Onboarded" ⇔ a payout method exists. Capability-active is NOT "bank added."** In Global Payouts the `bank_accounts` capability `status` flips to `"active"` when the capability is *granted*, not when a bank is added — so a freshly created, bankless recipient account can report `capabilityStatus: "active"`.
   - **Capability spans two rails — `local` AND `wire`.** Recipient accounts request both; some countries support only one (e.g. PH is **wire-only**: `local.status = "unsupported"`, `wire.status = "active"`). A recipient is payout-capable when **either** rail is active, so all capability reads go through `getEffectiveBankCapabilityStatus(account)` (most-favorable of local/wire by priority `active > pending > restricted > inactive > unsupported`) — never read `bank_accounts.local.status` directly. This single helper backs `isRecipientCapabilityActive`, `getRecipientOnboardingState.capabilityActive`, the `GET /stripe/payouts/status` `capabilityStatus`, the `payout-queue` readiness gate, and the finances "payouts enabled" flag. Onboarding is therefore treated as complete **only when a payout method (local bank) is resolvable** — `getRecipientOnboardingState` keys `onboarded` off `payoutMethodId` ALONE (never `capabilityActive` / `recipient.applied` / empty `currently_due`). `getPayoutStatus` sets `onboardingComplete = !!payoutMethodId` and `payoutsReady = capabilityActive && !!payoutMethodId` (a method resolved from the live account, else `listPayoutMethods`, else the persisted `stripePayoutMethodId`); it never trusts the standalone onboarding boolean. The client mirror `isStripePayoutSetupComplete` relies on `onboardingComplete` only, never raw `capabilityStatus`. The authoritative completion backstop is Stripe's "already been onboarded" error on link creation.
   - **Three payout-account UI states** (`getPayoutAccountState` in `client/src/lib/stripe-connect.ts`): `active` (capability live → "Active"), `verifying` (bank added, Stripe checking → "Verifying"), `attention` (account exists but no bank yet → "Information Needed" + a **Continue Setup** button that re-opens a fresh onboarding link on the *same* recipient account via `GET /stripe/payouts/account-link`). An account-id-only profile is "partially connected", not connected.
6. **Idempotency:** every `createOutboundPayment` passes an `idempotencyKey` (`recruitment_payout_<id>`, `intro_payout_<reqId>`, `marketplace_payout_<reqId>_<role>`) so retries never double-pay.
7. **Stripe ids are long** (esp. `*_test_*`) — id columns are `varchar(255)`.
8. **Gate payouts on `stripeRecipientAccountId && stripeRecipientOnboardingComplete`**, NOT on the stored payout-method id (which may be null).
9. **Webhook-only release:** there is NO cron fallback. The v2 webhook MUST be configured or deferred payouts never release.
10. **Country is immutable** on the Stripe recipient account once set; it drives the payout currency.
11. **Block-on-edge:** if computed fees ≥ payout amount, the payout is blocked/failed for manual review (not sent).

---

## Open items / verify in test mode
- Confirm the live v2 `event.type` strings match `stripe.constants.ts` (router logs unknowns at debug).
- Confirm the platform Financial Account funding flow (captured PaymentIntents → outbound-payable balance).
- E2E test each of the 5 countries; confirm candidate (not just connector) deferred release.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-26 | Initial — Global Payouts replaces Connect Express | jitendra_officebeacon |
| 2.0 | 2026-06-27 | Per-country payout fees (gross-up + revert flag + breakdown storage), exact v2 event-type routing, webhook signature/security, deferred release for all rails incl. candidate + marketplace, idempotency keys, [object Object] fix, widened id columns, thumb-rules section | jitendra_officebeacon |
