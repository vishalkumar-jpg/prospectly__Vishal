---
name: pre-deploy
description: Production readiness checklist. Validates environment variables, migrations, rollback plan, monitoring, security headers, Docker config, and infrastructure.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob, Task
---

# Pre-Deploy Checklist

Validate production readiness by checking environment configuration, database migrations, security headers, Docker setup, monitoring, and build integrity.

## Steps

1. **Check environment configuration:**
   - Verify all required env vars are documented in `.env.example`. Cross-reference with actual usage by grepping for `process.env.` and `ConfigService.get` across the server codebase.
   - Scan for hardcoded secrets in source code: grep for patterns like `password`, `secret`, `apiKey`, `api_key`, `token`, `bearer`, `authorization` in string literals (exclude type definitions and variable names).
   - Verify `JWT_SECRET` is required and has no fallback/default value in the config.
   - Verify `REDIS_PASSWORD` is configured for production Redis connections.
   - Check that `.env` files are in `.gitignore` and not committed to the repository.

2. **Check database:**
   - Check for pending migrations: run `cd server && bunx drizzle-kit generate` and verify the output is clean (no new migrations generated).
   - Review recent migration files in `server/src/migrations/` for reversibility -- are there corresponding down migrations or rollback steps?
   - Check if any data migrations are needed (seed scripts, data transformations).
   - Verify schema changes are backward compatible (no dropped columns that are still referenced).

3. **Check security headers** (read `server/src/main.ts`):**
   - CORS: `origin` is restricted to the frontend URL in production (not `*` or `true`).
   - Helmet: CSP (Content Security Policy) is enabled for production builds.
   - Swagger: API documentation (`/api/docs`) is disabled in production (`NODE_ENV === 'production'`).
   - Body size limit: request body limit is reasonable (not excessively large like 50MB unless justified).
   - Logger levels: production should not expose `debug` or `verbose` log levels.
   - Cookie settings: `httpOnly`, `secure`, `sameSite` flags are set on auth cookies.

4. **Check Docker** (read `server/Dockerfile`):**
   - Container runs as non-root user (look for `USER` directive).
   - Uses `--frozen-lockfile` for dependency installation (deterministic builds).
   - No secrets or credentials baked into the Dockerfile or docker-compose files.
   - `.dockerignore` exists and excludes: `.env`, `node_modules`, `.git`, `*.log`, test files.
   - Multi-stage build is used to minimize final image size.

5. **Check monitoring:**
   - Sentry is configured for error tracking: grep for `@sentry/node` or `@sentry/nestjs` in server, `@sentry/react` in client.
   - LogRocket is configured for session replay in the client: grep for `logrocket` in client source.
   - Health check endpoint exists and is functional.

6. **Check deployment:**
   - Build succeeds without errors: `source ~/.nvm/nvm.sh && nvm use stable && bun run build`
   - No TypeScript compilation errors.
   - No ESLint errors that would block deployment.

7. **Output:** Production readiness checklist formatted as:

   | Category | Check | Status | Details |
   |----------|-------|--------|---------|
   | Environment | JWT_SECRET required | PASS/FAIL | description |

   Summarize at the top:
   - Total checks: N
   - Passed: N
   - Failed: N (list blockers)
   - Warnings: N

   Any FAIL item is a **deployment blocker** and must be resolved before deploying.
