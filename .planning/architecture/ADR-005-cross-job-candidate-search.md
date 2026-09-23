# ADR-005: Cross-Job Candidate Search

**Status:** Accepted
**Date:** 2026-08-25
**Author:** Recruitment team
**Feature plan:** `.planning/features/recruitment-candidate-search.md` (v4.1)

## Context

Résumé search today is scoped to a single job posting. `buildPipelineCte({ kind:
"job", jobId })` narrows to one `job_id` before ranking runs, so every downstream
CTE sees a few dozen rows.

Recruiters need to search **every candidate across every posting they can access**,
from one results-first page that queries on first paint. That changes three things
at once:

1. **Tenancy** — visibility is no longer "one job id" but a resolved set of job ids
   requiring a permission join.
2. **Scale** — the vector branch stops seeing dozens of rows and starts seeing the
   whole workspace, on every page load. We expect a large number of applications per
   posting once the product is in full use.
3. **Meaning** — "match %" against *one job's* AI evaluation is the wrong number for
   a query that spans jobs.

The stated primary goal is **accuracy**: a recruiter must be able to trust that the
people returned are the right people, and that nobody who should have appeared is
missing.

## Decision

### 1. Postgres hybrid search, not Typesense

The corpus already lives in `contact_resume_search` with tuned thresholds and PII
redaction upstream. Splitting it doubles the indexing surface and the PII risk.
Typesense keeps what it serves today; facet autocomplete is the only door left open.

### 2. One new scope variant; the CTE contract is extended, never changed

`ResumeSearchScope` gains `{ kind: "workspace"; userId; jobIds }`. `jobIds` is
resolved by a service and passed in, never derived inside SQL — the resolution needs
a permission join, and the security check belongs in one auditable place.

Critically, **`row_id` stays a uuid** — the freshest candidacy. Deduplication runs on
a separate `identity` key (`contact_id`, else `candidate_user_id`) that never leaves
the CTE. The published contract `(row_id, row_kind, embedding, search_vector, skills,
metadata, total_years_exp)` is extended with new columns and otherwise untouched, so
`resume-search-ranking.cte.ts`, `-condition.cte.ts` and `-matched-on.ts` compile and
behave unchanged, and the two existing scopes are unaffected.

### 3. Collaborator access requires `candidate.view`

`createCollaboratorJobIdsSubquery` filters on collaborator *status* only. Candidate
search exposes candidate data, so it additionally requires the collaborator's role to
hold `RECRUITMENT_PERMISSIONS.CANDIDATE_VIEW`. The shared helper gains an optional
permission argument — one implementation, and the dashboard's existing behaviour is
preserved by the default. **Connectors get no workspace scope**; they keep their
existing per-job board.

### 4. Match % is computed per request, never persisted

`fit` = weighted share of **every applied criterion** the candidate satisfies,
scored against live data. `recruitment_job_candidates.match_score` is *not* used —
it answers a different question (this person vs *that specific job*), it is null for
anyone never evaluated, and after dedup it would be an arbitrary posting's score.

Hard facets are always met by survivors, so including them compresses the middle of
the range. This is intended: a candidate satisfying two facets and one of three
skills scores 60%, not 33%, because they genuinely satisfy more of what was asked.
A full match remains exactly 100%, so the score slider at 100% still means "everything".

With **zero** criteria the column is not rendered — 0 ÷ 0 has no honest answer, and a
dash column or a fake baseline is worse than no column.

### 5. Skills match `search_vector`, not the `skills` array

`profile_text` (weight A in the tsvector) is assembled from `skills` **plus**
`metadata.technologies`, `tools`, `domainExpertise` and `certifications`. The
extraction prompt deliberately routes React into `technologies` and Jira into
`tools`, never duplicating into `skills`.

Filtering the array alone therefore drops people whose résumé plainly names the
skill. Matching `search_vector` also reuses `buildConditionCtes` unchanged, which
supplies the `met` / `missing` / **`unknown`** tri-state the explanation column needs.

The `skills` jsonb array remains the source of facet *values* and their counts.

### 6. Term matching: phrases and a hand-maintained alias map — no semantic expansion

`websearch_to_tsquery('english', …)` gives stemming, not synonyms. Multi-word skills
are quoted so they match as phrases; a plain `Record<string, string[]>` alias map
catches alternate spellings (`JS` → `JavaScript`, `NodeJS` → `Node.js`), seeded from
a corpus audit and grown from observed misses.

Embedding-based synonym expansion is **rejected**: it is unpredictable, and an
unexplainable match breaks the "Why this person" column. Every alias expansion
appears in `signals[]` so a recruiter can see what actually matched.

### 7. Job-side attributes are inherited by the candidate

Work mode, employment type and industry describe the *posting*, not the person,
and no candidate-side column exists for them. They are aggregated per person
across the postings **inside the recruiter's scope** and filtered by overlap. A
person on a remote and an onsite posting legitimately matches both.

**Country** is candidate-side: the filter matches the Location column (résumé
`metadata.location` or CRM `city`/`state`/`country`) with word-boundary regex on
supported country names, not `recruitment_jobs.countries`.

### 8. Two new columns, one new table

- `contact_resumes.education_level` — normalised at extraction from
  `metadata.education[].degree`. On the résumé, not the candidacy: education belongs
  to the person, and a per-candidacy column would store it once per posting and let
  copies drift under the dedup rule.
- `recruitment_jobs.employment_type` — no column existed on either side; the
  gap-analysis prompt reads it out of job description prose. Ships as its **own PR**
  with a wizard control, ahead of this feature.
- `recruitment_job_facet_counts` — pre-aggregated candidate-side facet frequencies
  per job, maintained by the existing résumé-indexing processor with a nightly
  rebuild. Job-side facets need no rollup: one row per job is already cheap.

### 9. Build for scale in the first release

- **HNSW on `contact_resume_search.embedding`**, mirroring `idx_contacts_embedding`.
  Chosen over IVFFlat: no `lists`/`probes` tuning, no decay as the corpus grows, and
  it repeats a pattern already running in production.
- **Cap the scored set** at 2,000 rows. This makes deep `OFFSET` impossible by
  construction — the offset can never exceed the cap — so **keyset pagination is
  unnecessary** and the numbered pager stays. `truncated: true` is reported whenever
  the cap bites; no silent caps.
- **Every structured filter is pushed into the pipeline CTE, before ranking.**
  Filtering after ranking is the classic failure of this design.
- Redis cache on the default unfiltered first page, 60 s, keyed by
  `(scopeHash, sort, pageSize)`.

### 10. POST for search, URL for applied state

Criteria are large, contain free text, and trigger paid calls — they stay out of
URLs, access logs and proxy caches. Shareability comes from the client mirroring
**applied** criteria into compact URL search params. Draft-vs-applied is a
first-class concept, not component state; it is the defining behaviour of the drawer.

### 11. The cosine floor is not a tuning knob

`RESUME_SEARCH_MIN_COSINE_SIMILARITY = 0.58` and the relative cutoff were measured
against **exact** search. HNSW is approximate, so recall changes and must be
re-measured at both whole-workspace and two-posting scope before the index is
trusted. If recall falls short the lever is **`ef_search` at query time**. Lowering
the floor to "find more people" reintroduces the off-domain noise this feature exists
to eliminate.

### 12. No automated test suite

Verification is manual: a documented tenancy pass, a data-correctness pass, a
behaviour pass, and a set of reference searches re-run on every tuning change. The
coverage ratios (§6.6 of the plan) are logged per request and are the only
continuously-running accuracy signal.

## Consequences

### Positive
- One tenancy boundary. Widening the search is one CTE branch, not a rewrite; the
  existing two scopes are provably unaffected because the contract only grew.
- The explanation column, the tri-state and the ranking all come from code already
  in production, so the new surface area is the scope resolver and the scoring.
- Scale work is done once, up front, rather than retrofitted under load.
- Match % answers the question the recruiter actually asked, and every applied
  criterion is visible in it — nothing is silently ignored.

### Negative
- **HNSW is approximate.** Recall is now a property to defend rather than a given,
  and every change to a tuned constant needs re-verification.
- **No automated suite.** Tenancy and accuracy regressions surface through use
  rather than a failed run. Mitigated by putting the tenancy pass first in the
  manual list and re-running it before any change to the scope code.
- Two schema changes and a rollup table with an incremental-maintenance path, which
  can drift; the nightly rebuild is the self-healing answer.
- Job-side inheritance means "Remote" reads as *"candidates on your remote
  postings"*, which needs careful labelling to avoid being read as a preference.

### Neutral
- `recruitment_job_candidates.match_score` continues to serve per-job evaluation. Two
  numbers now exist with different meanings; they carry different names everywhere.
- The `skills` jsonb array survives as a facet source even though it no longer drives
  filtering.

## Alternatives Considered

### Typesense for cross-job search
- **Pros:** purpose-built faceting; fast autocomplete.
- **Cons:** a second copy of résumé content, a second PII surface, a second
  invalidation path, and the tuned hybrid ranking would have to be reimplemented.
- **Why rejected:** doubles the indexing and PII surface to solve a problem Postgres
  already solves with a tuned pipeline.

### Persisted per-criteria match score
- **Pros:** no per-request scoring cost.
- **Cons:** criteria are unbounded and user-specific — the cross-product is not
  storable — and a persisted score is stale the moment a résumé is re-parsed.
- **Why rejected:** the number must reflect live data and the criteria just entered.

### IVFFlat instead of HNSW
- **Pros:** smaller index, faster build.
- **Cons:** needs `lists`/`probes` tuning, and recall decays as the corpus grows
  unless it is rebuilt.
- **Why rejected:** HNSW needs no tuning and is already operated in production here.

### Keyset pagination
- **Pros:** correct at any depth.
- **Cons:** incompatible with the numbered pager the design calls for.
- **Why rejected:** capping the scored set at 2,000 removes deep offsets entirely,
  which solves the same problem with less machinery.

### Deferring HNSW behind a latency trigger
- **Pros:** less work now; exact search is faster *and* more accurate at low volume.
- **Cons:** the deferral has to be actively monitored, and the recall re-measurement
  is owed either way.
- **Why rejected:** the product expects a large number of applications per posting,
  and the retrofit would land under load rather than under review.

## References

- `.planning/features/recruitment-candidate-search.md` — the implementation plan
- ADR-004 — the access resolver this builds on
- `advance-search-prototype/prototype/variant-c-drawer.*` — the UI/UX reference
- Migration `0017` — `idx_contacts_embedding`, the HNSW precedent
