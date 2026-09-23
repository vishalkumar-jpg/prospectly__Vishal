# UX Design Principles

> 10 core principles for Prospectly's user experience, distilled from beta feedback.
> Referenced by `/ux-review` and `/ux-audit` skills.

---

## 1. Clarity Before Cleverness

**Every label must pass the "stranger test" — if someone unfamiliar with the product can't understand it in 3 seconds, rewrite it.**

- Use plain language over branded terminology
- Button labels are verbs describing the action ("Send Request", not "Introduction")
- Navigation labels describe destinations, not concepts ("Transactions", not "Financial Hub")
- Tooltips supplement but never replace unclear labels

> _Origin: Beta issue #1 — "Seek"/"Make" nav labels confused every tester._

---

## 2. Show the Consequence Before the Action

**Explicitly state what happens before any action involving money, visibility, or commitment.**

- Before publishing: "This request will be visible to all marketplace users"
- Before payment: "You will be charged $X when the introduction is completed"
- Before destructive actions: Confirmation dialogs with specific outcomes, not generic "Are you sure?"
- Use inline alerts during form fill AND confirmation dialogs before submit (two layers)

> _Origin: Beta issue #6 — Users didn't realize intro requests become public marketplace listings._

---

## 3. Earn Trust Through Transparency

**Mirror e-commerce and banking mental models for anything involving money.**

- Payment flows follow the checkout pattern: Summary → Price → Method → Confirm
- Show "Powered by Stripe" and lock icons near payment inputs
- Display escrow status clearly — users must understand where their money is at all times
- Post-payment: show "What happens next" with clear timeline
- Always show cancellation/refund policies before financial commitment

> _Origin: Beta issue #13 — Payment UI didn't match users' e-commerce expectations._

---

## 4. Less Is More, But Never Less Than Enough

**Cards and list items show only what's needed for the next decision — nothing more, nothing less.**

- Kanban cards: max 5 visible fields (name, status, bounty, one contextual detail, primary CTA)
- Dashboard metric cards: max 3 elements (icon+title, value, trend)
- List items: max 4 fields in compact view
- Extended details live in expandable sections or detail sheets, never inline
- Above-fold content: max 4 key metrics before scroll

> _Origin: Beta issue #5 — Kanban cards too tall/detailed, burying the important information._

---

## 5. One Color, One Meaning

**Strict semantic color mapping — color is never decorative, always informational.**

| Color | Meaning | Never Use For |
|-------|---------|---------------|
| Green/Emerald | Success, completed, positive | Decoration, neutral states |
| Red | Error, destructive, declined | Completed milestones, neutral badges |
| Amber/Orange | Warning, needs attention | Success states, decorative accents |
| Blue | Informational, in-progress | Errors, financial amounts |
| Purple/Violet | Financial, premium | Status indicators, errors |
| Slate | Neutral, default | Emphasis, calls to action |

- Max 3 hue families per card or component
- Color is never the ONLY status indicator — always pair with icon or text

> _Origin: Beta issue #10 — Dashboard color scheme = visual noise. Beta issue #14 — Completed milestones shown in RED._

---

## 6. The Primary Action Should Be Obvious

**One visually dominant CTA per screen section. Everything else is secondary.**

- Primary CTA: filled button, high contrast
- Secondary CTA: outlined or ghost button
- Tertiary actions: text links or icon buttons
- Remove redundant CTAs that duplicate sidebar navigation
- Financial CTAs include the amount ("Pay $50 Bounty", not "Pay")

> _Origin: Beta issue #11 — Dashboard CTAs compete with metric cards, pushing important actions below fold._

---

## 7. Safe Before Sorry

**Financial and commitment CTAs must feel safe, not scary.**

- Financial CTAs use calm colors (not red/orange), moderate sizing
- Progressive commitment: Preview → Review Terms → Confirm
- Clear escape paths at every step (back button, cancel link, close)
- Reassurance text near bounty amounts: "You won't be charged until a successful introduction is delivered"
- Never auto-submit financial transactions

> _Origin: Beta issue #7 — "Request to Meet" CTA feels unsafe when displayed next to high bounty amounts._

---

## 8. Status Should Tell a Story

**Status badges include next-step context, not just a label.**

- Bad: "Pending" / Good: "Pending — Awaiting connector response"
- Bad: "Completed" / Good: "Completed — Payout processing"
- Status indicators use consistent color+icon pairs across the entire app
- Timeline/progress indicators show where the user is in the overall flow
- Hover states on status badges reveal additional context when needed

> _Origin: Beta issue #9 — Financial labels like "Referral Payout" ambiguous without context._

---

## 9. Respect the Returning User

**First-timers get guidance, power users get efficiency.**

- Provide search, filter, and sort controls on any list with 5+ items
- Save user preferences (view mode, sort order, filters) to localStorage
- Keyboard shortcuts for power actions (documented in help)
- Onboarding tooltips appear once, then remember dismissal
- 2-click access to any frequently used feature from the dashboard

> _Origin: Beta issue #8 — Inbox has no search, filter, or sort capabilities._

---

## 10. Design for the Anxious User

**Reduce cognitive load at financial decision points. Show reassurance, not urgency.**

- Replace urgency indicators with expiration dates (concrete > abstract)
- Show trust scores and verification badges at decision points
- Break complex flows into digestible steps (wizard pattern)
- Confirmation screens summarize all choices before final submit
- Error recovery is always possible — never trap users in a dead end

> _Origin: Beta issue #12 — No expiration dates or withdraw/cancel options creates anxiety._

---

## Cross-Reference

| Principle | Beta Issues Addressed |
|-----------|----------------------|
| Clarity Before Cleverness | #1, #9 |
| Show Consequence Before Action | #6 |
| Earn Trust Through Transparency | #13 |
| Less Is More | #5, #11 |
| One Color, One Meaning | #10, #14 |
| Primary Action Obvious | #11 |
| Safe Before Sorry | #7 |
| Status Tells a Story | #9 |
| Respect Returning User | #8 |
| Design for Anxious User | #7, #12 |
