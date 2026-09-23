---
name: bootstrap
description: Auto-detect tech stack and generate CLAUDE.md, skills, rules, and knowledge base for any project. Run this once on a new project to give Claude full context about the codebase.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob, Write, Edit, Task, AskUserQuestion, EnterPlanMode, ExitPlanMode, WebSearch
---

# Project Bootstrap — Universal SDLC Agent Setup

This skill auto-detects your project's tech stack, patterns, and architecture, then generates a complete Claude Code configuration so every team member starts with full project context.

**Run once per project.** After bootstrapping, use `/feature`, `/hotfix`, `/refactor` for daily work.

---

## Phase 1: DETECT — Auto-Discover the Tech Stack

Launch 3 parallel Explore agents to scan the codebase:

### Agent 1: Stack Detection
Detect and report:
- **Language**: Check file extensions (`.ts`, `.py`, `.go`, `.java`, `.rb`, `.rs`, `.php`, etc.)
- **Package manager**: Check for `package.json` (npm/yarn/bun/pnpm), `requirements.txt`/`pyproject.toml` (pip/poetry), `go.mod`, `Gemfile`, `Cargo.toml`, `composer.json`, `pom.xml`/`build.gradle`
- **Framework**: Read config files — `nest-cli.json`/`angular.json` (NestJS/Angular), `next.config.*` (Next.js), `vite.config.*` (Vite), `settings.py` (Django), `config/application.rb` (Rails), `main.go` (Go), `pom.xml` (Spring)
- **Database/ORM**: Check for `drizzle.config.*`, `prisma/schema.prisma`, `alembic/`, `db/migrate/`, `ormconfig.*`, `knexfile.*`, `sequelize` config
- **Auth**: Search for JWT, OAuth, Passport, session, Clerk, Auth0, Supabase auth patterns
- **Testing**: Check for `jest.config.*`, `vitest.config.*`, `pytest.ini`, `_test.go`, `*_spec.rb`, `.rspec`, `cypress/`, `playwright.config.*`
- **CI/CD**: Check `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `bitbucket-pipelines.yml`, `.circleci/`, `Dockerfile`, `docker-compose.*`
- **Monorepo**: Check for `turbo.json`, `nx.json`, `lerna.json`, `pnpm-workspace.yaml`, or multiple `package.json` files
- **Node version**: Check `.nvmrc`, `.node-version`, `engines` in `package.json`
- **Linting**: Check for `eslint.config.*`, `.eslintrc.*`, `.prettierrc`, `ruff.toml`, `golangci.yml`, `rubocop.yml`

### Agent 2: Architecture Discovery
- **Project structure**: `ls` top-level directories, identify monorepo layout (e.g., `server/` + `client/`, `apps/` + `packages/`)
- **Module/feature pattern**: How are features organized? (modules, controllers, routes, handlers, views)
- **API style**: REST, GraphQL, gRPC, tRPC — check for route definitions, resolvers, protobuf files
- **State management**: Check for Redux, Zustand, MobX, React Query, Pinia, Vuex, NgRx
- **UI library**: Radix, shadcn/ui, MUI, Ant Design, Chakra, Bootstrap, Tailwind
- **External integrations**: Search for SDKs (Stripe, AWS, Firebase, Twilio, SendGrid, etc.)
- **Background jobs**: Check for BullMQ, Celery, Sidekiq, cron configurations
- **Caching**: Redis, Memcached, in-memory cache configs
- **File storage**: S3, GCS, Azure Blob, local filesystem uploads

### Agent 3: Conventions Discovery
- **Git conventions**: Read recent 20 commit messages to detect commit style (conventional commits, freeform, etc.)
- **Naming patterns**: Sample 10 files for naming conventions (camelCase, snake_case, kebab-case for files, classes, variables)
- **Code patterns**: Sample 3 controllers/handlers for response format, error handling, logging patterns
- **Env management**: Check `.env.example`, `.env.sample` for required variables
- **Pre-commit hooks**: Check `.husky/`, `.pre-commit-config.yaml`, `lint-staged` config
- **Documentation**: Check for existing docs (`docs/`, `README.md`, `CONTRIBUTING.md`, API docs)

---

## Phase 2: CONFIRM — Ask the User

Present detection results and ask:

1. "Here's what I detected: [summary]. Is this accurate? Anything missing?"
2. "What is this project? Give me a 1-2 sentence description."
3. "What's your team's priority?" → Quality > Stability > Speed (or let them pick)
4. "Any specific conventions or rules I should know about that aren't in the code?"
5. "Should I install any plugins?" → Suggest trailofbits/skills (security), anthropics/skills (docs) if relevant

---

## Phase 3: GENERATE — Create All Configuration Files

### 3a. Generate `CLAUDE.md`

Create at project root with these sections (adapt content to detected stack):

```markdown
# CLAUDE.md

## Build & Development Commands
[Auto-detected build, dev, test, lint commands from package.json/Makefile/etc.]

## Commit Convention
[Detected from git log — conventional commits, or whatever pattern is used]

## Architecture
### Project Layout
[Detected structure — monorepo, module pattern, MVC, etc.]

### Backend Architecture
[Framework, module pattern, database, auth, background jobs, guards/middleware]

### Frontend Architecture
[Framework, state management, UI library, API layer, routing]

## Critical Conventions
[Detected naming, date handling, response format, error logging, etc.]

## Development Principles
**Priority: [User's choice]**
- Never assume — always ask clarifying questions
- Keep .planning/ knowledge base updated after significant changes
- Match complexity to requirements — do not over-engineer
- Flag scope creep before expanding beyond original ask

## Available Skills
[List all generated skills with descriptions]
```

### 3b. Generate `.claude/settings.json`

Safe defaults based on detected package manager:
```json
{
  "permissions": {
    "allow": [
      "Bash([detected-pkg-manager]:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git branch:*)",
      "WebSearch"
    ]
  }
}
```

Add lint/test commands if detected. Add nvm commands if `.nvmrc` exists.

### 3c. Generate `.claude/rules/`

Create rules based on detected patterns:

- **`quality-principles.md`** — Always generated (stack-agnostic):
  - Priority enforcement, scope control, knowledge base maintenance, no assumptions

- **`backend-patterns.md`** (if backend detected) — Path-scoped to backend directory:
  - Framework-specific patterns (NestJS modules, Django views, Rails controllers, Express routes, etc.)
  - ORM usage patterns, response format, error logging, auth guard patterns

- **`frontend-patterns.md`** (if frontend detected) — Path-scoped to frontend directory:
  - State management rules, component patterns, API layer rules, styling conventions

### 3d. Generate `.claude/skills/`

**Always generate these 3 orchestrators:**

| Skill | Purpose |
|-------|---------|
| `/feature` | Full feature lifecycle: requirements → architecture → implement → review → QA → docs → commit |
| `/hotfix` | Production bug fix: root cause → fix → regression check → commit |
| `/refactor` | Refactoring: analyze → plan → implement → verify → commit |

**Always generate these specialists:**

| Skill | Purpose |
|-------|---------|
| `/commit` | Conventional commit with lint checks (adapt to detected linter/hooks) |
| `/code-review` | Coding standards (adapt to detected linter rules and naming conventions) |
| `/security-audit` | Security scan (adapt to detected auth, ORM, framework) |
| `/feature-doc` | Feature documentation in `.planning/features/` |
| `/change-request` | Scope control and change management |
| `/pre-deploy` | Production readiness checklist (adapt to detected CI/CD, Docker, env vars) |
| `/qa` | QA test plan generation (adapt to detected test framework) |

**Generate these if relevant stack detected:**

| Skill | Condition | Purpose |
|-------|-----------|---------|
| `/architect` | Always for non-trivial projects | Architecture review & ADR creation |
| `/api-review` | Backend detected | API design review (adapt to REST/GraphQL/gRPC) |
| `/db-review` | Database/ORM detected | Schema & query review (adapt to ORM) |
| `/frontend-review` | Frontend detected | Frontend patterns & performance |
| `/ux-review` | Frontend detected | UI/UX & accessibility |
| `/perf-audit` | Non-trivial project | Performance analysis |

Each skill's content MUST be adapted to the detected stack — reference actual file paths, framework conventions, and project-specific patterns. Do NOT use generic instructions.

### 3e. Seed `.planning/` Knowledge Base

**Always create:**
```
.planning/
  features/
    _TEMPLATE.md                    # Feature doc template
    [detected-feature-1].md         # One doc per detected module/feature
    [detected-feature-2].md
    ...
  architecture/
    _TEMPLATE.md                    # ADR template
    ADR-001-tech-stack.md           # Document current stack decisions
  knowledge-base/
    FUNCTIONAL.md                   # Business flows (seeded from route/handler analysis)
    NON-FUNCTIONAL.md               # Security, performance, accessibility status
    TECHNICAL.md                    # Stack, integrations, deployment, patterns
```

**Feature detection:**
- Scan module/feature directories (e.g., `src/modules/`, `app/`, `src/features/`)
- Create one doc per detected feature with: endpoints, tables, components, integrations
- Use the template structure for consistency

---

## Phase 4: COMMIT — Organize and Commit

Create 4 commits (use `source ~/.nvm/nvm.sh && nvm use stable` if .nvmrc exists):

1. `chore: add CLAUDE.md and project configuration` — CLAUDE.md + .nvmrc (if needed) + .claude/settings.json
2. `chore: add claude rules and SDLC agent skills` — rules/ + all skills/
3. `docs: seed feature documentation and knowledge base` — .planning/features/ + knowledge-base/
4. `docs: add architecture decision records` — .planning/architecture/

Do NOT push — the user will review and push manually.

---

## Phase 5: VERIFY — Confirm Everything Works

After all commits:
1. List all created files with a summary
2. Show the user which skills are available via `/` menu
3. Suggest next steps:
   - "Run `/feature <name>` to start your first feature with the full lifecycle"
   - "Run `/security-audit` to scan the codebase for vulnerabilities"
   - "Run `/code-review` on recent changes to validate coding standards"
4. Suggest plugins to install if not already done

---

## Notes

- This skill is stack-agnostic — it works for any language/framework
- All generated files should reference actual project paths, not placeholders
- Skills must be adapted to the detected stack (not copy-pasted generic instructions)
- If detection is ambiguous, ask the user — never guess
- Keep CLAUDE.md under 200 lines — move detailed rules to `.claude/rules/`
- The user will push manually after review
