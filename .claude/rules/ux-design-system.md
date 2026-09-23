# UX Design System Rules

> Auto-loaded for all `client/**` work. These rules enforce Prospectly's UX design system.
> Based on `.planning/knowledge-base/UX-PRINCIPLES.md`.

globs: client/**

---

## 1. Semantic Color Map

Strict mapping — color is informational, never decorative.

| Color Family | Tailwind Classes | Meaning | Usage |
|-------------|-----------------|---------|-------|
| Green/Emerald | `emerald-600`, `green-600` | Success, completed, positive | Completed milestones, successful payments, active status |
| Red | `red-600`, `destructive` | Error, destructive, declined | Failed states, decline actions, delete confirmations |
| Amber/Orange | `amber-500`, `orange-500` | Warning, needs attention | Expiring soon, pending review, action needed |
| Blue | `blue-600`, `sky-500` | Informational, in-progress | Active processes, info badges, links |
| Purple/Violet | `violet-600`, `purple-600` | Financial, premium | Bounty amounts, premium features, payment-related |
| Slate | `slate-500`, `muted-foreground` | Neutral, default | Secondary text, borders, disabled states |

### Color Rules:
- **NEVER** use red for completed/success states (use emerald/green)
- **NEVER** use color as the only status indicator — always pair with icon or text
- **Max 3 hue families** per card or component section
- Dark mode: colors must maintain the same semantic meaning
- **Dashboard page background**: do not set a background color on the page root of any protected/in-app page. `DashboardLayout` already applies `bg-muted/40` to the `<main>` wrapper around `<Outlet />`, so every dashboard page inherits the same surface. Use semantic tokens (`bg-card`, `bg-muted/30`, etc.) only on internal elements (cards, headers, sections), never on the page root. Auth/public pages outside `DashboardLayout` are exempt.

---

## 2. Typography Hierarchy

6 strict levels — use consistently across all pages:

| Level | Classes | Usage |
|-------|---------|-------|
| Page Title | `text-3xl font-bold` | One per page, top of content area |
| Section Header | `text-xl font-semibold` | Major sections within a page |
| Card Title | `text-lg font-semibold` | Card headers, dialog titles |
| Body | `text-sm` | Default text, descriptions, form labels |
| Caption | `text-xs text-muted-foreground` | Timestamps, helper text, secondary info |
| Micro | `text-[10px] uppercase tracking-wider` | Badges, status labels, category tags |

### Rules:
- Never skip heading levels (don't go from Page Title to Body)
- Page Title appears exactly once per page
- Card titles are always the first element in a card

---

## 3. Card & Component Density

| Component | Max Visible Fields | Rationale |
|-----------|-------------------|-----------|
| Kanban card | 5 | Name+company, status badge, bounty, one contextual detail, primary CTA |
| Dashboard metric card | 3 elements | Icon+title, value, trend indicator |
| Dashboard above-fold | 4 metric cards | Prevents CTA displacement below fold |
| List item (compact) | 4 fields | Keeps scanability for lists |
| Modal content | 2 scroll-lengths | Use tabs/steps for longer content |

### Rules:
- If a card needs more info, use `Collapsible`, `Sheet`, or a detail page — never inline expansion
- Transaction Details, Join Meeting, and extended context belong in a detail view, not card body
- Metric cards never contain CTAs — CTAs belong in dedicated action sections

---

## 4. CTA Hierarchy

| Level | Style | When |
|-------|-------|------|
| Primary | Filled button (`default` variant) | One per card section, main action |
| Secondary | Outlined button (`outline` variant) | Alternative actions |
| Tertiary | Ghost button or text link (`ghost`/`link` variant) | Cancel, dismiss, view more |
| Destructive | Red outlined (`destructive` + `outline`) | Delete, cancel subscription |

### Rules:
- **One primary (filled) button per card section** — never two competing filled buttons
- **Financial CTAs include the amount**: "Pay $50 Bounty" not "Pay"
- **Destructive CTAs are never the default** in dialogs — put them on the right, secondary styled
- **Button labels are verbs**: "Send Request" not "Introduction", "View Details" not "Details"
- **Marketplace cards**: Use softer CTAs ("View Details", "Learn More") not commitment-heavy ("Request to Meet")

---

## 5. Status Indicator Conventions

Standard color+icon pairs for all statuses:

| Status | Color | Icon | Badge Variant |
|--------|-------|------|---------------|
| `pending` | Amber | `Clock` | `warning` |
| `accepted` | Blue | `CheckCircle` | `info` |
| `declined` | Red | `XCircle` | `destructive` |
| `intro_sent` | Blue | `Send` | `info` |
| `meeting_scheduled` | Blue | `Calendar` | `info` |
| `completed` | Green/Emerald | `CheckCircle2` | `success` |
| `expired` | Slate | `Timer` | `secondary` |
| `cancelled` | Slate | `Ban` | `secondary` |
| `in_escrow` | Purple | `Lock` | `financial` |
| `payout_pending` | Purple | `Wallet` | `financial` |
| `payout_completed` | Green | `BadgeDollarSign` | `success` |
| `withdrawn` | Slate | `Undo` | `secondary` |
| `disputed` | Red | `AlertTriangle` | `destructive` |
| `refunded` | Amber | `RotateCcw` | `warning` |

### Rules:
- Use the same color+icon pair for a status everywhere it appears in the app
- Status badges include next-step context when space allows: "Pending — Awaiting response"
- Hover states on status badges reveal additional context

---

## 6. Loading / Empty / Error State Conventions

Every data-driven component MUST handle all three states:

### Loading:
- Use skeleton components immediately — never show blank areas
- Skeletons match the shape of expected content
- For lists: show 3-5 skeleton items
- For single items: skeleton matching the card layout

### Empty:
- Show an encouraging message + optional illustration + action CTA
- Example: "No introductions yet. Browse the marketplace to find your first connection."
- Never show an empty white space or just "No data"

### Error:
- Human-readable error message (never raw error text or stack traces)
- Include a retry button/action
- Preserve any user input that was entered before the error
- Example: "Something went wrong loading your introductions. [Try Again]"

---

## 7. Modal / Dialog Usage

| Component | When to Use |
|-----------|-------------|
| `Dialog` | Forms, detail views, non-destructive confirmations |
| `AlertDialog` | Destructive confirmations (delete, cancel, withdraw) — requires explicit action |
| `Sheet` | Side panels for detail views, settings panels, filters |
| `Drawer` | Bottom sheets on mobile, secondary navigation |
| `Popover` | Quick actions, tooltips with actions, dropdown menus |

### Rules:
- Destructive actions ALWAYS use `AlertDialog` with explicit confirmation
- Forms with more than 5 fields use `Sheet` (side panel) instead of centered `Dialog`
- Payment/financial confirmations use `AlertDialog` with full summary

---

## 8. Navigation Pattern Rules

- **Inbox/list views MUST have**: search bar + status filter + sort dropdown
- **Max 5 top-level tabs** per page — use nested navigation for more
- **Settings always accessible** from profile dropdown menu
- **Sidebar navigation** is the single source of truth for primary navigation — don't duplicate CTAs in page content
- **Breadcrumbs** for pages deeper than 2 levels in hierarchy

---

## 9. Trust & Payment UI Rules

Critical for marketplace trust and conversion:

### Financial Label Glossary:
| Concept | Requester Sees | Connector Sees |
|---------|---------------|----------------|
| Fee for introduction | "Introduction Bounty" | "Referral Payout" |
| Money held | "Bounty in Escrow" | "Pending Payout" |
| Lifetime total | "Total Invested" | "Total Earned" |

### Payment Modal Pattern:
1. **Summary** — What you're paying for (introduction details)
2. **Price breakdown** — Bounty amount + any fees, clearly itemized
3. **Payment method** — Saved card or new card entry
4. **Confirm with amount** — "Pay $50.00" button (never just "Confirm")

### Trust Signals:
- "Powered by Stripe" badge near payment inputs
- Lock icon (`Lock`) + "Secure payment" text near card fields
- Reassurance text near bounty amounts: "You won't be charged until a successful introduction is delivered"
- Show trust scores and verification badges at financial decision points
- Display cancellation/refund policies before financial commitment

### Marketplace Request Disclosure:
- Inline `Alert` with `Eye` icon in request creation form: "This request will be visible to all marketplace users"
- `AlertDialog` confirmation before submission requiring explicit acknowledgment

---

## 10. Micro-Interaction Rules

- **Hover effects**: Subtle scale (`hover:scale-[1.02]`) or shadow elevation — never color change alone
- **Transitions**: Use `transition-all duration-200` for interactive elements
- **Animations**: Reserved for meaningful state changes (loading → loaded, collapsed → expanded)
- **Never animate**: Text content changes, error messages, form validation
- **Toast notifications**: Auto-dismiss after 5 seconds, manual dismiss for errors
- **Focus rings**: Visible focus indicators on all interactive elements (`focus-visible:ring-2`)
