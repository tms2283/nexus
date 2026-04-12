/**
 * csrf.ts — CSRF protection via the Double-Submit Cookie pattern.
 *
 * Uses the `cookie` package (already a project dependency — no new installs).
 *
 * How it works:
 * - On first request, a random token is set as a readable (non-httpOnly) cookie `csrf_token`
 * - On every mutating request (POST/PUT/PATCH/DELETE), the server requires the
 *   `x-csrf-token` header to match the cookie value
 * - Because the session cookie is httpOnly + sameSite=lax, an attacker on another
 *   origin cannot read the csrf_token cookie or set the header
 *
 * Exemptions: safe methods, OAuth callback, localhost in development
 */
import { randomBytes, timingSafeEqual } from "crypto";
import { parse as parseCookies } from "cookie";
import type { Express, Request, Response, NextFunction } from "express";

const CSRF_COOKIE  = "csrf_token";
const CSRF_HEADER  = "x-csrf-token";
const TOKEN_BYTES  = 32;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXEMPT_PATHS = new Set(["/api/oauth/callback"]);

function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

function isLocalhost(req: Request): boolean {
  const h = req.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/** Constant-time string comparison to prevent timing attacks */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

export function applyCsrfProtection(app: Express): void {
  // ── Step 1: Ensure every response carries a CSRF token cookie ─────────────
  app.use((req: Request, res: Response, next: NextFunction) => {
    const cookies = parseCookies(req.headers.cookie ?? "");
    let token = cookies[CSRF_COOKIE];

    if (!token) {
      token = generateToken();
      res.cookie(CSRF_COOKIE, token, {
        sameSite: "lax",
        secure: req.protocol === "https",
        path: "/",
        httpOnly: false,          // Must be readable by JS so it can be sent as header
        maxAge: 24 * 60 * 60,    // 24 hours in seconds
      });
    }

    // Expose the token on the request object for downstream use
    (req as Request & { csrfToken: string }).csrfToken = token;
    next();
  });

  // ── Step 2: Validate token on every mutating request ──────────────────────
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();
    if (EXEMPT_PATHS.has(req.path)) return next();
    if (process.env.NODE_ENV !== "production" && isLocalhost(req)) return next();

    const cookies     = parseCookies(req.headers.cookie ?? "");
    const cookieToken = cookies[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER];

    if (
      !cookieToken ||
      typeof headerToken !== "string" ||
      !safeEqual(cookieToken, headerToken)
    ) {
      res.status(403).json({
        error: "CSRF validation failed",
        message: "Missing or invalid x-csrf-token header.",
      });
      return;
    }

    next();
  });
}
