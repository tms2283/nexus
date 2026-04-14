/**
 * auth.ts — Core authentication utilities for Nexus.
 * Handles password hashing, JWT session tokens, and cookie management.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Response, Request } from "express";
import { ENV } from "./_core/env";

const BCRYPT_ROUNDS = 12;
const SESSION_COOKIE_NAME = "nexus_session";
const SESSION_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30 days

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

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: "lax",
    maxAge: SESSION_EXPIRY_SECONDS * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
}

export function getSessionTokenFromRequest(req: Request): string | null {
  return req.cookies?.[SESSION_COOKIE_NAME] ?? null;
}

export { SESSION_COOKIE_NAME };
