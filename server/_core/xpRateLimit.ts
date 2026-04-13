/**
 * XP Rate Limiter — enforces limits on XP grants per visitor
 *
 * Limits:
 * - Max single grant: 1000 XP
 * - Max grants per window: 50
 * - Window: 1 hour
 * - Amount must be a positive integer
 */
import { TRPCError } from "@trpc/server";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_GRANTS = 50; // Max 50 grants per hour per cookieId

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const xpRateLimitMap = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if an XP grant is allowed
 * @returns Result with allowed=true if within limits, or allowed=false with reason
 */
export function checkXpRateLimit(
  cookieId: string,
  amount: number
): RateLimitResult {
  // Validate amount is a positive integer
  if (!Number.isInteger(amount)) {
    return { allowed: false, reason: "XP amount must be an integer" };
  }
  if (amount <= 0) {
    return { allowed: false, reason: "XP amount must be positive" };
  }
  if (amount > 1000) {
    return { allowed: false, reason: "Maximum single XP grant is 1000" };
  }

  const now = Date.now();
  const entry = xpRateLimitMap.get(cookieId);

  // If no entry or window has expired, start fresh
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    xpRateLimitMap.set(cookieId, { count: 1, windowStart: now });
    return { allowed: true };
  }

  // Check if under limit
  if (entry.count >= RATE_LIMIT_MAX_GRANTS) {
    return {
      allowed: false,
      reason: "Rate limit exceeded. Max 50 XP grants per hour.",
    };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Record a successful XP grant (for tracking purposes)
 * Call this after a successful grant to increment the counter
 */
export function recordXpGrant(cookieId: string): void {
  const now = Date.now();
  const entry = xpRateLimitMap.get(cookieId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    xpRateLimitMap.set(cookieId, { count: 1, windowStart: now });
  } else {
    entry.count++;
  }
}

/**
 * Clean up expired entries (call periodically to prevent memory leaks)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, val] of xpRateLimitMap.entries()) {
    if (now - val.windowStart > RATE_LIMIT_WINDOW_MS) {
      xpRateLimitMap.delete(key);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredEntries, RATE_LIMIT_WINDOW_MS);
