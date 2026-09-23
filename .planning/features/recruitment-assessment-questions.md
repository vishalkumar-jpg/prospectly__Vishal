# Feature: Recruitment Assessment Questions

**Version:** 2.0
**Status:** Active
**Last Updated:** 2026-07-09

## Overview
Recruiters can attach optional **assessment/screening questions** to a job post
while building it (a new optional "Assessment" step in the Post-a-Job wizard),
and edit them later from the job's edit flow. Recruiters also maintain a
**per-recruiter reusable question bank** and can pick questions from it into any
job.

Phase 1 delivered the full database design plus HR-facing authoring. **Phase 2**
adds the candidate answering flow, auto-scoring, and pipeline routing (see the
"Phase 2" section below).

### Phase-1 scope decisions
- **Question types:** the schema supports `single_choice`, `multi_choice`, and
  `text`. The Phase-1 UI is **`single_choice` only** with a fixed, non-editable
  **Approve / Decline** option set (stored as `value` 1 / 0). Recruiters do not
  edit options or types yet; the DB keeps the flexible structure for later.
- **Bank link model: copy-on-add (snapshot).** Adding a bank question to a job
  copies its values into the job question. Editing a job question is always
  local — it never changes the bank or any other job. `sourceBankQuestionId` is
  provenance only, never used for rendering (no live reference).
- **Response integrity: snapshot on response.** The responses table stores
  snapshots of the question text / options / answer key so Phase-2 history stays
  truthful even if the question is later edited or deleted.
- **Correct answer:** a dedicated `correct_answer` JSONB column (not embedded in
  options) so it is never leaked to candidates. Stored now; no scoring logic.

## Server Module
**Path:** `server/src/modules/recruitment/assessment-bank/` (bank CRUD) plus
extensions to `server/src/modules/recruitment/jobs/`.

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /recruitment/assessment-bank | Yes | List the current recruiter's bank (paginated + `search`) |
| POST | /recruitment/assessment-bank | Yes | Create a bank question |
| PATCH | /recruitment/assessment-bank/:id | Yes | Update a bank question (owner-only) |
| DELETE | /recruitment/assessment-bank/:id | Yes | Soft-delete a bank question (owner-only) |
| POST | /recruitment/jobs | Yes | Create job — now accepts `hasAssessment` + `assessmentQuestions` |
| PATCH | /recruitment/jobs/:id | Yes | Update job — diff-syncs `assessmentQuestions` when provided |
| GET | /recruitment/jobs/:id?view=full | Yes | Returns `assessmentQuestions` ordered by `orderIndex` |

Bank endpoints are scoped by `createdBy = currentUser`. All are gated by
`@RequireModule("recruiting")`.

### Key Services
- **RecruitmentAssessmentBankService** — per-recruiter bank CRUD.
- **recruitment-assessment.util.ts** — `normalizeAssessmentQuestion` /
  `normalizeJobAssessmentQuestions`: default-option stamping, correct-answer
  validation (every `optionId` must exist in `options`), count cap, and
  `orderIndex` re-sequencing.
- **recruitment-assessment-persistence.ts** — `syncJobAssessmentQuestions(tx,…)`:
  transaction helper used by both job create and update to upsert kept, insert
  new, soft-delete removed, and promote `saveToBank` questions into the bank.
- Job **create/update services** also set `recruitment_job_settings.hasAssessment`
  in the same transaction.

### Database Tables
| Table | Purpose |
|-------|---------|
| recruitment_assessment_question_bank | Per-recruiter reusable questions (owner = `createdBy`). Options as JSONB; dedicated `correct_answer` JSONB. |
| recruitment_job_assessment_questions | Per-job questions, self-contained copies, ordered by `order_index`; nullable `source_bank_question_id` provenance. |
| recruitment_candidate_assessment_responses | Phase-1 **schema only**. Snapshot columns + `answer` JSONB; unique `(job_candidate_id, job_question_id)`. |
| recruitment_job_settings (modified) | Added `has_assessment` boolean flag for a cheap Phase-2 lookup. |

Enum `assessment_question_type` added in `enums.ts`. Shared TS types
`AssessmentOption` / `AssessmentCorrectAnswer` live in the bank schema file.

> Migration note: schema files were authored but the migration is generated and
> applied manually (not by tooling) via `bunx drizzle-kit generate` +
> `bunx drizzle-kit migrate`.

## Client
### Pages
- **Question bank (no standalone page)** — the per-recruiter bank is authored
  through the Post-a-Job assessment modal's **"Save to bank"** checkbox (promotes an
  inline job question) and read back via the modal's **From Question Bank** picker
  tab (`useAssessmentBank`). There is no dedicated bank management page.
- **PostJobWizard** — new optional **Assessment** step (after Description) in
  create and edit flows: `client/src/pages/recruitment/post-job-wizard/AssessmentStep.tsx`
  and `AssessmentBankPicker.tsx`.

### Hooks
- `useAssessmentBank()` / `useCreateBankQuestion()` / `useUpdateBankQuestion()` /
  `useDeleteBankQuestion()` — `client/src/hooks/useAssessmentBank.ts`.

### API Module
- `client/src/lib/api/recruitment.ts` — `listAssessmentBank`,
  `createBankQuestion`, `updateBankQuestion`, `deleteBankQuestion`; job
  create/update/detail types extended with `hasAssessment` + assessment questions.

### Reusable UI
- `client/src/components/ui/sortable-list.tsx` — accessible drag-to-reorder list
  (`@dnd-kit`), persists an integer order via `onReorder`.

## External Integrations
- **@dnd-kit** (`core` + `sortable` + `utilities`) — drag-to-reorder for the
  question list.

## Business Logic
- The whole assessment section is optional per job; a job may have zero questions
  (`has_assessment = false`).
- Adding a bank question copies it into the job; later bank edits do not affect
  existing jobs (copy-on-add).
- Editing a job's questions is local; on job update the server diff-syncs the
  provided full set (soft-delete removed, upsert kept/new, re-sequence order).
- "Save to bank" promotes an inline job question into the recruiter's bank and
  records `source_bank_question_id`.
- Deleting a bank question soft-deletes it; job questions keep their copies and
  their `source_bank_question_id` resolves to null.

## Phase 2 — Candidate answering + Unqualified pipeline

Candidates answer the assessment while applying; answers are auto-scored and,
combined with the AI match score, decide where the candidate lands in the
recruiter pipeline. No DB migration was needed — the responses table and the
`not_qualified` stage already existed.

### Candidate answering flow
- **Question exposure (answer key stripped):** candidate-facing surfaces return
  questions without `correct_answer`. The public job endpoint
  (`GET /recruitment/jobs/public/:jobId`) and the consent verify endpoint
  (`GET /recruitment/consent/verify/:token`) now include `hasAssessment` +
  `assessmentQuestions`, sourced through a single shared query helper
  (`fetchCandidateAssessmentQuestions`) + mapper (`toCandidateAssessmentQuestion`).
- **Both apply paths** accept `assessmentResponses` (`{ jobQuestionId, answer }`):
  direct apply (`POST /recruitment/candidates/apply`) and connector consent-apply
  (`POST /recruitment/consent/apply`). Each persists snapshots into
  `recruitment_candidate_assessment_responses` inside its existing transaction,
  scoring every answer (`is_correct` / `points_awarded`).
- **Scoring:** choice questions use exact set-equality against the answer key
  (Approve = correct in Phase 1); text answers are non-blocking. Required
  questions must be answered or the apply request is rejected.
- **Client:** the apply modal is a 3-step flow — Resume → Assessment (only when
  the job has one) → Review & Submit. Small composable components
  (`AssessmentAnswerStep`, `AssessmentQuestionField`, `AssessmentReviewSummary`)
  are shared by both the direct and consent modals. The consent modal disables
  its auto-submit shortcut whenever an assessment is present.

### Pipeline placement (all jobs gated on score)
A single shared decider (`determinePipelineStageKey`) is used by both the async
evaluation processor and the synchronous consent path:
- any incorrect assessment answer → **Unqualified** (`not_qualified`)
- AI score `< 50` → **Unqualified**
- AI score `>= 50` **and** all answers correct → **In Review**

Failing candidates are no longer hidden — every applicant reaches the recruiter.
The recruiter kanban gained an **Unqualified** column; HR can **Shortlist** a
candidate from it (normal shortlist → `shortlisted`).

## Phase 3 — HR-authored text-answer questions

Recruiters can now author **free-text** screening questions in addition to Yes/No,
so candidates answer some questions in a text box (e.g. "Why are you interested?",
"Notice period?"). This was a **client-only** change — the `text` type was already
supported end-to-end on the server (enum, normalization, scoring, validation, DTOs)
and in the candidate UI; only the authoring modal was locked to `single_choice`.

- **Authoring:** the assessment question modal ("Write New" tab) gained a **required
  Answer type dropdown** — **Yes / No** (`single_choice`) and **Text answer**
  (`text`). It defaults to unselected; the recruiter must choose a type before the
  question can be saved (Add/Save is disabled and a validation message shows
  otherwise). Multi-choice remains hidden (no options editor yet). Switching type
  auto-resets options: Text carries no options/answer key; the server re-stamps the
  default Approve/Decline set for Yes/No.
- **Bank:** because the bank is written via "Save to bank" on this same modal, text
  questions are reusable automatically; the picker and job list show a **type badge**
  (Yes / No · Text) so the two are distinguishable.
- **Scoring (unchanged):** text answers are **informational only** — always scored
  `is_correct = true`, so they never route a candidate to Unqualified. Only failed
  Yes/No answers and AI score `< 50` disqualify. Required text questions must still
  be answered before applying.
- **Candidate answer cap:** the candidate text box enforces a 500-char limit (with a
  live counter) matching the server's answer cap.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-07-08 | Initial Phase-1 documentation | jitendra_officebeacon |
| 2.0 | 2026-07-09 | Phase 2: candidate answering, auto-scoring, Unqualified routing, shortlist-from-Unqualified | jitendra_officebeacon |
| 3.0 | 2026-07-15 | Phase 3: HR-authored text-answer questions (type picker, type badges, informational text scoring) | jitendra_officebeacon |
