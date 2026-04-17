import { auditLogs } from "../../drizzle/schema";
import { getDb } from "../db";

type ClientType = "web-admin" | "desktop-studio" | "system";

export interface AuditWriteInput {
  actorUserId: number | null;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  clientType?: ClientType;
}

export async function writeAuditLog(input: AuditWriteInput): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId ?? undefined,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId != null ? String(input.resourceId) : undefined,
    beforeJson: input.before ?? null,
    afterJson: input.after ?? null,
    ipAddress: input.ipAddress ?? undefined,
    userAgent: input.userAgent ?? undefined,
    clientType: input.clientType ?? "web-admin",
  });
}
