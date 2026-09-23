# Advanced Candidate Search — what was built

**Status:** Built · **Branch:** `feat/candidate-search-phase-0` · **Updated:** 2026-09-08
**Decisions:** `.planning/architecture/ADR-005-cross-job-candidate-search.md`

A record of what shipped and why, replacing the forward-looking plan. Where a
decision is non-obvious the reasoning is here, because that is the part nobody
can recover from the code six months from now.

---

## 1. What it does

One page at `/recruiting/candidates` that searches every candidate across every
job posting a recruiter can access.

- Keyword search across résumé content **and** candidate names, titles and companies
- **Structured query parsing** in the same box:
  - Bare tokens (`sana`, `google`, `CEO`) match name, current title or current company
    as whole words (not substring hits like "Hosanna"), with no embedding or résumé FTS
  - Explicit clauses: `named sana`, `name sana`, `candidate with name sana`, `at google`, `titled accountant`, `title: software engineer`. Wrapper words (`candidate`, `with`, `find`, …) are dropped so these stay identity-only — no embedding, no lookalikes.
  - Mixed queries (`vivek python developer`, `react devs named sana`, `react at google`) rank on the skill/intent remainder and **AND** the structured name/title/company tokens
  - Typed **`AND` / `OR`** between terms: OR binds alternatives of the same kind (names or skills), AND combines kinds — e.g. `vivek or sitaram and python`, `python or java and vivek or sana`
  - Natural-language queries (`someone who is experienced in TypeScript and GraphQL`, `someone who knows skill TypeScript`) are interpreted by **Gemini when the fast heuristic is unsure** — skills are AND-ed, names are never confused with products
  - Free-text queries (`software engineer`) also match `current_title` and `company`
    columns so contact-only records surface without an indexed résumé
  - Skill and category queries (`react`, `backend`, `Laravel`) are unchanged. Job-board
    résumé search is unaffected.
- Or upload a job description (PDF) and search by what it asks for
- Narrow with seven multi-select filters, or the full form in a side drawer
- Save a search and rerun it later
- Results carry a computed **Match %** and a per-row explanation of what matched

The page opens on an empty state. Once something is asked, results replace it in
place — same route, no navigation.

---

## 2. How the pieces fit

```
Landing:   search box + Search  │  OR  │  JD dropzone (PDF)
           7 multi-select filters · Advanced Search drawer
           saved searches
           ↓ once something is asked
Results:   Match % · Why this person · Job posting : stage · Applied … in place
Detail:    rail layout — short facts on the right, no evaluation or stage
```

Request order: structured filters run **inside** the tenancy CTE → survivors are
ranked → survivors are scored → the scored set is ordered and paged.

That order is the performance story. Scoring before filtering would score the
whole workspace on every page load.

---

## 3. Decisions worth knowing

### Who can see what
Job owners, plus collaborators whose role holds `candidate.view`. Connectors are
excluded — they keep their per-job board.

Visibility resolves to a list of job ids, produced by one service and consumed by
one CTE branch. Nothing else decides who is visible. The scope argument is
**required**, so omitting it is a compile error rather than a cross-tenant leak.
Resolved per request and never cached: removing a collaborator or revoking org
membership has to take effect on the next call.

### One row per person, not per application
A candidate on three of your postings is one result. Deduplication runs on a
separate `identity` key (`contact_id`, else `candidate_user_id`) so `row_id`
stays a uuid and every existing downstream CTE compiles unchanged — the published
contract was **extended, never altered**.

Attributes aggregate across the postings **you can see**, so someone on a remote
job and an onsite job matches both work-mode filters, and a posting outside your
scope never appears in their record. **Country** is different: it filters the
candidate Location column (résumé location or CRM city/state/country), not the
posting's target countries.

The **Job posting** column lists each in-scope application as `title : stage`.
Rows carry an `applications[]` of `{ jobId, stageId }` pairs (freshest first).
Stage and posting filters still decide **who** appears — any overlapping
application matches — but the column hides application lines that did not match
the active filters. Filter "In review" on someone with one In review and one Not
Qualified application: they stay in the results; only the In review line shows.

### Skills match the search index, not the skills list
`profile_text` is built from `skills` **plus** `metadata.technologies`, `tools`
and `domainExpertise`, and the extraction prompt deliberately files React under
`technologies` and Jira under `tools`. Filtering the `skills` array alone drops
people whose résumé plainly names the skill.

Skills match `search_vector` instead. Verified: NetSuite present only in
`technologies` is still found.

### Match % counts every applied criterion
Not only skills. If a recruiter asked for it, it counts.

Hard facets are met by every surviving row, so they add to both sides of the
fraction and compress the middle of the range — deliberately. Two facets plus
three skills puts a one-skill match at **44%**, not 33%: they satisfy more of
what was asked than the bare skill ratio says. A full match is still exactly
100%. Facet weights sit well below skill weights, because credit everyone gets
is not information.

With **no** criteria the column is not rendered. 0 ÷ 0 has no honest answer, and
a column of dashes is worse than no column.

### `unknown` is not `missing`
An unindexed résumé or an unextracted figure means *we could not check*, not
*they failed*. It renders amber with the word "unchecked", never red. It counts
as not-met in the arithmetic, so a verifiable candidate outranks an unverifiable
one — the right answer for a recruiter.

### Job descriptions
Must-haves become filters. Nice-to-haves become `bonus[]`, which **scores but
never excludes** — a preferred skill must not remove someone who matches
everything actually required.

Criteria carry an `origin` marker, which settles one ambiguity: the drawer's
**Clear** means "clear the filters I set", and a job description is not a filter
— it is the role being matched. So Clear keeps it, exactly as it keeps the search
box, and only an explicit **Remove** drops it along with `bonus[]`, which has no
chip and would otherwise keep scoring invisibly.

Extractions are cached on a hash of the document. Pasting or uploading the same
description twice is the normal way to use this; it must not bill twice.

### "All countries" clears rather than selecting everything
An empty selection already means every value. Ticking all five means the same
thing while bloating the URL, the chips and the badge.

The list shows every supported country with real counts (candidates whose
Location or CRM country matches), zeros included. A list that omits a country
cannot answer "none there"; it just makes the country look nonexistent.

---

## 4. Deliberately absent

| | Why |
|---|---|
| **`NOT` and parentheses** | `NOT Intern` inverts to *require* interns and parentheses are dropped — unsafe with `websearch_to_tsquery`. Typed **`AND` / `OR`** (no `NOT`) are supported for name/skill combinations. |
| **Field-scoped search** | One input searches everything; facets do precise narrowing. |
| **Export, bulk actions** | Not built. |
| **DOCX / TXT upload** | PDF only. |
| **Shared saved searches** | Personal only — sharing raises whose-scope questions nothing here answers. |

---

## 5. Where things live

**Migrations** `0096` education_level · `0097` HNSW index · `0098`
employment_type · `0099` facet counts · `0100` saved searches

**Server** `server/src/modules/recruitment/candidate-search/`
`criteria/` holds the pure logic — normaliser, fit scoring, chips: no DB, no I/O,
no clock. `services/` holds scope, filters, repository, ranking, facets, JD and
saved searches.

```
POST   /recruitment/candidate-search                             search
POST   /recruitment/candidate-search/count                       structured-only count
GET    /recruitment/candidate-search/facets                      filter values
POST   /recruitment/candidate-search/job-description/parse        paste
POST   /recruitment/candidate-search/job-description/parse-file   PDF
GET|POST|PATCH|DELETE  …/saved[/:id]                             saved searches
```

**Client** `client/src/pages/recruitment/candidate-search/`, hooks in
`client/src/hooks/useCandidateSearch*.ts`, criteria shape and URL encoding in
`client/src/lib/recruitment/candidate-search.criteria.ts`.

**Reused rather than rebuilt** — the résumé index and hybrid retrieval,
`job-extraction` for JD parsing, `ui/date-range-picker`, `STAGE_COLORS` from the
kanban, `RecruitmentAccessService`, and the collaborator subquery (extended with
an optional permission argument whose default preserves the dashboard exactly).

---

## 6. Verification

No automated test suite ships with this feature — a deliberate call. Everything
below was exercised by hand against the production dump.

| Checked | Outcome |
|---|---|
| Tenancy | Another user's postings never appear, including in `job_ids` of a row you legitimately match. Soft-deleted jobs leave scope immediately |
| Dedup | One contact on two accessible jobs ⇒ one row, `posting_count` 2, `applied_at` = earliest |
| Skills via `search_vector` | NetSuite found in `technologies`; multi-word phrase matched from résumé body |
| Job descriptions | Paste and PDF both parse; a second parse hits cache in 18 ms |
| `bonus` isolation | Impossible nice-to-haves drop the score 100%→45% and remove **no** rows; an impossible required skill returns 0 |
| Saved searches | Duplicate title 409; delete frees the title for reuse; another user's row 404 |
| HTTP | 401 unauthenticated · 403 without CSRF · 400 on unknown field and oversized `pageSize` |

**Five bugs that typecheck, lint and a production build all passed:**

1. `varchar[] && text[]` has no operator — every work-mode, employment-type and country filter threw at runtime
2. A `Date` in a raw `sql` template stringifies to a form Postgres rejects — the education backfill had never written a row
3. `appliedAt` returned a raw Postgres literal on some driver paths — Invalid Date in the table
4. Names were absent from the pipeline — the Candidate column rendered blank on every row
5. Removing your last filter flipped the page back to the empty state — results vanished because you *widened* the search

The lesson worth keeping: with no automated suite, **running the code is the
safety net**. None of these were findable by reading it.

---

## 7. Known gaps

- **The HTTP layer has no automated coverage.** Guards, throttles and DTO
  rejection were checked by hand, once.
- **Performance is unmeasured at scale.** The budgets in ADR-005 were set against
  an expectation, not a measurement. Request duration is logged, so the first
  sign of trouble should appear there rather than in a support ticket.
- **HNSW recall was never re-measured** against the `0.58` cosine floor. If
  recall proves short the lever is `ef_search`, never lowering the floor.
- **`recruitment_job_facet_counts` can drift.** Contact-side edits do not
  re-index a résumé, so the nightly rebuild is the self-healing path. At current
  volume the live query it replaces takes 0.8 ms — this is insurance against a
  scale that has not arrived.
- **Paste-a-JD is unreachable.** `JobDescriptionSheet`, `SearchBar`,
  `MatchJdButton` and `QuickFilterBar` (~900 lines) were orphaned when the
  landing design replaced the sheet with a dropzone. Kept pending a decision.
- **`--accent` equals `--primary`** app-wide, so shadcn's ghost hover paints
  indigo everywhere. Overridden throughout candidate search; other pages still
  have it.

### Results table UX (2026-09-01)

- Default sort switches to **Match % desc** when any criterion is applied; reverts
  to **Applied desc** when criteria are cleared.
- **Match %** and **Experience** column headers toggle sort (asc/desc); toolbar
  adds **Lowest match**.
- Match % uses the kanban colour badge (`getMatchScoreBadgeClass`) — no progress bar.
- **Preview** in each row opens the same PDF resume dialog as the kanban/detail
  modal (`hasResume` on search rows; URL minted on demand).
- **Actions** is `position: sticky; right: 0` so the menu stays on screen while
  the other columns scroll underneath on narrow table viewports.

### Candidate detail page (2026-09-01)

- **View** navigates to `/recruiting/candidates/:candidateId` (not the job kanban).
- Search query params are copied onto the detail URL and restored on Back so the
  results page reopens with the same filters.
- View-only **page** (not a Dialog). Scan path: identity header → evaluation +
  AI summary → interview → connectors → experience timeline → skills & tools →
  projects → assessment/payment. Kanban and modal files are unchanged.
