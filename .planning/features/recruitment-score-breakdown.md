# Feature: Recruitment Score Breakdown (Gap Analysis Weightage)

**Version:** 1.4
**Status:** Active
**Last Updated:** 2026-07-29

## Overview
The Fit Analysis popup shows an overall match score (e.g. 85%) and six gap-analysis
dimensions, but never explained how that number was reached or what the missing 15%
consisted of.

That was not an oversight in the UI -- the score genuinely was not calculated. Gemini
returns `matchPercentage` as a single opaque number that is written straight to
`match_score`, and the six dimensions carry only a tri-state badge (`ok` / `partial` /
`gap`) plus matched/gap chips. No weights or per-dimension scores existed.

This feature adds an attribution model that explains the existing score without changing
it. Phase 1 is a manually triggered backfill that annotates historical rows. Phase 2 will
generate the same structure inline during evaluation and surface it in the popup.

**Invariants:**
- `match_score` is never modified.
- `gap_analysis.verdict`, `.verdictStatus` and `.dimensions` are never modified -- the
  backfill does a read-modify-write that only *adds* a `scoreBreakdown` key.
- No migration, no client change, no change to the evaluation pipeline.

## Server Module
**Path:** `server/src/modules/backfill/score-breakdown/`

The route lives on the shared `BackfillController` so `/backfill` remains the single entry
point for all backfills; everything else is self-contained in the sub-module, which exports
only its queue service.

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /backfill/recruitment/score-breakdown | `x-api-key` (XApiKeyGuard) | Queues a breakdown backfill for up to 20 job ids. Body: `{ jobIds: string[], force?: boolean }` |

Runs as a BullMQ job (`recruitment-score-breakdown-backfill`), logs-only summary, matching
the existing credit-import backfill. Requires `ENABLE_QUEUES=true` and Redis; returns 503
otherwise.

### Key Services
- **BackfillScoreBreakdownQueueService** -- enqueues the job; timestamped job id so repeat
  manual triggers are never deduped.
- **BackfillScoreBreakdownRunnerService** -- per-job orchestration; sequential with a 200ms
  gap between AI calls; per-row errors are counted, never fatal.
- **BackfillScoreBreakdownAiService** -- builds the prompt, calls the shared Gemini client
  in JSON mode, parses, validates, reconciles.
- **BackfillScoreBreakdownRepository** -- row selection and the additive `gap_analysis`
  write. Deliberately does not touch `updated_at` / `updated_by`, since this is a
  derived-data annotation and list views order on recency.

### Database Tables
| Table | Purpose |
|-------|---------|
| recruitment_job_candidates | Applicant rows; `gap_analysis.scoreBreakdown` added where `analysis_status = 'completed'` |
| recruitment_job_pool_matches | Connector pool matches; same key. `ai_matched` rows have no gap analysis and are skipped |

### Stored shape
`gap_analysis.scoreBreakdown` = `{ version, source, generatedAt, model, totalScore,
lostPoints, reconciled, dimensions[{ key, weight, pointsEarned, pointsLost, reason }],
topReasons[] }`.

## Client
The Gap Analysis modal surfaces the breakdown in three places, all of which render nothing
when a record has no breakdown, so un-annotated rows look exactly as they did before:

- **Left rail** -- a "How this score adds up" panel under the score ring: one bar per
  dimension showing `pointsEarned/weight`, a `Total N / 100` row, and the top reasons for
  the lost points. The rail gained its own desktop scroll to accommodate it.
- **Category rows** -- a neutral `25/35` chip in each accordion header, beside (not
  replacing) the existing status badge. Hidden below the `sm` breakpoint, where the rail
  panel already carries the same numbers.
- **Expanded body** -- a "N of M points lost -- <reason>" line, shown only where points were
  actually lost. A dimension that has no chips but did lose points is now expandable, so
  its reason is always reachable.

Points are always rendered as text, so they never rely on colour alone.

### Status wording
Every status shown in the modal uses one of three fixed labels -- **Strong Match**,
**Partial Match**, **Limited Match** -- resolved on the client. The AI-supplied
`badge.label` is ignored: it is free text and in practice just echoed the raw enum, so a
recruiter saw a lowercase `ok` beside a `40/40` chip.

The label, the badge colour, the row icon tile and the rail bar all derive from a **single**
resolved status per dimension, so they can never disagree with each other or with the points:

- **Scored dimensions** resolve from `pointsEarned / weight` -- >=80% strong, >=50% partial,
  else limited. This matters because the model sets `badge.status` and `points`
  independently, so a section could previously show a green "ok" beside a `22/40` chip.
- **Work eligibility and employment type** have no points, so they fall back to the AI's
  `badge.status` -- as does any row written before the score breakdown existed.
- **The verdict banner** derives from `matchScore` on the same bands, so it always agrees
  with the ring directly above it, and its icon now reflects the status instead of showing a
  warning triangle at every score.

The 80/50 bands live in one place (`scoreStatus`); `matchScoreBadgeClass` and
`matchScoreRingColor` were re-pointed at it rather than repeating the thresholds.

This is deliberately **client-only**. `ok` / `partial` / `gap` are persisted enum values that
the server reads for scoring and the backfill reads for its projection, so changing them
would need a migration. A client label map instead fixes every historical row with no data
work and cannot be regressed by a future model response.

### Read path
`parseGapAnalysisStored` carries `scoreBreakdown` through behind a structural guard
(malformed blobs are dropped, not surfaced), and `assembleGapAnalysisPayload` passes it to
the client. Both live in the shared mapper, so all nine gap-analysis endpoints gained the
field from one change. The `ScoreBreakdown` types moved out of the backfill module into
`candidate-evaluation` so the read path does not depend on a backfill module.

## External Integrations
- **Gemini** -- via the shared `JobExtractionGeminiService` (JSON mode, retry/backoff,
  AI-usage logging). No new AI client was introduced and **no extra call was added**: the
  inline breakdown rides along in the existing evaluation call. Only the backfill spends a
  call per row, under action type `score-breakdown-backfill`.
- The evaluation call raises the shared client's 15k prompt clip, which could otherwise push
  the resume off the end of a long job description and yield a confidently wrong score.
  Truncation is now logged wherever it happens.
- Both paths parse the response through the shared `parseJsonObjectFromAiResponse`, whose
  extraction is string-aware. The hand-rolled brace counter it replaced treated a `}` inside
  a reason or verdict string as the end of the object, truncating otherwise-valid JSON and
  failing the row; it also could not recover literal newlines or a truncated response.

## Business Logic

### The scoring model (v2)
- **Four categories carry points**, with fixed global weights identical for every job so
  candidates stay comparable: skills 40, experience 30, domain 20, education 10 (total 100).
  A module-level guard throws at import if the map stops totalling 100 or if a scored key is
  not a real gap-analysis dimension.
- **Work eligibility and employment type are not scored.** They are still generated and
  displayed -- a location or contract mismatch matters to a recruiter -- but carry no points.
- **The overall score is the sum of the four categories**, computed server-side. The model no
  longer returns an overall percentage at all, so the headline number and the breakdown
  cannot disagree.
- **`verdictStatus` is derived from that score** (>=80 ok, >=50 partial, else gap) rather
  than being the model's independent opinion, which previously could contradict the score.
- **The AI never chooses weights.** It supplies `points` and a short `pointsReason` per
  scored dimension; `pointsLost`, `lostPoints` and the total are always computed in code.
- **Missing points are inferred, not zeroed.** If the model omits a dimension's points they
  are derived from the badge it did supply (ok = full, partial = 60%, gap = 0) and listed in
  `scoreBreakdown.derived`. Zeroing would silently push a strong candidate below the
  qualification threshold; failing would block the evaluation entirely. A frequently
  populated `derived` array is a signal the prompt needs tightening.
- **Scoring fields are stripped before storage** -- `points` / `pointsReason` never reach
  `gap_analysis.dimensions`, so `scoreBreakdown` is the single source of truth for points.

### Generation paths
- **Inline (primary):** produced in the same Gemini call as the gap analysis, for both the
  candidate apply flow and the connector upload flow. Because it is persisted with the
  analysis, a re-evaluation regenerates it rather than dropping it.
- **Backfill (historical):** fits points to an *already-stored* score, so it keeps the
  reconciliation step -- retried once, then proportionally rescaled and clamped, marked
  `reconciled: "rescaled"`. `match_score` is never modified by the backfill.
- Rows are skipped, never fabricated: no gap analysis, an unparseable blob, a blob not
  covering all six dimensions, or an out-of-range score all yield `skippedUnusable`.
  Re-runs skip rows that already have the key unless `force: true`.

### Caveat: two scoring generations coexist
Rows evaluated before the four-category model shipped keep scores produced by the older
six-category holistic model, so a recruiter comparing an old and a new candidate is
comparing two models. Re-running the backfill updates the *explanation* to v2 but
deliberately not the score -- re-scoring historical candidates would re-fire pipeline
routing and notifications.

Dropping the two penalising categories raises scores by roughly 5-10 points (a verified
example moved 70 -> 75). The `50` thresholds for pipeline routing, auto-consent email and
pool-match visibility were deliberately left unchanged, so expect somewhat more candidates
to qualify and more consent emails to be sent.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-07-28 | Phase 1: backfill API, fixed-weight attribution model, additive `scoreBreakdown` key | Claude |
| 1.1 | 2026-07-28 | Phase 2: read-path pass-through and Gap Analysis modal UI (rail panel, per-category points chip, loss reasons) | Claude |
| 1.2 | 2026-07-28 | Phase 3: inline generation during evaluation; four-category model (40/30/20/10) with the score computed as the sum; derived verdict status; eligibility and employment type unscored | Claude |
| 1.3 | 2026-07-29 | Fixed Strong/Partial/Limited Match wording across all section badges and the verdict banner, resolved client-side from the points ratio so label, colour and points always agree | Claude |
| 1.4 | 2026-07-29 | Routed both AI paths through the shared string-aware JSON extractor, so a brace inside a reason string no longer truncates the response and fails the row | Claude |
