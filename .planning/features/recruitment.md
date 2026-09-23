# Feature: Recruitment

**Version:** 1.19
**Status:** Active
**Last Updated:** 2026-05-08

## Overview
Full-lifecycle recruitment system enabling recruiters to post jobs, receive candidate applications via connectors and direct apply, manage candidates through a multi-stage pipeline (Kanban), schedule interviews with calendar integration, and process bounty payments via Stripe two-step authorization. Includes AI-powered job creation from PDF uploads or public URLs via Google Gemini, automatic resume parsing on candidate application, AI-powered candidate evaluation that compares resumes against job descriptions via Gemini before sending to recruiter review (≥50% match → in_review, <50% → jd_mismatched), AI-powered job-to-candidate matching using OpenAI embeddings and LLM scoring, a connector consent workflow for candidate privacy, and public job sharing with referral tracking.

## Server Module
**Path:** `server/src/modules/recruitment/`

The module is organized into 15 sub-modules:

| Sub-Module | Path | Purpose |
|------------|------|---------|
| candidates | `recruitment/candidates/` | Job application submission and candidate listing |
| candidate-workflow | `recruitment/candidate-workflow/` | Pipeline stage transitions (reject, shortlist, send invite) |
| jobs | `recruitment/jobs/` | Job posting CRUD, stats, and closure |
| job-extraction | `recruitment/job-extraction/` | AI-powered job data extraction from PDF uploads, public URLs, and AI job description generation via Google Gemini |
| resume-extraction | `recruitment/resume-extraction/` | Background resume parsing via BullMQ — extracts skills, experience, education from uploaded PDFs using Gemini |
| interview-booking | `recruitment/interview-booking/` | Public token-based interview slot booking |
| interview-cost | `recruitment/interview-cost/` | Bounty calculation from salary ranges |
| job-pool-matches | `recruitment/job-pool-matches/` | AI-powered candidate matching + BullMQ processor |
| marketplace | `recruitment/marketplace/` | Public job browsing for connectors |
| consent | `recruitment/consent/` | Contact consent collection for matched candidates |
| connector-pipeline | `recruitment/connector-pipeline/` | Connector's view of their matched candidates (includes interview_invite_sent stage with invite date tracking). Each row's `bountyAmount` is the **connector's actual payout** (not the recruiter's gross) computed via `RecruitmentFeeConfigService`: gross × `getConnectorPercent()` × `recruitment_candidate_connectors.sharePercent` (100% for `primary` → 80% of gross; 50% for `sharer`/`claimer` → 40% of gross). Pre-consent matches (`consent_pending` / `consent_declined`) have no candidate-connectors mapping yet and optimistically return the full connector pool (gross × 80%). Each row also returns `isSplit: boolean` (true only when connector role is `sharer` or `claimer`); the connector pipeline UI renders a "Split" badge with a `50/50 between you and the other connector` tooltip when set. |
| my-applications | `recruitment/my-applications/` | Candidate's view of their applications |
| master-data | `recruitment/master-data/` | Static reference data (industries, departments) |
| candidate-evaluation | `recruitment/candidate-evaluation/` | AI-powered JD-to-resume evaluation via Gemini before recruiter review |
| share | `recruitment/share/` | Job sharing and referral tracking |
| fee-config | `recruitment/fee-config/` | **Single source of truth for every recruitment percentage.** Owns `RecruitmentFeeConfigService` with getters: `getConnectorPercent` (80), `getPlatformPercent` (20), `getCandidateSuccessFeeRecipientPercent` (100), `getCandidateSuccessFeePlatformPercent` (0), `getSplitConnectorSharePercent` (50, per-recipient share inside the connector pool when a candidate has two connectors). Helpers: `splitAmount(amount, percent)` returns a 2-decimal string for direct API use; `getSharerPayoutAmount(gross)` returns the sharer dollar amount on a split deal (50% of 80% = 40% of gross by default). Every consumer (marketplace list API, public-job DTO, payout creation, payout-queue absorption, candidate-connectors `addSplit`) reads from this service — never hardcode percentages elsewhere. The public-job response includes `connectorPayout` (full connector pool, single-connector case) AND `sharerPayout` (split-share case) so the client never recomputes. Defaults live in `recruitment-fee-config.constants.ts`; a future phase swaps the service body to read from a DB-backed admin config without touching call sites. |

### API Endpoints

#### Jobs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /recruitment/jobs | Yes | Create a new job posting (validates payment method, auto-calculates bounty) |
| GET | /recruitment/jobs | Yes | List user's jobs with pagination, status filter, and search |
| GET | /recruitment/jobs/:id | Yes | Get full job details |
| PATCH | /recruitment/jobs/:id | Yes | Update job posting |
| PATCH | /recruitment/jobs/:id/close | Yes | Close job with reason (50-500 chars) |
| GET | /recruitment/jobs/stats | Yes | Get user's job stats (total, active, closed) |

#### Candidates
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /recruitment/candidates/apply | Yes | Apply to a job (with sharer code, LinkedIn URL, optional resume) |
| GET | /recruitment/candidates/check | Yes | Check if user already applied to a job |
| GET | /recruitment/candidates/job/:jobId | Yes | List candidates for a job (job owner only, searchable by stage) |
| GET | /recruitment/candidates/:candidateId | Yes | Get candidate details with pipeline tracker and transaction info |

#### Candidate Workflow
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | /recruitment/candidate-workflow/:candidateId/reject | Yes | Reject candidate with category and notes |
| PATCH | /recruitment/candidate-workflow/:candidateId/shortlist | Yes | Shortlist candidate — free, no Stripe call |
| PATCH | /recruitment/candidate-workflow/:candidateId/send-interview-invite | Yes | Send interview booking link via email |

#### Interview Booking (Public)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /recruitment/interview-booking/:candidateId/:token/availability | No | Get available interview slots (token-based, 14-day window) |
| POST | /recruitment/interview-booking/:candidateId/:token/confirm | No | Confirm selected slot, capture payment, create calendar event |

#### Interview Cost
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /recruitment/interview-cost/calculate | Yes | Calculate bounty and full fee breakdown (bounty, stripeFee, processingFee, totalAmount, suggestedBountyAmount) from salary range using tier lookup. Accepts optional `bountyOverride` — when provided and `>= suggested` and `<= 999,999`, fees are recomputed from the override; otherwise a 400 is returned |
| GET | /recruitment/interview-cost/shortlist-breakdown/:candidateId | Yes | Get full fee breakdown for shortlisting a candidate |

#### Job Pool Matches
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /recruitment/job-pool-matches | Yes | Get pending AI-matched candidates for user's jobs |
| GET | /recruitment/job-pool-matches/closed | Yes | Get closed (approved/declined) matches |
| POST | /recruitment/job-pool-matches/backfill-embeddings | API Key | Queue contact embedding backfill job |
| PATCH | /recruitment/job-pool-matches/:id/approve | Yes | Approve a match, transition to consent flow |
| PATCH | /recruitment/job-pool-matches/:id/decline | Yes | Decline a match with reason |

#### Marketplace
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /recruitment/marketplace | Yes | Browse active job postings (connector view). The response includes both `connectorPayout` (full referral pool) and `sharerPayout` (split-share amount) computed server-side from the canonical `RecruitmentFeeConfigService` — never trust a client-side percentage. The Share Job modal renders both values directly to disclose: (a) candidate applies directly via the share link → sharer earns `connectorPayout` (BE attaches sharer as primary connector in `candidates-mutation.service.ts:apply()`), and (b) another connector signs up via the link and claims with their own candidate → 50/50 split, sharer earns `sharerPayout`. The same precomputed pair is returned by `GET /recruitment/jobs/public/:jobId`. |

#### Consent
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | /recruitment/consent/:id/send | Yes | Send consent request email to candidate contact |
| GET | /recruitment/consent/verify/:token | No | Verify consent token before showing form. On successful verify (any of `pending`/`declined`/`accepted` states), fire-and-forget tracks a job view event (per-IP de-duped) into the unified `viewCount` aggregate, anchored to a lazy-created synthetic `recruitment_job_shares` row with `platform='consent'` and `sharerId=NULL` (one per job, `sharerCode='consent_${jobId}'`). Failed verifies (expired/invalid token) do NOT track. |
| POST | /recruitment/consent/decline | No | Decline consent with reason and optional notes |
| POST | /recruitment/consent/apply | Yes | Apply to matched job after consenting |

#### Connector Pipeline
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /recruitment/connector-pipeline | Yes | Get connector's candidates across all jobs (stages: consent_pending, consent_accepted, shortlisted, interview_invite_sent, interview_scheduled, interview_completed, consent_declined, rejected) |

#### My Applications
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /recruitment/my-applications | Yes | List candidate's own applications |

#### Share
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /recruitment/marketplace/share | Yes | Create referral share link for a job |
| GET | /recruitment/marketplace/my-job-shares | Yes | List user's shares with click metrics |
| GET | /recruitment/jobs/public/:jobId | No | View public job page (tracks views with IP, user agent, referer) |

#### Job Extraction
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /recruitment/job-extraction/extract | Yes | Extract job details from uploaded PDF (max 5MB, application/pdf only) via Gemini AI |
| POST | /recruitment/job-extraction/extract-url | Yes | Extract job details from public URL (max 2000 chars, SSRF-protected) via Gemini AI |
| POST | /recruitment/job-extraction/generate-with-ai | Yes | Generate job description sections (description, requirements, responsibilities, benefits) from job metadata |

### Key Services
- **RecruitmentJobsCreateService** (`jobs/services/recruitment-jobs-create.service.ts`) -- Creates a job + pricing record in a single transaction. Validates Stripe payment method (private `validatePaymentMethod` helper checks profile + `stripePrimaryPaymentMethodId`), then runs suggested-bounty calculation, optional bounty override validation, success-fee field gating, and shortlist-fee calculation; queues job-pool match compute. Backs `POST /recruitment/jobs`.
- **RecruitmentJobsUpdateService** (`jobs/services/recruitment-jobs-update.service.ts`) -- Patches mutable job fields; on title change, clears the cached embedding and re-queues match compute. Backs `PATCH /recruitment/jobs/:id`.
- **RecruitmentJobsCloseService** (`jobs/services/recruitment-jobs-close.service.ts`) -- Closes an active job (sets `status=closed`, `closedAt`, optional `closedReason`) with already-closed guard. Backs `PATCH /recruitment/jobs/:id/close`.
- **CandidatesMutationService** (`candidates/services/candidates-mutation.service.ts`) -- Job application submission, anonymous label generation, sharer-code attribution, resume upload linkage. Backs `POST /recruitment/candidates/apply`
- **CandidatesCheckApplicationService** (`candidates/services/candidates-check-application.service.ts`) -- Duplicate-application lookup for a `(userId, jobId)` pair. Backs `GET /recruitment/candidates/check`
- **CandidatesListService** (`candidates/services/candidates-list.service.ts`) -- Job-owner Kanban listing of candidates for a single job: filtering by stage, anonymization rules for non-revealed stages, list-shape mapping. Backs `GET /recruitment/candidates/job/:jobId`. Owns the inline `skillsFromResumeJson` and `currentCompanyFromResumeMetadata` helpers (only used by this method)
- **CandidatesDetailService** (`candidates/services/candidates-detail.service.ts`) -- Full candidate-detail composition: profile + pipeline stage tracker + transaction info + resume metadata + S3 URL hydration via `MediaService.getFullS3Url`, with anonymization for hidden-detail stages. Backs `GET /recruitment/candidates/:candidateId`
- **`candidates/services/candidates-query.helpers.ts`** -- Shared read-side constants and helpers extracted out of the legacy single service: `REVEALED_STAGES` (Set), `HIDDEN_DETAIL_STAGES` (array), `RECRUITER_PIPELINE` (array), `yearsExpFromDbColumn(...)`. Imported by both `CandidatesListService` and `CandidatesDetailService`
- **CandidateWorkflowService** -- Pipeline stage transitions: reject, shortlist (with Stripe auth), send interview invite
- **InterviewBookingService** -- Token-based public booking: calendar availability fetch, slot confirmation, payment capture, calendar event creation
- **InterviewCostService** -- Bounty tier lookup with salary period normalization (yearly/monthly/weekly/hourly), returns full fee breakdown (bounty, stripeFee, processingFee, totalAmount) using algebraic inversion formula
- **JobPoolMatchesService** -- AI match CRUD, approve/decline with consent transitions
- **JobPoolMatchesActiveQueryService** (`job-pool-matches/services/job-pool-matches-active-query.service.ts`) -- Connector inbox listing: merges active `recruitmentJobPoolMatches` (INBOX_STATUSES) with active `recruitmentUploadJobs` (queued / processing / failed) into a per-job grouped result, search across contact + job fields, cross-connector "claimed by other" flag via CLAIMED_STATUSES. **Deduplication:** upload_jobs are filtered by `poolMatchId IS NULL` so each upload surfaces as exactly one row in the inbox — once the upload processor inserts a pool_match it atomically sets `upload_jobs.poolMatchId`, suppressing the upload_job representation and letting the pool_match carry the full lifecycle (`processing` → `pending` → final). For pool_matches in `failed` status the response includes a `linkedUploadJob` payload (uploadJobId, fileName, retryCount, failureReason) so the InboxTab can render Retry/Dismiss controls on the failed pool_match card; non-failed matches return `linkedUploadJob: null`. Backs `GET /recruitment/job-pool-matches`
- **JobPoolMatchesClosedQueryService** (`job-pool-matches/services/job-pool-matches-closed-query.service.ts`) -- Closed-jobs listing: paginated distinct closed `recruitmentJobsSchema` rows with their matches, ordered by `closedAt` DESC, search across contact + job fields, no upload-job join. Backs `GET /recruitment/job-pool-matches/closed`
- **JobPoolMatchesComputeService** -- BullMQ processor: embedding generation, cosine similarity, LLM scoring, match creation
- **ConsentSendService** (`consent/services/consent-send.service.ts`) -- Send consent email: validates pending match ownership, cross-connector claim conflict check, decrypts candidate email, generates JWT consent token, transitions match to CONSENT_PENDING. Backs `PATCH /recruitment/consent/:id/send`
- **ConsentDeclineService** (`consent/services/consent-decline.service.ts`) -- Decline consent from the public page: verifies JWT token, transitions match to CONSENT_DECLINED with reason and optional notes. Backs `POST /recruitment/consent/decline`
- **ConsentApplyService** (`consent/services/consent-apply.service.ts`) -- Accept consent and create the candidate row in a transaction: source-aware branch (connector_uploaded reuses resume + score and skips queues; new uploads queue resume-extraction + candidate-evaluation), payout-split attribution, stage history. Backs `POST /recruitment/consent/apply`
- **ConsentVerifyService** (`consent/services/consent-verify.service.ts`) -- Public consent verification page data (job + connector name + source + LinkedIn flags); also returns top-level `jobId` on success (pending/declined/accepted) so the controller can fire view tracking. Backs `GET /recruitment/consent/verify/:token`
- **ConsentTokenService / ConsentEmailService** -- JWT signing/verification + consent email composition (shared by send + decline + apply)
- **RecruitmentShareService** -- Share link creation, event tracking, public job view
- **CandidateEvaluationService** -- AI skill match analysis: builds prompt from JD + resume text, calls Gemini, parses/validates JSON response with Zod, returns match percentage and skill breakdown
- **CandidateEvaluationQueueService** -- Enqueues evaluation jobs on candidate application (1s delay for resume extraction)
- **CandidateEvaluationQueueProcessor** -- BullMQ processor: fetches job/resume data, downloads resume from S3, runs AI analysis, persists results, transitions candidate stage based on score threshold
- **ResumeTextService** -- Builds formatted resume text string from parsed resume data (skills, experience, education, certifications) for evaluation prompt
- **CandidateEvaluationQueryRepository** -- DB reads for candidates, jobs, media files, and pipeline stages
- **CandidateEvaluationMutationRepository** -- DB writes for analysis results (matchScore, skills, status) and stage transitions with row-level locking
- **CandidatesContactService** -- Contact creation for candidates, PII encryption/masking, deduplication
- **JobExtractionService** -- Orchestrates PDF/URL job extraction and AI description generation via Google Gemini, with SSRF-safe URL fetching, JSON repair, and input sanitization
- **JobExtractionGeminiService** -- Google Gemini API client with retry logic (3 attempts, exponential backoff), shared by job extraction and resume extraction
- **JobExtractionParserService** -- Parses and normalizes Gemini responses: experience level/work type synonym mapping, skill extraction
- **JobPageService** -- Fetches public job page URLs with SSRF protection (IP pinning, DNS rebinding prevention, private IP blocking, redirect validation)
- **ResumeExtractionQueueService** -- Enqueues background resume parsing jobs on candidate application submission
- **ResumeExtractionAiService** -- Gemini-powered multimodal resume parsing: extracts job title, skills, years of experience, education, certifications, job history, languages, projects
- **ResumeExtractionMutationService** -- Saves parsed resume data to contact_resumes table and merges extracted skills into the contact's skill set

### Database Tables
| Table | Purpose |
|-------|---------|
| recruitment_jobs | Job postings with title, description, salary, bounty, skills, requirements, status, and 768-dim embedding vector |
| recruitment_job_candidates | Candidate applications linked to jobs, with anonymous labels, stage tracking, connector attribution, resume, and AI evaluation fields (matchScore, matchedSkills, missingSkills, analysisAt, analysisStatus, analysisNote) |
| recruitment_candidate_workflow | 1:1 with candidates — tracks rejection details, shortlist flag, interview scheduling, booking tokens |
| recruitment_stages | Reference table for pipeline stages (processing → in_review → shortlisted → interview_invite_sent → interview_scheduled → interview_completed → rejected / jd_mismatched) |
| recruitment_candidate_stage_history | Audit trail of all candidate stage transitions with timestamps and notes |
| recruitment_interview_meetings | Interview records with meeting date, duration, platform (Google Meet/Teams), calendar event ID, and status |
| recruitment_interview_meeting_history | Event log for meeting state changes (slot_booked, invite_sent, rescheduled) |
| recruitment_interview_transactions | Payment records: bounty, Stripe fees, processing fees, total, PaymentIntent ID, status (pending → authorized → captured → cancelled) |
| recruitment_job_pool_matches | AI-computed candidate-to-job matches with cosine similarity, LLM score, matched signals, consent status |
| recruitment_bounty_tiers | Reference table mapping salary ranges to bounty amounts ($25–$200+) |
| recruitment_job_shares | Job share records with unique sharerCode per user per job |
| recruitment_job_share_events | Share link click tracking with IP, user agent, referer. Also receives consent-page view events (anchored to a synthetic per-job `platform='consent'` share with `sharerId=NULL`) so the unified per-job `viewCount` aggregates visits to both `/jobs/{id}?ref=...` and `/consent/{token}`. |
| contact_resumes | Parsed resume data: job title, skills (jsonb), years of experience, AI summary, structured metadata (education, certifications, job history, languages, projects, domain expertise, tools/technologies) |

### Background Jobs (BullMQ)
**Queue:** `job-pool-match-compute` (3 retries, exponential backoff, 30s initial delay)

| Job Name | Trigger | Purpose |
|----------|---------|---------|
| compute-for-job | Job creation | Generate job embedding, match against all user contacts |
| compute-for-contacts | Contact import | Match user's contacts against all open jobs |
| generate-contact-embeddings | On demand | Generate 768-dim OpenAI embeddings for specific contacts |
| backfill-contact-embeddings | API key endpoint | Backfill embeddings for all contacts missing them |

**Queue:** `candidate-evaluation-queue` (3 retries, exponential backoff, 2s initial delay)

| Job Name | Trigger | Purpose |
|----------|---------|---------|
| analyze | Candidate application (1s delay) | Download resume from S3, build formatted text, evaluate against JD via Gemini, persist matchScore/skills, transition stage to in_review (≥50%) or jd_mismatched (<50%) |

**Queue:** `resume-extraction` (3 retries, exponential backoff, 15s initial delay)

| Job Name | Trigger | Purpose |
|----------|---------|---------|
| extract-resume | Candidate application (apply or consent-apply) | Download PDF from S3, validate (10MB max, PDF header check), extract structured data via Gemini, save to contact_resumes, merge skills into contacts |

**Matching Algorithm:**
1. Compute cosine similarity between job and contact embeddings (768-dim OpenAI vectors)
2. Filter by minimum cosine similarity threshold (0.3)
3. Take top 50 candidates per job
4. Send top 15 to LLM for detailed scoring
5. LLM score > 30 creates a match record
6. Final match score = weighted combination of cosine + LLM scores

## Client

### Pages
- **MyJobPostings** -- `client/src/pages/recruitment/MyJobPostings.tsx` -- Recruiter's job list with active/closed tabs, infinite scroll, search, and close/edit actions
- **PostJobWizard** -- `client/src/pages/recruitment/PostJobWizard.tsx` -- 8-step wizard (Method → Details → Skills → Description → Budget → Payment → Preview → Confirm) with localStorage draft persistence and edit mode. Budget step and Preview step show full itemized fee breakdown (Interview Cost, Stripe Fee, Application Fee, Total) matching ShortlistConfirmDialog
- **JobDetailWithKanban** -- `client/src/pages/recruitment/JobDetailWithKanban.tsx` -- Kanban pipeline board for managing candidates with shortlist, reject, and invite actions
- **JobMarketplace** -- `client/src/pages/recruitment/JobMarketplace.tsx` -- Connector job browsing with infinite scroll, search, share, and detail modal
- **PublicJobPage** -- `client/src/pages/recruitment/PublicJobPage.tsx` -- Public shareable job page with apply flow and referrer tracking
- **CandidateConsentPublic** -- `client/src/pages/recruitment/CandidateConsentPublic.tsx` -- Public consent verification/decline page (token-based)
- **InterviewBookingPublic** -- `client/src/pages/recruitment/InterviewBookingPublic.tsx` -- Public calendar booking page with timezone selection
- **CandidateApplicationsPage** -- `client/src/pages/recruitment/CandidateApplicationsPage.tsx` -- Candidate's application list with status timeline and interview booking
- **ConnectorRecruitmentPipeline** -- `client/src/pages/recruitment/ConnectorRecruitmentPipeline.tsx` -- Connector's pipeline with Inbox/Pipeline/Closed tabs, match approve/decline, consent sending, and interview_invite_sent / interview_scheduled / interview_completed stages with date display

### Hooks
- `useRecruitmentJobs(params)` -- Infinite query for recruiter's job listings with pagination
- `useRecruitmentJob(jobId)` -- Single job detail fetch
- `useRecruitmentJobStats()` -- Job count stats (total, active, closed)
- `useUpdateRecruitmentJob()` -- Mutation to update job
- `useCloseRecruitmentJob()` -- Mutation to close job with reason
- `useApplyToJob()` -- Mutation for job application (invalidates check, candidates, applications)
- `useMyApplications()` -- Candidate's applications list (30s stale, refetch on focus)
- `useJobCandidates(jobId, params)` -- Candidates for a job (30s stale, refetch on focus)
- `useCandidateDetail(candidateId)` -- Full candidate details with transaction info
- `useShortlistCandidate()` -- Shortlist mutation (triggers payment authorization)
- `useShortlistBreakdown(candidateId)` -- Fee breakdown for shortlisting
- `useRejectCandidate()` -- Reject mutation with category and notes
- `useJobPoolMatches(params)` -- Pending AI matches for connector's jobs
- `useClosedJobPoolMatches(params)` -- Archived matches
- `useApproveJobPoolMatch()` -- Approve match mutation
- `useDeclineJobPoolMatch()` -- Decline match mutation
- `useSendConsent(matchId)` -- Send consent email mutation
- `useVerifyConsent(token)` -- Verify consent token (retry: false, 30s stale)
- `useDeclineConsent()` -- Decline consent mutation
- `useConsentApply()` -- Apply via consent mutation
- `useMarketplaceJobs(params)` -- Infinite query for marketplace browsing
- `useMyJobShares(params)` -- Job shares with click metrics
- `usePublicJob(jobId, ref?)` -- Public job view (60s stale, retry: 1)
- `useInterviewCost(params)` -- Calculate bounty and fee breakdown (bountyAmount, suggestedBountyAmount, stripeFee, processingFee, totalAmount) from salary (5min stale, conditional). Accepts optional `bountyOverride` with internal 400ms debounce; returns `recalculating` flag while a new override is pending
- `useConnectorPipeline(search?)` -- Connector's candidate pipeline
- `useIndustries(search?)` -- Industries master data (10min stale)
- `useDepartments(search?)` -- Departments master data
- `useRecruitmentStages()` -- Pipeline stages (30min stale)
- `useJobExtraction()` -- Manages job extraction state (PDF upload or URL extraction), calls API, maps extracted data to form fields via `buildExtractedFormUpdates()`

### API Module
- `client/src/lib/api/recruitment.ts` -- All recruitment API calls: jobs CRUD, candidate management, interview booking, AI matching, consent flow, marketplace, sharing

### Key Components
- **KanbanCandidateCard** -- Candidate card in pipeline Kanban with stage-specific actions
- **ShortlistConfirmDialog** -- Payment breakdown confirmation before authorizing bounty
- **RejectDialog** -- Rejection with category selection and notes
- **ApplyJobModal** -- Candidate application form with LinkedIn URL and S3 resume upload
- **ConsentApplyModal** -- Application form via consent token flow
- **SendInterviewInviteRecruiterDialog** -- Interview invite email compose with notes
- **SendCandidateConsentDialog** -- Consent request email compose
- **CandidatePipelineTracker** -- Visual step-by-step pipeline progress bar
- **PaymentAuthorizationCard** -- Transaction details with fee breakdown and receipt link
- **InterviewBookingCalendarPicker** -- Calendar slot selection with timezone
- **InterviewBookingConfirmation** -- Post-booking meeting details display
- **FileExtractionCard** -- PDF upload card with drag-drop support, file validation (5MB, PDF only), and extraction status
- **UrlExtractionCard** -- URL input card with real-time validation, character count, and extract button
- **MethodStep** -- Job creation method selection step (manual, PDF upload, URL extraction, AI generation) in PostJobWizard
- **ResumeUploadField** -- Resume file input for job applications with PDF validation and S3 upload
- **ConnectorKanbanCard** -- Connector pipeline candidate card with name, job info, match score, bounty, invite sent date, and stage-specific actions (resend consent for consent_pending)
- **ConnectorProfileRow** (`client/src/pages/recruitment/job-kanban/ConnectorProfileRow.tsx`) -- Shared rich connector profile row used in the Move-to-Hired, Release Payout, and Edit Classification dialogs. Renders `ProfileAvatar` + name + role pill + (optional) jobTitle · company line + (optional) LinkedIn link, with a `rightSlot` for status pills and `children` for inline classification forms. Missing profile fields hide silently. Backed by `users.profilePhotoUrl/jobTitle/company/linkedinUrl` returned from both `GET /recruitment/payout/:candidateId/state` (`PayoutStateConnector`) and `GET /recruitment/candidates/:candidateId` (`CandidateConnectorRecord`).

## External Integrations
- **Stripe Payment Intents** -- Single create-and-capture charge at Move to Hired; shortlist and booking are free
- **Google Calendar** -- Fetch recruiter availability, create Google Meet events for interviews
- **Microsoft Graph Calendar** -- Fetch availability, create Teams meeting events
- **OpenAI Embeddings** -- 768-dim vectors for job and contact embeddings used in AI matching
- **OpenAI LLM** -- Detailed candidate-job scoring for top cosine-similarity matches
- **Resend** -- Interview invite emails and consent request emails
- **AWS S3** -- Resume uploads via presigned URLs (PDF/DOC/DOCX, max 10MB)
- **Google Gemini API** -- Multimodal AI for job extraction from PDFs/URLs, AI job description generation, and resume parsing (shared service with retry logic)

## Business Logic

### Candidate Pipeline State Machine
```
processing (default on apply)
  → in_review (AI evaluation score ≥ 50% match)
  → jd_mismatched (AI evaluation score < 50%, terminal)
in_review
  → shortlisted (free — no charge)
    → interview_invite_sent (booking link emailed, 30-day token)
      → interview_scheduled (candidate confirms slot, calendar event created — no charge)
        → interview_completed
  → rejected (terminal, from any stage — requires category + notes)
```

### Two-Step Payment Flow
1. Recruiter shortlists candidate → system calculates bounty + fees using algebraic inversion formula
2. Stripe PaymentIntent created with `requires_capture` (authorization only, card not charged)
3. Transaction recorded as `authorized`
4. Candidate confirms interview slot via public booking page
5. System captures the PaymentIntent (card charged)
6. Transaction updated to `captured` with receipt URL

### Fee Calculation (Algebraic Inversion)
```
total = (bounty + processingFee + fixedStripeFee) / (1 - stripePercent)

Where: stripePercent = 2.9%, fixedStripeFee = $0.30, processingFee = $0.25
Recruiter pays all fees — platform absorbs zero Stripe cost.
```

### Bounty Tier System
Salary ranges (normalized to yearly) map to fixed bounty amounts:
- $0–$10K → $25 | $10K–$20K → $50 | $20K–$50K → $100 | $50K–$100K → $200
- Salary period normalization: yearly ×1, monthly ×12, weekly ×52, hourly ×2080

### AI Candidate Evaluation (JD vs Resume)
- **Trigger:** Queued automatically when a candidate applies (direct apply or consent-apply), with a 1-second delay to allow resume extraction to complete first
- **Processing flow:** Download resume PDF from S3 → extract structured resume data → build formatted resume text (skills, experience, education, certifications) → construct prompt with job description, requirements, responsibilities, and required skills → send to Google Gemini → parse and validate JSON response with Zod schema
- **AI response fields:** matchPercentage (0–100), matchedSkills[], missingSkills[], matchedExperience[], missingExperience[], justification (text), recommendations[]
- **Stage determination:** matchPercentage ≥ 50% → candidate moves to `in_review` (visible to recruiter); < 50% → candidate moves to `jd_mismatched` (filtered out)
- **Data persistence:** Updates `recruitment_job_candidates` with matchScore, matchedSkills, missingSkills, analysisStatus, analysisNote, analysisAt; inserts stage history with eligibility note
- **Idempotent:** Skips candidates with analysisStatus already `completed`
- **Error handling:** 3 retries with exponential backoff (2s initial); on final failure, marks analysisStatus as `failed` — candidate stays in current stage, requires manual intervention
- **Concurrency safety:** Uses row-level locking (`FOR UPDATE`) in DB transactions to prevent race conditions

### AI Job Pool Matching
- Jobs and contacts get 768-dim OpenAI embeddings
- Cosine similarity computed between job embedding and all contact embeddings
- Min threshold: 0.3 cosine similarity, top 50 candidates per job
- Top 15 sent to LLM for detailed scoring (min LLM score: 30)
- Matches appear in connector's Inbox for approve/decline

### Consent Workflow
- Connector approves AI match → consent email sent to contact with unique token
- Contact verifies token → can accept (apply to job) or decline (with reason)
- Status: `pending → approved → consent_pending → consent_accepted/consent_declined`
- **Cross-connector consent lock:** Only one connector can send consent to a given contact per job. Once any connector's match reaches `approved`, `consent_pending`, `consent_accepted`, or `consent_declined` status, all other connectors are blocked from sending consent for that same contact+job combination — permanently, even if the candidate declines. The `sendConsent` API returns HTTP 409 with an anonymous message. The inbox listing API returns an `isClaimedByOther` flag per candidate; the UI replaces Approve/Decline buttons with an amber info banner ("This candidate has already been contacted for this role by another connector"). A partial unique DB index on `(job_id, contact_id)` for claimed statuses prevents race conditions at the database level.

### Connector Pipeline Stages
The connector's pipeline view shows a different stage mapping than the recruiter's Kanban:
- **Recruiter stages**: in_review → shortlisted → interview_invite_sent → interview_scheduled → interview_completed → rejected
- **Connector active stages**: consent_pending → consent_accepted → shortlisted → interview_invite_sent → interview_scheduled → interview_completed
- **Connector archived stages**: consent_declined, rejected
- **Stage mapping**: recruiter `in_review` → connector `consent_accepted`; all other stages (including `interview_completed`) map 1:1
- **Data sources**: Merges job_pool_matches (consent_pending/consent_declined) with job_candidates (in_review, shortlisted, interview_invite_sent, interview_scheduled, interview_completed, rejected)
- **Invite date tracking**: For candidates in `interview_invite_sent`, the most recent invite date is extracted from stage_history and displayed on the card
- **Interview date tracking**: For candidates in `interview_scheduled`, the actual meeting date is fetched from `recruitment_candidate_workflow.interviewScheduledAt` (not stage_history, which only records the transition timestamp)
- **Interview completion tracking**: For candidates in `interview_completed`, the most recent transition timestamp is extracted from stage_history (mirrors the `inviteSentAt` pattern; no dedicated workflow column) and displayed on the card
- **Candidate names**: Uses `users.firstName/lastName` (candidate's registered account name) with fallback to `contacts.firstName/lastName` (connector's contact record)
- **Card display**: Read-only cards showing name, job info, match score, bounty, and invite sent / interview scheduled / interview completed date (no action buttons for interview_invite_sent, interview_scheduled, or interview_completed)
- **Filtering**: Stage filter persisted in user profile config; includes all active + archived stages

### Candidate Anonymity
- Candidates assigned anonymous labels (e.g., "Candidate #RC-ABC123")
- Identity revealed only at `interview_scheduled`, `interview_completed`, or `hired` stages (server-side allow-list `REVEALED_STAGES` in `candidates-query.helpers.ts`)

### Interview Booking
- Public endpoint (no JWT, no CSRF) — rate limited: GET 20/min, POST 10/min
- 32-byte hex token with 30-day expiry
- Fetches recruiter's calendar availability (Google or Microsoft) for 14-day window
- On confirmation: captures payment → creates calendar event (Google Meet or Teams) → updates stage
- **Recruiter error notifications:** When a candidate hits any booking error (except "already booked") on GET availability or POST confirm, `RecruitmentNotificationsDispatchService.dispatchInterviewBookingError` enqueues one email via `RecruitmentNotificationsModule` (BullMQ job `send-interview-booking-error`, template `recruitment_interview_booking_error`): **To** = job owner, **CC** = active collaborators.

### Lifecycle Email Notifications (Phase 1)
Best-effort transactional emails via the existing `recruitment-notification` BullMQ queue (`send-lifecycle` job). No `recruitment_notifications` DB rows — idempotency uses deterministic BullMQ `jobId`s.

| Event | Trigger | Recipients | Template slug |
|-------|---------|------------|---------------|
| New candidate in pipeline | Stage becomes `in_review` (evaluation completion or consent-apply with pre-scored connector upload) | Job owner (To) + active collaborators (CC), one email | `recruitment_recruiter_new_candidate` |
| Shortlist | `shortlistCandidate` succeeds | Candidate + each connector | `recruitment_candidate_shortlisted`, `recruitment_connector_shortlisted` |
| Hire | `hireCandidate` succeeds | Candidate + each connector | `recruitment_candidate_hired`, `recruitment_connector_hired` |
| Payout setup | Payout worker sets `processing_status = onboarding_pending` | Payout row recipient | `recruitment_candidate_payout_setup`, `recruitment_connector_payout_setup` |

**Dispatch:** `RecruitmentLifecycleNotificationDispatchService` (`dispatchRecruiterNewCandidate`, `dispatchShortlist`, `dispatchHire`, `dispatchPayoutSetup`). Failures are logged and never block the underlying workflow.

**Deferred (not in Phase 1):** in-app notification center, user email preferences, reminder emails.

### Job Extraction from PDF/URL
- **PDF flow:** Upload PDF (max 5MB) → send to Gemini with extraction prompt → parse JSON response → return structured job data (title, skills, description, etc.)
- **URL flow:** Validate URL (SSRF protection: block private IPs, localhost, reserved ranges) → resolve DNS → pin IP → fetch HTML (max 500KB, 25s timeout, max 10 redirects) → convert to plain text (max 15K chars) → send to Gemini → parse response
- **AI generation flow:** Sanitize inputs (strip newlines, escape backticks/template literals) → build prompt with job metadata → send to Gemini → return description/requirements/responsibilities/benefits
- **Extracted data:** title, companyName, industry, department, experienceLevel, workType, location, description, requirements, responsibilities, benefits, requiredSkills, preferredSkills (salary is not extracted; users enter it manually on the Budget step)
- **Security:** SSRF protection via IP pinning and DNS rebinding prevention, prompt injection mitigation via `<DOCUMENT_TEXT>` wrapping, JSON repair for truncated Gemini responses

### Contact Deduplication Across Recruitment Flows
Both connector resume upload and candidate self-apply funnel into the shared contact-matching engine (`server/src/services/contactMatchingService.ts`). To stay deduped:
- Every contact-creation path **must** populate `normalizedEmail`, `normalizedPhone`, and (when applicable) `normalizedSecondaryEmail` on `contact_sensitive_data`, in addition to the hash columns. Use `encryptNormalizedEmail` / `encryptNormalizedPhone` from `server/src/services/contactImportService.ts`. The canonical example is `contactImportService.ts:596-609`.
- Matching is two-stage: hash columns find candidates fast, then `checkPrimaryMatch` confirms with the decrypted normalized plaintext. Skipping the encrypted-normalized columns silently breaks the second stage (the hash match still happens, but confirmation falls through to weighted scoring and creates duplicates).

### Resume Extraction Pipeline
- **Trigger:** Queued automatically when a candidate applies to a job (direct apply or consent-apply)
- **Processing:** Download PDF from S3 → validate (10MB max, PDF header `%PDF-` check, MIME type) → send to Gemini multimodal → parse structured JSON
- **Extracted data:** jobTitle, skills[], totalYearsExp, aiSummary, metadata (education, certifications, jobHistory, languages, domainExpertise, toolsTechnologies, projects)
- **Data persistence:** Upsert to `contact_resumes` table, merge extracted skills into `contacts.skills` (case-insensitive deduplication)
- **Error handling:** Unrecoverable errors (bad file type/size/header) skip retries; extraction failures retry 3x with 15s exponential backoff

### Key Validations
- Job creation requires active payment method
- No self-applications (requester cannot apply to own job)
- Unique application constraint per candidate per job
- LinkedIn URL required for all applications
- Shortlist blocked if candidate already has active authorized transaction
- Interview invite requires active calendar integration
- Booking token validated for expiry and candidate match

## Routes
```
/dashboard/recruitment/post-new-job          → PostJobWizard
/dashboard/recruitment/my-job-postings       → MyJobPostings
/dashboard/recruitment/my-job-postings/:id   → JobDetailWithKanban
/dashboard/recruitment/my-job-postings/:id/edit → PostJobWizard (edit mode)
/dashboard/recruitment/job-marketplace       → JobMarketplace
/dashboard/recruitment/my-pipeline           → ConnectorRecruitmentPipeline
/dashboard/my-applications                   → CandidateApplicationsPage
/jobs/:shareCode                             → PublicJobPage
/consent/:token                              → CandidateConsentPublic
/interview-booking/:candidateId/:token       → InterviewBookingPublic
```