---
name: ux-review
description: Prospectly-specific UX audit across 8 dimensions — trust signals, information density, label clarity, CTA safety, visual hierarchy, color intentionality, standard patterns, and accessibility. Run on any page or component.
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
---

# UI/UX Review — 8-Dimension Audit

## Prerequisites

Before starting, read these reference documents:
- `.planning/knowledge-base/UX-PRINCIPLES.md` — 10 core UX principles
- `.claude/rules/ux-design-system.md` — design system rules and semantic color map

## Steps

1. **Identify targets** from `$ARGUMENTS`. Resolve to specific files using Glob/Grep.

2. **Read all target component files** and their imports (child components, hooks, utilities).

3. Run the 8-dimension audit below. For each dimension, check every item and assign a rating.

---

## Audit Dimensions

### Dimension 1: Trust Signal Verification
_Principle: Earn Trust Through Transparency (#3), Safe Before Sorry (#7)_

- [ ] Payment CTAs include amount ("Pay $50 Bounty", not "Pay")
- [ ] Escrow status is clearly displayed with explanation text
- [ ] "Powered by Stripe" badge present near payment inputs
- [ ] Lock icon + "Secure payment" text near card entry fields
- [ ] Privacy disclosures shown before data becomes public (marketplace requests)
- [ ] Cancellation/refund policies visible before financial commitment
- [ ] Trust scores and verification badges shown at decision points
- [ ] "What happens next" section after payment confirmation

### Dimension 2: Information Density Audit
_Principle: Less Is More (#4)_

- [ ] Kanban cards show max 5 fields (name, status, bounty, one detail, CTA)
- [ ] Dashboard metric cards have max 3 elements (icon+title, value, trend)
- [ ] Max 4 metric cards above fold on dashboard
- [ ] List items show max 4 fields in compact view
- [ ] Modals don't exceed 2 scroll-lengths (use tabs/steps if longer)
- [ ] Extended details use Collapsible/Sheet, not inline expansion
- [ ] No redundant CTAs that duplicate sidebar navigation

### Dimension 3: Label Clarity Check
_Principle: Clarity Before Cleverness (#1), Status Tells a Story (#8)_

- [ ] All labels pass the "stranger test" (understandable in 3 seconds)
- [ ] Button labels are verbs ("Send Request", not "Introduction")
- [ ] Navigation labels describe destinations ("Transactions", not "Financial Hub")
- [ ] Financial labels follow the glossary (requester vs connector perspective)
- [ ] Status badges include next-step context ("Pending — Awaiting response")
- [ ] No branded jargon without explanation
- [ ] Tooltips supplement, never replace, unclear labels

### Dimension 4: CTA Safety Check
_Principle: Primary Action Obvious (#6), Safe Before Sorry (#7)_

- [ ] One primary (filled) button per card section
- [ ] Financial CTAs use calm colors (not red/orange)
- [ ] Progressive commitment for financial flows (Preview → Review → Confirm)
- [ ] Destructive CTAs are never the default in dialogs
- [ ] Clear escape paths at every step (back, cancel, close)
- [ ] Marketplace cards use soft CTAs ("View Details" not "Request to Meet")
- [ ] Reassurance text near bounty amounts

### Dimension 5: Visual Hierarchy Audit
_Principle: Primary Action Obvious (#6), Less Is More (#4)_

- [ ] Clear focal point on each page section
- [ ] Typography follows 6-level hierarchy (page title → section → card → body → caption → micro)
- [ ] Adequate white space between sections
- [ ] Eye flow follows natural reading pattern (F-pattern or Z-pattern)
- [ ] Important information is above the fold
- [ ] No competing visual elements at the same hierarchy level

### Dimension 6: Color Intentionality Check
_Principle: One Color, One Meaning (#5)_

- [ ] Green/emerald used only for success/completed (never red for completion)
- [ ] Red used only for error/destructive/declined
- [ ] Amber/orange only for warning/needs-attention
- [ ] Blue only for informational/in-progress
- [ ] Purple/violet only for financial/premium
- [ ] Max 3 hue families per card
- [ ] Color never the sole status indicator (paired with icon/text)
- [ ] Decorative gradients don't conflict with semantic colors

### Dimension 7: Standard UX Patterns
_Principle: Respect the Returning User (#9)_

- [ ] Loading: skeleton shown immediately, matches content shape
- [ ] Empty: encouraging message + illustration + action CTA
- [ ] Error: human-readable message + retry action
- [ ] Form validation: inline errors next to fields, disabled submit during loading
- [ ] Success feedback: toast/notification after mutations
- [ ] List views have search + filter + sort (if 5+ items expected)
- [ ] User preferences saved to localStorage (view mode, sort order)

### Dimension 8: Accessibility & Mobile
_Principle: Design for the Anxious User (#10)_

- [ ] ARIA labels on all interactive elements without visible text
- [ ] Keyboard navigation: Tab/Enter/Escape work correctly
- [ ] Color contrast: WCAG AA (4.5:1 normal, 3:1 large text)
- [ ] Semantic HTML: button/a/heading hierarchy/landmarks
- [ ] Touch targets: minimum 44px (Apple HIG / WCAG)
- [ ] Responsive: uses Tailwind breakpoints with mobile-first approach
- [ ] Focus indicators visible on all interactive elements

---

## Output Format

For each target component/page, output:

```
## <component-or-page>

**Overall UX Score**: <score>/10

### 1. Trust Signals — <risk-level>
- [PASS|WARN|FAIL] <check> — <details>

### 2. Information Density — <risk-level>
- [PASS|WARN|FAIL] <check> — <details>

### 3. Label Clarity — <risk-level>
- [PASS|WARN|FAIL] <check> — <details>

### 4. CTA Safety — <risk-level>
- [PASS|WARN|FAIL] <check> — <details>

### 5. Visual Hierarchy — <risk-level>
- [PASS|WARN|FAIL] <check> — <details>

### 6. Color Intentionality — <risk-level>
- [PASS|WARN|FAIL] <check> — <details>

### 7. Standard Patterns — <risk-level>
- [PASS|WARN|FAIL] <check> — <details>

### 8. Accessibility & Mobile — <risk-level>
- [PASS|WARN|FAIL] <check> — <details>

### Summary
| Dimension | Risk | Issues |
|-----------|------|--------|
| Trust Signals | LOW/MEDIUM/HIGH/CRITICAL | count |
| Information Density | LOW/MEDIUM/HIGH/CRITICAL | count |
| ... | ... | ... |

### Recommendations (prioritized)
1. [CRITICAL] <actionable fix> — Principle: <principle-name>
2. [HIGH] <actionable fix> — Principle: <principle-name>
3. [MEDIUM] <actionable fix> — Principle: <principle-name>
4. [LOW] <actionable fix> — Principle: <principle-name>
```

Risk levels:
- **CRITICAL**: Blocks trust or causes financial confusion — fix before shipping
- **HIGH**: Significant UX degradation — fix in current sprint
- **MEDIUM**: Noticeable but not blocking — fix in next sprint
- **LOW**: Polish item — add to backlog
