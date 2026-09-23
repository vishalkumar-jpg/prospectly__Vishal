# Non-Functional Requirements & Status

This document tracks non-functional requirements across security, performance, reliability, accessibility, and compliance.

---

## Security (Score: 5.4/10 per audit, improving)

### Secured

| Requirement | Status | Details |
|-------------|--------|---------|
| JWT with proper expiration | SECURED | 15-minute access token, 7-day refresh token |
| Refresh token rotation | SECURED | Old refresh token invalidated on use, new one issued |
| httpOnly, secure, sameSite:strict cookies | SECURED | Tokens stored in httpOnly cookies, not accessible to JavaScript |
| CSRF double-submit pattern | SECURED | X-CSRF-Token header validated by global CsrfGuard |
| Global JwtAuthGuard + CsrfGuard | SECURED | All routes protected by default, opt-out via @Public() and @SkipCSRF() |
| CSP headers via Helmet | SECURED | Content Security Policy headers set in production only |
| CORS restricted to frontendUrl | SECURED | Cross-origin requests limited to configured frontend URL in production |
| Swagger disabled in production | SECURED | API documentation only available in development environment |
| DOMPurify on client, sanitize-html on server | SECURED | Input/output sanitization on both client and server |
| Rate limiting on auth + public endpoints | SECURED | ThrottlerGuard applied to authentication routes and public recruitment endpoints (interview booking: 20/10 per min, consent: 20/10 per min, public job: 100/min) |
| Docker non-root user | SECURED | Production Docker container runs as non-root user |
| JWT_SECRET required (no fallback) | SECURED | No hardcoded fallback secret; application fails to start without proper configuration |

### Gaps

- RolesGuard not implemented (no role-based access control enforcement)
- PII present in some log outputs
- Tokens passed in URL parameters in some flows (including recruitment interview booking tokens and consent tokens)
- No GDPR data export functionality

---

## Performance

### Implemented

| Requirement | Status | Details |
|-------------|--------|---------|
| Body size limit | IMPLEMENTED | 10MB general limit, larger allowance for webhook endpoints |
| Pagination caps | IMPLEMENTED | Maximum 100 items per page on all list endpoints |
| Background job processing | IMPLEMENTED | BullMQ + Redis for async task processing via separate worker process (includes recruitment AI matching queue) |
| File uploads via S3 presigned URLs | IMPLEMENTED | 15-minute expiry, uploads go directly to S3 without proxying through server |
| Client-side caching | IMPLEMENTED | React Query for server state caching, automatic stale data management |

### Gaps

- No CDN configured for static assets
- No API response time monitoring or alerting
- Source maps disabled in production (limits debugging but improves security)

---

## Reliability

### Implemented

| Requirement | Status | Details |
|-------------|--------|---------|
| Error tracking (server) | IMPLEMENTED | Sentry integration for server-side error capture and alerting |
| Session replay (client) | IMPLEMENTED | LogRocket for client-side session recording and error reproduction |
| Soft deletes | IMPLEMENTED | All schemas use deletedAt column; records are never hard-deleted |
| Database transactions | IMPLEMENTED | Multi-step operations wrapped in transactions for atomicity |

### Gaps

- No health check endpoint monitoring
- No CI/CD pipeline for automated builds and deployments
- No automated testing (unit, integration, or end-to-end)

---

## Accessibility

### Implemented

| Requirement | Status | Details |
|-------------|--------|---------|
| Radix UI primitives | IMPLEMENTED | Built-in ARIA support for all interactive components |
| Responsive design | IMPLEMENTED | Tailwind CSS responsive utilities for all screen sizes |
| Mobile support | IMPLEMENTED | Capacitor for native iOS and Android builds |

### Gaps

- No formal WCAG audit conducted
- Keyboard navigation not fully tested across all flows
- Screen reader compatibility not verified

---

## Compliance

### Implemented

| Requirement | Status | Details |
|-------------|--------|---------|
| PII encryption | GOOD | Contact PII stored in separate encrypted table with hash indexing |
| Soft deletes for data retention | GOOD | All data is soft-deleted, preserving records for compliance |
| Environment variables excluded from git | GOOD | .env files in .gitignore, secrets managed outside of version control |

### Gaps

- No GDPR data export (right to data portability)
- No formal data retention policies defined
- No audit trail table for tracking data access and modifications
