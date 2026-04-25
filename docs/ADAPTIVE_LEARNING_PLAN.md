# Adaptive Learning Platform — Execution Plan

> **Audience:** Implementing model (Sonnet 4.6). You have **no memory** of the prior conversation. This document is self-contained. Read §1–§4 before touching code. Each phase (§5–§8) is independently shippable and in strict order. Do not skip phases.
>
> **North star:** The homepage promises *"AI-Powered Adaptive Learning / Tell us your goal. We build a personalized curriculum."* Today that promise is a static AI Literacy course + a weak "generate a markdown curriculum" button. This plan turns it into a real goal→concept-graph→personalized-path→adaptive-lesson→mastery-tracked system that reuses 113 curated OER assets and generates missing lessons on demand.
>
> **Golden rule:** Reuse existing infrastructure. Don't rebuild what's there. When in doubt, extend.

---

## 1. Context you need before writing code

### 1.1 Stack fundamentals (verify before assuming)

- **DB:** MySQL via Drizzle ORM. All new tables use `mysqlTable`, `mysqlEnum`, `varchar`, `text`, `json`, `int`, `boolean`, `timestamp`, `float`, `index` imported from `drizzle-orm/mysql-core`. **Not Postgres.** No arrays — use `json().$type<string[]>()`.
- **Backend:** Node + tRPC. Routers live in `server/routers/*.ts`, registered in `server/routers/index.ts`. Helper: `callAI(cookieId, prompt, systemPrompt?, maxTokens=1024)` in `server/routers/shared.ts` handles rate limiting, logging, provider fallback.
- **Frontend:** React + Vite + wouter routing + TanStack Query via tRPC. Styled with Tailwind + oklch colors + `glass` utility class. Framer Motion for animation. Pages in `client/src/pages/*.tsx`, lesson blocks in `client/src/components/lesson/*.tsx`.
- **Background jobs:** `server/_core/jobRunner.ts` polls the `backgroundJobs` table every 5 min. Dispatches on `job.type` string. Add new job types by extending `processJob` in that file.
- **Auth:** `ctx.user?.id` is the registered-user id; anonymous users get a `cookieId` via `visitorProfiles`. **Everything must work for both**, keyed on `(userId ?? null, cookieId)`.

### 1.2 What already exists (do not rebuild)

**Adaptive lesson rendering (done — extend, don't replace):**
- `shared/types/lessonSeed.ts` defines `LessonTemplate`, `LessonSeed`, `LessonSection`, `RetrievalChoice`. Eight section kinds today: `narrative`, `analogy`, `example`, `retrieval`, `productive-failure`, `span-select`, `reflection`, `rubric`.
- `shared/types/learnerProfile.ts` defines `LearnerProfile` (reading level, learn style, suggested tier, accuracy, calibration gap).
- `server/services/lessonSeedFactory.ts` — `composeLessonSeed(template, profile)` is the canonical compiler: productive-failure probe → narrative+analogy+example per concept → tier-scaled retrieval → extras → reflection.
- `client/src/components/lesson/LessonSeedRenderer.tsx` dispatches section kinds to block components. Blocks: `ProductiveFailureBlock`, `RetrievalWithConfidence`, `SpanSelectBlock`, plus inline narrative/analogy/example/reflection.
- `client/src/components/lesson/AdaptiveLessonView.tsx` consumes `trpc.lesson.getSeededLesson`. **Works for any course** — not AI Literacy specific.
- Existing courses with templates: `shared/content/aiLiteracy/lessonTemplates.ts`, `shared/content/aiByAI/lessonTemplates.ts`. `server/routers/lesson.ts` line ~445 falls back between them: `AI_LITERACY_TEMPLATES[id] ?? AI_BY_AI_TEMPLATES[id]`.

**Goal→curriculum flow (primitive — extend):**
- `server/routers/ai.ts` has `generateCurriculum` mutation. Takes `{goal, currentLevel, timeAvailable, interests}`, returns `{title, description, estimatedWeeks, phases:[{phase, title, duration, objectives, resources, milestone}], curriculumId}`. Enqueues `GENERATE_LESSON` background jobs.
- `server/_core/jobRunner.ts` `processJob` handles `GENERATE_LESSON` — writes a free-text markdown lesson via `saveLesson`.
- `client/src/pages/Learn.tsx` (6859 lines) has a `CurriculumGenerator` component around line 6150 that calls the above mutation. Tabs include `"curriculum"` and `"paths"`.

**Progress / mastery infrastructure (use as-is):**
- `lessons` (id:int, cookieId, curriculumId, title, content, objectives, order, difficulty, estimatedMinutes, isShared, completed, …)
- `lessonBlueprints`, `lessonSections` (older section-row model; coexists with LessonSeed).
- `sectionCompletions` (cookieId, lessonId, sectionId, answerCorrect, timeSpentSeconds).
- `lessonProgress` (cookieId, userId, lessonId:int, startedAt, completedAt, attempts).
- `curriculumProgress` (cookieId, curriculumId:varchar255, lessonsCompleted, totalLessons).
- `lessonAssessmentResponses` (cookieId, lessonId:varchar64, itemId, itemKind, correct, confidence, responsePayload). **Use this for every retrieval attempt.**
- `lessonReflections`, `skillMastery` (cookieId, skillId, level, evidenceCount), `backgroundJobs`, `visitorProfiles`, `userPsychProfiles`.

**Assets file (read, don't re-derive):**
- `C:\Users\tmsch\Downloads\Nexus_Asset_Catalog.xlsx` — 113 curated OER items. Sheet **"Asset Catalog"** has columns: `Source Platform`, `Asset Title`, `URL`, `Content Type`, `License Name`, `License URL`, `Suggested Learning Objective`, `Difficulty Level`, `Est. Duration`, `Assessment Availability`, `Visual/Interactive Tags`, `Priority (1-3)`, `Notes`. Priority 1 = 74 assets, all CC BY or public domain / commercial-OK. Top sources: OpenStax (25), MIT OCW (12), LibreTexts (10), Saylor (9), OpenLearn (9), PhET (8), Khan Academy (5), Alison (5).

### 1.3 Hard constraints

1. **Zero breaking changes** to existing AI Literacy or AI by AI lessons. They must continue to render unchanged.
2. **Every adaptive lesson must render through `LessonSeedRenderer`** — no bespoke renderers.
3. **License-safe by default.** Content flagged `nc_only` must be hidden when `process.env.NEXUS_COMMERCIAL === "true"` (default false for now — ship with all priority-1 assets visible).
4. **No raw string IDs mixed with int IDs.** Adaptive lessons use string `lessonId` (like `path-<pathId>-concept-<conceptId>`). `lesson_assessment_responses` already uses `lessonId:varchar64` — good. Do not pass these into `lessons.id:int` columns.
5. **All LLM calls go through `callAI`** — never import an AI SDK directly in routers.
6. **Typecheck must pass** after each phase (`npm run typecheck` or `tsc --noEmit`).

### 1.4 Verification before acting on memory

If you read a "memory" or this doc says a file is at `X:Y`, run `Grep` / `Read` to confirm before editing. File line numbers drift. Paths given here are accurate at doc time but verify names.

---

## 2. Architectural decisions (already made — do not revisit)

| Decision | Chosen | Rejected alternative | Why |
|---|---|---|---|
| Concept graph storage | MySQL tables `concepts` + `concept_prerequisites` with recursive CTEs | Neo4j | Stack is already MySQL; graphs are small (<50k nodes); recursive CTE is fast enough; no new infra. |
| Mastery model | BKT-lite (4 params) stored in `concept_mastery`, computed in TS | pyBKT / IRT | No Python runtime; BKT-lite is a single update formula; IRT is future work. |
| On-demand lesson generation | Existing `backgroundJobs` + new type `GENERATE_ADAPTIVE_LESSON` | New queue infra | Job runner exists and works. |
| Goal → concepts | Two-stage LLM: (1) decompose goal into learning outcomes; (2) match outcomes to existing concepts + propose new concept stubs | One-shot | Grounds output in real catalog; prevents hallucinated concept names. |
| Content sourcing | OER catalog (Nexus xlsx) + LLM-generated lesson templates with Wolfram/PhET embeds | Pure LLM generation | "Good artists copy, great artists steal" — reuse vetted material; LLM stitches narrative around curated assets. |
| Licensing | Enum `commercial_ok | nc_only | deep_link_only` per asset, enforced at render | Trust-by-default | Legal safety. |
| Misconception handling | Extend `RetrievalChoice` with optional `misconceptionTag`; on wrong choice, route to remediation narrative | Full MisEdu-RAG dual-hypergraph | 10% of the complexity, 80% of the value. |
| Interactive content | New section kinds `embed` (iframe whitelist), `diagram` (Mermaid), `computation` (Wolfram widget), `video` (YouTube/MIT OCW) | Custom players | Iframes are safe with sandbox + CSP; Mermaid renders client-side. |
| Curriculum UI | Extend existing `/learn` curriculum tab + add `/path/:pathId` page; reuse `AdaptiveLessonView` | Build `/goal` from scratch | `CurriculumGenerator` in Learn.tsx already has the "tell us your goal" form. |
| Asset ingestion | One-time `scripts/ingest-nexus.ts` that parses xlsx, LLM-tags each asset to concepts, inserts rows | Manual tagging | 113 assets is too many to hand-tag; LLM with retry is good enough at priority 1 quality. |

### 2.1 BKT update formula (exact math — implement literally)

Per `(learnerKey, conceptId)` pair, track `pKnown ∈ [0,1]`:

```
Constants (lesson-level defaults; override per concept later):
  p_init  = 0.10   // prior before any evidence
  p_learn = 0.20   // probability of learning on a single attempt
  p_slip  = 0.10   // P(wrong | known)
  p_guess = 0.20   // P(right | not known)
  mastery_threshold = 0.85

After observing a correct/incorrect attempt:
  let pL = current pKnown (or p_init if first time)
  if correct:
    pL_given_obs = (pL * (1 - p_slip)) / (pL * (1 - p_slip) + (1 - pL) * p_guess)
  else:
    pL_given_obs = (pL * p_slip) / (pL * p_slip + (1 - pL) * (1 - p_guess))
  new_pL = pL_given_obs + (1 - pL_given_obs) * p_learn
  store new_pL; if new_pL >= mastery_threshold → mark concept mastered
```

Unit test must verify: starting from 0.1, two consecutive correct answers push pKnown above 0.5; five consecutive correct push above 0.85.

---

## 3. The new data model

All new tables go in `drizzle/schema.ts` **at the end of the file**, before the final newline. Follow the existing style: explicit types, `index()` in the `(t) => ({ ... })` tuple, `export type X = typeof x.$inferSelect`, `export type InsertX = typeof x.$inferInsert`.

### 3.1 New tables (add verbatim — comments inline)

```typescript
// ───────────────────────────────────────── Concept graph ─────────────────────
// A concept is an atomic learnable idea ("gradient descent", "Nash equilibrium").
// Concepts are the grain at which we track mastery and compose lesson paths.
export const concepts = mysqlTable("concepts", {
  id: varchar("id", { length: 96 }).primaryKey(), // slug: "calc-derivative-chain-rule"
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary").notNull(),               // 1-2 sentences, shown on path cards
  domain: varchar("domain", { length: 64 }).notNull(), // "math", "cs", "physics", "ai", "writing", etc.
  bloomLevel: mysqlEnum("bloomLevel", ["remember", "understand", "apply", "analyze", "evaluate", "create"]).notNull(),
  estimatedMinutes: int("estimatedMinutes").default(15).notNull(),
  // Canonical misconceptions keyed by short id — reused by retrieval choices.
  misconceptions: json("misconceptions").$type<Array<{ id: string; misconception: string; reality: string }>>(),
  // Which vocabulary/glossary keys this concept surfaces. Optional for now.
  vocabKeys: json("vocabKeys").$type<string[]>(),
  source: mysqlEnum("source", ["seeded", "llm-extracted", "admin-authored"]).default("llm-extracted").notNull(),
  reviewStatus: mysqlEnum("reviewStatus", ["draft", "published", "deprecated"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  domainIdx: index("concepts_domain_idx").on(t.domain),
  statusIdx: index("concepts_status_idx").on(t.reviewStatus),
}));
export type Concept = typeof concepts.$inferSelect;
export type InsertConcept = typeof concepts.$inferInsert;

// Directed prerequisite edges. (prerequisiteId) must be mastered before (conceptId).
// Admin can mark "strength" soft (preferred) vs hard (required).
export const conceptPrerequisites = mysqlTable("concept_prerequisites", {
  id: int("id").autoincrement().primaryKey(),
  conceptId: varchar("conceptId", { length: 96 }).notNull(),
  prerequisiteId: varchar("prerequisiteId", { length: 96 }).notNull(),
  strength: mysqlEnum("strength", ["hard", "soft"]).default("hard").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  conceptIdx: index("concept_prereq_concept_idx").on(t.conceptId),
  prereqIdx: index("concept_prereq_prereq_idx").on(t.prerequisiteId),
  pairIdx: index("concept_prereq_pair_idx").on(t.conceptId, t.prerequisiteId),
}));
export type ConceptPrerequisite = typeof conceptPrerequisites.$inferSelect;
export type InsertConceptPrerequisite = typeof conceptPrerequisites.$inferInsert;

// ───────────────────────────────────────── Learning assets (Nexus catalog) ───
export const learningAssets = mysqlTable("learning_assets", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  sourcePlatform: varchar("sourcePlatform", { length: 128 }).notNull(), // "OpenStax", "MIT OCW", …
  contentType: mysqlEnum("contentType", [
    "textbook", "article", "video", "simulation", "interactive", "problem-set", "lecture", "other"
  ]).notNull(),
  licenseName: varchar("licenseName", { length: 128 }).notNull(),
  licenseUrl: varchar("licenseUrl", { length: 1024 }),
  // Runtime gate: determines whether we can render in a commercial deploy.
  licenseCategory: mysqlEnum("licenseCategory", ["commercial_ok", "nc_only", "deep_link_only"]).notNull(),
  difficultyLevel: mysqlEnum("difficultyLevel", ["intro", "core", "stretch"]).default("core").notNull(),
  estimatedMinutes: int("estimatedMinutes").default(15).notNull(),
  hasAssessment: boolean("hasAssessment").default(false).notNull(),
  visualTags: json("visualTags").$type<string[]>(),   // "video", "interactive", "diagram", "simulation"
  priority: int("priority").default(3).notNull(),     // 1 = best, 3 = reserve
  // Whether we can embed via iframe. null = unknown / not tested; computed during ingest.
  embeddable: boolean("embeddable"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  platformIdx: index("learning_assets_platform_idx").on(t.sourcePlatform),
  licenseIdx: index("learning_assets_license_idx").on(t.licenseCategory),
  priorityIdx: index("learning_assets_priority_idx").on(t.priority),
}));
export type LearningAsset = typeof learningAssets.$inferSelect;
export type InsertLearningAsset = typeof learningAssets.$inferInsert;

// Which assets teach which concepts. M:N. LLM populates during ingestion;
// admin can reweight via /admin/concepts UI in a later phase.
export const conceptAssets = mysqlTable("concept_assets", {
  id: int("id").autoincrement().primaryKey(),
  conceptId: varchar("conceptId", { length: 96 }).notNull(),
  assetId: int("assetId").notNull(),
  role: mysqlEnum("role", ["primary", "practice", "deep-dive", "alternate"]).default("primary").notNull(),
  relevanceScore: float("relevanceScore").default(0.5), // 0..1, LLM-assigned
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  conceptIdx: index("concept_assets_concept_idx").on(t.conceptId),
  assetIdx: index("concept_assets_asset_idx").on(t.assetId),
}));
export type ConceptAsset = typeof conceptAssets.$inferSelect;
export type InsertConceptAsset = typeof conceptAssets.$inferInsert;

// ───────────────────────────────────────── Goal paths ────────────────────────
// A learner enters a goal → we produce a goalPath = ordered concepts to master.
export const goalPaths = mysqlTable("goal_paths", {
  id: varchar("id", { length: 64 }).primaryKey(),   // nanoid
  userId: int("userId"),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  goalText: varchar("goalText", { length: 1000 }).notNull(),
  goalSummary: varchar("goalSummary", { length: 255 }),  // LLM short title
  // LLM's explanation of what this path teaches, shown on the path page header.
  pitch: text("pitch"),
  estimatedTotalMinutes: int("estimatedTotalMinutes").default(0).notNull(),
  status: mysqlEnum("status", ["building", "ready", "in_progress", "completed", "abandoned"]).default("building").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  cookieIdx: index("goal_paths_cookie_idx").on(t.cookieId),
  userIdx: index("goal_paths_user_idx").on(t.userId),
  statusIdx: index("goal_paths_status_idx").on(t.status),
}));
export type GoalPath = typeof goalPaths.$inferSelect;
export type InsertGoalPath = typeof goalPaths.$inferInsert;

// Ordered concepts within a goalPath. sequenceNumber defines learn order.
export const goalPathNodes = mysqlTable("goal_path_nodes", {
  id: int("id").autoincrement().primaryKey(),
  pathId: varchar("pathId", { length: 64 }).notNull(),
  conceptId: varchar("conceptId", { length: 96 }).notNull(),
  sequenceNumber: int("sequenceNumber").notNull(),
  // After generation, the adaptive lesson key (so we can fetch it via getSeededLesson).
  lessonKey: varchar("lessonKey", { length: 128 }),
  lessonStatus: mysqlEnum("lessonStatus", ["queued", "generating", "ready", "failed"]).default("queued").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  pathSeqIdx: index("goal_path_nodes_path_seq_idx").on(t.pathId, t.sequenceNumber),
  pathIdx: index("goal_path_nodes_path_idx").on(t.pathId),
  conceptIdx: index("goal_path_nodes_concept_idx").on(t.conceptId),
}));
export type GoalPathNode = typeof goalPathNodes.$inferSelect;
export type InsertGoalPathNode = typeof goalPathNodes.$inferInsert;

// ───────────────────────────────────────── Concept mastery (BKT-lite) ────────
export const conceptMastery = mysqlTable("concept_mastery", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  conceptId: varchar("conceptId", { length: 96 }).notNull(),
  pKnown: float("pKnown").default(0.1).notNull(),   // BKT-lite posterior
  attemptCount: int("attemptCount").default(0).notNull(),
  correctCount: int("correctCount").default(0).notNull(),
  masteredAt: timestamp("masteredAt"),              // set when pKnown crosses 0.85
  lastAttemptAt: timestamp("lastAttemptAt"),
  lastCorrect: boolean("lastCorrect"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  cookieConceptIdx: index("concept_mastery_cookie_concept_idx").on(t.cookieId, t.conceptId),
  userConceptIdx: index("concept_mastery_user_concept_idx").on(t.userId, t.conceptId),
}));
export type ConceptMastery = typeof conceptMastery.$inferSelect;
export type InsertConceptMastery = typeof conceptMastery.$inferInsert;

// ───────────────────────────────────────── Lesson template cache ─────────────
// On-demand-generated LessonTemplate shapes persisted so we don't regenerate
// every request. Keyed by conceptId + profile-signature bucket.
export const adaptiveLessonTemplates = mysqlTable("adaptive_lesson_templates", {
  id: int("id").autoincrement().primaryKey(),
  lessonKey: varchar("lessonKey", { length: 128 }).notNull().unique(),
  conceptId: varchar("conceptId", { length: 96 }).notNull(),
  // Low-cardinality bucketed signature so we can reuse templates across similar profiles.
  profileBucket: varchar("profileBucket", { length: 64 }).notNull(),
  templateJson: json("templateJson").$type<Record<string, unknown>>().notNull(), // LessonTemplate
  generatorModel: varchar("generatorModel", { length: 64 }),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
}, (t) => ({
  conceptBucketIdx: index("adaptive_templates_concept_bucket_idx").on(t.conceptId, t.profileBucket),
}));
export type AdaptiveLessonTemplate = typeof adaptiveLessonTemplates.$inferSelect;
export type InsertAdaptiveLessonTemplate = typeof adaptiveLessonTemplates.$inferInsert;
```

### 3.2 TypeScript type extensions (edit `shared/types/lessonSeed.ts`)

Add three new section kinds + extend `RetrievalChoice` with misconception tagging. **Do not break the existing union** — append.

```typescript
// ───────── Extend LessonSectionKind union ─────────
export type LessonSectionKind =
  | "narrative"
  | "analogy"
  | "example"
  | "retrieval"
  | "productive-failure"
  | "span-select"
  | "reflection"
  | "rubric"
  | "embed"         // NEW: iframe a curated asset (video, simulation, article)
  | "diagram"       // NEW: Mermaid diagram
  | "computation";  // NEW: Wolfram Alpha widget

// ───────── Extend RetrievalChoice ─────────
export interface RetrievalChoice {
  id: string;
  text: string;
  correct: boolean;
  rationale: string;
  /** NEW: If this is a known misconception, which one? Used to route to remediation. */
  misconceptionTag?: string;
  /** NEW: If set, when learner picks this, they're shown this remediation conceptId next. */
  remediationConceptId?: string;
}

// ───────── New section blocks ─────────
export interface EmbedBlock {
  kind: "embed";
  id: string;
  title: string;
  /** Full asset URL. Must be allow-listed by the renderer; see ALLOWED_EMBED_HOSTS. */
  url: string;
  /** Explicit iframe-mode vs deep-link: "iframe" renders sandboxed iframe; "link" renders a card. */
  displayMode: "iframe" | "link";
  sourcePlatform: string;      // "OpenStax", "PhET", …
  licenseCategory: "commercial_ok" | "nc_only" | "deep_link_only";
  /** Pre/post prompts to frame the asset pedagogically. */
  beforePrompt?: string;
  afterPrompt?: string;
  /** Optional expected watch/read minutes, drives progress estimation. */
  estimatedMinutes?: number;
}

export interface DiagramBlock {
  kind: "diagram";
  id: string;
  title?: string;
  /** Mermaid syntax. Renderer sanitizes; see §6.4. */
  mermaid: string;
  caption?: string;
}

export interface ComputationBlock {
  kind: "computation";
  id: string;
  prompt: string;              // "Graph y = x^2 from -3 to 3"
  /** Wolfram Alpha query OR a self-hosted sandbox; MVP uses Wolfram iframe embed. */
  wolframQuery: string;
  /** What the learner is supposed to notice — shown after they interact. */
  takeaway: string;
}

// Extend LessonSection union
export type LessonSection =
  | NarrativeBlock
  | AnalogyBlock
  | ExampleBlock
  | RetrievalBlock
  | ProductiveFailureBlock
  | SpanSelectBlock
  | ReflectionBlock
  | RubricBlock
  | EmbedBlock
  | DiagramBlock
  | ComputationBlock;
```

### 3.3 New types for goal paths (add to `shared/types/goalPath.ts`)

```typescript
import type { LearnerProfile } from "./learnerProfile";

export interface GoalPathDecomposition {
  goalSummary: string;        // ≤120 chars, displayed as title
  pitch: string;              // 2-3 sentences, why this path is right for the goal
  estimatedWeeks: number;
  outcomes: string[];         // ["Understand conditional probability", …]
}

export interface GoalPathConceptPlan {
  conceptId: string;          // existing if matched, or new slug to create
  title: string;
  isNew: boolean;             // LLM flagged a concept not in catalog
  rationale: string;          // why this concept belongs in the path
  prerequisiteIds: string[];  // must be earlier in the path
  sourceOutcomeIndex: number; // which decomposition.outcomes[] drove this concept
}

export interface GoalPathPlan {
  decomposition: GoalPathDecomposition;
  concepts: GoalPathConceptPlan[];   // topologically sorted
}

export interface GoalPathView {
  pathId: string;
  goalText: string;
  goalSummary: string;
  pitch: string;
  status: "building" | "ready" | "in_progress" | "completed" | "abandoned";
  nodes: Array<{
    sequenceNumber: number;
    conceptId: string;
    conceptTitle: string;
    conceptSummary: string;
    estimatedMinutes: number;
    lessonStatus: "queued" | "generating" | "ready" | "failed";
    lessonKey?: string;
    masteryPKnown: number;
    mastered: boolean;
  }>;
  profileSnapshot: Pick<LearnerProfile, "readingLevel" | "inferredLearnStyle" | "suggestedTier">;
}
```

---

## 4. The API surface

All new procedures go in **new file** `server/routers/curriculum.ts`. Register it in `server/routers/index.ts` by adding `curriculum: curriculumRouter`.

Signatures (exact — implement these shapes):

```typescript
// server/routers/curriculum.ts
curriculumRouter = router({

  // ── Goal entry ────────────────────────────────────────────────────────────
  startGoal: publicProcedure
    .input(z.object({
      cookieId: z.string(),
      goalText: z.string().min(10).max(1000),
      timeCommitment: z.enum(["light", "moderate", "intense"]).default("moderate"),
    }))
    .mutation(async ({ input, ctx }) => { /* §5.3 */ })
    // Returns: { pathId: string }  — path row is in "building" status; worker fills it.

  getPath: publicProcedure
    .input(z.object({ pathId: z.string(), cookieId: z.string() }))
    .query(async ({ input, ctx }): Promise<GoalPathView> => { /* §5.4 */ }),

  listMyPaths: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input, ctx }) => { /* returns compact path cards */ }),

  abandonPath: publicProcedure
    .input(z.object({ pathId: z.string(), cookieId: z.string() }))
    .mutation(/* soft-delete → status=abandoned */),

  // ── Lesson advance ────────────────────────────────────────────────────────
  /**
   * Called when the user opens lesson N on a path.
   * Returns existing template or enqueues generation and returns { status:"generating" }.
   */
  advancePath: publicProcedure
    .input(z.object({
      pathId: z.string(),
      conceptId: z.string(),
      cookieId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => { /* §7.2 */ })
    // Returns: { lessonKey: string; status: "ready"|"generating" }

  // ── Mastery ───────────────────────────────────────────────────────────────
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
    .mutation(async ({ input, ctx }) => { /* §7.3 — BKT update */ })
    // Returns: { pKnown: number; mastered: boolean; remediationConceptId?: string }

  getMastery: publicProcedure
    .input(z.object({ cookieId: z.string(), conceptIds: z.array(z.string()) }))
    .query(/* returns Record<conceptId, {pKnown, mastered}> */),

  // ── Admin / content mgmt (Phase 4) ────────────────────────────────────────
  adminListConcepts: adminProcedure.input(/* pagination */).query(/* … */),
  adminUpsertConcept: adminProcedure.input(/* … */).mutation(/* … */),
  adminPublishConcept: adminProcedure.input(/* … */).mutation(/* sets reviewStatus=published */),
});
```

**IMPORTANT:** `advancePath` does NOT call `lesson.getSeededLesson`. It only ensures the template exists (generating if needed) and returns the `lessonKey`. The client then calls `lesson.getSeededLesson` with `{ lessonId: lessonKey }` through the existing path — we extend `getSeededLesson` in §7.4 to fall back to `adaptiveLessonTemplates` lookup.

---

## 5. Phase 1 — Concept graph + Nexus ingestion (Week 1)

**Ships:** The database knows about 113 OER assets, ~80 seeded concepts, and prerequisite edges between them. An admin-only UI shows the graph. No learner-facing change yet.

**Deliverable is shippable even if Phase 2 never ships** — concept catalog has standalone value.

### 5.1 Migration — create new tables

1. Paste the 7 table definitions from §3.1 into the end of `drizzle/schema.ts`.
2. Generate migration:
   ```bash
   npm run db:generate   # or whatever the drizzle-kit script is; check package.json scripts
   ```
3. Verify the generated SQL migration file does NOT drop any existing table. If drizzle-kit tries to drop, fix by pinning the migration.
4. Apply: `npm run db:migrate` (verify script name).
5. Sanity: connect and `SHOW TABLES LIKE 'concept%';` — expect `concepts`, `concept_prerequisites`, `concept_assets`, `concept_mastery`.

### 5.2 Ingestion script — `scripts/ingest-nexus.ts`

Writes to `learning_assets` and `concepts` + `concept_prerequisites` + `concept_assets`.

**Behavior:**
1. Parse the xlsx. Use `xlsx` or `exceljs` npm package — add to devDependencies if missing. (Alternative: convert to CSV first with a one-time Python/manual step and check the CSV into `data/nexus_catalog.csv`; this is simpler and reproducible. **Prefer CSV path.**)
2. For each row in the "Asset Catalog" sheet:
   - Upsert into `learning_assets`. Compute `licenseCategory` from `License Name`:
     - `CC BY`, `CC0`, `Public Domain` → `commercial_ok`
     - `CC BY-NC`, `CC BY-NC-SA`, `CC BY-NC-ND` → `nc_only`
     - proprietary, "All rights reserved", unknown → `deep_link_only`
   - Compute `embeddable`: true for YouTube, PhET, MIT OCW, OpenStax, Saylor, OpenLearn, LibreTexts; false for Khan Academy (anti-frame), Alison (login-gated), otherwise null.
3. Call `extractConceptsFromAssetBatch` — an LLM pass that takes 10-asset chunks and returns `{ conceptId, title, summary, domain, bloomLevel, assetIds, relevanceScore }[]`. Dedupe conceptIds via the LLM's own suggestions; canonicalize to slug `kebab-case-title`.
4. Upsert `concepts` rows. Mark `source="llm-extracted"`, `reviewStatus="draft"`.
5. Insert `concept_assets` rows for each concept→asset mapping.
6. Second LLM pass `proposePrerequisites(conceptsInDomain)`: for each domain, take all concepts in that domain and ask LLM for a DAG of prerequisites. Insert `concept_prerequisites` rows. **Validate acyclicity** before insert (see §5.5).

**The two prompts (use verbatim):**

```
// System for extractConceptsFromAssetBatch
You are a curriculum designer indexing an open educational resource catalog.
Given 10 assets, output JSON only. No prose. Schema:
{"concepts":[{"conceptId":"<kebab-case-slug>","title":"<Title Case>","summary":"<1-2 sentences, neutral>","domain":"<math|cs|physics|chem|bio|writing|history|ai|econ|other>","bloomLevel":"<remember|understand|apply|analyze|evaluate|create>","estimatedMinutes":<int 5-60>,"assetIndices":[<0-based indices into the input>],"relevanceScores":[<0..1 for each index>]}]}
Guidelines:
- Prefer broad-but-atomic concepts ("chain rule" > "derivatives", but not as narrow as "example 3.4").
- Reuse conceptIds across similar assets; dedupe aggressively.
- Use the asset's Suggested Learning Objective field when present.
- Bloom level: match the verbs in the LO. "Define/identify" = understand; "apply/calculate" = apply; "compare/critique" = analyze/evaluate.
```

```
// System for proposePrerequisites
You are a curriculum architect. Given a list of concepts in one domain, output the
prerequisite DAG as JSON only. Schema:
{"edges":[{"from":"<conceptId that must be learned first>","to":"<conceptId>","strength":"<hard|soft>"}]}
Rules:
- Output a DAG; no cycles.
- "hard" when the target concept genuinely cannot be understood without the source.
- "soft" when the source makes the target easier but is not strictly required.
- Only use conceptIds from the provided list; do not invent new ones.
- Keep the graph sparse — prefer 1-3 prerequisites per concept over exhaustive chains.
```

**Script structure:**

```typescript
// scripts/ingest-nexus.ts
import fs from "node:fs";
import { parse as parseCsv } from "csv-parse/sync";
import { getDb } from "../server/db";
import { learningAssets, concepts, conceptAssets, conceptPrerequisites } from "../drizzle/schema";
import { callAI } from "../server/routers/shared";

async function main() {
  const csv = fs.readFileSync("data/nexus_catalog.csv", "utf8");
  const rows = parseCsv(csv, { columns: true, skip_empty_lines: true }) as RawRow[];
  const db = await getDb();

  // 1. Insert assets
  const assetIds = await upsertAssets(db, rows);

  // 2. Extract concepts in batches of 10
  const allConcepts = new Map<string, PendingConcept>();
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const extracted = await extractConceptsFromAssetBatch(batch);
    for (const c of extracted) mergeConcept(allConcepts, c, batch, assetIds.slice(i, i + 10));
  }
  await upsertConcepts(db, allConcepts);
  await upsertConceptAssets(db, allConcepts);

  // 3. Prereqs per domain
  const byDomain = groupByDomain(allConcepts);
  for (const [domain, group] of byDomain) {
    const edges = await proposePrerequisites(group);
    const valid = dropCycles(edges, group);
    await upsertPrerequisites(db, valid);
  }

  console.log(`Done. ${allConcepts.size} concepts, ${rows.length} assets.`);
}
main().catch(e => { console.error(e); process.exit(1); });
```

Add to `package.json` scripts: `"ingest:nexus": "tsx scripts/ingest-nexus.ts"`.

### 5.3 Cycle detection (inline in ingestion + in `advancePath`)

```typescript
// Kahn's algorithm — returns topologically sorted conceptIds; throws on cycle.
export function topoSort(conceptIds: string[], edges: Array<{from: string; to: string}>): string[] {
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const id of conceptIds) { indeg.set(id, 0); adj.set(id, []); }
  for (const e of edges) {
    if (!indeg.has(e.from) || !indeg.has(e.to)) continue;
    adj.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }
  const queue = [...indeg.entries()].filter(([, d]) => d === 0).map(([id]) => id);
  const result: string[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    result.push(n);
    for (const m of adj.get(n) ?? []) {
      indeg.set(m, indeg.get(m)! - 1);
      if (indeg.get(m) === 0) queue.push(m);
    }
  }
  if (result.length !== conceptIds.length) {
    throw new Error(`Cycle detected in concept graph: ${conceptIds.filter(c => !result.includes(c)).join(", ")}`);
  }
  return result;
}

export function dropCycles<E extends {from: string; to: string}>(edges: E[], conceptIds: string[]): E[] {
  // Greedy: add edges in order; skip any that would create a cycle.
  const kept: E[] = [];
  for (const e of edges) {
    const trial = [...kept, e];
    try { topoSort(conceptIds, trial); kept.push(e); } catch { /* skip */ }
  }
  return kept;
}
```

Put this in `shared/utils/graphSort.ts` so both server and client can use it.

### 5.4 Acceptance checks for Phase 1

- [ ] `SELECT COUNT(*) FROM learning_assets` returns 113.
- [ ] `SELECT COUNT(*) FROM concepts` returns between 40 and 120. (If outside this range, rerun with tighter prompts.)
- [ ] `SELECT COUNT(*) FROM concept_assets` > 150.
- [ ] `SELECT COUNT(*) FROM concept_prerequisites` > 30.
- [ ] Calling `topoSort(allConceptIds, allEdges)` succeeds (no cycles).
- [ ] `nc_only` count > 0 (verify NC filtering actually has something to filter).
- [ ] `ingest:nexus` is **idempotent** — running twice leaves the DB in the same state.
- [ ] `npm run typecheck` passes.

---

## 6. Phase 2 — Goal → path generation (Week 2)

**Ships:** Learner enters a goal, backend generates a personalized concept path, learner sees the path on `/path/:pathId` with "not yet started" status for each node. **No lesson generation yet** — clicking a node shows "coming soon" placeholder.

### 6.1 Router — `server/routers/curriculum.ts` — `startGoal` implementation

```typescript
// Pseudocode — follow this structure
startGoal: publicProcedure
  .input(/* as defined §4 */)
  .mutation(async ({ input, ctx }) => {
    const profile = await resolveLearnerProfile(ctx.user?.id, input.cookieId);
    const pathId = nanoid(16);

    // Insert a "building" row immediately so client can poll.
    await db.insert(goalPaths).values({
      id: pathId,
      userId: ctx.user?.id ?? null,
      cookieId: input.cookieId,
      goalText: input.goalText,
      status: "building",
    });

    // Enqueue build job — do NOT block the mutation on the LLM.
    await db.insert(backgroundJobs).values({
      type: "BUILD_GOAL_PATH",
      payload: { pathId, goalText: input.goalText, timeCommitment: input.timeCommitment,
                 userId: ctx.user?.id ?? null, cookieId: input.cookieId,
                 profileSnapshot: profile },
      status: "pending",
    });

    return { pathId };
  }),
```

### 6.2 Worker — extend `server/_core/jobRunner.ts` processJob

Add new case `BUILD_GOAL_PATH`. The worker runs two LLM passes:

**Pass A — decompose goal:**

```
// System prompt
You are a pedagogical planner for Nexus, an adaptive learning platform. A learner
stated a goal. Produce a decomposition that a curriculum engine can execute.
Output JSON only. Schema:
{"goalSummary":"<title-case, ≤80 chars>","pitch":"<2-3 sentences speaking TO the learner; concrete, non-marketing>","estimatedWeeks":<int 1-12>,"outcomes":["<verb-led, measurable outcome>", …]}
Rules:
- 4-8 outcomes. Each outcome uses a Bloom verb (understand, apply, analyze, compare, build, design).
- Outcomes must be sequential: later outcomes depend on earlier ones.
- Match reading/learn style hints in the user message (if provided).
- If the goal is too broad ("learn everything about AI"), narrow it in goalSummary and explain in pitch.
- If the goal is harmful, refuse by setting goalSummary="refused" and pitch explaining why. Return empty outcomes.
```

User message template:
```
Goal: {{goalText}}
Time commitment: {{timeCommitment}}  (light=1-3h/wk, moderate=4-7h/wk, intense=8+h/wk)
Learner profile:
  - background: {{profile.inferredBackground}}
  - interests: {{profile.inferredInterests.join(", ")}}
  - learn style: {{profile.inferredLearnStyle}}
  - reading level: {{profile.readingLevel}}
  - prior exposure: {{profile.priorExposure}}
```

**Pass B — map outcomes to concepts.** The catalog is potentially large, so fetch candidate concepts by semantic substring match on outcome keywords + domain heuristics (see helper below). Pass only candidates (≤100) to the LLM:

```
// System prompt
You are matching learning outcomes to an existing concept catalog. Some outcomes
won't have a matching concept — propose a new one only when no existing concept
fits. Output JSON only. Schema:
{"concepts":[{"conceptId":"<existing-or-new-slug>","title":"<Title Case>","isNew":<bool>,"rationale":"<1 sentence>","prerequisiteIds":["<conceptId from this list>"],"sourceOutcomeIndex":<int>,"estimatedMinutes":<int 5-45>}]}
Rules:
- Use existing conceptIds exactly as given when they match. Do not rename.
- For new concepts, generate a kebab-case slug that won't collide with existing ids.
- Prerequisites reference other items IN YOUR OUTPUT. Produce a DAG.
- Order output roughly by learning order, but the engine will re-topo-sort.
- Skip outcomes that are ungrounded fluff ("have fun", "feel confident"); don't force a concept for them.
```

User message:
```
Outcomes from decomposition:
{{outcomes.map((o,i) => `[${i}] ${o}`).join("\n")}}

Existing concept catalog (<=100 candidates matched by keyword):
{{candidates.map(c => `- ${c.conceptId}: ${c.title} — ${c.summary}`).join("\n")}}
```

**Post-processing in the worker:**

1. Validate all referenced conceptIds are either in the candidate set OR marked `isNew`.
2. For new concepts: insert stubs into `concepts` with `source="llm-extracted"`, `reviewStatus="draft"`, and enqueue a one-shot `POPULATE_CONCEPT_ASSETS` job to attach 1-3 existing assets via vector/keyword match. (If no match found, skip — lessons can still generate pure-LLM content.)
3. Build the combined prerequisite set: path-local edges from the LLM + transitive edges from `concept_prerequisites` for existing concepts (traverse ≤2 hops).
4. `topoSort` all concepts; drop the path if cycle detection fails after `dropCycles`.
5. Insert `goal_path_nodes` rows in topological order.
6. Update `goalPaths.status = "ready"`, set `goalSummary`, `pitch`, `estimatedTotalMinutes`.
7. On any failure: update `status = "abandoned"`, set `pitch = "We couldn't build this path. Try rephrasing your goal."`, rethrow (so jobRunner retries up to MAX_ATTEMPTS).

### 6.3 Candidate concept matcher (fast, pre-LLM filter)

```typescript
// server/services/conceptMatcher.ts
export async function findCandidateConcepts(outcomes: string[], db: Db): Promise<Concept[]> {
  // Extract keywords: lowercase non-stopwords ≥4 chars across all outcomes.
  const keywords = tokenize(outcomes.join(" "));
  if (keywords.length === 0) return [];

  // MySQL LIKE ORs across title + summary. Cap at 100 results by score.
  const rows = await db.select().from(concepts)
    .where(and(
      eq(concepts.reviewStatus, "published"),
      or(...keywords.map(k => or(like(concepts.title, `%${k}%`), like(concepts.summary, `%${k}%`))))
    ))
    .limit(200);

  // Re-rank by keyword overlap count; take top 100.
  const scored = rows.map(r => ({ r, score: keywords.filter(k =>
    r.title.toLowerCase().includes(k) || r.summary.toLowerCase().includes(k)
  ).length })).sort((a, b) => b.score - a.score).slice(0, 100);

  return scored.map(s => s.r);
}
```

**Stopword list:** Keep inline (~50 common English words). Don't install a package.

### 6.4 Client — path view page `client/src/pages/PathView.tsx`

- Route: `/path/:pathId` (add to `App.tsx` lazy routes). Mirror the existing lazy-loading pattern.
- On mount, `trpc.curriculum.getPath.useQuery({ pathId, cookieId })` with `refetchInterval: status === "building" ? 3000 : false`.
- Render states:
  - `building`: Skeleton + "We're designing your path…" with a 4-phase progress ticker.
  - `ready`: Header (goalSummary + pitch + estimated weeks) + vertical scroll list of `PathNodeCard` components, each showing title, summary, estimated minutes, and a button that goes to `/lesson/<lessonKey>` (disabled with "generating…" spinner for queued nodes).
  - `in_progress`/`completed`: Same list, but with mastery bars (pKnown bar, green when mastered).
- Style: reuse existing `glass` cards, oklch colors matching `Learn.tsx` tabs for visual coherence.

### 6.5 Client — extend the CurriculumGenerator in `Learn.tsx`

At the existing location (~line 6150 — verify with `Grep "CurriculumGenerator"`), add a second button **"Generate adaptive path"** next to the existing "Generate curriculum" button. It calls `trpc.curriculum.startGoal` and navigates to `/path/:pathId`. Leave the old path in place for now (remove in Phase 4).

### 6.6 Acceptance checks for Phase 2

- [ ] Submitting a goal redirects to `/path/:pathId` within 1s.
- [ ] The page polls, then within ≤60s renders a 4-8 concept path.
- [ ] The path is topologically ordered (earlier prereqs first).
- [ ] Submitting the same goal twice produces two distinct paths (not deduplicated).
- [ ] Submitting a harmful goal ("how to synthesize nerve agent") returns a path with `goalSummary="refused"` and empty nodes; client renders a graceful "we can't build that" screen.
- [ ] Clicking a ready node shows "Lesson generation coming in Phase 3" placeholder (not a blank screen).

---

## 7. Phase 3 — On-demand adaptive lesson generation (Week 3)

**Ships:** Clicking a concept in a path generates a full `LessonTemplate` (cached in `adaptiveLessonTemplates`), renders through existing `LessonSeedRenderer`, records attempts, updates BKT mastery. The section kinds `embed`, `diagram`, `computation` render.

### 7.1 New section kind renderers

Extend `client/src/components/lesson/LessonSeedRenderer.tsx` — add cases for the three new kinds.

**EmbedBlock renderer** (`client/src/components/lesson/EmbedBlock.tsx`):
```typescript
// Allow-list of embed hosts. Reject all others at render time.
const ALLOWED_EMBED_HOSTS = new Set([
  "www.youtube.com", "youtube.com", "www.youtube-nocookie.com",
  "phet.colorado.edu",
  "ocw.mit.edu",
  "openstax.org", "cnx.org",
  "openlearn.open.ac.uk",
  "saylor.org",
  "libretexts.org", "math.libretexts.org", "chem.libretexts.org", "phys.libretexts.org",
  "wolframalpha.com", "www.wolframalpha.com",
]);

// Before rendering: parse URL host; if not in allow-list OR displayMode==="link",
// render a card with external link instead of an iframe.
// iframe attributes: sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer"
// loading="lazy" title={title}. No allow="fullscreen" unless host is YouTube.
```

Must also respect `licenseCategory === "nc_only"` under commercial flag — render "Unavailable in this deployment" card.

**DiagramBlock renderer** (`client/src/components/lesson/DiagramBlock.tsx`):
- `npm install mermaid` (pin version, e.g. ^10).
- On mount, init once with `{ startOnLoad: false, securityLevel: "strict" }`.
- Parse via `mermaid.parse(section.mermaid)` first; on failure, render the raw text in a `<pre>` with "Diagram failed to render" note (never throw).
- Render via `mermaid.render()` into innerHTML. Re-render on theme changes.

**ComputationBlock renderer** (`client/src/components/lesson/ComputationBlock.tsx`):
- For MVP: iframe `https://www.wolframalpha.com/input?i=<encodeURIComponent(wolframQuery)>` with `sandbox="allow-scripts allow-same-origin"`.
- Before-prompt: show `section.prompt`.
- After the learner clicks "I've explored", reveal `section.takeaway` and mark a `sectionCompletion`.

### 7.2 `advancePath` implementation

```typescript
advancePath: publicProcedure
  .input(/* as §4 */)
  .mutation(async ({ input, ctx }) => {
    const profile = await resolveLearnerProfile(ctx.user?.id, input.cookieId);
    const profileBucket = computeProfileBucket(profile);  // see §7.6
    const lessonKey = `path-${input.pathId}-concept-${input.conceptId}`;

    // Check cache — existing template for this (concept, profileBucket)?
    const cached = await db.select().from(adaptiveLessonTemplates)
      .where(and(eq(adaptiveLessonTemplates.conceptId, input.conceptId),
                 eq(adaptiveLessonTemplates.profileBucket, profileBucket)))
      .limit(1);

    if (cached[0]) {
      // Point the node to the cached template. Multiple learners share the template,
      // but attempts/mastery stay per-learner.
      await db.update(goalPathNodes)
        .set({ lessonKey: cached[0].lessonKey, lessonStatus: "ready" })
        .where(and(eq(goalPathNodes.pathId, input.pathId),
                   eq(goalPathNodes.conceptId, input.conceptId)));
      return { lessonKey: cached[0].lessonKey, status: "ready" as const };
    }

    // Not cached — enqueue generation; mark node as generating.
    await db.update(goalPathNodes)
      .set({ lessonKey, lessonStatus: "generating" })
      .where(and(eq(goalPathNodes.pathId, input.pathId),
                 eq(goalPathNodes.conceptId, input.conceptId)));

    await db.insert(backgroundJobs).values({
      type: "GENERATE_ADAPTIVE_LESSON",
      payload: { pathId: input.pathId, conceptId: input.conceptId, lessonKey,
                 profileBucket, profileSnapshot: profile, cookieId: input.cookieId },
      status: "pending",
    });
    return { lessonKey, status: "generating" as const };
  }),
```

### 7.3 `recordAttempt` implementation (BKT update)

```typescript
recordAttempt: publicProcedure
  .input(/* as §4 */)
  .mutation(async ({ input, ctx }) => {
    // Log raw response for future re-training
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

    // Fetch current mastery (or create with defaults)
    const existing = await db.select().from(conceptMastery)
      .where(and(eq(conceptMastery.cookieId, input.cookieId),
                 eq(conceptMastery.conceptId, input.conceptId)))
      .limit(1);
    const pL = existing[0]?.pKnown ?? 0.10;
    const { pKnown: newPL } = bktUpdate(pL, input.correct);   // see §7.5
    const nowMastered = newPL >= 0.85;

    if (existing[0]) {
      await db.update(conceptMastery).set({
        pKnown: newPL,
        attemptCount: existing[0].attemptCount + 1,
        correctCount: existing[0].correctCount + (input.correct ? 1 : 0),
        masteredAt: (!existing[0].masteredAt && nowMastered) ? new Date() : existing[0].masteredAt,
        lastAttemptAt: new Date(),
        lastCorrect: input.correct,
      }).where(eq(conceptMastery.id, existing[0].id));
    } else {
      await db.insert(conceptMastery).values({
        userId: ctx.user?.id ?? null,
        cookieId: input.cookieId,
        conceptId: input.conceptId,
        pKnown: newPL,
        attemptCount: 1,
        correctCount: input.correct ? 1 : 0,
        masteredAt: nowMastered ? new Date() : null,
        lastAttemptAt: new Date(),
        lastCorrect: input.correct,
      });
    }

    // Remediation routing: if misconceptionTag maps to a concept, return it.
    const remediationConceptId = input.misconceptionTag
      ? await lookupRemediationConcept(input.misconceptionTag)
      : undefined;

    return { pKnown: newPL, mastered: nowMastered, remediationConceptId };
  }),
```

### 7.4 `lesson.getSeededLesson` extension

File: `server/routers/lesson.ts` around line 445 (verify with `Grep "getSeededLesson"`). Change:

```typescript
// Before:
const template = AI_LITERACY_TEMPLATES[input.lessonId] ?? AI_BY_AI_TEMPLATES[input.lessonId];

// After:
let template = AI_LITERACY_TEMPLATES[input.lessonId] ?? AI_BY_AI_TEMPLATES[input.lessonId];
if (!template) {
  const cached = await db.select().from(adaptiveLessonTemplates)
    .where(eq(adaptiveLessonTemplates.lessonKey, input.lessonId))
    .limit(1);
  if (cached[0]) template = cached[0].templateJson as LessonTemplate;
}
if (!template) {
  throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found — it may still be generating." });
}
```

Also relax `startLessonProgress` (line 432) to accept `lessonId: z.union([z.number(), z.string()])`. When a string, write to a new `adaptive_lesson_progress` table (mirror shape of `lesson_progress` but with `lessonId:varchar128`) — simpler than making `lessonProgress.lessonId` polymorphic.

### 7.5 BKT helper

File: `shared/utils/bkt.ts` (accessible from both server and client).

```typescript
export interface BktParams {
  pInit: number; pLearn: number; pSlip: number; pGuess: number;
}
export const DEFAULT_BKT: BktParams = { pInit: 0.10, pLearn: 0.20, pSlip: 0.10, pGuess: 0.20 };
export const MASTERY_THRESHOLD = 0.85;

export function bktUpdate(priorKnown: number, correct: boolean, params: BktParams = DEFAULT_BKT) {
  const { pLearn, pSlip, pGuess } = params;
  const pL = Math.max(0, Math.min(1, priorKnown));
  const givenObs = correct
    ? (pL * (1 - pSlip)) / (pL * (1 - pSlip) + (1 - pL) * pGuess)
    : (pL * pSlip) / (pL * pSlip + (1 - pL) * (1 - pGuess));
  const pKnown = givenObs + (1 - givenObs) * pLearn;
  return { pKnown, mastered: pKnown >= MASTERY_THRESHOLD };
}
```

Unit test (`shared/utils/bkt.test.ts`):
```typescript
test("converges upward on correct", () => {
  let p = 0.1;
  for (let i = 0; i < 5; i++) p = bktUpdate(p, true).pKnown;
  expect(p).toBeGreaterThan(0.85);
});
test("drops on incorrect", () => {
  const next = bktUpdate(0.6, false).pKnown;
  expect(next).toBeLessThan(0.6);
});
```

### 7.6 Profile bucket (for template cache reuse)

```typescript
// server/services/profileBucket.ts
export function computeProfileBucket(profile: LearnerProfile): string {
  return [
    profile.readingLevel,                    // 3 values
    profile.inferredLearnStyle,              // 4 values
    profile.priorExposure,                   // 4 values
    profile.suggestedTier,                   // 3 values
  ].join("|"); // 144 total buckets — plenty of diversity, tolerable cache size
}
```

### 7.7 Lesson generation worker

Add `GENERATE_ADAPTIVE_LESSON` to `processJob` in `server/_core/jobRunner.ts`:

```typescript
if (job.type === "GENERATE_ADAPTIVE_LESSON") {
  const p = job.payload as {
    pathId: string; conceptId: string; lessonKey: string;
    profileBucket: string; profileSnapshot: LearnerProfile; cookieId: string;
  };

  // 1. Load concept + attached assets (primary role first).
  const [concept] = await db.select().from(concepts).where(eq(concepts.id, p.conceptId));
  if (!concept) throw new Error(`Concept ${p.conceptId} not found`);
  const assets = await db.select().from(learningAssets)
    .innerJoin(conceptAssets, eq(conceptAssets.assetId, learningAssets.id))
    .where(eq(conceptAssets.conceptId, p.conceptId))
    .limit(6);

  // 2. Generate LessonTemplate via LLM (§7.8).
  const template = await generateLessonTemplate({
    concept, assets, profile: p.profileSnapshot, lessonKey: p.lessonKey,
  });

  // 3. Validate against Gagné 9 events (§7.9).
  assertGagneConformance(template);

  // 4. Persist.
  await db.insert(adaptiveLessonTemplates).values({
    lessonKey: p.lessonKey,
    conceptId: p.conceptId,
    profileBucket: p.profileBucket,
    templateJson: template,
    generatorModel: "claude-sonnet-4-6",
  });

  // 5. Flip node to ready.
  await db.update(goalPathNodes)
    .set({ lessonStatus: "ready" })
    .where(and(eq(goalPathNodes.pathId, p.pathId),
               eq(goalPathNodes.conceptId, p.conceptId)));
}
```

### 7.8 `generateLessonTemplate` — the LLM prompt (exact)

```
// System prompt
You are composing a LessonTemplate JSON for an adaptive learning platform.
The learner will never see this JSON directly — a renderer compiles it into
sections. You MUST output valid JSON only.

Schema (TypeScript):
interface LessonTemplate {
  lessonId: string;
  courseId: "adaptive";
  title: string;
  subtitle?: string;
  estimatedMinutes: number;
  xpReward: number;
  prerequisites: string[];
  concepts: string[];           // concept keys to surface; we supply one
  retrieval: RetrievalBlock[];  // 4-8 items across tiers intro/core/stretch
  extraSections?: LessonSection[];
  closingReflection?: ReflectionBlock;
}

The renderer will auto-compose: productive-failure probe (if concept has a
misconception), narrative + analogy + example per concept, then retrieval.
You SHOULD fill extraSections with any of: embed, diagram, computation,
span-select, productive-failure beyond the auto one.

Pedagogical requirements (Gagné's 9 events):
  1. Gain attention — usually an embed or diagram up front is ideal.
  2. State objectives — phrased as "By the end, you'll be able to …" in subtitle.
  3. Activate prior knowledge — retrieval item at tier "intro".
  4. Present content — via the concepts[] + extraSections.
  5. Provide guidance — analogies + worked examples.
  6. Elicit performance — retrieval items at tier "core".
  7. Feedback — in each RetrievalChoice.rationale.
  8. Assess — retrieval items at tier "stretch" + optional span-select.
  9. Enhance retention — closingReflection must ask for an application AND a specific confusion.

Rules:
- Every RetrievalChoice MUST have a non-empty rationale (≥1 sentence).
- At least ONE wrong RetrievalChoice across the lesson should have a misconceptionTag
  keyed to the concept.misconceptions list.
- All tier:intro items come before tier:core; tier:stretch last.
- estimatedMinutes = sum of content minutes + 2min/retrieval; 10 ≤ total ≤ 45.
- xpReward = estimatedMinutes * 3.
- Embed URLs MUST be chosen from the provided asset list; do not hallucinate URLs.
- Diagrams use valid Mermaid syntax; stick to "flowchart LR" or "graph TD" — simple.
- Computation blocks use plain-English Wolfram queries; avoid code.
```

User message template (filled by worker):
```
Concept:
  id: {{concept.id}}
  title: {{concept.title}}
  summary: {{concept.summary}}
  domain: {{concept.domain}}
  bloomLevel: {{concept.bloomLevel}}
  misconceptions: {{JSON.stringify(concept.misconceptions ?? [])}}

Curated assets available (use any, none, or several — pick pedagogically):
{{assets.map((a,i) => `[${i}] ${a.title} (${a.sourcePlatform}, ${a.contentType}, ${a.licenseCategory}, ${a.estimatedMinutes}min)
    URL: ${a.url}
    Embeddable: ${a.embeddable}`).join("\n")}}

Learner profile:
  readingLevel: {{profile.readingLevel}}  (plain | standard | technical)
  learnStyle: {{profile.inferredLearnStyle}}  (deep-technical | visual | socratic | hands-on)
  priorExposure: {{profile.priorExposure}}  (none | consumer | builder | expert)
  suggestedTier: {{profile.suggestedTier}}

Tailoring:
- If learnStyle=visual: include at least one diagram OR embed of a simulation/video.
- If learnStyle=hands-on: include a computation block OR a concrete mini-project in a rubric.
- If learnStyle=socratic: productive-failure probe must lead; retrieval phrased as questions.
- If learnStyle=deep-technical: retrieval tier:stretch must include at least 2 items.
- If readingLevel=plain: narrative body ≤150 words per section; no jargon without gloss.
- If readingLevel=technical: use domain terms freely; expect one-shot understanding.

lessonId to use: {{lessonKey}}
```

Parse the response with a forgiving JSON extractor (match `{[\s\S]*}` outermost).
Validate against schema with zod. On validation failure, retry once with a
"Your previous output failed validation: <error>. Please fix and resend the full JSON."
follow-up. On second failure, throw — job will retry at the jobRunner level.

### 7.9 `assertGagneConformance` — validator

```typescript
// shared/utils/gagneValidator.ts
export function assertGagneConformance(tpl: LessonTemplate) {
  const sections = [
    ...(tpl.concepts.length ? [{ kind: "narrative" }] : []),
    ...(tpl.retrieval ?? []),
    ...(tpl.extraSections ?? []),
    ...(tpl.closingReflection ? [tpl.closingReflection] : []),
  ];
  const kinds = sections.map((s: any) => s.kind);
  const hasIntroRetrieval = (tpl.retrieval ?? []).some(r => r.tier === "intro");
  const hasCoreRetrieval  = (tpl.retrieval ?? []).some(r => r.tier === "core");
  const hasClosing = !!tpl.closingReflection;
  const everyChoiceHasRationale = (tpl.retrieval ?? []).every(r =>
    r.choices.every(c => (c.rationale ?? "").trim().length > 0)
  );

  const errors: string[] = [];
  if (!hasIntroRetrieval) errors.push("Missing intro-tier retrieval (Gagné 3: activate prior knowledge).");
  if (!hasCoreRetrieval) errors.push("Missing core-tier retrieval (Gagné 6: elicit performance).");
  if (!hasClosing) errors.push("Missing closing reflection (Gagné 9: retention).");
  if (!everyChoiceHasRationale) errors.push("Every RetrievalChoice must have a non-empty rationale (Gagné 7: feedback).");
  if (tpl.retrieval.length < 3) errors.push("At least 3 retrieval items required.");
  if (tpl.estimatedMinutes < 10 || tpl.estimatedMinutes > 45) errors.push(`estimatedMinutes ${tpl.estimatedMinutes} out of [10,45].`);

  if (errors.length) throw new Error(`Pedagogical validation failed:\n  - ${errors.join("\n  - ")}`);
}
```

### 7.10 Fact-verification pass (optional but recommended — ship if time)

After generation, run a separate `verifyFacts` LLM call: pass the narrative bodies + any `canonicalInsight` fields + any retrieval rationales, ask the model to flag factual errors with citations. On flags, either:
1. Regenerate just the flagged block (preferable), or
2. Append a "Human review recommended" flag to `adaptiveLessonTemplates` (add column later).

**MVP:** skip this; log a todo.

### 7.11 Acceptance checks for Phase 3

- [ ] Opening a ready node in a path renders a LessonSeed with ≥1 retrieval and a closing reflection.
- [ ] Answering a retrieval fires `recordAttempt`; `concept_mastery.pKnown` updates.
- [ ] 5 correct answers in a row cross the mastery threshold — the node on the path view shows the green mastered badge.
- [ ] An `embed` block renders a YouTube or PhET iframe with sandbox attributes set.
- [ ] A `diagram` block with `flowchart LR` renders (not as raw text).
- [ ] A `computation` block renders a Wolfram iframe + takeaway reveal button.
- [ ] Template generation is idempotent per `(conceptId, profileBucket)` — second learner in the same bucket reuses the cached template.
- [ ] Invalid LLM output triggers the retry prompt; a completely broken template bubbles to `backgroundJobs.status=failed` with `error` populated.
- [ ] Existing AI Literacy and AI by AI lessons still render identically.
- [ ] `npm run typecheck` passes.

---

## 8. Phase 4 — Misconception remediation, UI polish, admin tooling (Week 4)

**Ships:** Misconception-aware remediation loops, a concept admin view, visible mastery dashboard, removal of the legacy curriculum generator.

### 8.1 Misconception remediation flow

Current state after Phase 3: `recordAttempt` returns `remediationConceptId?` when a tagged wrong answer was chosen. Client must act on it.

**Client change in `RetrievalWithConfidence.tsx`:**
When `recordAttempt` returns `remediationConceptId`, show a "Let's unpack that" inline card:
- 2-sentence concept summary (fetched client-side via a new `curriculum.getConceptSnippet` query).
- "Read the 90-second explainer" button → opens the concept's primary asset in a modal or routes to a mini-lesson.
- "Continue lesson" button → dismisses and proceeds.

**Backend `lookupRemediationConcept`:**
Maintain a small `misconception_remediations` table OR (simpler for MVP) extend `concepts.misconceptions[].remediationConceptId?` as an optional field in the embedded JSON. Use the JSON path.

### 8.2 Mastery dashboard

New page `/dashboard/mastery` (or add section to existing `/dashboard`). Shows:
- Active goal paths with per-node pKnown bars.
- Concepts mastered across all paths, grouped by domain.
- Spaced retrieval suggestions — any concept with `pKnown ∈ [0.85, 0.95]` and `lastAttemptAt` > 7 days ago surfaces a "Review" card.

Query: `curriculum.getMasterySummary({ cookieId })` returning `{ activePaths, masteredByDomain, reviewQueue }`.

### 8.3 Admin concept browser

New page `/admin/concepts`. List all concepts with filters (domain, reviewStatus, source). Row actions:
- Edit title/summary.
- Promote `draft` → `published`. **Only published concepts appear in candidate matching for goal paths.**
- Deprecate.
- View attached assets and prerequisites.

This is how you triage LLM-extracted concepts from Phase 1 ingestion. Without it, the catalog stays in "draft" purgatory. **Ship this — it is not optional.**

### 8.4 Legacy cleanup

- In `Learn.tsx`, promote the adaptive path button to primary; hide the old "generate curriculum" behind an `admin-only` feature flag or remove outright.
- `server/routers/ai.ts:generateCurriculum` and the `GENERATE_LESSON` job type — leave in place for backward compat of existing `/learn/curriculum/:id` pages. Mark deprecated in the JSDoc.

### 8.5 License enforcement flag

Add to `client/src/utils/featureFlags.ts` (create if missing):
```typescript
export const COMMERCIAL_MODE = import.meta.env.VITE_NEXUS_COMMERCIAL === "true";
```
Server mirror: `process.env.NEXUS_COMMERCIAL === "true"`. In `EmbedBlock` renderer, hide `nc_only` assets when `COMMERCIAL_MODE` is true. In `advancePath` worker, skip `nc_only` assets when filtering `concept_assets` for template generation.

### 8.6 Acceptance checks for Phase 4

- [ ] Picking a misconception-tagged wrong answer triggers the remediation card.
- [ ] `/dashboard/mastery` renders for a learner with at least one path.
- [ ] `/admin/concepts` lists all concepts and allows publishing.
- [ ] With `VITE_NEXUS_COMMERCIAL=true`, no `nc_only` embeds render.
- [ ] All Phase 3 acceptance checks still pass.
- [ ] `npm run typecheck` passes.

---

## 9. Edge cases already resolved — do not re-debate

| Case | Resolution |
|---|---|
| Cycle in LLM-proposed prereqs | `dropCycles` in `shared/utils/graphSort.ts` — keep edges in LLM's order, skip any that would create a cycle. Log skipped edges for admin review. |
| Goal too broad ("learn AI") | Decomposition LLM narrows in `goalSummary`; pitch explains the narrowing. No clarification dialog in MVP. |
| Goal harmful | Decomposition LLM returns `goalSummary="refused"`, empty outcomes. Client renders graceful refusal page. |
| Concept not in catalog | Path generator marks `isNew=true`; worker inserts stub with `reviewStatus="draft"`. Lesson generation proceeds with no assets (pure-LLM content). |
| Template generation fails twice | `backgroundJobs.status=failed` after 3 attempts. Node `lessonStatus="failed"`. Client shows "This lesson couldn't be generated — skip for now." with a retry button. |
| Two learners hit the same concept simultaneously | Both see `lessonStatus="generating"`, both enqueue jobs, only one cache row wins (unique constraint on `lessonKey`). Second job errors on insert; catch and continue. |
| Mermaid parse failure | Renderer falls back to `<pre>` with the raw text. Never crashes. |
| Embed URL not in allow-list | Renderer falls back to a link card. Logs a warning. |
| BKT pKnown underflows (all wrong) | Formula is stable; pKnown approaches `pLearn / (1 + pLearn - pLearn) ≈ 0.2` floor. Fine. |
| NC-only asset in commercial deploy | `EmbedBlock` renders "Unavailable in this deployment". Template still counts as complete for mastery. |
| Client passes numeric lesson ID to adaptive route | `getSeededLesson` falls through to adaptive cache lookup; if not found, returns `NOT_FOUND`. Existing numeric-only routes remain untouched. |
| Learner has no cookieId | Not possible — `visitorProfiles` middleware creates one on every request. If somehow absent, treat all curriculum writes as no-ops and return `UNAUTHORIZED`. |
| Path has 0 nodes (decomposition refused or catalog totally empty) | Worker sets `status="abandoned"` with a helpful `pitch`. Client renders refusal page. |

---

## 10. Testing strategy (mandatory, in phase order)

Add tests in `tests/` (or the project's existing test dir — `Grep "\.test\.ts"` to find convention).

| Target | Test file | Assertions |
|---|---|---|
| `bktUpdate` | `shared/utils/bkt.test.ts` | 5 correct → mastered; 1 wrong after 3 correct → drops but not crashed; monotone in pInit. |
| `topoSort` | `shared/utils/graphSort.test.ts` | Empty → []; linear chain → same order; diamond → valid sort; cycle → throws. |
| `dropCycles` | Same file | Always returns acyclic set; preserves edge order for accepted edges. |
| `computeProfileBucket` | `server/services/profileBucket.test.ts` | Same profile → same bucket; changed readingLevel → different bucket. |
| `assertGagneConformance` | `shared/utils/gagneValidator.test.ts` | Minimal valid template passes; missing closing reflection throws; choice without rationale throws. |
| License derivation | `scripts/ingest-nexus.test.ts` | "CC BY" → commercial_ok; "CC BY-NC-SA" → nc_only; "All rights reserved" → deep_link_only. |
| `startGoal` end-to-end | `server/routers/curriculum.test.ts` | With a mocked `callAI` returning canned JSON, a path row appears with the decomposed shape. |

Don't test LLM behavior itself — stub `callAI` with fixtures. Unit tests must run in <10s total.

Run tests at the end of each phase before moving on.

---

## 11. Phased delivery summary

| Week | Phase | Ships to users? | Ship gate |
|---|---|---|---|
| 1 | Concept graph + Nexus ingestion | No (admin-only visible) | `ingest:nexus` idempotent; 40-120 concepts; zero cycles. |
| 2 | Goal → path generation | Yes — "adaptive path" button in /learn | Submit goal → /path/:id renders ≤60s; topo-order correct. |
| 3 | On-demand lesson generation + BKT | Yes — full loop | Path node → LessonSeedRenderer; mastery updates; new section kinds render. |
| 4 | Misconception loop + dashboard + admin | Yes — polished product | All P3 checks + remediation + admin publish flow. |

Each phase is independently committable and revertable. Commit at the end of each phase with message `feat(adaptive): phase N — <one-line>`.

---

## 12. Files you will create or edit

**New files:**
- `drizzle/schema.ts` — append §3.1 tables
- `shared/types/lessonSeed.ts` — extend unions per §3.2
- `shared/types/goalPath.ts` — new file per §3.3
- `shared/utils/bkt.ts` + `.test.ts`
- `shared/utils/graphSort.ts` + `.test.ts`
- `shared/utils/gagneValidator.ts` + `.test.ts`
- `server/routers/curriculum.ts` (register in `server/routers/index.ts`)
- `server/services/conceptMatcher.ts`
- `server/services/profileBucket.ts` + `.test.ts`
- `server/services/adaptiveTemplateGenerator.ts`
- `scripts/ingest-nexus.ts`
- `data/nexus_catalog.csv` (converted from xlsx)
- `client/src/pages/PathView.tsx`
- `client/src/components/lesson/EmbedBlock.tsx`
- `client/src/components/lesson/DiagramBlock.tsx`
- `client/src/components/lesson/ComputationBlock.tsx`
- `client/src/pages/AdminConcepts.tsx` (Phase 4)
- `client/src/pages/MasteryDashboard.tsx` (Phase 4)
- `client/src/utils/featureFlags.ts` (if missing)

**Edit:**
- `server/_core/jobRunner.ts` — add `BUILD_GOAL_PATH`, `GENERATE_ADAPTIVE_LESSON`, `POPULATE_CONCEPT_ASSETS` cases
- `server/routers/index.ts` — register curriculumRouter
- `server/routers/lesson.ts` — `getSeededLesson` falls back to adaptive cache; `startLessonProgress` accepts string ids (or split into adaptive variant)
- `client/src/App.tsx` — add `/path/:pathId`, `/admin/concepts`, `/dashboard/mastery` lazy routes
- `client/src/components/lesson/LessonSeedRenderer.tsx` — add cases for embed/diagram/computation
- `client/src/components/lesson/RetrievalWithConfidence.tsx` — remediation card when response has `remediationConceptId`
- `client/src/pages/Learn.tsx` — promote adaptive path CTA

**Do NOT edit:**
- Existing AI Literacy / AI by AI templates or content files
- `ThemeContext`, `AuthContext`, `LearnerProfileContext`
- `LessonSeed` / `LearnerProfile` interface fields (only extend unions)

---

## 13. Glossary for future reference

- **Concept** — an atomic learnable idea; the unit of mastery.
- **Goal path** — ordered list of concepts that fulfill a learner's goal.
- **Lesson template** — static JSON that the `lessonSeedFactory` compiles into a `LessonSeed`.
- **LessonSeed** — the personalized, renderer-ready shape.
- **Profile bucket** — low-cardinality hash of profile fields used as a template cache key.
- **BKT-lite** — 4-param Bayesian Knowledge Tracing, no per-item difficulty.
- **Nexus catalog** — 113 curated OER assets from xlsx; seeded into `learning_assets`.
- **Gagné 9 events** — pedagogical checklist enforced by `assertGagneConformance`.

---

## 14. One rule above all

**If a file says something different from this plan, the file wins.** Paths, line numbers, table shapes drift. Verify with `Read` / `Grep` before editing. This document is the plan; the code is the ground truth.

End of plan.
