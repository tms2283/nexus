import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifySessionToken, getSessionTokenFromRequest } from "../auth";
import { getUserById, getUserByOpenId } from "../db";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const token = getSessionTokenFromRequest(opts.req);
    if (token) {
      const payload = verifySessionToken(token);
      if (payload?.userId) {
        user = await getUserById(payload.userId);
      } else {
        const session = await sdk.verifySession(token);
        if (session?.openId) {
          user = (await getUserByOpenId(session.openId)) ?? null;
        }
      }
    }
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
