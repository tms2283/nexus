/**
 * db/research.ts — Research sessions and codex entries.
 */
import { eq, desc } from 'drizzle-orm';
import { getDb } from './connection';
import { researchSessions, codexEntries, type ResearchSession } from '../../drizzle/schema';

export async function saveResearchSession(data: {
  cookieId: string;
  title: string;
  sourceText?: string;
  sourceUrl?: string;
  summary?: string;
  keyInsights?: string[];
  notes?: string;
  tags?: string[];
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(researchSessions).values(data);
  return (result as unknown as { insertId: number }).insertId ?? 0;
}

export async function getResearchSessions(cookieId: string): Promise<ResearchSession[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(researchSessions)
    .where(eq(researchSessions.cookieId, cookieId))
    .orderBy(desc(researchSessions.createdAt))
    .limit(20);
}

export async function updateResearchSessionNotes(id: number, notes: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(researchSessions).set({ notes, updatedAt: new Date() }).where(eq(researchSessions.id, id));
}

// ─── Codex ────────────────────────────────────────────────────────────────────
export async function getCodexEntries(category?: string) {
  const db = await getDb();
  if (!db) return [];
  if (category) {
    return db.select().from(codexEntries).where(eq(codexEntries.category, category));
  }
  return db.select().from(codexEntries).orderBy(desc(codexEntries.createdAt));
}

let _codexSeeded = false;

export async function seedCodexEntries(): Promise<void> {
  if (_codexSeeded) return;
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(codexEntries).limit(1);
  if (existing.length > 0) { _codexSeeded = true; return; }
  const entries = [
    { title: 'The Illustrated Guide to Neural Networks', description: 'A visual, intuitive walkthrough of how neural networks learn.', url: 'https://colah.github.io/posts/2015-09-Visual-Information/', category: 'AI & Machine Learning', tags: ['neural-networks', 'deep-learning', 'visualization'], difficulty: 'intermediate' as const, featured: true },
    { title: 'Attention Is All You Need', description: 'The landmark paper introducing the Transformer architecture.', url: 'https://arxiv.org/abs/1706.03762', category: 'AI & Machine Learning', tags: ['transformers', 'attention', 'nlp'], difficulty: 'advanced' as const, featured: true },
    { title: 'Andrej Karpathy: Neural Networks Zero to Hero', description: 'A complete video series building neural networks from scratch.', url: 'https://karpathy.ai/zero-to-hero.html', category: 'AI & Machine Learning', tags: ['neural-networks', 'python'], difficulty: 'intermediate' as const, featured: true },
    { title: 'The Pragmatic Programmer', description: 'Timeless principles for writing clean, maintainable code.', url: 'https://pragprog.com/titles/tpp20/', category: 'Software Engineering', tags: ['best-practices', 'career'], difficulty: 'intermediate' as const, featured: true },
    { title: 'Designing Data-Intensive Applications', description: 'The definitive guide to building scalable data systems.', url: 'https://dataintensive.net', category: 'Software Engineering', tags: ['databases', 'distributed-systems'], difficulty: 'advanced' as const, featured: true },
    { title: 'Refactoring UI', description: 'Practical design advice for developers.', url: 'https://www.refactoringui.com', category: 'Design', tags: ['ui-design', 'css'], difficulty: 'beginner' as const, featured: true },
    { title: 'Laws of UX', description: 'Key psychological principles designers should know.', url: 'https://lawsofux.com', category: 'Design', tags: ['ux', 'psychology'], difficulty: 'beginner' as const, featured: true },
    { title: 'The Missing Semester of Your CS Education', description: 'MIT course covering shell, git, vim, debugging.', url: 'https://missing.csail.mit.edu', category: 'Software Engineering', tags: ['tools', 'shell', 'git'], difficulty: 'beginner' as const, featured: false },
  ];
  for (const entry of entries) {
    await db.insert(codexEntries).values(entry);
  }
  _codexSeeded = true;
}
