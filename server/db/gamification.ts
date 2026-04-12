/**
 * db/gamification.ts — XP, badges, streaks, and page visit tracking.
 */
import { eq } from 'drizzle-orm';
import { getDb } from './connection';
import { visitorProfiles } from '../../drizzle/schema';
import { getOrCreateVisitorProfile } from './users';

const BADGE_XP_THRESHOLDS: Record<string, number> = {
  'explorer': 50,
  'curious-mind': 150,
  'deep-diver': 300,
  'ai-whisperer': 500,
  'nexus-scholar': 1000,
};

function computeBadges(
  currentBadges: string[],
  newXp: number,
  aiInteractions?: number,
  streak?: number,
): { badges: string[]; newBadges: string[] } {
  const badges = [...currentBadges];
  const newBadges: string[] = [];
  for (const [badge, threshold] of Object.entries(BADGE_XP_THRESHOLDS)) {
    if (newXp >= threshold && !badges.includes(badge)) {
      badges.push(badge);
      newBadges.push(badge);
    }
  }
  if (aiInteractions !== undefined && aiInteractions >= 5 && !badges.includes('ai-conversationalist')) {
    badges.push('ai-conversationalist');
    newBadges.push('ai-conversationalist');
  }
  if (streak !== undefined) {
    if (streak >= 3 && !badges.includes('streak-3')) { badges.push('streak-3'); newBadges.push('streak-3'); }
    if (streak >= 7 && !badges.includes('streak-7')) { badges.push('streak-7'); newBadges.push('streak-7'); }
  }
  return { badges, newBadges };
}

export async function recordPageVisit(
  cookieId: string,
  page: string,
): Promise<{ xp: number; level: number; streak: number; newBadges: string[] }> {
  const db = await getDb();
  if (!db) return { xp: 0, level: 1, streak: 0, newBadges: [] };
  const profile = await getOrCreateVisitorProfile(cookieId);
  if (!profile) return { xp: 0, level: 1, streak: 0, newBadges: [] };

  const pages = profile.pagesVisited ?? [];
  const isNewPage = !pages.includes(page);
  if (isNewPage) pages.push(page);
  const xpGain = isNewPage ? 10 : 2;

  const today = new Date().toISOString().split('T')[0] ?? '';
  let streak = profile.streak;
  let lastStreakDate = profile.lastStreakDate;
  if (lastStreakDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0] ?? '';
    streak = lastStreakDate === yesterday ? streak + 1 : 1;
    lastStreakDate = today;
  }

  const newXp = profile.xp + xpGain;
  const newLevel = Math.floor(newXp / 100) + 1;
  const { badges: currentBadges, newBadges } = computeBadges(
    profile.badges ?? [],
    newXp,
    undefined,
    streak,
  );

  await db.update(visitorProfiles).set({
    pagesVisited: pages,
    visitCount: profile.visitCount + 1,
    lastVisit: new Date(),
    xp: newXp,
    level: newLevel,
    streak,
    lastStreakDate,
    badges: currentBadges,
    updatedAt: new Date(),
  }).where(eq(visitorProfiles.cookieId, cookieId));

  return { xp: newXp, level: newLevel, streak, newBadges };
}

export async function addXP(
  cookieId: string,
  amount: number,
): Promise<{ xp: number; level: number; newBadges: string[] }> {
  const db = await getDb();
  if (!db) return { xp: 0, level: 1, newBadges: [] };
  const profile = await getOrCreateVisitorProfile(cookieId);
  if (!profile) return { xp: 0, level: 1, newBadges: [] };

  const newXp = profile.xp + amount;
  const newLevel = Math.floor(newXp / 100) + 1;
  const aiInteractions = profile.aiInteractions + 1;
  const { badges: currentBadges, newBadges } = computeBadges(
    profile.badges ?? [],
    newXp,
    aiInteractions,
  );

  await db.update(visitorProfiles).set({
    xp: newXp,
    level: newLevel,
    badges: currentBadges,
    aiInteractions,
    updatedAt: new Date(),
  }).where(eq(visitorProfiles.cookieId, cookieId));

  return { xp: newXp, level: newLevel, newBadges };
}
