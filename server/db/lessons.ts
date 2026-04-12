/**
 * db/lessons.ts — AI-generated lesson content, Q&A, progress tracking.
 */
import { eq, desc, and, sql } from 'drizzle-orm';
import { getDb } from './connection';
import {
  lessons, lessonQuestions, lessonAnswers, lessonRatings,
  lessonFeedback, lessonProgress, curriculumProgress, visitorProfiles,
  type Lesson, type InsertLesson,
  type LessonQuestion, type LessonAnswer,
  type LessonRating, type LessonProgress, type CurriculumProgress,
} from '../../drizzle/schema';

export async function saveLesson(data: InsertLesson): Promise<Lesson | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lessons).values(data);
  const id = (result as unknown as { insertId: number }).insertId;
  return getLessonById(id);
}

export async function getLessonById(id: number): Promise<Lesson | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getLessonsByCurriculum(cookieId: string, curriculumId: string): Promise<Lesson[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons)
    .where(and(eq(lessons.cookieId, cookieId), eq(lessons.curriculumId, curriculumId)))
    .orderBy(lessons.order);
}
export async function markLessonComplete(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(lessons).set({ completed: true, completedAt: new Date() }).where(eq(lessons.id, id));
}

export async function incrementLessonViewCount(lessonId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(lessons).set({ viewCount: sql`viewCount + 1` }).where(eq(lessons.id, lessonId));
}

export async function searchSharedLessons(query: string): Promise<Lesson[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons)
    .where(sql`isShared = true AND (title LIKE ${`%${query}%`} OR description LIKE ${`%${query}%`})`)
    .orderBy(desc(lessons.viewCount))
    .limit(20);
}

export async function markLessonAsShared(lessonId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(lessons).set({ isShared: true }).where(eq(lessons.id, lessonId));
}
// ─── Lesson Q&A ───────────────────────────────────────────────────────────────
export async function askLessonQuestion(
  lessonId: number, cookieId: string, question: string,
): Promise<LessonQuestion | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lessonQuestions).values({ lessonId, cookieId, question });
  const id = (result[0] as unknown as { insertId?: number }).insertId;
  if (!id) return null;
  const rows = await db.select().from(lessonQuestions).where(eq(lessonQuestions.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function saveLessonAnswer(questionId: number, aiResponse: string): Promise<LessonAnswer | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lessonAnswers).values({ questionId, aiResponse });
  const id = (result[0] as unknown as { insertId?: number }).insertId;
  if (!id) return null;
  const rows = await db.select().from(lessonAnswers).where(eq(lessonAnswers.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getLessonQuestions(lessonId: number): Promise<LessonQuestion[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonQuestions)
    .where(eq(lessonQuestions.lessonId, lessonId))
    .orderBy(desc(lessonQuestions.createdAt));
}

export async function getQuestionAnswer(questionId: number): Promise<LessonAnswer | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(lessonAnswers)
    .where(eq(lessonAnswers.questionId, questionId)).limit(1);
  return result[0] ?? null;
}

export async function markAnswerHelpful(answerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(lessonAnswers)
    .set({ helpfulCount: sql`helpfulCount + 1` })
    .where(eq(lessonAnswers.id, answerId));
}

// ─── Lesson Ratings & Feedback ────────────────────────────────────────────────
export async function rateLessonAndFeedback(
  lessonId: number, cookieId: string, rating: number, feedback: string, category: string,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(lessonRatings)
    .where(and(eq(lessonRatings.lessonId, lessonId), eq(lessonRatings.cookieId, cookieId))).limit(1);
  if (existing.length > 0) {
    await db.update(lessonRatings).set({ rating, updatedAt: new Date() })
      .where(and(eq(lessonRatings.lessonId, lessonId), eq(lessonRatings.cookieId, cookieId)));
  } else {
    await db.insert(lessonRatings).values({ lessonId, cookieId, rating });
  }
  if (feedback.trim()) {
    await db.insert(lessonFeedback).values({ lessonId, cookieId, feedback, category: category as 'excellent' | 'good' | 'confusing' | 'incorrect' | 'other' });
  }
}

export async function getLessonRating(lessonId: number, cookieId: string): Promise<LessonRating | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(lessonRatings)
    .where(and(eq(lessonRatings.lessonId, lessonId), eq(lessonRatings.cookieId, cookieId))).limit(1);
  return result[0] ?? null;
}

export async function getLessonStats(lessonId: number): Promise<{ avgRating: number; ratingCount: number; feedbackCount: number }> {
  const db = await getDb();
  if (!db) return { avgRating: 0, ratingCount: 0, feedbackCount: 0 };
  const ratingResult = await db.select({
    avgRating: sql<number>`AVG(rating)`,
    ratingCount: sql<number>`COUNT(*)`,
  }).from(lessonRatings).where(eq(lessonRatings.lessonId, lessonId));
  const feedbackResult = await db.select({ feedbackCount: sql<number>`COUNT(*)` })
    .from(lessonFeedback).where(eq(lessonFeedback.lessonId, lessonId));
  return {
    avgRating: ratingResult[0]?.avgRating ?? 0,
    ratingCount: ratingResult[0]?.ratingCount ?? 0,
    feedbackCount: feedbackResult[0]?.feedbackCount ?? 0,
  };
}
// ─── Lesson Progress ──────────────────────────────────────────────────────────
export async function startLessonProgress(cookieId: string, lessonId: number): Promise<LessonProgress | null> {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(lessonProgress)
    .where(and(eq(lessonProgress.cookieId, cookieId), eq(lessonProgress.lessonId, lessonId))).limit(1);
  if (existing.length > 0) {
    await db.update(lessonProgress)
      .set({ lastAccessedAt: new Date(), attempts: sql`attempts + 1` })
      .where(and(eq(lessonProgress.cookieId, cookieId), eq(lessonProgress.lessonId, lessonId)));
    return existing[0] ?? null;
  }
  const result = await db.insert(lessonProgress).values({ cookieId, lessonId });
  const id = (result[0] as unknown as { insertId?: number }).insertId;
  if (!id) return null;
  const rows = await db.select().from(lessonProgress).where(eq(lessonProgress.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function completeLessonProgress(cookieId: string, lessonId: number, timeSpentSeconds: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(lessonProgress)
    .set({ completedAt: new Date(), timeSpentSeconds, lastAccessedAt: new Date() })
    .where(and(eq(lessonProgress.cookieId, cookieId), eq(lessonProgress.lessonId, lessonId)));
}

export async function getUserProgress(cookieId: string): Promise<{ lessons: LessonProgress[]; curricula: CurriculumProgress[] }> {
  const db = await getDb();
  if (!db) return { lessons: [], curricula: [] };
  const lessonsData = await db.select().from(lessonProgress).where(eq(lessonProgress.cookieId, cookieId));
  const curricula = await db.select().from(curriculumProgress).where(eq(curriculumProgress.cookieId, cookieId));
  return { lessons: lessonsData, curricula };
}

export async function getStudyStats(cookieId: string): Promise<{ totalTimeSeconds: number; lessonsCompleted: number; streak: number; lastStudyDate: Date | null }> {
  const db = await getDb();
  if (!db) return { totalTimeSeconds: 0, lessonsCompleted: 0, streak: 0, lastStudyDate: null };
  const result = await db.select({
    totalTimeSeconds: sql<number>`COALESCE(SUM(timeSpentSeconds), 0)`,
    lessonsCompleted: sql<number>`COUNT(CASE WHEN completedAt IS NOT NULL THEN 1 END)`,
    lastStudyDate: sql<Date>`MAX(lastAccessedAt)`,
  }).from(lessonProgress).where(eq(lessonProgress.cookieId, cookieId));
  const profile = await db.select({ streak: visitorProfiles.streak })
    .from(visitorProfiles).where(eq(visitorProfiles.cookieId, cookieId)).limit(1);
  return {
    totalTimeSeconds: result[0]?.totalTimeSeconds ?? 0,
    lessonsCompleted: result[0]?.lessonsCompleted ?? 0,
    streak: profile[0]?.streak ?? 0,
    lastStudyDate: result[0]?.lastStudyDate ?? null,
  };
}

export async function startCurriculumProgress(cookieId: string, curriculumId: string, totalLessons: number): Promise<CurriculumProgress | null> {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(curriculumProgress)
    .where(and(eq(curriculumProgress.cookieId, cookieId), eq(curriculumProgress.curriculumId, curriculumId))).limit(1);
  if (existing.length > 0) return existing[0] ?? null;
  const result = await db.insert(curriculumProgress).values({ cookieId, curriculumId, totalLessons });
  const id = (result[0] as unknown as { insertId?: number }).insertId;
  if (!id) return null;
  const rows = await db.select().from(curriculumProgress).where(eq(curriculumProgress.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getCurriculumProgress(cookieId: string, curriculumId: string): Promise<CurriculumProgress | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(curriculumProgress)
    .where(and(eq(curriculumProgress.cookieId, cookieId), eq(curriculumProgress.curriculumId, curriculumId))).limit(1);
  return result[0] ?? null;
}
