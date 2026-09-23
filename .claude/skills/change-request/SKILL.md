---
name: change-request
description: Change request and scope control. Documents scope changes, performs impact analysis, tracks affected files and features, and requires explicit approval before expanding scope.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Task, AskUserQuestion
---

# Change Request and Scope Control

Document scope changes, perform impact analysis, track affected files and features, and require explicit approval before expanding scope beyond the original request.

## Steps

1. **Read $ARGUMENTS** for the change description. This should include what is being changed or proposed.

2. **Document the change request:**

   ### Original Scope
   What was originally requested? Reference the initial task, feature request, or ticket. If this is a mid-implementation scope expansion, describe what work was already planned and in progress.

   ### Proposed Change
   What is being added, modified, or removed beyond the original scope? Be specific about the delta -- what is new versus what was already planned.

   ### Reason
   Why is this change needed? Was it discovered during implementation? Is it a new requirement from stakeholders? Is it a dependency that was not initially identified?

3. **Impact analysis:**
   - **Affected modules/files**: List specific files that need to be created, modified, or deleted. Use Grep and Glob to identify all references to the affected code.
   - **Affected features**: Cross-reference with feature docs in `.planning/features/` to identify which documented features are impacted.
   - **Database schema changes**: Are there new tables, columns, indexes, or constraints? Does this require a migration?
   - **API contract changes**: Are there breaking changes to existing endpoints (changed request/response shape, removed fields, changed behavior)? Are there new endpoints?
   - **UI changes**: Are there user-visible changes? New pages, modified layouts, changed workflows?
   - **Background jobs**: Are BullMQ queue processors affected? New queues needed?
   - **Dependencies**: Are new npm packages required? Are existing package versions affected?

4. **Risk assessment:**
   - **What could break?** List specific features, integrations, or workflows that could be negatively affected.
   - **Is this reversible?** Can the change be rolled back without data loss or downtime?
   - **Does it require a migration?** Database migrations are harder to roll back -- flag this explicitly.
   - **Does it affect other team members?** Will this change conflict with other in-progress branches or features?
   - **Estimated effort**: Small (< 1 hour), Medium (1-4 hours), Large (4+ hours)

5. **Present the analysis to the user** and ask for explicit approval:
   - Summarize the change in one sentence
   - Show the impact summary (number of files, modules, and features affected)
   - Highlight any blockers or high-risk items
   - Ask: "This change expands scope from [original] to [proposed]. The impact is: [summary]. Do you want to proceed? (yes/no)"

6. **If approved:**
   - Update the relevant feature doc in `.planning/features/` with the scope change
   - Add a note to the revision history documenting the scope expansion
   - Proceed with implementation

7. **If rejected:**
   - Document why it was rejected
   - Suggest alternatives that stay within the original scope
   - Note the rejected change for future consideration
