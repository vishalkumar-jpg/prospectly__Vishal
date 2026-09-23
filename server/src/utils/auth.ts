import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";
import { appConfig } from "config/app.config";
import crypto from "node:crypto";
import { toUTC } from "./dayjs";

const configService = new ConfigService();
const JWT_SECRET = configService.get<string>("JWT_SECRET");
if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET must be configured. Set JWT_SECRET environment variable."
  );
}
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const SALT_ROUNDS = 10;

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  tokenType?: "access" | "refresh";
}

export interface RefreshToken {
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

// In-memory refresh token store (in production, use Redis or database)
const refreshTokenStore = new Map<string, RefreshToken>();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateAccessToken(
  payload: Omit<JWTPayload, "tokenType">
): string {
  return jwt.sign({ ...payload, tokenType: "access" }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: "prospectly",
  });
}

export function generateRefreshToken(
  payload: Omit<JWTPayload, "tokenType">
): string {
  const refreshToken = jwt.sign(
    { ...payload, tokenType: "refresh" },
    JWT_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      issuer: "prospectly",
    }
  );

  // Store refresh token
  const expiresAt = toUTC();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  refreshTokenStore.set(refreshToken, {
    token: refreshToken,
    userId: payload.userId,
    expiresAt,
    createdAt: toUTC(),
  });

  return refreshToken;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "prospectly",
    }) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function invalidateRefreshToken(token: string): void {
  refreshTokenStore.delete(token);
}

export function isRefreshTokenValid(token: string): boolean {
  const storedToken = refreshTokenStore.get(token);
  if (!storedToken) return false;
  if (storedToken.expiresAt < toUTC()) {
    refreshTokenStore.delete(token);
    return false;
  }
  return true;
}

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  csrfToken: string
): void {
  const { isProduction, cookieNames } = appConfig;
  const domain = appConfig.cookieDomain;

  // Set access token cookie (15 minutes)
  res.cookie(cookieNames.accessToken, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: "/",
    domain,
  });

  // Set refresh token cookie (30 days)
  res.cookie(cookieNames.refreshToken, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/",
    domain,
  });

  // Set CSRF token (not httpOnly - frontend needs to read it)
  res.cookie(cookieNames.csrfToken, csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/",
    domain,
  });
}

export function clearAuthCookies(res: Response): void {
  const { cookieDomain: domain, cookieNames } = appConfig;

  res.clearCookie(cookieNames.accessToken, { path: "/", domain });
  res.clearCookie(cookieNames.refreshToken, { path: "/", domain });
  res.clearCookie(cookieNames.csrfToken, { path: "/", domain });
}

export function extractTokenFromHeader(
  authHeader: string | undefined
): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}
