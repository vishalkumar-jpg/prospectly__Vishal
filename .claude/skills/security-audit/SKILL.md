---
name: security-audit
description: End-to-end security audit. Combines Trail of Bits plugin analysis with Prospectly-specific security checks for auth, CORS, CSRF, XSS, and infrastructure.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Task
  - WebSearch
---

# End-to-End Security Audit

## Steps

1. If `$ARGUMENTS` specifies a scope (module, file, or feature), focus on that area. Otherwise perform a full scan across the entire codebase.

2. Check the authentication layer:
   - `server/src/strategies/jwt.strategy.ts` -- no hardcoded secrets, secret loaded from environment variables.
   - `server/src/utils/auth.ts` -- no fallback secrets, no default passwords.
   - All non-public endpoints have JWT protection (no missing guards).
   - Inventory all `@Public()` endpoints and verify each is intentionally public.

3. Check CORS, CSP, and Helmet configuration in `server/src/main.ts`:
   - CORS origin is restricted to allowed domains in production (not wildcard `*`).
   - CSP headers are enabled in production via Helmet.
   - Swagger UI is disabled in production builds.

4. Check input validation:
   - All controller methods use DTOs with class-validator decorators for request validation.
   - HTML content is sanitized with `sanitize-html` on the server or `DOMPurify` on the client.
   - File uploads validate MIME type and file size before processing.

5. Check infrastructure security:
   - `server/Dockerfile` uses a non-root user to run the application.
   - Redis requires a password in production (`server/src/config/redis-config.ts`).
   - No secrets in source code -- grep for hardcoded tokens, passwords, API keys, and connection strings.
   - `.env` files are listed in `.gitignore`.

6. Check client-side security:
   - No `dangerouslySetInnerHTML` without wrapping content in `DOMPurify.sanitize()`.
   - No tokens or secrets stored in `localStorage` (tokens must be in httpOnly cookies).
   - CSRF token is injected on all mutating API calls via the core request handler.

7. Reference the existing audit in `.planning/security/full-audit/AUDIT.md` to check for previously identified issues and their remediation status.

8. Output a structured report with the following columns for each finding:

   ```
   | Severity | File:Line | Finding | Remediation |
   |----------|-----------|---------|-------------|
   | CRITICAL | path:123  | ...     | ...         |
   | HIGH     | path:456  | ...     | ...         |
   | MEDIUM   | path:789  | ...     | ...         |
   | LOW      | path:012  | ...     | ...         |
   ```
