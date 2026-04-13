import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  visitorCookieId: string | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let visitorCookieId: string | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Extract visitor cookie ID from request cookies
  const cookies = opts.req.headers.cookie
    ? parseCookies(opts.req.headers.cookie)
    : {};
  visitorCookieId = cookies[VISTOR_COOKIE_NAME] || null;

  return {
    req: opts.req,
    res: opts.res,
    user,
    visitorCookieId,
  };
}

const VISTOR_COOKIE_NAME = "nexus_visitor_id";

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach(cookie => {
    const [name, ...rest] = cookie.split("=");
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join("=").trim();
    }
  });

  return cookies;
}
