import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { skillMastery } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { SKILLS, SKILL_DOMAINS, matchSkillsToTopics, getPrerequisiteChain } from "../skillTree";

export const skillsRouter = router({
  // Return the full skill tree with this user's mastery levels overlaid
  getTree: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      let masteryMap: Record<string, { level: number; evidenceCount: number }> = {};
      if (db) {
        const rows = await db.select().from(skillMastery)
          .where(eq(skillMastery.cookieId, input.cookieId));
        for (const row of rows) {
          masteryMap[row.skillId] = { level: row.level, evidenceCount: row.evidenceCount };
        }
      }
      return {
        domains: SKILL_DOMAINS,
        skills: SKILLS.map(s => ({
          ...s,
          level: masteryMap[s.id]?.level ?? 0,
          evidenceCount: masteryMap[s.id]?.evidenceCount ?? 0,
          unlocked: s.prerequisites.every(p => (masteryMap[p]?.level ?? 0) >= 1),
        })),
      };
    }),

  // Update mastery for skills inferred from topic tags
  updateFromTopics: publicProcedure
    .input(z.object({
      cookieId: z.string(),
      topics: z.array(z.string()),
      scorePercent: z.number().min(0).max(100),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { updated: 0 };
      const matched = matchSkillsToTopics(input.topics);
      if (matched.length === 0) return { updated: 0 };
      const levelGain = input.scorePercent >= 80 ? 1 : 0;
      let updated = 0;
      for (const skillId of matched) {
        const existing = await db.select().from(skillMastery)
          .where(and(eq(skillMastery.cookieId, input.cookieId), eq(skillMastery.skillId, skillId)))
          .limit(1);
        if (existing.length > 0) {
          const newLevel = Math.min(4, existing[0].level + levelGain);
          await db.update(skillMastery)
            .set({ level: newLevel, evidenceCount: existing[0].evidenceCount + 1, lastUpdated: new Date() })
            .where(and(eq(skillMastery.cookieId, input.cookieId), eq(skillMastery.skillId, skillId)));
        } else {
          await db.insert(skillMastery).values({
            cookieId: input.cookieId, skillId,
            level: levelGain, evidenceCount: 1,
          });
        }
        updated++;
      }
      return { updated, matchedSkills: matched };
    }),

  // Get prerequisite chain for a skill (what to learn first)
  getPrerequisites: publicProcedure
    .input(z.object({ skillId: z.string() }))
    .query(async ({ input }) => {
      const chain = getPrerequisiteChain(input.skillId);
      return { prerequisites: chain };
    }),
});
