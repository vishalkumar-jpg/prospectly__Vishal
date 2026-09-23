---
name: code-review
description: Coding standards enforcement. Checks naming conventions, file structure, dead code, complexity, ESLint compliance, import patterns, and type safety.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob, Task
---

# Code Review

Enforce coding standards across the codebase. Check naming conventions, file structure, dead code, complexity, ESLint compliance, import patterns, and type safety.

## Steps

1. **Identify files to review** from $ARGUMENTS or from recent changes via `git diff --name-only HEAD~1` (or `git diff --name-only main...HEAD` for branch reviews). Filter to only `.ts`, `.tsx`, `.js`, `.jsx` files.

2. **Check naming conventions:**
   - **Files**: kebab-case with type suffix (`.controller.ts`, `.service.ts`, `.dto.ts`, `.module.ts`, `.guard.ts`, `.interceptor.ts`)
   - **Classes**: PascalCase with suffix (`UserService`, `CreateUserDto`, `AuthController`, `JwtAuthGuard`)
   - **Constants**: UPPER_SNAKE_CASE (e.g., `DRIZZLE_TOKEN`, `MAX_RETRY_COUNT`)
   - **Directories**: kebab-case (e.g., `trust-score/`, `auth/`, `email-templates/`)
   - **DB tables**: snake_case in PostgreSQL schema definitions, camelCase in TypeScript references
   - **Variables and functions**: camelCase

3. **Check file structure:**
   - Is the file in the correct directory for its type? Controllers, services, DTOs, and modules should be in `server/src/modules/<feature>/`
   - Does it follow the module pattern (server)? Each module should have: `.module.ts`, `.controller.ts`, `.service.ts`, `.dto.ts`
   - Does it follow the component pattern (client)? Components in `client/src/components/`, pages in `client/src/pages/`, hooks in `client/src/hooks/`

4. **Check code quality:**
   - **No unused imports or variables**: look for imports that are not referenced in the file body
   - **No `any` types**: search for `: any`, `as any`, `<any>` -- use proper typing instead
   - **No `console.log` in server code**: use NestJS `Logger` instead (`this.logger.log()`, `this.logger.error()`, etc.)
   - **No dead code**: commented-out code blocks (more than 2 consecutive commented lines), unreachable code after `return`/`throw`
   - **Function complexity**: flag functions longer than 50 lines and suggest splitting. Flag deeply nested code (3+ levels of nesting)
   - **Date handling**: ensure `toUTC()` or `utcDayjs()` is used instead of `new Date()` for storage and API payloads
   - **Response format**: server endpoints should use `responseUtils.success()` and `responseUtils.error()`, not raw `res.json()`
   - **Error logging**: server errors should follow `this.logger.error(\`MODULE_CONTROLLER :: METHOD_NAME : ERROR : \${error}\`)` format

5. **Check imports:**
   - Using path aliases (`config/*`, `utils/*`, `modules/*`, `@/*`) instead of deep relative paths (e.g., `../../../utils/`)
   - No circular dependencies: check if module A imports from module B which imports from module A
   - Imports are organized: external packages first, then internal modules, then relative imports

6. **Run ESLint check:**
   - For server files: `source ~/.nvm/nvm.sh && nvm use stable && cd server && npx eslint <files>`
   - For client files: `source ~/.nvm/nvm.sh && nvm use stable && cd client && npx eslint <files>`
   - Report any ESLint errors or warnings

7. **Output:** For each file reviewed, provide a verdict:
   - **PASS**: No issues found
   - **WARN**: Minor issues that should be addressed (style, best practices)
   - **FAIL**: Serious issues that must be fixed (type safety, security, correctness)

   For each issue, include:
   - File path and line number
   - Rule violated (naming, structure, quality, imports, eslint)
   - Description of the issue
   - Suggested fix with code snippet
