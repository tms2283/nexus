/**
 * xpRateLimit.ts — In-process rate limiter for XP grants.
 *
 * Prevents abuse of the visitor addXP endpoint.
 * Tracks grants per cookieId in a rolling 60-second window.
 */

const XP_WINDOW_MS = 60 * 1000;        // 1-minute rolling window
const XP_MAX_GRANTS_PER_WINDOW = 50;   // max individual grant calls per window
const XP_MAX_TOTAL_PER_WINDOW = 500;   // max total XP per window
const XP_MAX_SINGLE_GRANT = 1000;      // max XP in a single call

interface XpWindow {
  grants: number;
  totalXp: number;
  windowStart: number;
}

const xpWindows = new Map<string, XpWindow>();

// Clean up stale windows every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of xpWindows.entries()) {
    if (now - win.windowStart > XP_WINDOW_MS) xpWindows.delete(key);
  }
}, 5 * 60 * 1000);

export interface XpRateLimitResult {
  allowed: boolean;
  reason?: string;
}

export function checkXpRateLimit(cookieId: string, amount: number): XpRateLimitResult {
  // Validate amount
  if (!Number.isInteger(amount) || amount < 1) {
    return { allowed: false, reason: "XP amount must be a positive integer." };
  }
  if (amount > XP_MAX_SINGLE_GRANT) {
    return { allowed: false, reason: `XP amount exceeds maximum of ${XP_MAX_SINGLE_GRANT} per grant.` };
  }

  const now = Date.now();
  const win = xpWindows.get(cookieId);

  if (!win || now - win.windowStart > XP_WINDOW_MS) {
    // New or expired window
    xpWindows.set(cookieId, { grants: 1, totalXp: amount, windowStart: now });
    return { allowed: true };
  }

  if (win.grants >= XP_MAX_GRANTS_PER_WINDOW) {
    return { allowed: false, reason: "XP grant rate limit exceeded. Please slow down." };
  }
  if (win.totalXp + amount > XP_MAX_TOTAL_PER_WINDOW) {
    return { allowed: false, reason: "XP total per minute limit exceeded." };
  }

  win.grants++;
  win.totalXp += amount;
  return { allowed: true };
}
