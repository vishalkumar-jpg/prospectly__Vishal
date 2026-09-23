# Feature: Trust Score

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-02-06

## Overview
A rules-based reputation system that calculates and tracks user trust scores based on platform activity, introduction outcomes, and feedback. Trust scores influence connector ranking, marketplace visibility, and bounty percentages.

## Server Module
**Path:** `server/src/modules/trust-score/`, `server/src/modules/trust-score/feedback/`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /trust-score/me | Yes | Retrieve the current user's trust score and breakdown |
| GET | /trust-score/me/rules | Yes | List all scoring rules and the user's progress against each |
| GET | /trust-score/me/history | Yes | Paginated history of trust score changes (max 100 per page) |
| GET | /trust-score/user/:id | Yes | Retrieve another user's public trust score |
| POST | /trust-score/feedback | Yes | Submit feedback that contributes to trust score calculation |
| GET | /trust-score/feedback/pending | Yes | List pending feedback requests for the current user |

### Key Services
- **TrustScoreService** -- Calculates trust scores based on rules, tracks score history, and provides score breakdowns and user rankings
- **TrustScoreFeedbackService** -- Manages feedback collection tied to introductions and applies feedback scores to trust calculations

### Database Tables
| Table | Purpose |
|-------|---------|
| user_trust_score_history | Chronological log of trust score changes with the triggering event, rule, and point delta |
| trust_score_rules | Defines scoring rules including point values, categories, and conditions for awarding points |
| introduction_feedback | Feedback records from introduction participants that feed into trust score calculations |

## Client
### Pages
- **TrustRating** -- `client/src/pages/TrustRating.tsx` -- Trust score dashboard showing current score, badge, rule progress, and score history timeline

### Hooks
- `useTrustScore()` -- Fetches the current user's trust score, breakdown by category, and rank
- `useTrustBadges()` -- Returns the badge tier (e.g., bronze, silver, gold) based on the user's current trust score
- `useUserPoints()` -- Fetches the user's point totals across all trust score categories
- `useBountyPercentages()` -- Returns bounty percentage tiers that unlock at different trust score thresholds

### API Module
- `client/src/lib/api/trust-score.ts` -- Trust score retrieval, rule listing, history, and feedback submission

## External Integrations
- None; trust score is an internal system that aggregates data from other modules (introductions, contacts, feedback)

## Business Logic
- Trust scores are calculated from a configurable set of rules defined in the `trust_score_rules` table; each rule specifies a category, point value, and trigger condition
- Score history is tracked as an append-only log, enabling full audit trail and trend visualization
- Scores are awarded for key platform activities: completing introductions, receiving positive feedback, maintaining active contacts, and consistent platform usage
- Feedback from introduction participants (both requesters and connectors) directly impacts trust scores; negative feedback can reduce scores
- Trust score tiers (badges) unlock platform benefits: higher marketplace visibility, priority in connector matching, and increased bounty earning percentages
- Bounty percentages are tiered by trust score, incentivizing users to maintain high scores for better payout rates
- Score calculations are deterministic and reproducible -- the same set of events always produces the same score
- Pagination on history endpoint is capped at 100 records per page to ensure consistent performance

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-06 | Initial documentation | Claude Code |
