# Google OAuth Authentication - Access & Refresh Token Management Implementation

## Document Purpose
This document provides a comprehensive technical overview of the "Continue with Google" authentication implementation, including detailed code snippets, token management flow, and CSRF protection. This document is intended for validation and root cause analysis purposes.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [CSRF Guard Implementation](#csrf-guard-implementation)
3. [Google OAuth Flow](#google-oauth-flow)
4. [Access Token Management](#access-token-management)
5. [Refresh Token Management](#refresh-token-management)
6. [Token Generation & Storage](#token-generation--storage)
7. [Complete Authentication Flow](#complete-authentication-flow)
8. [Security Features](#security-features)

---

## Architecture Overview

### System Components

```
┌─────────────────┐
│   Frontend      │
│  (React/TS)     │
└────────┬────────┘
         │ HTTP Requests with Cookies
         │ X-CSRF-Token Header
         ▼
┌─────────────────────────────────────┐
│         NestJS Backend              │
│  ┌──────────────────────────────┐  │
│  │   Global Guards (App Level)  │  │
│  │  1. JwtAuthGuard             │  │
│  │  2. CsrfGuard                │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │   AuthController             │  │
│  │  - /auth/google              │  │
│  │  - /auth/google/callback     │  │
│  │  - /auth/refresh             │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │   AuthService                │  │
│  │  - Token Generation          │  │
│  │  - Token Validation         │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │   RefreshTokenService        │  │
│  │  - Database Operations       │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
│  refresh_tokens │
└─────────────────┘
```

### Key Technologies
- **Backend**: NestJS with TypeScript
- **Authentication**: JWT (JSON Web Tokens)
- **OAuth Provider**: Google OAuth 2.0
- **Token Storage**: HTTP-only Cookies
- **CSRF Protection**: Double Submit Cookie Pattern
- **Database**: PostgreSQL (for refresh token storage)

---

## CSRF Guard Implementation

### Overview
The CSRF Guard is a **global guard** applied at the application level to protect all state-changing HTTP methods (POST, PUT, PATCH, DELETE) from Cross-Site Request Forgery attacks.

### Code Implementation

**File**: `server/src/guards/csrf.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "decorators/public.decorator";
import { SKIP_CSRF_KEY } from "decorators/skip-csrf.decorator";

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(Reflector) private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Skip CSRF validation for safe HTTP methods
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(request.method)) {
      return true;
    }

    // Skip CSRF validation for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      handler,
      controller,
    ]);
    if (isPublic) {
      return true;
    }

    // Skip CSRF validation for routes explicitly marked with @SkipCSRF()
    const skipCSRF = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      handler,
      controller,
    ]);
    if (skipCSRF) {
      return true;
    }

    // Skip CSRF validation for webhook endpoints
    const path = request.path || request.url;
    if (path.includes("/webhooks/")) {
      return true;
    }

    // Extract CSRF token from header (Express normalizes headers to lowercase)
    const headerToken =
      (request.headers["x-csrf-token"] as string | undefined) ||
      (request.headers["X-CSRF-Token"] as string | undefined);

    // Extract CSRF token from cookie
    const cookieToken = request.cookies?.csrf_token as string | undefined;

    // Validate CSRF token
    if (!headerToken || !cookieToken) {
      throw new ForbiddenException(
        "CSRF token is missing. Please ensure X-CSRF-Token header is included in your request."
      );
    }

    // Compare tokens (case-sensitive)
    if (headerToken !== cookieToken) {
      throw new ForbiddenException(
        "CSRF token validation failed. The token in the header does not match the token in the cookie."
      );
    }

    return true;
  }
}
```

### CSRF Guard Registration

**File**: `server/src/app.module.ts`

```typescript
import { CsrfGuard } from "guards/csrf.guard";
import { JwtAuthGuard } from "guards/jwt-auth.guard";

@Module({
  // ... imports
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,  // Applied first
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,      // Applied second
    },
  ],
})
export class AppModule {}
```

### CSRF Guard Behavior

1. **Skip Conditions**:
   - Safe HTTP methods (GET, HEAD, OPTIONS) - no CSRF risk
   - Public routes (marked with `@Public()` decorator)
   - Routes explicitly marked with `@SkipCSRF()` decorator
   - Webhook endpoints (external services)

2. **Validation Process**:
   - Extracts CSRF token from `X-CSRF-Token` header
   - Extracts CSRF token from `csrf_token` cookie
   - Compares both tokens (case-sensitive)
   - Throws `ForbiddenException` if tokens don't match or are missing

3. **Error Responses**:
   - Missing token: `403 Forbidden` with message about missing header
   - Mismatched token: `403 Forbidden` with validation failure message

---

## Google OAuth Flow

### Step 1: Initiate Google OAuth

**Endpoint**: `GET /api/auth/google`

**File**: `server/src/modules/auth/auth.controller.ts`

```typescript
@Public()
@Get("google")
@ApiSwaggerResponse(MessageResponse)
async googleAuth(@Res() res: Response) {
  try {
    const { clientId } = oauthConfig.google;
    const { clientSecret } = oauthConfig.google;
    const { redirectUri } = oauthConfig.google;
    const { loginScopes } = oauthConfig.google;

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.GOOGLE_OAUTH_NOT_CONFIGURED
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",  // Required for refresh token
      prompt: "consent",        // Force consent screen
      scope: loginScopes,       // Includes: openid, email, profile, contacts.readonly, calendar scopes
    });

    return res.redirect(authUrl);
  } catch (error) {
    this.logger.error(`AUTH_CONTROLLER :: GOOGLE : ERROR : ${error}`);
    return responseUtils.error({ res, error });
  }
}
```

**Key Points**:
- `@Public()` decorator marks route as public (bypasses JWT auth)
- `access_type: "offline"` ensures Google returns refresh token
- `prompt: "consent"` forces consent screen to get fresh tokens
- Redirects user to Google OAuth consent screen

### Step 2: Google OAuth Callback

**Endpoint**: `GET /api/auth/google/callback`

**File**: `server/src/modules/auth/auth.controller.ts`

```typescript
@Public()
@Get("google/callback")
@ApiSwaggerResponse(MessageResponse)
async googleCallback(
  @Query("code") code: string,
  @Res({ passthrough: true }) res: Response
) {
  try {
    const { clientId } = oauthConfig.google;
    const { clientSecret } = oauthConfig.google;
    const { redirectUri } = oauthConfig.google;

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.GOOGLE_OAUTH_NOT_CONFIGURED
      );
    }

    if (!code) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.MISSING_AUTHORIZATION_CODE
      );
    }

    // 1. Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // 2. Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.id_token) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.NO_ID_TOKEN_RECEIVED_FROM_GOOGLE
      );
    }

    // 3. Verify ID token with Google
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });

    // 4. Extract user information from verified token
    const payload = ticket.getPayload();
    const email = payload?.email || null;
    const firstName = (payload?.given_name as string | undefined) || null;
    const lastName = (payload?.family_name as string | undefined) || null;
    const fullName = (payload?.name as string | undefined) || null;
    const picture = (payload?.picture as string | undefined) || null;

    // 5. Check if contacts scope was granted
    const hasContactsScope =
      tokens.scope?.includes(oauthConfig.google.contactsScopes[0]) || false;

    // 6. Login or register user and generate JWT tokens
    const result = await this.authService.loginWithGoogle({
      email,
      firstName,
      lastName,
      fullName,
      picture,
      googleTokens: hasContactsScope
        ? {
            accessToken: tokens.access_token || "",
            refreshToken: tokens.refresh_token || "",
            expiryDate: tokens.expiry_date || undefined,
            scope: tokens.scope || undefined,
          }
        : undefined,
    });

    // 7. Handle calendar connection if scope granted
    const hasCalendarScope =
      tokens.scope?.includes(
        "https://www.googleapis.com/auth/calendar.readonly"
      ) ||
      tokens.scope?.includes(
        "https://www.googleapis.com/auth/calendar.events"
      ) ||
      false;

    if (hasCalendarScope && tokens.access_token) {
      await this.authService.handleCalendarConnection({
        userId: result.user.id,
        tokens: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || undefined,
          expiryDate: tokens.expiry_date || undefined,
        },
        email,
      });
    }

    // 8. Set authentication cookies (access_token, refresh_token, csrf_token)
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      result.csrfToken
    );

    // 9. Redirect to dashboard
    res.redirect(`${appConfig.frontendUrl}/dashboard`);
  } catch (error) {
    this.logger.error(`AUTH_CONTROLLER :: GOOGLE : ERROR : ${error}`);
    return responseUtils.error({ res, error });
  }
}
```

**Flow Explanation**:
1. Receives authorization code from Google
2. Exchanges code for access token, refresh token, and ID token
3. Verifies ID token with Google to ensure authenticity
4. Extracts user information (email, name, picture)
5. Creates or retrieves user profile
6. Generates JWT access token, refresh token, and CSRF token
7. Stores refresh token hash in database
8. Sets HTTP-only cookies
9. Redirects to dashboard

---

## Access Token Management

### Access Token Generation

**File**: `server/src/modules/auth/auth.service.ts`

```typescript
private async generateTokens({ userId, email, rememberMe }: GenerateTokens) {
  // 1. Generate Access Token (15 minutes validity)
  const accessToken = this.jwtService.sign(
    { userId, email, tokenType: "access" },
    {
      secret: this.configService.get("jwt.accessTokenSecret"),
      expiresIn: this.configService.get("jwt.accessTokenExpiry"), // "15m"
      issuer: "prospectly",
    }
  );

  // 2. Generate Refresh Token (7 days or 30 days if rememberMe)
  const refreshTokenExpiry =
    rememberMe === true
      ? "30d"
      : this.configService.get("jwt.refreshTokenExpiry"); // "7d"

  const refreshToken = this.jwtService.sign(
    { userId, email, tokenType: "refresh" },
    {
      secret: this.configService.get("jwt.refreshTokenSecret"),
      expiresIn: refreshTokenExpiry,
      issuer: "prospectly",
    }
  );

  // 3. Store refresh token hash in database
  await this.refreshTokenService.storeRefreshToken(refreshToken, userId);

  // 4. Generate CSRF token (random 32-byte hex string)
  const csrfToken = this.cryptoService.generateCSRFToken();

  return { accessToken, refreshToken, csrfToken };
}
```

### Access Token Structure

**JWT Payload**:
```json
{
  "userId": "uuid-string",
  "email": "user@example.com",
  "tokenType": "access",
  "iat": 1234567890,
  "exp": 1234568790,
  "iss": "prospectly"
}
```

**Token Configuration**:
- **Secret**: `JWT_SECRET` environment variable
- **Expiry**: 15 minutes (`"15m"`)
- **Issuer**: `"prospectly"`
- **Storage**: HTTP-only cookie named `access_token`

### Access Token Cookie Settings

**File**: `server/src/utils/auth.ts`

```typescript
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  csrfToken: string
): void {
  const isProduction = configService.get<string>("NODE_ENV") === "production";

  // Set access token cookie (15 minutes)
  res.cookie("access_token", accessToken, {
    httpOnly: true,        // Not accessible via JavaScript (XSS protection)
    secure: isProduction,  // HTTPS only in production
    sameSite: "strict",    // CSRF protection
    maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
    path: "/",
  });

  // Set refresh token cookie (7 days)
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: "/",
  });

  // Set CSRF token (not httpOnly - frontend needs to read it)
  res.cookie("csrf_token", csrfToken, {
    httpOnly: false,       // Accessible via JavaScript for CSRF header
    secure: isProduction,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: "/",
  });
}
```

### Access Token Validation

**File**: `server/src/strategies/jwt.strategy.ts`

```typescript
import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(@Inject(ConfigService) configService: ConfigService) {
    const secret =
      configService?.get<string>("jwt.accessTokenSecret") ||
      configService?.get<string>("JWT_SECRET") ||
      "fallback-secret";
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Extract token from HTTP-only cookie
          return request?.cookies?.access_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: "prospectly",
    });
  }

  async validate(payload: AnyType) {
    // Validate token type
    if (payload.tokenType !== "access") {
      throw new UnauthorizedException("Invalid token type");
    }

    return {
      userId: payload.userId,
      email: payload.email,
      tokenType: payload.tokenType,
    };
  }
}
```

**Validation Process**:
1. Extracts `access_token` from HTTP-only cookie
2. Verifies JWT signature using `JWT_SECRET`
3. Checks token expiration
4. Validates issuer is `"prospectly"`
5. Validates `tokenType` is `"access"`
6. Returns user information if valid

---

## Refresh Token Management

### Refresh Token Storage

**File**: `server/src/services/refreshTokenService.ts`

```typescript
import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq, and, lt } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { refreshTokens } from "database/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as crypto from "crypto";

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Hash refresh token using SHA-256 before storage
   * Original token is never stored in plaintext
   */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Store refresh token hash in database
   * Token is hashed before storage for security
   */
  async storeRefreshToken(
    token: string,
    userId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      await this.db.insert(refreshTokens).values({
        userId,
        tokenHash,
        expiresAt,
        userAgent,
        ipAddress,
      });
      this.logger.debug(`Stored refresh token for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to store refresh token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Invalidate refresh token (mark as revoked)
   * Used during token rotation and logout
   */
  async invalidateRefreshToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    try {
      await this.db
        .update(refreshTokens)
        .set({
          isRevoked: true,
          revokedAt: new Date(),
        })
        .where(eq(refreshTokens.tokenHash, tokenHash));
      this.logger.debug("Refresh token invalidated");
    } catch (error) {
      this.logger.error(`Failed to invalidate refresh token: ${error.message}`);
    }
  }

  /**
   * Validate refresh token
   * Checks: existence, revocation status, expiration
   */
  async isRefreshTokenValid(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);

    try {
      const result = await this.db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.tokenHash, tokenHash),
            eq(refreshTokens.isRevoked, false)
          )
        )
        .limit(1);

      if (result.length === 0) {
        return false; // Token not found
      }

      const [storedToken] = result;

      // Check expiration
      if (storedToken.expiresAt < new Date()) {
        await this.invalidateRefreshToken(token);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to validate refresh token: ${error.message}`);
      return false;
    }
  }

  /**
   * Cleanup expired tokens from database
   * Should be run periodically via cron job
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      await this.db
        .delete(refreshTokens)
        .where(lt(refreshTokens.expiresAt, new Date()));
      this.logger.debug("Cleaned up expired refresh tokens");
    } catch (error) {
      this.logger.error(`Failed to cleanup expired tokens: ${error.message}`);
    }
  }
}
```

### Refresh Token Database Schema

**File**: `server/src/database/schema/refresh-tokens.ts`

```typescript
import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { profiles } from './profiles';

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),        // SHA-256 hash of token
  expiresAt: timestamp('expires_at').notNull(),   // 7 days from creation
  isRevoked: boolean('is_revoked').default(false).notNull(),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
}, (table) => ({
  userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
  tokenHashIdx: index('refresh_tokens_token_hash_idx').on(table.tokenHash),
  expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
}));
```

**Database Table Structure**:
- `id`: Primary key (UUID)
- `user_id`: Foreign key to profiles table (cascade delete)
- `token_hash`: SHA-256 hash of refresh token (never stores plaintext)
- `expires_at`: Token expiration timestamp (7 days)
- `is_revoked`: Boolean flag for token revocation
- `revoked_at`: Timestamp when token was revoked
- `created_at`: Token creation timestamp
- `user_agent`: Optional browser user agent
- `ip_address`: Optional client IP address

**Indexes**:
- `refresh_tokens_user_id_idx`: Fast lookup by user
- `refresh_tokens_token_hash_idx`: Fast lookup by token hash
- `refresh_tokens_expires_at_idx`: Fast cleanup of expired tokens

### Refresh Token Flow

**Endpoint**: `POST /api/auth/refresh`

**File**: `server/src/modules/auth/auth.controller.ts`

```typescript
@Public()  // Public endpoint - uses refresh token cookie for auth
@Post("refresh")
@ApiSwaggerResponse(MessageResponse)
async refresh(
  @Req() request: Request,
  @Res({ passthrough: true }) res: Response
) {
  try {
    // 1. Extract refresh token from HTTP-only cookie
    const refreshToken = request.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.REFRESH_TOKEN_NOT_FOUND
      );
    }

    // 2. Refresh tokens (validates and generates new ones)
    const result = await this.authService.refreshTokens(refreshToken);

    // 3. Set new cookies with fresh tokens
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      result.csrfToken
    );

    return responseUtils.success(res, {
      data: { message: AUTH_MESSAGES.INFO.TOKEN_REFRESHED_SUCCESSFULLY },
    });
  } catch (error) {
    this.logger.error(`AUTH_CONTROLLER :: REFRESH : ERROR : ${error}`);
    return responseUtils.error({ res, error });
  }
}
```

**Service Implementation**:

**File**: `server/src/modules/auth/auth.service.ts`

```typescript
async refreshTokens(refreshToken: string) {
  // 1. Verify JWT signature and extract payload
  const payload = this.jwtService.verify(refreshToken, {
    secret: this.configService.get("jwt.refreshTokenSecret"),
    issuer: "prospectly",
  });

  // 2. Validate token type
  if (payload.tokenType !== "refresh") {
    throw new UnauthorizedException(AUTH_MESSAGES.ERROR.INVALID_TOKEN_TYPE);
  }

  // 3. Check if token exists and is valid in database
  const isValid =
    await this.refreshTokenService.isRefreshTokenValid(refreshToken);

  if (!isValid) {
    throw new UnauthorizedException(
      AUTH_MESSAGES.ERROR.INVALID_REFRESH_TOKEN
    );
  }

  // 4. Generate new tokens (access + refresh)
  const tokens = await this.generateTokens({
    userId: payload.userId,
    email: payload.email,
  });

  // 5. Invalidate old refresh token (token rotation)
  await this.refreshTokenService.invalidateRefreshToken(refreshToken);

  return tokens;
}
```

**Refresh Token Flow Steps**:

1. **Frontend receives 401 Unauthorized** on any API request
2. **Frontend calls `/api/auth/refresh`** with `refresh_token` cookie
3. **Backend extracts refresh token** from HTTP-only cookie
4. **Backend verifies JWT signature** using `REFRESH_TOKEN_SECRET`
5. **Backend validates token type** is `"refresh"`
6. **Backend checks database** for token hash, revocation status, expiration
7. **Backend generates new tokens** (access + refresh + CSRF)
8. **Backend stores new refresh token hash** in database
9. **Backend invalidates old refresh token** (marks as revoked)
10. **Backend sets new cookies** with fresh tokens
11. **Frontend retries original request** with new access token

---

## Token Generation & Storage

### Token Generation Process

**File**: `server/src/modules/auth/auth.service.ts`

```typescript
private async generateTokens({ userId, email, rememberMe }: GenerateTokens) {
  // Step 1: Generate Access Token
  const accessToken = this.jwtService.sign(
    { userId, email, tokenType: "access" },
    {
      secret: this.configService.get("jwt.accessTokenSecret"),
      expiresIn: this.configService.get("jwt.accessTokenExpiry"), // "15m"
      issuer: "prospectly",
    }
  );

  // Step 2: Generate Refresh Token
  const refreshTokenExpiry =
    rememberMe === true
      ? "30d"  // 30 days for "Remember Me"
      : this.configService.get("jwt.refreshTokenExpiry"); // "7d"

  const refreshToken = this.jwtService.sign(
    { userId, email, tokenType: "refresh" },
    {
      secret: this.configService.get("jwt.refreshTokenSecret"),
      expiresIn: refreshTokenExpiry,
      issuer: "prospectly",
    }
  );

  // Step 3: Store refresh token hash in database
  await this.refreshTokenService.storeRefreshToken(refreshToken, userId);

  // Step 4: Generate CSRF token
  const csrfToken = this.cryptoService.generateCSRFToken();

  return { accessToken, refreshToken, csrfToken };
}
```

### CSRF Token Generation

**File**: `server/src/shared/crypto.service.ts`

```typescript
generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

**CSRF Token Characteristics**:
- 32 random bytes = 64 hex characters
- Cryptographically secure random generation
- Not stored in database (stateless)
- Validated by comparing cookie value with header value

### Token Storage Security

**Access Token**:
- ✅ Stored in HTTP-only cookie (not accessible via JavaScript)
- ✅ Short-lived (15 minutes)
- ✅ Signed with separate secret (`JWT_SECRET`)

**Refresh Token**:
- ✅ Stored in HTTP-only cookie (not accessible via JavaScript)
- ✅ Long-lived (7 days standard, 30 days if "Remember Me")
- ✅ Signed with separate secret (`REFRESH_TOKEN_SECRET`)
- ✅ Hashed (SHA-256) before database storage
- ✅ Never stored in plaintext

**CSRF Token**:
- ✅ Stored in regular cookie (accessible via JavaScript)
- ✅ Long-lived (7 days)
- ✅ Not stored in database (stateless)
- ✅ Validated by comparing cookie with header

---

## Complete Authentication Flow

### End-to-End Flow Diagram

```
┌─────────────┐
│   User      │
│  Clicks     │
│ "Continue   │
│ with Google"│
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend: SignIn.tsx               │
│  window.location.href =              │
│  "/api/auth/google"                  │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Backend: GET /api/auth/google      │
│  - Creates OAuth2 client            │
│  - Generates auth URL                │
│  - Redirects to Google             │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Google OAuth Consent Screen        │
│  - User grants permissions          │
│  - Google redirects with code       │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Backend: GET /api/auth/google/    │
│            callback?code=...       │
│  1. Exchange code for tokens        │
│  2. Verify ID token                 │
│  3. Extract user info               │
│  4. Create/retrieve user            │
│  5. Generate JWT tokens              │
│  6. Store refresh token hash        │
│  7. Set cookies                     │
│  8. Redirect to dashboard           │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend: Dashboard                │
│  - AuthContext calls /api/auth/me   │
│  - Access token in cookie           │
│  - JWT validated by JwtAuthGuard    │
│  - CSRF token validated by          │
│    CsrfGuard (if POST/PUT/etc)     │
└─────────────────────────────────────┘
```

### Token Refresh Flow

```
┌─────────────────────────────────────┐
│  Frontend: API Request               │
│  POST /api/some-endpoint            │
│  - Includes access_token cookie      │
│  - Includes X-CSRF-Token header     │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Backend: JwtAuthGuard              │
│  - Validates access token           │
│  - Token expired? → 401              │
└──────┬──────────────────────────────┘
       │
       ▼ (if 401)
┌─────────────────────────────────────┐
│  Frontend: Automatic Refresh        │
│  POST /api/auth/refresh             │
│  - Includes refresh_token cookie    │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Backend: AuthService.refreshTokens │
│  1. Verify refresh token JWT        │
│  2. Check database validity        │
│  3. Generate new tokens              │
│  4. Invalidate old refresh token     │
│  5. Store new refresh token hash    │
│  6. Set new cookies                 │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend: Retry Original Request   │
│  POST /api/some-endpoint            │
│  - New access_token cookie          │
│  - Request succeeds                 │
└─────────────────────────────────────┘
```

---

## Security Features

### 1. Token Rotation
- **Implementation**: New refresh token issued on each refresh
- **Benefit**: Prevents token reuse attacks
- **Code**: Old token invalidated before new token issued

### 2. Token Hashing
- **Implementation**: SHA-256 hash before database storage
- **Benefit**: Database compromise doesn't expose tokens
- **Code**: `crypto.createHash("sha256").update(token).digest("hex")`

### 3. HTTP-Only Cookies
- **Implementation**: Access and refresh tokens in HTTP-only cookies
- **Benefit**: Not accessible via JavaScript (XSS protection)
- **Code**: `httpOnly: true` in cookie settings

### 4. Secure Flag
- **Implementation**: Cookies marked as Secure in production
- **Benefit**: Only sent over HTTPS
- **Code**: `secure: isProduction` in cookie settings

### 5. SameSite Strict
- **Implementation**: Cookies marked as SameSite: Strict
- **Benefit**: Not sent on cross-site requests
- **Code**: `sameSite: "strict"` in cookie settings

### 6. CSRF Protection
- **Implementation**: Double Submit Cookie Pattern
- **Benefit**: Prevents cross-site request forgery
- **Code**: CSRF token in cookie + header, compared by CsrfGuard

### 7. Token Type Validation
- **Implementation**: JWT payload includes `tokenType` field
- **Benefit**: Prevents token type confusion attacks
- **Code**: Validates `tokenType === "access"` or `"refresh"`

### 8. Database Token Validation
- **Implementation**: Refresh tokens validated against database
- **Benefit**: Supports token revocation and expiration
- **Code**: `isRefreshTokenValid()` checks database

### 9. Separate Secrets
- **Implementation**: Different secrets for access and refresh tokens
- **Benefit**: Compromise of one doesn't affect the other
- **Code**: `JWT_SECRET` vs `REFRESH_TOKEN_SECRET`

### 10. Short-Lived Access Tokens
- **Implementation**: 15-minute expiration
- **Benefit**: Limits exposure window if token is compromised
- **Code**: `expiresIn: "15m"`

---

## Configuration

### JWT Configuration

**File**: `server/src/config/jwt.config.ts`

```typescript
import { registerAs } from "@nestjs/config";
import { getOsEnv } from "config/env.config";

export default registerAs("jwt", () => ({
  accessTokenSecret: getOsEnv("JWT_SECRET"),
  refreshTokenSecret: getOsEnv("REFRESH_TOKEN_SECRET"),
  accessTokenExpiry: "15m",  // 15 minutes
  refreshTokenExpiry: "7d",  // 7 days
}));
```

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-access-token-secret-key
REFRESH_TOKEN_SECRET=your-refresh-token-secret-key

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Application URLs
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Environment
NODE_ENV=production  # or development
```

---

## Error Handling

### Common Errors

1. **REFRESH_TOKEN_NOT_FOUND**
   - **Cause**: Refresh token cookie missing
   - **HTTP Status**: 401 Unauthorized
   - **Resolution**: User must re-authenticate

2. **INVALID_REFRESH_TOKEN**
   - **Cause**: Token invalid, expired, or revoked
   - **HTTP Status**: 401 Unauthorized
   - **Resolution**: User must re-authenticate

3. **INVALID_TOKEN_TYPE**
   - **Cause**: Wrong token type used (access vs refresh)
   - **HTTP Status**: 401 Unauthorized
   - **Resolution**: Use correct token type

4. **CSRF Token Missing**
   - **Cause**: Missing `X-CSRF-Token` header
   - **HTTP Status**: 403 Forbidden
   - **Resolution**: Include CSRF token in header

5. **CSRF Token Validation Failed**
   - **Cause**: Header token doesn't match cookie token
   - **HTTP Status**: 403 Forbidden
   - **Resolution**: Ensure tokens match

---

## Summary

This implementation provides a secure, production-ready authentication system with:

✅ **Google OAuth Integration**: Seamless "Continue with Google" sign-in  
✅ **JWT Token Management**: Secure access (15min) and refresh (7d) tokens  
✅ **Cookie-Based Auth**: HTTP-only cookies for secure token storage  
✅ **CSRF Protection**: Double Submit Cookie Pattern with global guard  
✅ **Token Rotation**: New refresh token on each refresh  
✅ **Database-Backed**: Refresh tokens stored and validated in PostgreSQL  
✅ **Security Best Practices**: HTTP-only, Secure, SameSite cookies  
✅ **Token Hashing**: SHA-256 hashing before database storage  

The system is designed to be secure, scalable, and user-friendly, providing a seamless authentication experience while maintaining strong security posture.

---

## Validation Checklist

For validation purposes, verify:

- [ ] CSRF Guard is registered as global guard
- [ ] CSRF Guard skips safe HTTP methods (GET, HEAD, OPTIONS)
- [ ] CSRF Guard validates tokens for state-changing methods
- [ ] Access tokens expire after 15 minutes
- [ ] Refresh tokens expire after 7 days (or 30 days if rememberMe)
- [ ] Refresh tokens are hashed before database storage
- [ ] Old refresh tokens are invalidated on refresh
- [ ] Cookies are HTTP-only, Secure (production), SameSite Strict
- [ ] CSRF token is accessible via JavaScript (not HTTP-only)
- [ ] Token type validation prevents type confusion
- [ ] Database validation checks revocation and expiration
- [ ] Separate secrets for access and refresh tokens

