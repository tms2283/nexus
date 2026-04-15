/**
 * auth.ts — Core authentication utilities for Nexus.
 * Handles password hashing, JWT session tokens, and cookie management.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { parse as parseCookies } from "cookie";
import type { Response, Request } from "express";
import { COOKIE_NAME, SESSION_LIFETIME_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";

const BCRYPT_ROUNDS = 12;
const LEGACY_SESSION_COOKIE_NAME = "nexus_session";
const SESSION_EXPIRY_SECONDS = Math.floor(SESSION_LIFETIME_MS / 1000);

// ─── Password ────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export interface SessionPayload {
  userId: number;
  email: string | null;
}

export function createSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, ENV.cookieSecret, { expiresIn: SESSION_EXPIRY_SECONDS });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, ENV.cookieSecret) as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Cookie ───────────────────────────────────────────────────────────────────

export function setAuthCookie(req: Request, res: Response, token: string): void {
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: SESSION_LIFETIME_MS,
  });
}

export function clearAuthCookie(req: Request, res: Response): void {
  const expiredCookieOptions = {
    ...getSessionCookieOptions(req),
    maxAge: -1,
  };

  res.clearCookie(COOKIE_NAME, expiredCookieOptions);
  res.clearCookie(LEGACY_SESSION_COOKIE_NAME, expiredCookieOptions);
}

export function getSessionTokenFromRequest(req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie ?? "");
  return cookies[COOKIE_NAME] ?? cookies[LEGACY_SESSION_COOKIE_NAME] ?? null;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export { LEGACY_SESSION_COOKIE_NAME };
