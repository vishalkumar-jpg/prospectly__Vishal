---
name: qa
description: QA test plan generation. Creates test matrices, edge cases, regression checklists, and integration test plans per feature.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Task, AskUserQuestion
---

# QA Test Plan Generation

Generate comprehensive test plans for features or changes, covering happy paths, error paths, edge cases, regression risks, and integration points.

## Steps

1. **Read $ARGUMENTS** to identify the feature or change to test. This can be a feature name (e.g., `auth`, `contacts`), a PR number, or a description of a change.

2. **Read the feature doc** in `.planning/features/` for context. If no feature doc exists, gather context from the codebase directly.

3. **Read relevant source files:**
   - Controller files for API endpoints and request validation
   - Service files for business logic and database operations
   - DTO files for input validation rules and constraints
   - Client components and pages for UI flows
   - Client hooks for data fetching and mutation patterns
   - Database schema for data model and constraints

4. **Generate test plan** with these sections:

   ### Happy Path Tests
   - List each expected user flow with numbered steps and expected outcome
   - Cover the primary use case and common variations
   - Include both UI interactions and API-level expectations

   ### Error Path Tests
   - **Invalid input**: empty fields, wrong types, values exceeding max length, malformed data
   - **Unauthorized access**: missing auth cookie, expired JWT, wrong user role, accessing another user's data
   - **Network errors**: API timeout, 500 response, connection reset, slow responses
   - **Race conditions**: double-click on submit buttons, concurrent requests modifying same resource, stale data submissions

   ### Edge Cases
   - **Boundary values**: 0, negative numbers, max integer, max limit values, empty arrays, single-item arrays
   - **Special characters in input**: unicode, HTML entities, SQL injection attempts, XSS payloads, extra whitespace
   - **Large payloads**: maximum allowed file sizes, bulk operations at limit, very long strings
   - **Concurrent users**: two users modifying the same record, simultaneous creation of conflicting resources

   ### Regression Risks
   - List existing features that could be affected by this change
   - Specify which existing flows to re-test with exact steps
   - Identify shared utilities, hooks, or components that are modified

   ### Integration Points
   - **External services**: Stripe (payments), Resend (emails), Clay (enrichment), S3 (file storage) -- list which are relevant
   - **Background jobs**: Which BullMQ queues are involved? What happens if a job fails?
   - **Cross-module dependencies**: Which other modules call into or are called by this feature?

5. **Format as a checklist** using markdown checkboxes (`- [ ]`) that can be used for manual testing or converted to automated tests. Group by section and include priority tags: `[P0]` critical, `[P1]` high, `[P2]` medium, `[P3]` low.
