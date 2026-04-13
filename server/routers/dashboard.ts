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
      const {
        researchSessions, testResults: tr, iqResults: iq,
        flashcardReviews, flashcardDecks,
      } = await import("../../drizzle/schema");

      // Use SQL DATE() + GROUP BY instead of loading all rows into JS memory
      const cutoff = new Date(Date.now() - 84 * 86400000);

      const [researchCounts, testCounts, iqCounts, reviewCounts] = await Promise.all([
        db.select({ date: sql<string>`DATE(createdAt)`, count: sql<number>`COUNT(*)` })
          .from(researchSessions)
          .where(sql`cookieId = ${input.cookieId} AND createdAt >= ${cutoff}`)
          .groupBy(sql`DATE(createdAt)`),
        db.select({ date: sql<string>`DATE(completedAt)`, count: sql<number>`COUNT(*)` })
          .from(tr)
          .where(sql`cookieId = ${input.cookieId} AND completedAt >= ${cutoff}`)
          .groupBy(sql`DATE(completedAt)`),
        db.select({ date: sql<string>`DATE(completedAt)`, count: sql<number>`COUNT(*)` })
          .from(iq)
          .where(sql`cookieId = ${input.cookieId} AND completedAt >= ${cutoff}`)
          .groupBy(sql`DATE(completedAt)`),
        db.select({ date: sql<string>`DATE(flashcard_reviews.reviewedAt)`, count: sql<number>`COUNT(*)` })
          .from(flashcardReviews)
          .innerJoin(flashcardDecks, eq(flashcardReviews.deckId, flashcardDecks.id))
          .where(sql`flashcard_decks.cookieId = ${input.cookieId} AND flashcard_reviews.reviewedAt >= ${cutoff}`)
          .groupBy(sql`DATE(flashcard_reviews.reviewedAt)`),
      ]);

      // Merge all counts into a single date map
      const dayMap: Record<string, number> = {};
      for (const rows of [researchCounts, testCounts, iqCounts, reviewCounts]) {
        for (const row of rows) {
          if (row.date) dayMap[row.date] = (dayMap[row.date] ?? 0) + Number(row.count);
        }
      }

      const days: Array<{ date: string; count: number }> = [];
      for (let i = 83; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        days.push({ date: d, count: dayMap[d] ?? 0 });
      }
      const totalActions = Object.values(dayMap).reduce((a, b) => a + b, 0);
      return {
        days,
        totalActions,
        avgPerDay: totalActions > 0 ? Math.round((totalActions / 84) * 10) / 10 : 0,
      };
    }),

  getInsight: publicProcedure
    .input(z.object({ cookieId: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { insight: null };
      const { testResults: tr, iqResults: iq } = await import("../../drizzle/schema");
      const [tests, iqs] = await Promise.all([
        db.select().from(tr).where(eq(tr.cookieId, input.cookieId)).orderBy(descOrder(tr.completedAt)).limit(20),
        db.select().from(iq).where(eq(iq.cookieId, input.cookieId)).orderBy(descOrder(iq.completedAt)).limit(1),
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
