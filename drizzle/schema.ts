import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
  float,
  index,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Visitor profiles for cookie-based personalization
export const visitorProfiles = mysqlTable("visitor_profiles", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }).notNull().unique(),
  visitCount: int("visitCount").default(1).notNull(),
  firstVisit: timestamp("firstVisit").defaultNow().notNull(),
  lastVisit: timestamp("lastVisit").defaultNow().notNull(),
  pagesVisited: json("pagesVisited").$type<string[]>(),
  interests: json("interests").$type<string[]>(),
  interactionCount: int("interactionCount").default(0).notNull(),
  quizCompleted: boolean("quizCompleted").default(false).notNull(),
  quizResults: json("quizResults").$type<Record<string, string>>(),
  preferredTopics: json("preferredTopics").$type<string[]>(),
  timeOnSite: int("timeOnSite").default(0).notNull(),
  aiInteractions: int("aiInteractions").default(0).notNull(),
  xp: int("xp").default(0).notNull(),
  level: int("level").default(1).notNull(),
  streak: int("streak").default(0).notNull(),
  lastStreakDate: varchar("lastStreakDate", { length: 20 }),
  badges: json("badges").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VisitorProfile = typeof visitorProfiles.$inferSelect;
export type InsertVisitorProfile = typeof visitorProfiles.$inferInsert;

// Chat history for AI assistant
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  cookieIdIdx: index("chat_messages_cookieId_idx").on(t.cookieId),
  createdAtIdx: index("chat_messages_createdAt_idx").on(t.createdAt),
}));

export type ChatMessage = typeof chatMessages.$inferSelect;

// Contact form submissions
export const contactSubmissions = mysqlTable("contact_submissions", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 512 }),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Codex entries
export const codexEntries = mysqlTable("codex_entries", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description").notNull(),
  url: varchar("url", { length: 1024 }),
  category: varchar("category", { length: 128 }).notNull(),
  tags: json("tags").$type<string[]>(),
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).default("intermediate"),
  featured: boolean("featured").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CodexEntry = typeof codexEntries.$inferSelect;
// ─── Courses ──────────────────────────────────────────────────────────────────
export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description").notNull(),
  longDescription: text("longDescription"),
  category: varchar("category", { length: 128 }).notNull(),
  level: mysqlEnum("level", ["beginner", "intermediate", "advanced"]).default("beginner").notNull(),
  tags: json("tags").$type<string[]>(),
  estimatedHours: float("estimatedHours").default(2),
  xpReward: int("xpReward").default(100).notNull(),
  featured: boolean("featured").default(false).notNull(),
  published: boolean("published").default(true).notNull(),
  prerequisites: json("prerequisites").$type<string[]>(),
  learningOutcomes: json("learningOutcomes").$type<string[]>(),
  instructor: varchar("instructor", { length: 256 }).default("AI Curriculum"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Course = typeof courses.$inferSelect;

// ─── Course Modules ───────────────────────────────────────────────────────────
export const courseModules = mysqlTable("course_modules", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  content: text("content").notNull(),
  order: int("order").notNull(),
  type: mysqlEnum("type", ["lesson", "quiz", "lab", "video"]).default("lesson").notNull(),
  xpReward: int("xpReward").default(20).notNull(),
  estimatedMinutes: int("estimatedMinutes").default(15),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CourseModule = typeof courseModules.$inferSelect;

// ─── Learning Progress ────────────────────────────────────────────────────────
export const learningProgress = mysqlTable("learning_progress", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  courseId: int("courseId").notNull(),
  moduleId: int("moduleId"),
  status: mysqlEnum("status", ["started", "in_progress", "completed"]).default("started").notNull(),
  progressPercent: int("progressPercent").default(0).notNull(),
  completedModules: json("completedModules").$type<number[]>(),
  lastAccessedAt: timestamp("lastAccessedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LearningProgress = typeof learningProgress.$inferSelect;

// ─── Research Sessions ────────────────────────────────────────────────────────
export const researchSessions = mysqlTable("research_sessions", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  sourceText: text("sourceText"),
  sourceUrl: varchar("sourceUrl", { length: 1024 }),
  summary: text("summary"),
  keyInsights: json("keyInsights").$type<string[]>(),
  notes: text("notes"),
  tags: json("tags").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  cookieIdIdx: index("research_sessions_cookieId_idx").on(t.cookieId),
}));
export type ResearchSession = typeof researchSessions.$inferSelect;

// ─── Flashcard Decks ──────────────────────────────────────────────────────────
export const flashcardDecks = mysqlTable("flashcard_decks", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  userId: int("userId"),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  sourceType: mysqlEnum("sourceType", ["research", "manual", "ai_generated"]).default("ai_generated").notNull(),
  sourceId: int("sourceId"),
  cardCount: int("cardCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  cookieIdIdx: index("flashcard_decks_cookieId_idx").on(t.cookieId),
}));
export type FlashcardDeck = typeof flashcardDecks.$inferSelect;

// ─── Flashcards ───────────────────────────────────────────────────────────────
export const flashcards = mysqlTable("flashcards", {
  id: int("id").autoincrement().primaryKey(),
  deckId: int("deckId").notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  interval: int("interval").default(1).notNull(),
  easeFactor: float("easeFactor").default(2.5).notNull(),
  repetitions: int("repetitions").default(0).notNull(),
  dueDate: timestamp("dueDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  // Most critical: getSdueFlashcards filters by deckId + dueDate on every review session
  deckIdIdx: index("flashcards_deckId_idx").on(t.deckId),
  dueDateIdx: index("flashcards_dueDate_idx").on(t.dueDate),
  deckDueIdx: index("flashcards_deckId_dueDate_idx").on(t.deckId, t.dueDate),
}));
export type Flashcard = typeof flashcards.$inferSelect;

// ─── Flashcard Reviews ────────────────────────────────────────────────────────
export const flashcardReviews = mysqlTable("flashcard_reviews", {
  id: int("id").autoincrement().primaryKey(),
  cardId: int("cardId").notNull(),
  deckId: int("deckId").notNull(),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  rating: mysqlEnum("rating", ["again", "hard", "good", "easy"]).notNull(),
  reviewedAt: timestamp("reviewedAt").defaultNow().notNull(),
}, (t) => ({
  deckIdIdx: index("flashcard_reviews_deckId_idx").on(t.deckId),
  cookieIdIdx: index("flashcard_reviews_cookieId_idx").on(t.cookieId),
}));
export type FlashcardReview = typeof flashcardReviews.$inferSelect;

// ─── AI Provider Settings ─────────────────────────────────────────────────────
export const aiProviderSettings = mysqlTable("ai_provider_settings", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }).notNull().unique(),
  provider: mysqlEnum("provider", ["gemini", "perplexity", "openai"]).default("gemini").notNull(),
  apiKey: varchar("apiKey", { length: 512 }), // user-supplied key (stored as-is; warn user)
  model: varchar("model", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AIProviderSettings = typeof aiProviderSettings.$inferSelect;

// ─── Mind Maps ────────────────────────────────────────────────────────────────
export const mindMaps = mysqlTable("mind_maps", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  userId: int("userId"),
  title: varchar("title", { length: 512 }).notNull(),
  rootTopic: varchar("rootTopic", { length: 256 }).notNull(),
  nodesJson: json("nodesJson").$type<MindMapNode[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  cookieIdIdx: index("mind_maps_cookieId_idx").on(t.cookieId),
}));
export type MindMap = typeof mindMaps.$inferSelect;

// ─── Library Resources ────────────────────────────────────────────────────────
export const libraryResources = mysqlTable("library_resources", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 128 }).notNull(),
  tags: json("tags").$type<string[]>(),
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).default("intermediate"),
  type: mysqlEnum("type", ["article", "video", "course", "tool", "paper", "book", "repo"]).default("article"),
  featured: boolean("featured").default(false).notNull(),
  contributedBy: varchar("contributedBy", { length: 128 }),
  ratingSum: int("ratingSum").default(0).notNull(),
  ratingCount: int("ratingCount").default(0).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});
export type LibraryResource = typeof libraryResources.$inferSelect;

// ─── Testing Center ─────────────────────────────────────────────────────────────
export const testQuestions = mysqlTable("test_questions", {
  id: int("id").autoincrement().primaryKey(),
  testId: varchar("testId", { length: 64 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  question: text("question").notNull(),
  options: json("options").$type<string[]>().notNull(),
  correctAnswer: int("correctAnswer").notNull(),
  explanation: text("explanation"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  questionType: varchar("questionType", { length: 32 }).default("multiple-choice").notNull(),
  imageData: text("imageData"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TestQuestion = typeof testQuestions.$inferSelect;

export const testResults = mysqlTable("test_results", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  testId: varchar("testId", { length: 64 }).notNull(),
  score: int("score").notNull(),
  totalQuestions: int("totalQuestions").notNull(),
  answers: json("answers").$type<Record<string, number>>().notNull(),
  timeTakenSeconds: int("timeTakenSeconds"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, (t) => ({
  cookieIdIdx: index("test_results_cookieId_idx").on(t.cookieId),
  testIdIdx:   index("test_results_testId_idx").on(t.testId),
}));
export type TestResult = typeof testResults.$inferSelect;

export const iqResults = mysqlTable("iq_results", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  iqScore: int("iqScore").notNull(),
  percentile: int("percentile").notNull(),
  rawScore: int("rawScore").notNull(),
  categoryScores: json("categoryScores").$type<Record<string, number>>().notNull(),
  timeTakenSeconds: int("timeTakenSeconds"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, (t) => ({
  cookieIdIdx: index("iq_results_cookieId_idx").on(t.cookieId),
}));
export type IQResult = typeof iqResults.$inferSelect;

// ─── Lessons (AI-Generated Learning Content) ─────────────────────────────────
export const lessons = mysqlTable("lessons", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  curriculumId: varchar("curriculumId", { length: 64 }).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  content: text("content").notNull(), // Full lesson markdown/HTML content
  objectives: json("objectives").$type<string[]>(),
  keyPoints: json("keyPoints").$type<string[]>(),
  resources: json("resources").$type<Array<{ title: string; type: string; url: string; description: string }>>(),
  externalResources: json("externalResources").$type<Array<{ title: string; url: string; source: string; description?: string }>>(),
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).default("intermediate"),
  estimatedMinutes: int("estimatedMinutes").default(15),
  order: int("order").default(0).notNull(),
  isShared: boolean("isShared").default(false).notNull(), // Shared across all users
  viewCount: int("viewCount").default(0).notNull(), // Track popularity
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  relatedTopics: json("relatedTopics").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  cookieIdIdx:    index("lessons_cookieId_idx").on(t.cookieId),
  curriculumIdx:  index("lessons_curriculumId_idx").on(t.curriculumId),
  sharedIdx:      index("lessons_isShared_idx").on(t.isShared),
}));
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = typeof lessons.$inferInsert;

// Lesson Q&A tables
export const lessonQuestions = mysqlTable("lesson_questions", {
  id: int("id").autoincrement().primaryKey(),
  lessonId: int("lessonId").notNull(),
  userId: int("userId"),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  question: text("question").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LessonQuestion = typeof lessonQuestions.$inferSelect;
export type InsertLessonQuestion = typeof lessonQuestions.$inferInsert;

export const lessonAnswers = mysqlTable("lesson_answers", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull(),
  aiResponse: text("aiResponse").notNull(),
  helpfulCount: int("helpfulCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LessonAnswer = typeof lessonAnswers.$inferSelect;
export type InsertLessonAnswer = typeof lessonAnswers.$inferInsert;

// Lesson Ratings & Feedback
// ─────────────────────────────────────────────────────────────────────────────
export const lessonRatings = mysqlTable("lesson_ratings", {
  id: int("id").autoincrement().primaryKey(),
  lessonId: int("lessonId").notNull(),
  userId: int("userId"),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  rating: int("rating").notNull(), // 1-5 stars
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LessonRating = typeof lessonRatings.$inferSelect;
export type InsertLessonRating = typeof lessonRatings.$inferInsert;

export const lessonFeedback = mysqlTable("lesson_feedback", {
  id: int("id").autoincrement().primaryKey(),
  lessonId: int("lessonId").notNull(),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  feedback: text("feedback").notNull(),
  category: mysqlEnum("category", ["too_easy", "too_hard", "unclear", "excellent", "needs_update", "other"]).default("other").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LessonFeedback = typeof lessonFeedback.$inferSelect;
export type InsertLessonFeedback = typeof lessonFeedback.$inferInsert;

// ─── User Progress Tracking ────────────────────────────────────────────────
export const lessonProgress = mysqlTable("lesson_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  lessonId: int("lessonId").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  timeSpentSeconds: int("timeSpentSeconds").default(0).notNull(),
  attempts: int("attempts").default(1).notNull(),
  lastAccessedAt: timestamp("lastAccessedAt").defaultNow().notNull(),
}, (t) => ({
  cookieLessonIdx: index("lesson_progress_cookie_lesson_idx").on(t.cookieId, t.lessonId),
  cookieIdIdx:     index("lesson_progress_cookieId_idx").on(t.cookieId),
}));
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type InsertLessonProgress = typeof lessonProgress.$inferInsert;
export const curriculumProgress = mysqlTable("curriculum_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  curriculumId: varchar("curriculumId", { length: 255 }).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  lessonsCompleted: int("lessonsCompleted").default(0).notNull(),
  totalLessons: int("totalLessons").default(0).notNull(),
  lastAccessedAt: timestamp("lastAccessedAt").defaultNow().notNull(),
}, (t) => ({
  cookieCurriculumIdx: index("curriculum_progress_cookie_curriculum_idx").on(t.cookieId, t.curriculumId),
}));
export type CurriculumProgress = typeof curriculumProgress.$inferSelect;
export type InsertCurriculumProgress = typeof curriculumProgress.$inferInsert;

// ─── Research Sources (scraped / discovered) ──────────────────────────────
export const researchSources = mysqlTable("research_sources", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  sessionId: int("sessionId"),
  url: varchar("url", { length: 2000 }).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  author: varchar("author", { length: 256 }),
  publishDate: varchar("publishDate", { length: 64 }),
  fullText: text("fullText"),
  shortSummary: text("shortSummary"),
  detailedSummary: text("detailedSummary"),
  keyPoints: json("keyPoints").$type<string[]>(),
  topics: json("topics").$type<string[]>(),
  score: float("score").default(0.5),
  faissId: int("faissId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ResearchSource = typeof researchSources.$inferSelect;
export type InsertResearchSource = typeof researchSources.$inferInsert;

// ─── Research Projects ────────────────────────────────────────────────────
export const researchProjects = mysqlTable("research_projects", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  sessionId: int("sessionId"),
  name: varchar("name", { length: 256 }).notNull(),
  topic: varchar("topic", { length: 512 }),
  sourceCount: int("sourceCount").default(0).notNull(),
  audioUrl: varchar("audioUrl", { length: 1024 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ResearchProject = typeof researchProjects.$inferSelect;
export type InsertResearchProject = typeof researchProjects.$inferInsert;

// ─── Audio Overviews ──────────────────────────────────────────────────────
export const audioOverviews = mysqlTable("audio_overviews", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["research_session", "lesson"]).notNull(),
  sourceId: int("sourceId").notNull(),
  audioUrl: varchar("audioUrl", { length: 1024 }).notNull(),
  transcript: text("transcript"),
  durationSeconds: int("durationSeconds"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AudioOverview = typeof audioOverviews.$inferSelect;
export type InsertAudioOverview = typeof audioOverviews.$inferInsert;

// ─── Skill Mastery ────────────────────────────────────────────────────────
export const skillMastery = mysqlTable("skill_mastery", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  skillId: varchar("skillId", { length: 128 }).notNull(),
  level: int("level").default(0).notNull(),
  evidenceCount: int("evidenceCount").default(0).notNull(),
  lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
});
export type SkillMastery = typeof skillMastery.$inferSelect;
export type InsertSkillMastery = typeof skillMastery.$inferInsert;

// ─── Background Jobs ──────────────────────────────────────────────────────
export const backgroundJobs = mysqlTable("background_jobs", {
  id: int("id").autoincrement().primaryKey(),
  type: varchar("type", { length: 128 }).notNull(),
  payload: json("payload").$type<Record<string, unknown>>(),
  status: mysqlEnum("status", ["pending", "processing", "done", "failed"]).default("pending").notNull(),
  attempts: int("attempts").default(0).notNull(),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
});
export type BackgroundJob = typeof backgroundJobs.$inferSelect;
export type InsertBackgroundJob = typeof backgroundJobs.$inferInsert;

// ─── Reading List ─────────────────────────────────────────────────────────
export const readingList = mysqlTable("reading_list", {
  id: int("id").autoincrement().primaryKey(),
  cookieId: varchar("cookieId", { length: 128 }).notNull(),
  resourceId: int("resourceId"),
  url: varchar("url", { length: 2000 }),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 128 }),
  status: mysqlEnum("status", ["want", "reading", "finished"]).default("want").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});
export type ReadingListItem = typeof readingList.$inferSelect;
export type InsertReadingListItem = typeof readingList.$inferInsert;

// ─── Shared Types ─────────────────────────────────────────────────────────
export interface MindMapNode {
  id: string;
  label: string;
  parentId: string | null;
  x: number;
  y: number;
  color?: string;
  category?: string;
  expanded?: boolean;
  notes?: string;
}
