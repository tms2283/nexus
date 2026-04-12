/**
 * db/mindmaps.ts — Mind map CRUD operations.
 */
import { eq, desc } from 'drizzle-orm';
import { getDb } from './connection';
import { mindMaps, type MindMap, type MindMapNode } from '../../drizzle/schema';

export async function getMindMaps(cookieId: string): Promise<MindMap[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mindMaps)
    .where(eq(mindMaps.cookieId, cookieId))
    .orderBy(desc(mindMaps.updatedAt));
}

export async function getMindMapById(id: number): Promise<MindMap | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(mindMaps).where(eq(mindMaps.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function saveMindMap(data: {
  cookieId: string;
  title: string;
  rootTopic: string;
  nodesJson: MindMapNode[];
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(mindMaps).values(data);
  return (result as unknown as { insertId: number }).insertId ?? 0;
}

export async function updateMindMap(
  id: number,
  data: { title?: string; nodesJson?: MindMapNode[] },
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(mindMaps).set({ ...data, updatedAt: new Date() }).where(eq(mindMaps.id, id));
}

export async function deleteMindMap(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(mindMaps).where(eq(mindMaps.id, id));
}
