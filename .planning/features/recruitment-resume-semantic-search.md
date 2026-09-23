# Feature: Resume Semantic Search (Recruiter & Connector Pipelines)

**Version:** 2.4
**Status:** Active (Phase 1)
**Last Updated:** 2026-08-14

## Overview

Lets a recruiter search the _content_ of candidate resumes in natural language from the job pipeline board. Typing "backend developer with cloud experience" surfaces a candidate whose resume says "PHP developer", because matching is by meaning rather than by substring.

Results come from a hybrid of two signals fused together: pgvector cosine similarity over a per-resume embedding, and Postgres full-text ranking over the resume text. The board is filtered in place — matching candidates stay in their stage columns, re-sorted by relevance, each card carrying a compact strip that says how it ranked and why.

This is the board's only text search. The earlier substring filter over title, company and skills was removed once semantic search covered the same ground more accurately — it competed for the same intent and split recruiters between two boxes with different rules. The match-score range filter and the stage filter still combine with the search using AND; they now sit behind a single Filters button that opens a side panel, so the toolbar carries only the search.

The same box also finds a specific person. Typing a candidate's name narrows the board to them, and a name combined with requirements — "Jitendra Bavaliya with python experience" — shows that one candidate with the requirements checked off on their card. This is a separate mechanism from resume matching, described under _Finding a specific person_ below, because resume search cannot answer it: identity is deliberately excluded from the index.

### Who searches, and over what

The same search, the same toolbar and the same card chips now appear on two boards, but each searches a different set of people.

- **A recruiter, on their own job board.** Everyone in the job's pipeline. Only the job's owner and collaborators granted candidate access can search here.
- **A connector, on a job they are referring into.** Only the people they themselves put forward — both the candidates they have already referred and their own pre-referral matches, which are still contacts rather than candidates. A connector never sees, ranks or counts another connector's people, and the "how many have indexed resumes" figures they see describe only their own rows.

The two are deliberately separate paths rather than one search with a filter applied afterwards: the boundary is enforced where the rows are first gathered, so there is no ordering in which a connector could be handed someone else's candidate.

The connector board shows real names throughout — the connector sourced these people — so a name search there simply finds the name on the card, and the note about anonymous candidates does not apply.

**Phase 1 (this release)** indexes newly uploaded resumes only, so anything uploaded before it shipped is invisible to search until it is backfilled.

**Backfilling what already exists.** An operations trigger indexes resumes that have no entry yet. It can be pointed at a single job — covering both that job's candidates and its connectors' pre-referral matches — so the corpus can be worked through one job at a time and checked before widening; given no job, it sweeps everything. It is safe to re-run: a resume that already has an entry is skipped, and re-indexing an unchanged resume costs no AI call. Nothing schedules it, so it is always started deliberately. Note that indexing always re-reads the original document from storage, because the extracted text is not kept anywhere else — so the cost of a sweep is one document read and one AI call per resume that still needs indexing.

**Phase 2** adds OCR for scanned PDFs. There is no way to target only the scanned documents, so that pass re-indexes everything in whatever scope it is given.

## Server Modules

**Paths:** `server/src/modules/recruitment/resume-indexing/` (write side), `server/src/modules/recruitment/resume-search/` (read side)

### API Endpoints

| Method | Path                                                     | Auth                                                            | Description                                                                                                                                                            |
| ------ | -------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /recruitment/candidates/job/:jobId/resume-search         | JWT + `recruiting` module + `CANDIDATE_VIEW` on the job         | Ranked candidate IDs for a natural-language resume query                                                                                                               |
| POST   | /recruitment/connector-pipeline/job/:jobId/resume-search | JWT + `recruiting` module; rows scoped to the calling connector | The same ranking over only the connector's own referrals and pool matches                                                                                              |
| POST   | /backfill/recruitment/resume-index                       | X-API-Key                                                       | Queue an indexing sweep. Optional `jobId` limits it to one job's resumes; omitted, it sweeps every resume. Optional `force` re-indexes rows that already have an entry |

The search endpoint returns an ID-and-rank projection capped at 50, not a listing, so it is intentionally unpaginated — the client already holds the board rows and only needs the ranking. Rate limited to 20 requests/minute.

### Database Tables

| Table                 | Purpose                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| contact_resume_search | Derived search index: one row per parsed resume, holding PII-stripped text, a 768-dim embedding, and a generated weighted tsvector |

The table is 1:1 with `contact_resumes` via a unique `contact_resume_id` with `ON DELETE CASCADE`. Presence of a row _is_ the "indexed" flag, so coverage counting and backfill selection are both simple joins. Invalidation hard-deletes rather than soft-deletes, because the content is regenerable.

### Queue

| Queue           | Jobs                                    | Purpose                                                     |
| --------------- | --------------------------------------- | ----------------------------------------------------------- |
| resume-indexing | `index-resume`, `backfill-scan-resumes` | Extracts text, strips PII, embeds, and writes the index row |

Chained after resume extraction on **both** ingestion paths — the candidate-apply path and the connector bulk-upload path. The second is not optional: connector uploads bypass the extraction queue entirely, so chaining from only the first would leave that whole corpus unindexed.

## Client

### Pages

- `/recruiting/my-job-posts/:id` — the recruiter's board: the search input in the toolbar, per-card relevance badges and matched-on chips, and a notices strip that appears only when something needs saying
- `/recruiting/refer-candidates/inbox/:jobId` — the connector's board for one job, carrying the same toolbar, drawer and card chips over their own rows

The search box, filter drawer, notices, empty state and relevance strip are one shared set of components used by both boards. Only the row source and the scoping differ.

A successful search shows no summary of itself. The board is the result: matching candidates stay in their columns, each card carries its own relevance badge and matched-on chips, and an empty board has its own empty state. A running commentary above it — the match count, the requirements that were applied, a clear button duplicating the one in the search box — was removed as noise on every single search. What remains appears only on failure or when results are quietly incomplete.

### Hooks

- `useJobResumeSearch(jobId, query, scope)` — runs the search and returns matches keyed by row ID, plus coverage counts and degraded/truncated flags. `scope` selects the recruiter or connector endpoint and is part of the cache key, so the two boards never serve each other's results for the same job

Name matching runs before this hook, purely on the board's own rows, and hands it whatever is left of the query. Coverage warnings are suppressed while a name filter is in effect, since resume coverage no longer decides who is on the board.

## External Integrations

Google Gemini `gemini-embedding-001` (768 dimensions) for both document and query embeddings. Every call is recorded in the existing AI usage audit log.

## Business Logic

### What is searchable

Skills, experience (including employers), education, certifications, projects and achievements. **Personal identity is not searchable.** Names, emails, phone numbers, government IDs and social/profile URLs are stripped before anything is stored or embedded.

Redaction covers both halves of the indexed document — the resume body _and_ the structured summary of job title, skills, tools and certifications. The structured fields are supposed to hold professional data only, but an AI writes them, so a name that lands in the wrong field is stripped rather than trusted. The two halves are redacted with slightly different settings: the summary is a list of labelled lines by construction, so the rules that read a `Label: value` line as personal data are turned off for it, which is what keeps a genuine value like "Contact-Center Operations" intact. Names are matched by Unicode word boundaries, so accented and non-Latin names are removed as reliably as plain ASCII ones.

The redaction is deliberately conservative in the other direction too: date ranges (`2019 - 2022`), version numbers (`Node.js 18.2`), metrics (`99.99% uptime`, `450 ms`) and money (`$1.2M ARR`) all survive, and a name token is never removed when it also appears in a skill, employer or institution — a candidate named "Ruby" does not lose the Ruby skill from their index.

This matters because candidates stay anonymised until they reach the reveal stages. Match reasons ("matched on" chips) are drawn from an allowlist of skills, tools, technologies and domain expertise, none of which can carry identity, so no reveal check is needed on the search path.

### Finding a specific person

A recruiter also needs to pull up one candidate by name, which the index cannot answer. That match is made instead against the name already printed on the card — the revealed name where identity has been released, and the candidate number everywhere else — so it is decided entirely by what the recruiter can already see.

This placement is the security property, not a convenience: the reveal decision is made once, when the board is loaded, and an anonymous candidate's real name is never part of what is being searched. Typing it finds nobody, so the search cannot be used to test who is behind a candidate number. It also avoids a second copy of the reveal rule, which depends on stage history for rejected candidates and would leak identity the moment the two copies disagreed.

Behaviour:

- A name acts as a **filter**, not a ranking signal — the board narrows to the named candidate. Anything else in the query still runs as a resume search and supplies their relevance badge and requirement checklist.
- A full name always resolves; a single name part resolves only when it is not an everyday English word, so "engineer who **will** lead a team" is not read as a search for a candidate named Will. Those candidates remain findable by full name.
- Only the closest match is shown: a full name beats a first name, so searching two names does not also return everyone sharing the first.
- The name is **removed from the query before the resume search runs**. Left in, a surname reads to query understanding as a named product to require, which no resume satisfies — the search would return nothing at all. This also means a name-only search costs no AI calls.
- Because this matches the board rather than the index, it finds candidates whose resume has not been indexed yet, which pure resume search cannot.

### Indexing

1. Extract text from the PDF locally.
2. If the PDF yields too little readable text (a scanned document), fall back to the structured extraction fields instead. Which branch was taken is logged per run but not stored, so it is a diagnostic rather than something Phase 2 can select on.
3. Discard lines that carry no letter or digit. PDF text arrives in drawing order, so a resume whose list markers are drawn separately yields its bullet glyphs detached from their text and clumped together — the bullet text itself is kept, only the stray markers go.
4. Strip personal identity.
5. Compose the embedding input with the high-signal profile first, so truncation can only ever drop the tail.
6. Skip the embedding call entirely when a content hash shows nothing changed — this makes retries, identical re-uploads and repeat backfill passes free.

### Understanding the query

A recruiter's sentence is first read by an LLM and split into **hard requirements** and **soft intent**.

A hard requirement is a specific, named, checkable thing — a language, framework, library, database, cloud service or certification. These are combined with AND: "laravel with vue js and Elasticsearch with 9 experience" returns only candidates who have all three technologies _and_ at least nine years, not candidates who merely resemble that description.

Everything else is soft: broad categories ("cloud", "backend"), seniority, and responsibilities. Soft terms influence ranking but never exclude anyone. This is what keeps the original promise intact — searching "backend developer" still surfaces a PHP or Laravel resume that never uses the word "backend", because Laravel _is_ a backend framework. Ambiguity always resolves toward soft, since a wrong hard requirement silently hides a good candidate while a wrong soft term only shifts the order.

Each requirement is expanded into the spellings that could plausibly appear in a resume — `vue.js`, `vuejs`, `vue js` — and any one of them satisfies it. This is essential rather than cosmetic: a resume can contain "Vue.js" without ever containing the bare word "vue", and full-text search does not connect the two on its own.

Requirements are checked against the whole resume, not the extracted skills list, because that list is a summary and routinely omits technologies the resume plainly describes.

Where a requirement cannot be checked at all — an unindexed resume, or no years of experience on file — it is reported as **unknown** rather than failed, and the count is surfaced. An absence of evidence is not held against the candidate.

**Near misses.** Candidates meeting some but not all requirements still appear, ranked below the full matches and flagged on the card as a partial match, so a recruiter can see who was close and what they were missing instead of facing an empty board. A candidate meeting none is not shown.

### What the card shows

The strip sits above the candidate's own name and competes with it for the only space on the card that gets read, so it is packed to fit rather than allowed to grow: one line for a simple search, at most two, and every line it does use is filled to the edge before anything is collapsed. It carries the rank and match tier, the partial-match flag where it applies, and then as much evidence as fits before a "+N" holding the rest.

Which evidence gets those slots is a ranking of its own:

- **Requirements outrank keywords.** A ✓/✗ against something the recruiter actually asked for says more than a word that happened to match.
- **Unmet outranks met.** With one or two slots, what a candidate is missing is the more useful fact — and it keeps the failing requirement visible next to the partial-match flag rather than hidden behind the overflow.
- **A requirement and a keyword that say the same thing are one item.** A met "Terraform" requirement and a matched "Terraform" keyword are the same fact; only the requirement is shown. Spelling variants fold together, so "Vue.js" and "vue js" do not both appear.

Nothing is lost to the collapse — the overflow opens on hover or tap and lists every hidden item, and a hidden requirement keeps its ✓/✗/? there.

When query understanding is unavailable, no requirements are applied and the search falls back to pure relevance ranking, with the board saying so.

### Ranking

The two result lists are combined with Reciprocal Rank Fusion. When hard requirements are present they decide _who_ is returned and ranking only decides the order — the relevance gates below are relaxed, since they exist to supply precision and the requirements now do that. A candidate who satisfies every stated requirement is never dropped for ranking weakly. Fusion cannot create precision that neither input list had — RRF is ordinal, and consecutive ranks score within 2% of each other — so **each branch is gated on its own signal before they are fused**, and the post-fusion cutoff only trims the long tail.

**Semantic branch.** Similarity scores are not calibrated: an entirely off-topic query still scores around 0.53 against any resume, and a strong match only reaches about 0.67. A fixed floor alone therefore either admits everything or rejects everything. Two gates apply together — an absolute floor that rejects off-domain noise, and a relative one that keeps only candidates within a small margin of the _best_ match for that particular query. The relative gate is what makes the search self-calibrating: a narrow query like "laravel" keeps one candidate, while "backend developer with cloud experience" legitimately keeps several.

**Keyword branch.** Terms are OR-folded for recall, and Postgres full-text ranking has no corpus statistics, so a word every candidate shares ranks nearly as high as a rare one — one generic term would otherwise pull in the whole pipeline. Each query term is therefore measured against the job's own candidate pool and dropped if it appears in most of them. This is measured per job rather than taken from a fixed word list, so "developer" stops discriminating in a pipeline of developers, and "laravel" stops discriminating in a pipeline of Laravel developers. If every term turns out to be generic, the search falls back to using them all and shows everyone, rather than returning nothing. Grammatical filler is discarded before this stage, and quoted phrases skip it entirely.

Match reasons are drawn from the terms that survived these filters, so a card never claims to have matched on a word the search ignored.

Both thresholds and the term-frequency limit are single constants, deliberately, because they are calibrated against a small corpus and should be revisited as the pipeline grows.

### Concurrency safety

The index write is guarded on the source resume's `updated_at` as read at the start of the job. If the resume changed while the embedding call was in flight, the write is rejected and the job retries against the current row.

This is what prevents a stale vector: a second write can land while a first index job is mid-embedding, and the second job's enqueue is silently deduplicated away against the still-active first job. Without the guard the first job would then persist a vector derived from the superseded resume, permanently and with no error. With it, the rejected job's retry performs the dropped work.

### Failure behaviour

- **Embedding unavailable** (timeout, quota, missing key): the search degrades to keyword-only ranking, returns 200, and the UI says so. Never a 5xx.
- **Cache unavailable:** searches still run, just slower and at higher API cost.
- **Not yet indexed:** those candidates still participate through the keyword half, and a notice reports how many resumes are not yet AI-indexed rather than silently omitting them.

### Cost control

Query embeddings are cached for 24 hours keyed by a hash of the normalized query, so repeated and shared phrases are free. Only the hash is stored — the query text itself never lands in the cache.

### Data retention

The index inherits soft-deletion from the parent resume and cascades on hard delete. Account deletion additionally purges the index rows outright. The purge is split in two because of ordering: rows reachable from the user are removed before the candidate records they hang off are deleted, and rows reachable through a contact are removed in the instant before that contact is deleted. Both links are severed by the database the moment their parent row goes, so a purge that ran afterwards would find nothing and quietly leave resume text and a live embedding behind.

## Revision History

| Version | Date       | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Author      |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1.0     | 2026-08-10 | Initial documentation — Phase 1 (new resumes only)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Claude Code |
| 1.1     | 2026-08-11 | Per-branch relevance gating — searches returned every candidate in the pipeline because neither branch filtered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Claude Code |
| 1.2     | 2026-08-12 | LLM query understanding — named requirements now combine with AND instead of only influencing rank; near-miss group with per-requirement reasons                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Claude Code |
| 1.3     | 2026-08-12 | Removed the board's substring candidate filter — resume search is now the single search input                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Claude Code |
| 1.4     | 2026-08-12 | Filters moved behind a single side panel; results banner cut back to a notices strip that appears only on failure or incomplete results                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Claude Code |
| 1.5     | 2026-08-12 | Search by the name shown on the card — matched against the already-revealed identity, never the index; restores candidate-number lookup                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Claude Code |
| 1.6     | 2026-08-12 | Card relevance strip cut from three rows to one — duplicate requirement/keyword chips merged, unmet requirements prioritised, remainder behind an overflow                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Claude Code |
| 1.7     | 2026-08-12 | Overflow chip opens on hover, tap and keyboard — it was unreachable by any input                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Claude Code |
| 1.8     | 2026-08-12 | Strip packed by width instead of a fixed chip count, so a line that exists is filled to the edge before anything collapses                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Claude Code |
| 1.9     | 2026-08-12 | Index table renamed to `contact_resume_search`; dropped `indexed_at` (duplicated `updated_at`) and `resume_text_source`, and with it the scanned-only backfill mode                                                                                                                                                                                                                                                                                                                                                                                                                                        | Claude Code |
| 2.0     | 2026-08-13 | Review pass. Structured profile fields are now PII-redacted before storage and embedding, and name matching uses Unicode word boundaries so accented and non-Latin names no longer slip through. Account deletion now purges contact-linked index rows before the contact is deleted, where it previously matched nothing. Backfill staggers its embedding calls and clamps its page size; an unknown queue job no longer burns four retries; completed jobs keep their configured retention; the batch embedding call has a timeout                                                                       | Claude Code |
| 2.4     | 2026-08-14 | Indexed resume text no longer ends in a run of stray bullet characters. PDF extraction returns list markers detached from their text; those content-free lines are now dropped. Search results are unaffected — the markers were already ignored by text ranking — but existing entries keep them until re-indexed with force                                                                                                                                                                                                                                                                              | Claude Code |
| 2.3     | 2026-08-14 | The indexing sweep can now be pointed at a single job, covering that job's candidates and its connectors' pre-referral matches, so the existing corpus can be indexed one job at a time instead of all at once. Two sweeps queued back to back previously collided and the second was silently dropped                                                                                                                                                                                                                                                                                                     | Claude Code |
| 2.2     | 2026-08-13 | Search extended to the connector's own job board, covering both their referred candidates and their pre-referral matches, and scoped so a connector only ever searches, ranks and counts their own people. That board's substring search box is replaced by the AI search, its stage and match-score filters move behind a Filters drawer, and its cards gain the relevance strip — matching the recruiter board                                                                                                                                                                                           | Claude Code |
| 2.1     | 2026-08-13 | Review pass on the search path. A requirement whose term began with a hyphen was read as a negation and matched the candidates who _lacked_ the skill — hyphens are now trimmed from the edges of every requirement term. A long requirement cut mid-character could fail the whole search with an error; terms are now truncated by character rather than by byte. The exact-match count no longer overstates how many results are shown. Query understanding and embedding stop retrying failures that cannot succeed, log every failed attempt, and keep their timeout armed while the response is read | Claude Code |
