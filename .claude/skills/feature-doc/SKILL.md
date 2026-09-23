---
name: feature-doc
description: Feature documentation management. Creates or updates feature docs in .planning/features/ with API endpoints, database tables, UI components, and revision history.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit, Task, AskUserQuestion
---

# Feature Documentation

Create or update feature documentation in `.planning/features/` by scanning the codebase for API endpoints, database tables, UI components, and business logic.

## Steps

1. **Read $ARGUMENTS** as the feature name (e.g., `auth`, `contacts`, `marketplace`, `credits`, `emails`, `trust-score`).

2. **Check if `.planning/features/$ARGUMENTS.md` exists:**
   - If yes: read the existing doc and prepare to update it with any new changes found in the codebase.
   - If no: create it. Check if `.planning/features/_TEMPLATE.md` exists and use it as a starting point. If no template exists, use the structure defined in step 4.

3. **Scan the codebase to populate or update the doc:**
   - Read the server module at `server/src/modules/$ARGUMENTS/` -- examine all files: `.module.ts`, `.controller.ts`, `.service.ts`, `.dto.ts`, `.constants.ts`, `.response.ts`
   - Read client pages related to this feature by searching `client/src/pages/` for relevant components
   - Read client hooks in `client/src/hooks/` that are related to this feature
   - Read database schema files in `server/src/database/schema/` for relevant tables
   - Read the API service module in `client/src/lib/api/` for this feature's API calls
   - Check for BullMQ processors in `server/src/worker/` related to this feature

4. **Document the following sections:**

   ### Overview
   What the feature does, who uses it, and why it exists.

   ### Version
   Current version number, status (`Active` / `In Progress` / `Deprecated` / `Planned`), and last updated date.

   ### API Endpoints
   | Method | Path | Auth | Description |
   |--------|------|------|-------------|
   | GET | /api/contacts | Yes | List all contacts |

   Include request body shape for POST/PUT/PATCH endpoints and notable query parameters for GET endpoints.

   ### Database Tables
   | Table | Key Columns | Relationships |
   |-------|-------------|---------------|
   | contacts | id, email, firstName, lastName | belongsTo: users, hasMany: contact_tags |

   ### UI Components
   List key pages, components, and hooks with their file paths.

   ### External Integrations
   Third-party services used by this feature (Stripe, Resend, Clay, S3, etc.) and what they are used for.

   ### Business Logic
   Key flows, rules, and algorithms. Document non-obvious behavior, edge cases, and important constraints.

   ### Configuration
   Environment variables, feature flags, and settings that affect this feature.

5. **If updating an existing doc**, add an entry to the **Revision History** section at the bottom:

   | Version | Date | Changes | Author |
   |---------|------|---------|--------|
   | 1.1 | 2026-02-06 | Added new endpoint documentation | Claude |

6. **Output:** Confirm what was created or updated. List any sections that need manual review because the information could not be determined from code alone (e.g., business context, future plans, external service credentials).
