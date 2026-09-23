# Quality Principles

These rules apply to ALL work in this repository.

## Priority: Quality > Stability > Speed

- Write correct, secure, well-tested code over fast-to-ship code
- Prefer stable, proven patterns over cutting-edge unproven approaches
- Speed is the last priority — never sacrifice quality or stability for delivery speed

## Never Assume

- If requirements are vague or ambiguous, STOP and ask clarifying questions
- Do not interpret unclear instructions — ask the user what they mean
- Do not expand scope beyond what was explicitly requested
- If you need to make a judgment call, present options and let the user decide

## Scope Control

- Before starting work, confirm the scope with the user
- If scope grows beyond the original ask, flag it immediately
- Use `/change-request` to document scope changes before implementing them
- A "small tweak" that touches 5+ files is no longer small — re-scope it

## Knowledge Base Maintenance

- After completing a feature or significant change, update `.planning/features/<feature>.md`
- After making a technical decision, update `.planning/knowledge-base/TECHNICAL.md`
- After changing business logic, update `.planning/knowledge-base/FUNCTIONAL.md`
- After security or performance changes, update `.planning/knowledge-base/NON-FUNCTIONAL.md`
- After architectural changes, create or update an ADR in `.planning/architecture/`

## Engineering Standards

- Cover the basics first (validation, error handling, auth guards) before adding advanced features
- Match complexity to actual requirements — do not over-engineer
- Prefer elegant, simple solutions over brute-force traditional approaches
- Reuse existing utilities, hooks, and patterns before creating new ones
- Every new module/component should follow established project patterns
