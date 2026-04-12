/**
 * db/flashcards.ts — Flashcard decks, cards, and SM-2 spaced repetition.
 */
import { eq, and, lte, desc } from 'drizzle-orm';
import { getDb } from './connection';
import {
  flashcardDecks, flashcards, flashcardReviews,
  type FlashcardDeck, type Flashcard,
} from '../../drizzle/schema';

export async function getFlashcardDeckById(deckId: number): Promise<FlashcardDeck | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(flashcardDecks).where(eq(flashcardDecks.id, deckId)).limit(1);
  return rows[0] ?? null;
}

export async function getFlashcardDecks(cookieId: string): Promise<FlashcardDeck[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flashcardDecks)
    .where(eq(flashcardDecks.cookieId, cookieId))
    .orderBy(desc(flashcardDecks.createdAt));
}

export async function createFlashcardDeck(data: {
  cookieId: string;
  title: string;
  description?: string;
  sourceType?: 'research' | 'manual' | 'ai_generated';
  sourceId?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(flashcardDecks).values({
    cookieId: data.cookieId,
    title: data.title,
    description: data.description,
    sourceType: data.sourceType ?? 'ai_generated',
    sourceId: data.sourceId,
  });
  return (result as unknown as { insertId: number }).insertId ?? 0;
}

export async function addFlashcardsToDecks(
  deckId: number,
  cards: Array<{ front: string; back: string }>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  for (const card of cards) {
    await db.insert(flashcards).values({ deckId, front: card.front, back: card.back, dueDate: now });
  }
  await db.update(flashcardDecks)
    .set({ cardCount: cards.length, updatedAt: now })
    .where(eq(flashcardDecks.id, deckId));
}

export async function getFlashcardsForDeck(deckId: number): Promise<Flashcard[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flashcards).where(eq(flashcards.deckId, deckId));
}

export async function getDueFlashcards(deckId: number): Promise<Flashcard[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(flashcards)
    .where(and(eq(flashcards.deckId, deckId), lte(flashcards.dueDate, now)));
}

/** SM-2 spaced repetition review */
export async function reviewFlashcard(
  cardId: number,
  deckId: number,
  cookieId: string,
  rating: 'again' | 'hard' | 'good' | 'easy',
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const cards = await db.select().from(flashcards).where(eq(flashcards.id, cardId)).limit(1);
  const card = cards[0];
  if (!card) return;

  const qualityMap: Record<string, number> = { again: 0, hard: 2, good: 3, easy: 5 };
  const q = qualityMap[rating] ?? 0;
  let { easeFactor, repetitions, interval } = card;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  const dueDate = new Date(Date.now() + interval * 86400000);

  await db.update(flashcards)
    .set({ easeFactor, repetitions, interval, dueDate, updatedAt: new Date() })
    .where(eq(flashcards.id, cardId));
  await db.insert(flashcardReviews).values({ cardId, deckId, cookieId, rating });
}
