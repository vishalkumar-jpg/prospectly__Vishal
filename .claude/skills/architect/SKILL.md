---
name: architect
description: Architecture review and ADR creation. Use before major changes to assess impact on database, API, and frontend layers.
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Write
  - Edit
  - Task
  - AskUserQuestion
---

# Architecture Review & ADR Creation

## Steps

1. Read `$ARGUMENTS` to understand what is being reviewed (module name, file path, or feature description).

2. Explore affected modules in `server/src/modules/` and `client/src/` using Glob and Read to understand the current structure and dependencies.

3. Read existing ADRs in `.planning/architecture/` for context on prior architectural decisions.

4. Read `.planning/knowledge-base/TECHNICAL.md` for current stack decisions and technical constraints.

5. Assess impact across all layers:
   - **Database**: Which tables change? Are new tables needed? Do indexes need updating?
   - **API**: Which endpoints are affected? Are new endpoints needed? Do DTOs change?
   - **Client**: Which components need updates? Are new pages/routes needed? Does state management change?

6. If this warrants a new ADR, create one in `.planning/architecture/ADR-NNN-<title>.md` following this template:
   ```
   # ADR-NNN: Title

   ## Status: Proposed

   ## Date: YYYY-MM-DD

   ## Context
   Why is this decision needed?

   ## Decision
   What was decided?

   ## Consequences
   What are the trade-offs?

   ## Alternatives Considered
   What else was evaluated?
   ```

7. Output a structured summary with the following sections:
   - **Impact Level**: low / medium / high
   - **Affected Layers**: database, API, client (which ones)
   - **Database Changes**: tables, columns, indexes, migrations
   - **API Changes**: new/modified endpoints, DTOs, guards
   - **Client Changes**: components, hooks, routes, state
   - **Risks**: potential issues, breaking changes, rollback concerns
