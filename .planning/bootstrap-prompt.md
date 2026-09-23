# Universal Project Bootstrap Prompt

**Copy and paste this prompt into a new Claude Code session on any project to generate a full SDLC agent setup.**

---

## The Prompt

```
I need you to bootstrap this project with a complete Claude Code configuration. Do the following:

### Step 1: Detect the Tech Stack

Explore the codebase and detect:
- Language, framework, package manager, Node/Python/Go/Ruby/Java version
- Database, ORM, migration tool
- Auth mechanism (JWT, OAuth, sessions, Clerk, Auth0, etc.)
- Testing framework, linter, formatter
- CI/CD, Docker, deployment setup
- Frontend framework, state management, UI library, CSS approach
- External integrations (payment, email, storage, monitoring)
- Background jobs, caching, message queues
- Monorepo structure (if any)
- Git commit conventions (read last 20 commits)
- Naming conventions (sample 10 files)
- Pre-commit hooks

Present your findings and ask me to confirm before proceeding.

### Step 2: Ask Me

1. What is this project? (1-2 sentence description)
2. What's the team's priority? (Quality > Stability > Speed, or other)
3. Any conventions or rules not visible in the code?
4. Should I install plugins? (trailofbits/skills for security, anthropics/skills for docs)

### Step 3: Generate CLAUDE.md

Create CLAUDE.md at project root with:
- Build & Development Commands (auto-detected)
- Commit Convention (from git log)
- Architecture (project layout, backend, frontend, database, auth, background jobs)
- Critical Conventions (naming, date handling, response format, error logging)
- Development Principles (priority, no assumptions, scope control, knowledge base maintenance)
- Available Skills list

Keep under 200 lines. Move detailed rules to .claude/rules/.

### Step 4: Generate .claude/settings.json

Safe shared permissions (read-only git, package manager, lint, test).

### Step 5: Generate .claude/rules/

- quality-principles.md — always (stack-agnostic quality rules)
- backend-patterns.md — if backend exists (path-scoped, framework-specific)
- frontend-patterns.md — if frontend exists (path-scoped, framework-specific)

### Step 6: Generate .claude/skills/

Create these skills adapted to the detected stack:

**Orchestrators (always create):**
- /feature — full feature lifecycle (requirements → architecture → implement → review → QA → docs → commit)
- /hotfix — production bug fix lifecycle
- /refactor — refactoring lifecycle

**Specialists (always create):**
- /commit — conventional commit with detected linter/hooks
- /code-review — coding standards using detected conventions
- /security-audit — security scan adapted to detected auth/ORM/framework
- /feature-doc — create/update feature docs in .planning/features/
- /change-request — scope control and change management
- /pre-deploy — production readiness checklist
- /qa — test plan generation using detected test framework
- /architect — architecture review & ADR creation

**Conditional (create if relevant):**
- /api-review — if backend with REST/GraphQL/gRPC
- /db-review — if database/ORM detected
- /frontend-review — if frontend detected
- /ux-review — if frontend detected
- /perf-audit — if non-trivial project

IMPORTANT: Each skill MUST reference actual project paths and conventions, not generic placeholders.

### Step 7: Seed .planning/ Knowledge Base

Create:
```
.planning/
  features/
    _TEMPLATE.md
    [one .md per detected module/feature — seeded with endpoints, tables, components]
  architecture/
    _TEMPLATE.md
    ADR-001-tech-stack.md (document current stack with rationale)
  knowledge-base/
    FUNCTIONAL.md (all business flows)
    NON-FUNCTIONAL.md (security, performance, accessibility status)
    TECHNICAL.md (stack, integrations, deployment, patterns)
```

For feature docs: scan module/feature directories, create one doc per feature with API endpoints, database tables, UI components, external integrations, and business logic.

### Step 8: Commit

Create organized commits:
1. chore: add CLAUDE.md and project configuration
2. chore: add claude rules and SDLC agent skills
3. docs: seed feature documentation and knowledge base
4. docs: add architecture decision records

Do NOT push. I will review and push manually.

### Step 9: Summary

List all created files and suggest next steps:
- Which skills to try first
- Which plugins to install
- How to onboard team members (they just pull the branch)
```

---

## After Bootstrap

Once bootstrapped, your team can use:

| Command | When |
|---------|------|
| `/feature <name>` | Starting a new feature (end-to-end lifecycle) |
| `/hotfix <desc>` | Fixing a production bug |
| `/refactor <scope>` | Refactoring code |
| `/commit` | Creating a conventional commit |
| `/code-review` | Checking coding standards |
| `/security-audit` | Running a security scan |
| `/qa` | Generating a test plan |
| `/pre-deploy` | Production readiness checklist |
| `/feature-doc <name>` | Updating feature documentation |
| `/change-request` | Managing scope changes |

## Onboarding New Team Members

1. Team member pulls the branch with `.claude/` and `.planning/`
2. They install Claude Code
3. All skills, rules, and knowledge base are automatically available
4. They run `/feature <name>` to start their first task with full context

No manual setup needed — everything is in git.
