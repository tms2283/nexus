/**
 * Drizzle ORM schema additions for PBSP behavioral data caching.
 *
 * These tables cache behavioral insights in the Nexus MySQL database
 * so the frontend can query them without hitting the PBSP API every time.
 * They are refreshed periodically by the behavioral tRPC router.
 *
 * Add these to the existing drizzle/schema.ts in the Nexus codebase.
 */

import {
  int,
  float,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

// ── Behavioral Profiles (cached from PBSP) ──────────────────────────────

export const behavioralProfiles = mysqlTable(
  "behavioral_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    cookieId: varchar("cookieId", { length: 128 }).notNull(),
    userId: int("userId"),

    // Behavioral traits (0.0 - 1.0)
    traitExplorationBreadth: float("traitExplorationBreadth").default(0.5),
    traitFocusConsistency: float("traitFocusConsistency").default(0.5),
    traitSocialOrientation: float("traitSocialOrientation").default(0.5),
    traitFrictionTolerance: float("traitFrictionTolerance").default(0.5),
    traitEmotionalVolatility: float("traitEmotionalVolatility").default(0.5),
    traitConfidence: float("traitConfidence").default(0.0),

    // Learning style
    learningStylePrimary: varchar("learningStylePrimary", { length: 32 }),
    learningStyleSecondary: varchar("learningStyleSecondary", { length: 32 }),
    learningApproach: varchar("learningApproach", { length: 16 }), // sequential | global
    learningMode: varchar("learningMode", { length: 16 }), // active | reflective

    // Aggregate scores
    avgFocusScore: float("avgFocusScore").default(0),
    avgStruggleScore: float("avgStruggleScore").default(0),
    burnoutRiskScore: float("burnoutRiskScore").default(0),

    // Behavioral data
    peakFocusHours: json("peakFocusHours").$type<number[]>(),
    lowEnergyHours: json("lowEnergyHours").$type<number[]>(),
    topInterests: json("topInterests").$type<
      Array<{ topic: string; confidence: number }>
    >(),
    modeDistribution: json("modeDistribution").$type<
      Record<string, number>
    >(),

    // Stats
    totalSessions: int("totalSessions").default(0),
    totalEvents: int("totalEvents").default(0),
    personalityConfidence: float("personalityConfidence").default(0),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_bp_cookieId").on(table.cookieId),
    index("idx_bp_userId").on(table.userId),
  ]
);

export type BehavioralProfile = typeof behavioralProfiles.$inferSelect;
export type InsertBehavioralProfile = typeof behavioralProfiles.$inferInsert;

// ── Behavioral Insights (cached learning recommendations) ───────────────

export const behavioralInsights = mysqlTable(
  "behavioral_insights",
  {
    id: int("id").autoincrement().primaryKey(),
    cookieId: varchar("cookieId", { length: 128 }).notNull(),

    // Optimal study times
    optimalStudyTimes: json("optimalStudyTimes").$type<
      Array<{ hour: number; focus_probability: number }>
    >(),

    // Struggle areas
    struggleAreas: json("struggleAreas").$type<
      Array<{ topic: string; frequency: number; avg_duration: number }>
    >(),

    // Recommendations
    recommendations: json("recommendations").$type<
      Array<{ type: string; message: string }>
    >(),

    // Current interests
    currentInterests: json("currentInterests").$type<
      Array<{ topic: string; confidence: number; trend: string }>
    >(),

    // Burnout assessment
    burnoutScore: float("burnoutScore").default(0),
    burnoutLabel: varchar("burnoutLabel", { length: 16 }),
    burnoutFactors: json("burnoutFactors").$type<string[]>(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("idx_bi_cookieId").on(table.cookieId)]
);

export type BehavioralInsight = typeof behavioralInsights.$inferSelect;
export type InsertBehavioralInsight = typeof behavioralInsights.$inferInsert;

// ── Connected Platforms ─────────────────────────────────────────────────

export const connectedPlatforms = mysqlTable(
  "connected_platforms",
  {
    id: int("id").autoincrement().primaryKey(),
    cookieId: varchar("cookieId", { length: 128 }).notNull(),
    connectorId: varchar("connectorId", { length: 64 }).notNull(), // youtube, spotify, etc.
    displayName: varchar("displayName", { length: 128 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("disconnected"),
    lastSync: timestamp("lastSync"),
    config: json("config").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_cp_cookieId").on(table.cookieId),
    index("idx_cp_connector").on(table.connectorId),
  ]
);

export type ConnectedPlatform = typeof connectedPlatforms.$inferSelect;
export type InsertConnectedPlatform = typeof connectedPlatforms.$inferInsert;
