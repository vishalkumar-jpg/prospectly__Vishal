# ADR-002: Authentication Flow

**Status:** Accepted
**Date:** 2026-02-06
**Author:** Claude Code (documented from existing implementation)

## Context

Prospectly needs secure authentication supporting Google and Microsoft OAuth, with session management across web and mobile clients. The system must protect against XSS, CSRF, and token theft while supporting multi-device sessions.

## Decision

**OAuth + JWT in httpOnly cookies with CSRF double-submit pattern.**

### Token Architecture
| Token | Storage | Lifetime | Purpose |
|-------|---------|----------|---------|
| Access Token | httpOnly, secure, sameSite:strict cookie | 15 minutes | API authentication |
| Refresh Token | httpOnly, secure, sameSite:strict cookie | 7 days | Access token renewal |
| CSRF Token | Regular cookie + X-CSRF-Token header | Per session | CSRF protection |

### Guard Architecture
| Guard | Scope | Override |
|-------|-------|---------|
| JwtAuthGuard | Global (all routes) | `@Public()` decorator |
| CsrfGuard | Global (POST/PUT/PATCH/DELETE) | `@SkipCSRF()` decorator, GET/OPTIONS auto-skipped |
| ThrottlerGuard | Global (all routes) | `@Throttle()` decorator for per-route limits |

### OAuth Providers
- Google OAuth 2.0 (Gmail, Contacts, Calendar scopes)
- Microsoft OAuth 2.0 (Outlook, Contacts via Graph API, Calendar)

### Key Flows
1. **Login:** OAuth redirect → callback → create/find user → issue tokens → set cookies
2. **Token Refresh:** Access token expires → client calls POST /auth/refresh → new access token issued → old refresh token invalidated (rotation)
3. **Logout:** POST /auth/logout → clear all auth cookies

## Consequences

### Positive
- httpOnly cookies prevent JavaScript access — immune to XSS token theft
- CSRF double-submit pattern protects state-changing requests
- Token rotation prevents refresh token reuse attacks
- Global guards ensure no endpoint is accidentally left unprotected
- 15-minute access token limits exposure window

### Negative
- Cookie-based auth adds complexity for mobile (Capacitor) clients
- sameSite:strict can block legitimate cross-origin flows during OAuth redirects (mitigated with sameSite:lax for OAuth nonce cookies)
- Token rotation requires database tracking of refresh tokens

### Neutral
- JWT issuer validation configured ("prospectly")
- bcryptjs with 10 salt rounds for any password hashing
- Separate access and refresh token secrets

## Alternatives Considered

### localStorage Tokens
- **Pros:** Simpler implementation, works easily with mobile
- **Cons:** Vulnerable to XSS — any script can read tokens
- **Why rejected:** Security risk too high for a platform handling financial transactions

### Session-Based Auth (server-side sessions)
- **Pros:** Simple revocation, no token management
- **Cons:** Requires session store, harder to scale, sticky sessions
- **Why rejected:** JWT provides stateless authentication suitable for horizontal scaling
