import { and, eq } from "drizzle-orm";
import { roleAssignments, type User } from "../../drizzle/schema";
import { getDb } from "../db";

export type AppRole = "owner" | "admin" | "editor" | "analyst" | "support";
export type Permission =
  | "content.read"
  | "content.write"
  | "content.publish"
  | "content.rollback"
  | "users.read"
  | "users.write"
  | "users.roles.manage"
  | "ai.read"
  | "ai.config.write"
  | "ai.providers.test"
  | "research.read"
  | "research.export"
  | "analytics.read"
  | "system.health.read"
  | "system.settings.write"
  | "audit.read"
  | "desktop.sync"
  | "desktop.publish";

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  owner: [
    "content.read", "content.write", "content.publish", "content.rollback",
    "users.read", "users.write", "users.roles.manage",
    "ai.read", "ai.config.write", "ai.providers.test",
    "research.read", "research.export",
    "analytics.read",
    "system.health.read", "system.settings.write",
    "audit.read",
    "desktop.sync", "desktop.publish",
  ],
  admin: [
    "content.read", "content.write", "content.publish", "content.rollback",
    "users.read", "users.write",
    "ai.read", "ai.config.write", "ai.providers.test",
    "research.read", "research.export",
    "analytics.read",
    "system.health.read",
    "audit.read",
    "desktop.sync", "desktop.publish",
  ],
  editor: [
    "content.read", "content.write", "content.publish",
    "ai.read", "ai.providers.test",
    "research.read",
    "desktop.sync", "desktop.publish",
  ],
  analyst: [
    "content.read",
    "ai.read",
    "research.read", "research.export",
    "analytics.read",
    "audit.read",
  ],
  support: [
    "users.read",
    "research.read",
    "analytics.read",
  ],
};

function legacyRoleToAppRole(user: User): AppRole {
  return user.role === "admin" ? "admin" : "support";
}

export async function resolveUserRoles(user: User): Promise<AppRole[]> {
  const roles = new Set<AppRole>([legacyRoleToAppRole(user)]);
  const db = await getDb();
  if (!db) return Array.from(roles);
  const assigned = await db
    .select({ role: roleAssignments.role })
    .from(roleAssignments)
    .where(eq(roleAssignments.userId, user.id));
  for (const item of assigned) roles.add(item.role);
  return Array.from(roles);
}

export async function resolveUserPermissions(user: User): Promise<Set<Permission>> {
  const roles = await resolveUserRoles(user);
  const permissions = new Set<Permission>();
  for (const role of Array.from(roles)) {
    for (const perm of ROLE_PERMISSIONS[role] ?? []) permissions.add(perm);
  }
  return permissions;
}

export async function userHasPermission(user: User, permission: Permission): Promise<boolean> {
  const perms = await resolveUserPermissions(user);
  return perms.has(permission);
}

export async function setSinglePrimaryRole(userId: number, role: AppRole, actorUserId: number | null) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select({ id: roleAssignments.id })
    .from(roleAssignments)
    .where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.role, role)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(roleAssignments).values({ userId, role, assignedByUserId: actorUserId ?? undefined });
  }
}
