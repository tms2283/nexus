/**
 * db/users.ts — User accounts and visitor profiles.
 */
import { eq, desc } from 'drizzle-orm';
import { getDb } from './connection';
import { ENV } from '../_core/env';
import {
  users, visitorProfiles, chatMessages, contactSubmissions,
  type InsertUser, type VisitorProfile, type InsertVisitorProfile, type ChatMessage,
} from '../../drizzle/schema';

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error('User openId is required for upsert');
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ['name', 'email', 'loginMethod'] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = 'admin';
    updateSet.role = 'admin';
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrCreateVisitorProfile(cookieId: string): Promise<VisitorProfile | null> {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(visitorProfiles)
    .where(eq(visitorProfiles.cookieId, cookieId)).limit(1);
  if (existing.length > 0) return existing[0] ?? null;
  await db.insert(visitorProfiles).values({ cookieId });
  const created = await db.select().from(visitorProfiles)
    .where(eq(visitorProfiles.cookieId, cookieId)).limit(1);
  return created[0] ?? null;
}

export async function updateVisitorProfile(
  cookieId: string,
  updates: Partial<InsertVisitorProfile>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(visitorProfiles)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(visitorProfiles.cookieId, cookieId));
}

export async function getChatHistory(cookieId: string, limit = 20): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages)
    .where(eq(chatMessages.cookieId, cookieId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit)
    .then((rows) => rows.reverse());
}

export async function saveChatMessage(
  cookieId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatMessages).values({ cookieId, role, content });
}

export async function saveContactSubmission(data: {
  cookieId?: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactSubmissions).values(data);
}
