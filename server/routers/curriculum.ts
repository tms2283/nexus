import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { eq, and, inArray } from "drizzle-orm";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  goalPaths, goalPathNodes, conceptMastery, concepts,
  learningAssets, conceptAssets, lessonAssessmentResponses,
  backgroundJobs, adaptiveLessonTemplates,
  type InsertGoalPath,
} from "../../drizzle/schema";
import { callAI } from "./shared";
import { getLearnerProfile, getDefaultProfile } from "../services/learnerProfileService";
import { bktUpdate } from "../../shared/utils/bkt";
import type { GoalPathView, GoalPathCard, GoalPathNodeView } from "../../shared/types/goalPath";
import type { LearnerProfile } from "../../shared/types/learnerProfile";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function computeProfileBucket(profile: LearnerProfile): string {
  return [
    profile.readingLevel,
    profile.inferredLearnStyle,
    profile.priorExposure,
    profile.suggestedTier,
  ].join("|");
}

async function resolveLearnerProfile(
  userId: number | null | undefined,
  cookieId: string
): Promise<LearnerProfile> {
  if (userId) {
    try {
      return await getLearnerProfile(userId);
    } catch {
      // fall through to default
    }
  }
  return getDefaultProfile(userId ?? null, cookieId);
}

async function lookupRemediationConcept(
  misconceptionTag: string
): Promise<string | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  // misconceptionTag is expected to be a conceptId
  const rows = await db.select({ id: concepts.id })
    .from(concepts)
    .where(eq(concepts.id, misconceptionTag))
    .limit(1);
  return rows[0]?.id;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const curriculumRouter = router({

  // ── Start a new goal path ─────────────────────────────────────────────────
  startGoal: publicProcedure
    .input(z.object({
      cookieId: z.string(),
      goalText: z.string().min(10).max(1000),
      timeCommitment: z.enum(["light", "moderate", "intense"]).default("moderate"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const profile = await resolveLearnerProfile(ctx.user?.id, input.cookieId);
      const pathId = nanoid(16);

      await db.insert(goalPaths).values({
        id: pathId,
        userId: ctx.user?.id ?? null,
        cookieId: input.cookieId,
        goalText: input.goalText,
        status: "building",
      } satisfies InsertGoalPath);

      // Enqueue async build — don't block the response
      await db.insert(backgroundJobs).values({
        type: "BUILD_GOAL_PATH",
        payload: {
          pathId,
          goalText: input.goalText,
          timeCommitment: input.timeCommitment,
          userId: ctx.user?.id ?? null,
          cookieId: input.cookieId,
          profileSnapshot: profile,
        },
        status: "pending",
      });

      return { pathId };
    }),

  // ── Get a path + its nodes with mastery ───────────────────────────────────
  getPath: publicProcedure
    .input(z.object({ pathId: z.string(), cookieId: z.string() }))
    .query(async ({ input, ctx }): Promise<GoalPathView> => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [path] = await db.select().from(goalPaths)
        .where(eq(goalPaths.id, input.pathId))
        .limit(1);
      if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Path not found" });

      const nodes = await db.select().from(goalPathNodes)
        .where(eq(goalPathNodes.pathId, input.pathId))
        .orderBy(goalPathNodes.sequenceNumber);

      // Batch-fetch concepts and mastery
      const conceptIds = nodes.map(n => n.conceptId);
      const [conceptRows, masteryRows] = conceptIds.length
        ? await Promise.all([
            db.select().from(concepts).where(inArray(concepts.id, conceptIds)),
            db.select().from(conceptMastery).where(
              and(
                eq(conceptMastery.cookieId, input.cookieId),
                inArray(conceptMastery.conceptId, conceptIds)
              )
            ),
          ])
        : [[], []];

      const conceptMap = new Map(conceptRows.map(c => [c.id, c]));
      const masteryMap = new Map(masteryRows.map(m => [m.conceptId, m]));

      const profile = await resolveLearnerProfile(ctx.user?.id, input.cookieId);

      const nodeViews: GoalPathNodeView[] = nodes.map(n => {
        const concept = conceptMap.get(n.conceptId);
        const mastery = masteryMap.get(n.conceptId);
        return {
          sequenceNumber: n.sequenceNumber,
          conceptId: n.conceptId,
          conceptTitle: concept?.title ?? n.conceptId,
          conceptSummary: concept?.summary ?? "",
          estimatedMinutes: concept?.estimatedMinutes ?? 15,
          lessonStatus: n.lessonStatus as GoalPathNodeView["lessonStatus"],
          lessonKey: n.lessonKey ?? undefined,
          masteryPKnown: mastery?.pKnown ?? 0.1,
          mastered: (mastery?.pKnown ?? 0) >= 0.85,
        };
      });

      return {
        pathId: path.id,
        goalText: path.goalText,
        goalSummary: path.goalSummary ?? path.goalText,
        pitch: path.pitch ?? "",
        status: path.status as GoalPathView["status"],
        estimatedTotalMinutes: path.estimatedTotalMinutes,
        nodes: nodeViews,
        profileSnapshot: {
          readingLevel: profile.readingLevel,
          inferredLearnStyle: profile.inferredLearnStyle,
          suggestedTier: profile.suggestedTier,
        },
      };
    }),

  // ── List my paths (compact cards) ─────────────────────────────────────────
  listMyPaths: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input, ctx }): Promise<GoalPathCard[]> => {
      const db = await getDb();
      if (!db) return [];

      const paths = await db.select().from(goalPaths)
        .where(eq(goalPaths.cookieId, input.cookieId))
        .orderBy(goalPaths.createdAt)
        .limit(20);

      const cards: GoalPathCard[] = await Promise.all(paths.map(async p => {
        const nodes = await db.select().from(goalPathNodes)
          .where(eq(goalPathNodes.pathId, p.id));
        const conceptIds = nodes.map(n => n.conceptId);
        const masteryRows = conceptIds.length
          ? await db.select().from(conceptMastery).where(
              and(
                eq(conceptMastery.cookieId, input.cookieId),
                inArray(conceptMastery.conceptId, conceptIds)
              )
            )
          : [];
        const masteredCount = masteryRows.filter(m => m.pKnown >= 0.85).length;
        return {
          pathId: p.id,
          goalText: p.goalText,
          goalSummary: p.goalSummary ?? p.goalText,
          status: p.status as GoalPathCard["status"],
          nodeCount: nodes.length,
          masteredCount,
          estimatedTotalMinutes: p.estimatedTotalMinutes,
          createdAt: p.createdAt,
        };
      }));
      return cards;
    }),

  // ── Abandon a path ────────────────────────────────────────────────────────
  abandonPath: publicProcedure
    .input(z.object({ pathId: z.string(), cookieId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(goalPaths)
        .set({ status: "abandoned" })
        .where(and(eq(goalPaths.id, input.pathId), eq(goalPaths.cookieId, input.cookieId)));
      return { success: true };
    }),

  // ── Advance to a specific concept (get/generate lesson) ───────────────────
  advancePath: publicProcedure
    .input(z.object({
      pathId: z.string(),
      conceptId: z.string(),
      cookieId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const profile = await resolveLearnerProfile(ctx.user?.id, input.cookieId);
      const profileBucket = computeProfileBucket(profile);
      const lessonKey = `path-${input.pathId}-concept-${input.conceptId}`;

      // Check template cache
      const cached = await db.select().from(adaptiveLessonTemplates)
        .where(and(
          eq(adaptiveLessonTemplates.conceptId, input.conceptId),
          eq(adaptiveLessonTemplates.profileBucket, profileBucket)
        ))
        .limit(1);

      if (cached[0]) {
        // Update node to point to cached template
        await db.update(goalPathNodes)
          .set({ lessonKey: cached[0].lessonKey, lessonStatus: "ready" })
          .where(and(
            eq(goalPathNodes.pathId, input.pathId),
            eq(goalPathNodes.conceptId, input.conceptId)
          ));
        return { lessonKey: cached[0].lessonKey, status: "ready" as const };
      }

      // Not cached — enqueue generation
      await db.update(goalPathNodes)
        .set({ lessonKey, lessonStatus: "generating" })
        .where(and(
          eq(goalPathNodes.pathId, input.pathId),
          eq(goalPathNodes.conceptId, input.conceptId)
        ));

      await db.insert(backgroundJobs).values({
        type: "GENERATE_ADAPTIVE_LESSON",
        payload: {
          pathId: input.pathId,
          conceptId: input.conceptId,
          lessonKey,
          profileBucket,
          profileSnapshot: profile,
          cookieId: input.cookieId,
        },
        status: "pending",
      });

      return { lessonKey, status: "generating" as const };
    }),

  // ── Record a retrieval attempt and update BKT mastery ────────────────────
  recordAttempt: publicProcedure
    .input(z.object({
      cookieId: z.string(),
      conceptId: z.string(),
      correct: z.boolean(),
      confidence: z.number().min(1).max(5).optional(),
      itemId: z.string(),
      lessonKey: z.string(),
      misconceptionTag: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Log raw assessment response
      await db.insert(lessonAssessmentResponses).values({
        userId: ctx.user?.id ?? null,
        cookieId: input.cookieId,
        lessonId: input.lessonKey,
        itemId: input.itemId,
        itemKind: "retrieval",
        correct: input.correct,
        confidence: input.confidence ?? null,
        responsePayload: { misconceptionTag: input.misconceptionTag ?? null },
      });

      // BKT update
      const existing = await db.select().from(conceptMastery)
        .where(and(
          eq(conceptMastery.cookieId, input.cookieId),
          eq(conceptMastery.conceptId, input.conceptId)
        ))
        .limit(1);

      const priorKnown = existing[0]?.pKnown ?? 0.10;
      const { pKnown: newPKnown, mastered } = bktUpdate(priorKnown, input.correct);

      if (existing[0]) {
        await db.update(conceptMastery).set({
          pKnown: newPKnown,
          attemptCount: existing[0].attemptCount + 1,
          correctCount: existing[0].correctCount + (input.correct ? 1 : 0),
          masteredAt: (!existing[0].masteredAt && mastered) ? new Date() : existing[0].masteredAt,
          lastAttemptAt: new Date(),
          lastCorrect: input.correct,
        }).where(eq(conceptMastery.id, existing[0].id));
      } else {
        await db.insert(conceptMastery).values({
          userId: ctx.user?.id ?? null,
          cookieId: input.cookieId,
          conceptId: input.conceptId,
          pKnown: newPKnown,
          attemptCount: 1,
          correctCount: input.correct ? 1 : 0,
          masteredAt: mastered ? new Date() : null,
          lastAttemptAt: new Date(),
          lastCorrect: input.correct,
        });
      }

      const remediationConceptId = input.misconceptionTag && !input.correct
        ? await lookupRemediationConcept(input.misconceptionTag)
        : undefined;

      return { pKnown: newPKnown, mastered, remediationConceptId };
    }),

  // ── Get mastery for a set of concepts ────────────────────────────────────
  getMastery: publicProcedure
    .input(z.object({
      cookieId: z.string(),
      conceptIds: z.array(z.string()).max(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db || !input.conceptIds.length) return {} as Record<string, { pKnown: number; mastered: boolean }>;

      const rows = await db.select().from(conceptMastery)
        .where(and(
          eq(conceptMastery.cookieId, input.cookieId),
          inArray(conceptMastery.conceptId, input.conceptIds)
        ));

      const result: Record<string, { pKnown: number; mastered: boolean }> = {};
      for (const row of rows) {
        result[row.conceptId] = { pKnown: row.pKnown, mastered: row.pKnown >= 0.85 };
      }
      return result;
    }),

  // ── Get a single concept snippet (for remediation cards) ─────────────────
  getConceptSnippet: publicProcedure
    .input(z.object({ conceptId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [concept] = await db.select().from(concepts)
        .where(eq(concepts.id, input.conceptId))
        .limit(1);
      if (!concept) return null;
      return { id: concept.id, title: concept.title, summary: concept.summary };
    }),

  // ── Get mastery summary for dashboard ────────────────────────────────────
  getMasterySummary: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { activePaths: [], masteredByDomain: {}, reviewQueue: [] };

      const [activePaths, masteryRows] = await Promise.all([
        db.select().from(goalPaths)
          .where(and(
            eq(goalPaths.cookieId, input.cookieId),
            inArray(goalPaths.status, ["ready", "in_progress"])
          ))
          .limit(10),
        db.select().from(conceptMastery)
          .where(eq(conceptMastery.cookieId, input.cookieId)),
      ]);

      const masteredConceptIds = masteryRows
        .filter(m => m.pKnown >= 0.85)
        .map(m => m.conceptId);

      const masteredByDomain: Record<string, number> = {};
      if (masteredConceptIds.length) {
        const conceptRows = await db.select({ id: concepts.id, domain: concepts.domain })
          .from(concepts)
          .where(inArray(concepts.id, masteredConceptIds));
        for (const c of conceptRows) {
          masteredByDomain[c.domain] = (masteredByDomain[c.domain] ?? 0) + 1;
        }
      }

      // Spaced review: mastered but last attempt > 7 days ago
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const reviewQueue = masteryRows.filter(m =>
        m.pKnown >= 0.85 &&
        m.lastAttemptAt &&
        m.lastAttemptAt < sevenDaysAgo
      ).slice(0, 5).map(m => m.conceptId);

      return { activePaths: activePaths.map(p => p.id), masteredByDomain, reviewQueue };
    }),

  // ── Admin: list all concepts ───────────────────────────────────────────────
  adminListConcepts: adminProcedure
    .input(z.object({
      domain: z.string().optional(),
      reviewStatus: z.enum(["draft", "published", "deprecated"]).optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { concepts: [], total: 0 };

      const conditions = [];
      if (input.domain) conditions.push(eq(concepts.domain, input.domain));
      if (input.reviewStatus) conditions.push(eq(concepts.reviewStatus, input.reviewStatus));

      const rows = await db.select().from(concepts)
        .where(conditions.length ? and(...conditions) : undefined)
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(concepts.domain, concepts.title);

      return { concepts: rows, total: rows.length };
    }),

  // ── Admin: update a concept's status ──────────────────────────────────────
  adminPublishConcept: adminProcedure
    .input(z.object({
      conceptId: z.string(),
      reviewStatus: z.enum(["draft", "published", "deprecated"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(concepts)
        .set({ reviewStatus: input.reviewStatus })
        .where(eq(concepts.id, input.conceptId));
      return { success: true };
    }),

  // ── Admin: upsert a concept ────────────────────────────────────────────────
  adminUpsertConcept: adminProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().max(255),
      summary: z.string(),
      domain: z.string().max(64),
      bloomLevel: z.enum(["remember", "understand", "apply", "analyze", "evaluate", "create"]),
      estimatedMinutes: z.number().min(5).max(120).default(15),
      reviewStatus: z.enum(["draft", "published", "deprecated"]).default("draft"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.insert(concepts).values({
        id: input.id,
        title: input.title,
        summary: input.summary,
        domain: input.domain,
        bloomLevel: input.bloomLevel,
        estimatedMinutes: input.estimatedMinutes,
        reviewStatus: input.reviewStatus,
        source: "admin-authored",
      }).onDuplicateKeyUpdate({
        set: {
          title: input.title,
          summary: input.summary,
          domain: input.domain,
          bloomLevel: input.bloomLevel,
          estimatedMinutes: input.estimatedMinutes,
          reviewStatus: input.reviewStatus,
        },
      });
      return { success: true };
    }),
});
