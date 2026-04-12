import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { visitorProfiles } from "../../drizzle/schema";
import { eq, sql, desc as descOrder } from "drizzle-orm";

export const leaderboardRouter = router({
  getTopUsers: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20), metric: z.enum(["xp", "streak", "visitCount"]).default("xp") }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { users: [] };
      const col = input.metric === "xp" ? visitorProfiles.xp : input.metric === "streak" ? visitorProfiles.streak : visitorProfiles.visitCount;
      const rows = await db.select({ cookieId: visitorProfiles.cookieId, xp: visitorProfiles.xp, level: visitorProfiles.level, streak: visitorProfiles.streak, visitCount: visitorProfiles.visitCount, badges: visitorProfiles.badges, preferredTopics: visitorProfiles.preferredTopics, createdAt: visitorProfiles.createdAt }).from(visitorProfiles).orderBy(descOrder(col)).limit(input.limit);
      return { users: rows.map((r, i) => ({ ...r, rank: i + 1, displayName: `Explorer #${r.cookieId.slice(-6).toUpperCase()}` })) };
    }),

  getMyRank: publicProcedure
    .input(z.object({ cookieId: z.string(), metric: z.enum(["xp", "streak", "visitCount"]).default("xp") }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { rank: null, total: 0 };
      const col = input.metric === "xp" ? visitorProfiles.xp : input.metric === "streak" ? visitorProfiles.streak : visitorProfiles.visitCount;
      const me = await db.select({ val: col }).from(visitorProfiles).where(eq(visitorProfiles.cookieId, input.cookieId)).limit(1);
      if (!me.length) return { rank: null, total: 0 };
      const myVal = me[0].val ?? 0;
      const above = await db.select({ count: sql<number>`count(*)` }).from(visitorProfiles).where(sql`${col} > ${myVal}`);
      const total = await db.select({ count: sql<number>`count(*)` }).from(visitorProfiles);
      return { rank: (above[0]?.count ?? 0) + 1, total: total[0]?.count ?? 0, value: myVal };
    }),
});

export const dashboardRouter = router({
  getActivity: publicProcedure
    .input(z.object({ cookieId: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { days: [], totalActions: 0, avgPerDay: 0 };
      const { researchSessions, testResults: tr, iqResults: iq, flashcardReviews, flashcardDecks } = await import("../../drizzle/schema");
      const [research, tests, iqs, reviews] = await Promise.all([
        db.select({ createdAt: researchSessions.createdAt }).from(researchSessions).where(eq(researchSessions.cookieId, input.cookieId)),
        db.select({ createdAt: tr.completedAt }).from(tr).where(eq(tr.cookieId, input.cookieId)),
        db.select({ createdAt: iq.completedAt }).from(iq).where(eq(iq.cookieId, input.cookieId)),
        db.select({ createdAt: flashcardReviews.reviewedAt }).from(flashcardReviews).innerJoin(flashcardDecks, eq(flashcardReviews.deckId, flashcardDecks.id)).where(eq(flashcardDecks.cookieId, input.cookieId)),
      ]);
      const dayMap: Record<string, number> = {};
      const allDates = [...research.map(r => r.createdAt), ...tests.map(r => r.createdAt), ...iqs.map(r => r.createdAt), ...reviews.map(r => r.createdAt)].filter(Boolean);
      for (const d of allDates) {
        const key = new Date(d as Date).toISOString().slice(0, 10);
        dayMap[key] = (dayMap[key] ?? 0) + 1;
      }
      const days: Array<{ date: string; count: number }> = [];
      for (let i = 83; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        days.push({ date: d, count: dayMap[d] ?? 0 });
      }
      return { days, totalActions: allDates.length, avgPerDay: allDates.length > 0 ? Math.round((allDates.length / 84) * 10) / 10 : 0 };
    }),

  getInsight: publicProcedure
    .input(z.object({ cookieId: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { insight: null };
      const { testResults: tr, iqResults: iq } = await import("../../drizzle/schema");
      const [tests, iqs] = await Promise.all([
        db.select({ testId: tr.testId, score: tr.score, totalQuestions: tr.totalQuestions, completedAt: tr.completedAt }).from(tr).where(eq(tr.cookieId, input.cookieId)).orderBy(descOrder(tr.completedAt)).limit(20),
        db.select({ iqScore: iq.iqScore, percentile: iq.percentile }).from(iq).where(eq(iq.cookieId, input.cookieId)).orderBy(descOrder(iq.completedAt)).limit(1),
      ]);
      if (tests.length === 0 && iqs.length === 0) return { insight: null };
      const subjectScores: Record<string, number[]> = {};
      for (const t of tests) {
        if (!subjectScores[t.testId]) subjectScores[t.testId] = [];
        subjectScores[t.testId].push(Math.round((t.score / t.totalQuestions) * 100));
      }
      const subjectAvgs = Object.entries(subjectScores).map(([id, scores]) => ({ id, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) })).sort((a, b) => b.avg - a.avg);
      const subjectNames: Record<string, string> = { ai: "AI Knowledge", science: "Science", history: "World History", math: "Mathematics", logic: "Logic & Reasoning", language: "Language", geography: "Geography", philosophy: "Philosophy", technology: "Technology", "art-history": "Art & Culture" };
      let insightText = "";
      const strongest = subjectAvgs[0], weakest = subjectAvgs[subjectAvgs.length - 1];
      if (strongest && weakest && strongest.id !== weakest.id) insightText = `You're strongest in **${subjectNames[strongest.id] ?? strongest.id}** (avg ${strongest.avg}%) and have the most room to grow in **${subjectNames[weakest.id] ?? weakest.id}** (avg ${weakest.avg}%). `;
      else if (strongest) insightText = `You're performing well in **${subjectNames[strongest.id] ?? strongest.id}** with an average of ${strongest.avg}%. `;
      const latestIQ = iqs[0];
      if (latestIQ) { const tier = latestIQ.iqScore >= 130 ? "exceptional" : latestIQ.iqScore >= 115 ? "above average" : latestIQ.iqScore >= 100 ? "average" : "developing"; insightText += `Your IQ assessment of **${latestIQ.iqScore}** places you in the ${tier} range (${latestIQ.percentile}th percentile). `; }
      if (tests.length >= 3) { const recent = tests.slice(0, 3).map(t => Math.round((t.score / t.totalQuestions) * 100)); insightText += `Recent trend: **${recent[0] > recent[2] ? "improving" : recent[0] < recent[2] ? "declining" : "stable"}**.`; }
      return { insight: insightText || null };
    }),
});
