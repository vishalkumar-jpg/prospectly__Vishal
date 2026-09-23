---
name: ux-audit
description: Proactive 7-phase UX audit for new pages or redesigns. Maps user journeys, assesses cognitive load, validates trust signals, and checks information architecture. Use before shipping new pages.
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
---

# Proactive UX Audit — 7-Phase Deep Analysis

> Unlike `/ux-review` (reactive checklist), `/ux-audit` is a **proactive, holistic audit** for new pages or redesigns. Use when building or significantly changing a page.

## Prerequisites

Before starting, read these reference documents:
- `.planning/knowledge-base/UX-PRINCIPLES.md` — 10 core UX principles
- `.claude/rules/ux-design-system.md` — design system rules and semantic color map

## Steps

1. **Identify the target page or feature** from `$ARGUMENTS`.
2. **Read ALL component files** involved — the page, child components, hooks, utilities, and API layer.
3. Execute all 7 phases below sequentially.
4. Produce the final audit report.

---

## Phase 1: Context Gathering

**Goal**: Understand every component, its data sources, and how users arrive at and leave this page.

- Read the page file and trace all imported components
- Identify all hooks used (React Query, custom hooks, context)
- Map data flow: API → hook → component → render
- Identify entry points: How do users navigate TO this page? (sidebar link, CTA, redirect, URL)
- Identify exit points: Where do users go FROM this page? (CTAs, links, back navigation)
- Note any global state dependencies (auth context, feature flags)

**Output**:
```
### Component Tree
- PageComponent
  - ChildA (hook: useDataA)
  - ChildB (hook: useDataB)
    - GrandchildC

### Data Sources
- API: GET /api/resource → useResource hook → ResourceList component
- Context: AuthContext → user role determines visible sections

### Entry Points
1. Sidebar nav → "/page-route"
2. Dashboard CTA → "View All" link
3. Direct URL

### Exit Points
1. Detail view → click on list item
2. Action modal → CTA button
3. Back → browser back / breadcrumb
```

---

## Phase 2: User Journey Map

**Goal**: Map the complete user journey through this page, from arrival to departure.

For each user type (first-time user, returning user, different roles if applicable):

1. **Entry** — First thing the user sees (above-fold content)
2. **First Impression** — What questions does the page answer in the first 3 seconds?
3. **Primary Path** — What is the main action the user should take? How many clicks?
4. **Decision Points** — Where does the user need to make a choice? What information do they need?
5. **Financial Decision Points** — Any money-related actions? What trust signals are present?
6. **Exit** — How does the user complete their goal and leave?
7. **Return** — When the user comes back, what has changed? Is their progress preserved?

**Output**:
```
### User Journey: [Role/Type]
| Step | Action | Sees | Feels | Risk |
|------|--------|------|-------|------|
| 1. Entry | Clicks sidebar link | Page title, 4 metric cards | Oriented | LOW |
| 2. Scan | Reads metrics | Stats, trends | Informed | LOW |
| 3. Decide | Clicks "View Details" | Detail sheet | Focused | MEDIUM |
| ... | ... | ... | ... | ... |
```

---

## Phase 3: Cognitive Load Assessment

**Goal**: Quantify the mental effort required to use this page. Apply Miller's Law (7±2 items).

Count and evaluate:

1. **Information Items** — How many distinct pieces of information are visible at once?
   - Above fold: count all text elements, numbers, icons with meaning
   - Per card/section: count fields
   - Target: ≤7 items per visual group, ≤4 metric cards above fold

2. **Decisions Required** — How many choices must the user make?
   - Count CTAs, filters, toggles, links
   - Target: 1 clear primary action per section

3. **Clicks to Goal** — How many clicks from page load to completing the primary task?
   - Target: ≤3 clicks for common tasks

4. **Memory Requirements** — Does the user need to remember information from a previous step?
   - Target: zero — all needed context should be visible at decision point

5. **Jargon Score** — Count terms that fail the "stranger test"
   - Target: 0 jargon terms without explanation

**Output**:
```
### Cognitive Load Scorecard
| Metric | Count | Target | Status |
|--------|-------|--------|--------|
| Info items above fold | 12 | ≤7 | OVER |
| Decisions per section | 2 | 1 primary | OK |
| Clicks to primary goal | 3 | ≤3 | OK |
| Memory requirements | 1 | 0 | WARN |
| Jargon terms | 2 | 0 | FAIL |
```

---

## Phase 4: First-Time User Experience

**Goal**: Evaluate whether a new user can successfully use this page without prior knowledge.

Check:

1. **Discoverability** — Can the user find the primary action without guidance?
   - Is the main CTA visually dominant?
   - Is the page purpose clear from the title and layout?

2. **Onboarding** — Are there tooltips, empty state messages, or guided flows for first use?
   - First-time tooltip for complex features?
   - Empty state with encouraging message + action CTA?

3. **Financial Explanations** — For pages with money:
   - Is "bounty" explained on first encounter?
   - Is the escrow flow explained before first payment?
   - Are there "Learn more" links for financial concepts?

4. **Undo Paths** — Can the user reverse any action they take?
   - Cancel buttons on all modals
   - Withdraw/cancel options on submissions
   - Clear "back" navigation

5. **Error Recovery** — What happens when things go wrong?
   - Form validation before submit (not after)
   - Preserved input on error
   - Clear error messages with next steps

**Output**:
```
### First-Time User Assessment
| Check | Status | Notes |
|-------|--------|-------|
| Primary action discoverable | PASS | "Create Request" button is prominent |
| Onboarding present | FAIL | No tooltip for marketplace visibility |
| Financial concepts explained | WARN | Bounty shown but escrow not explained |
| Undo paths available | PASS | Cancel on all modals |
| Error recovery | PASS | Inline validation + preserved input |
```

---

## Phase 5: Returning User Efficiency

**Goal**: Evaluate whether power users can work efficiently.

Check:

1. **2-Click Access** — Can the user reach any key action in ≤2 clicks from this page?
2. **Search & Filter** — Lists with 5+ items have search bar + filters + sort
3. **State Preservation** — View preferences, sort order, and filters persist (localStorage)
4. **Keyboard Shortcuts** — Are there shortcuts for frequent actions?
5. **Progressive Disclosure** — Can users expand/collapse sections to customize their view?

**Output**:
```
### Returning User Efficiency
| Check | Status | Notes |
|-------|--------|-------|
| 2-click access | PASS | All actions reachable from card |
| Search & filter | FAIL | No search on inbox list |
| State preservation | WARN | Sort order resets on page reload |
| Keyboard shortcuts | N/A | Not applicable for this page |
| Progressive disclosure | PASS | Collapsible sections work well |
```

---

## Phase 6: Trust Signal Placement

**Goal**: Verify trust signals are present at every decision point, especially financial ones.

For each decision point identified in Phase 2:

1. **Trust Score Visibility** — Is the other party's trust/verification score visible?
2. **Security Indicators** — Lock icons, "Powered by Stripe", secure payment text
3. **Consequence Preview** — Does the user know what happens before clicking?
4. **Cancellation Policy** — Is the refund/cancellation policy visible before commitment?
5. **Social Proof** — Ratings, reviews, success counts where applicable
6. **Reassurance Text** — Calming copy near high-stakes actions

**Output**:
```
### Trust Signal Audit
| Decision Point | Trust Score | Security | Consequence | Cancel Policy | Reassurance |
|---------------|-------------|----------|-------------|---------------|-------------|
| Pay bounty | PASS | FAIL (no Stripe badge) | PASS | WARN | PASS |
| Submit request | N/A | N/A | FAIL (no visibility warning) | N/A | N/A |
```

---

## Phase 7: Information Architecture Validation

**Goal**: Verify content is logically grouped, properly prioritized, and progressively disclosed.

Check:

1. **Content Grouping** — Related information is visually grouped (cards, sections, tabs)
   - No orphaned elements or out-of-context information

2. **Priority Ordering** — Most important content is first/top/left
   - Key metrics above fold
   - Primary CTA in the natural eye flow path

3. **Progressive Disclosure** — Complex information is layered
   - Summary → Detail on demand
   - Collapsible sections for advanced options
   - Tabs for distinct content categories

4. **Consistency** — Page follows the same patterns as similar pages in the app
   - Same card layout as other list views
   - Same CTA placement as other action pages
   - Same status badge rendering as other status displays

5. **Hierarchy Clarity** — Visual hierarchy matches content importance
   - Typography levels used correctly
   - White space creates clear section boundaries

**Output**:
```
### Information Architecture
| Check | Status | Notes |
|-------|--------|-------|
| Content grouping | PASS | Clear card-based sections |
| Priority ordering | WARN | CTA below fold |
| Progressive disclosure | PASS | Tabs for content categories |
| Consistency | FAIL | Different card layout than marketplace |
| Hierarchy clarity | PASS | Typography levels correct |
```

---

## Final Audit Report Format

```
# UX Audit: <page-or-feature-name>

## Executive Summary
<2-3 sentence overview of findings>

**Overall UX Health**: <score>/10
**Critical Issues**: <count>
**Recommended Actions**: <count>

## Phase Results

### Phase 1: Context
<component tree, data sources, entry/exit points>

### Phase 2: User Journey
<journey map table for each user type>

### Phase 3: Cognitive Load
<scorecard table>

### Phase 4: First-Time User
<assessment table>

### Phase 5: Returning User
<efficiency table>

### Phase 6: Trust Signals
<audit table>

### Phase 7: Information Architecture
<architecture table>

## Prioritized Recommendations

| Priority | Issue | Phase | Principle | Estimated Effort |
|----------|-------|-------|-----------|-----------------|
| CRITICAL | <issue> | <#> | <principle> | <Low/Medium/High> |
| HIGH | <issue> | <#> | <principle> | <Low/Medium/High> |
| MEDIUM | <issue> | <#> | <principle> | <Low/Medium/High> |
| LOW | <issue> | <#> | <principle> | <Low/Medium/High> |

## Design System Compliance
- Semantic colors: <PASS/FAIL> — <details>
- Typography hierarchy: <PASS/FAIL> — <details>
- Component density: <PASS/FAIL> — <details>
- CTA hierarchy: <PASS/FAIL> — <details>
- Status indicators: <PASS/FAIL> — <details>
```
