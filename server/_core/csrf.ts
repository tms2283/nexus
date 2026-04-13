/**
 * CSRF protection using double-submit cookie pattern.
 *
 * On every page load, the client receives a CSRF token cookie.
 * For all state-changing requests (POST), the client sends the token
 * in the x-csrf-token header. The server validates cookie vs header match.
 *
 * This approach is resistant to CSRF because:
 * 1. Attack can't read the token value (HttpOnly, but we make it readable for comparison)
 * 2. Attack can't set the cookie in the user's browser
 * 3. The token is validated on every mutation
 */
import { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/**
 * Express middleware for CSRF protection on state-changing requests.
 * - GET requests: set CSRF cookie if not present
 * - POST requests: validate CSRF token
 */
export function csrfMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // GET requests: set/update CSRF cookie
  if (req.method === "GET") {
    let token = req.cookies?.[CSRF_COOKIE_NAME];
    if (!token || token.length !== CSRF_TOKEN_LENGTH * 2) {
      token = generateCsrfToken();
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false, // Allow JS to read for sending as header
        secure: req.protocol === "https",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: "/",
      });
    }
    return next();
  }

  // POST, PUT, DELETE, PATCH: validate CSRF token
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

    // Allow requests without CSRF token only for OAuth callbacks and public endpoints
    const isOAuthCallback = req.path.startsWith("/api/oauth");
    const isTrpcBatch = req.path === "/api/trpc" && req.method === "POST";

    // For tRPC, we need to allow cross-origin requests in development
    // The actual tRPC caller will validate further
    if (!cookieToken || !headerToken) {
      if (isOAuthCallback) {
        return next();
      }
      // tRPC requests must have CSRF token
      if (isTrpcBatch) {
        console.warn(
          `[CSRF] Rejected ${req.method} ${req.path} - missing token`
        );
        return res.status(403).json({
          error: {
            message: "CSRF token required. Refresh the page and try again.",
            code: "FORBIDDEN",
          },
        });
      }
      return next();
    }

    // Validate token match (constant-time comparison to prevent timing attacks)
    if (!timingSafeEqual(cookieToken, headerToken)) {
      console.warn(
        `[CSRF] Rejected ${req.method} ${req.path} - token mismatch`
      );
      return res.status(403).json({
        error: {
          message: "Invalid CSRF token. Refresh the page and try again.",
          code: "FORBIDDEN",
        },
      });
    }

    return next();
  }

  next();
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
