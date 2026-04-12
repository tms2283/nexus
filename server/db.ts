import { eq, desc, and, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { encrypt, decrypt } from "./crypto";

import {
  InsertUser, users, visitorProfiles, chatMessages,
  contactSubmissions, codexEntries, VisitorProfile, InsertVisitorProfile, ChatMessage,
  researchSessions, ResearchSession, lessons, Lesson, InsertLesson,
  lessonQuestions, LessonQuestion, InsertLessonQuestion,
  lessonAnswers, LessonAnswer, InsertLessonAnswer,
  lessonRatings, LessonRating, InsertLessonRating,
  lessonFeedback, LessonFeedback, InsertLessonFeedback,
  lessonProgress, LessonProgress, InsertLessonProgress,
  curriculumProgress, CurriculumProgress, InsertCurriculumProgress,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrCreateVisitorProfile(cookieId: string): Promise<VisitorProfile | null> {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(visitorProfiles).where(eq(visitorProfiles.cookieId, cookieId)).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(visitorProfiles).values({ cookieId });
  const created = await db.select().from(visitorProfiles).where(eq(visitorProfiles.cookieId, cookieId)).limit(1);
  return created[0] ?? null;
}

export async function updateVisitorProfile(cookieId: string, updates: Partial<InsertVisitorProfile>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(visitorProfiles).set({ ...updates, updatedAt: new Date() }).where(eq(visitorProfiles.cookieId, cookieId));
}

export async function recordPageVisit(cookieId: string, page: string): Promise<{ xp: number; level: number; streak: number; newBadges: string[] }> {
  const db = await getDb();
  if (!db) return { xp: 0, level: 1, streak: 0, newBadges: [] };
  const profile = await getOrCreateVisitorProfile(cookieId);
  if (!profile) return { xp: 0, level: 1, streak: 0, newBadges: [] };
  const pages = profile.pagesVisited ?? [];
  const isNewPage = !pages.includes(page);
  if (isNewPage) pages.push(page);
  const xpGain = isNewPage ? 10 : 2;
  const today = new Date().toISOString().split("T")[0];
  let streak = profile.streak;
  let lastStreakDate = profile.lastStreakDate;
  if (lastStreakDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    streak = lastStreakDate === yesterday ? streak + 1 : 1;
    lastStreakDate = today;
  }
  const newXp = profile.xp + xpGain;
  const newLevel = Math.floor(newXp / 100) + 1;
  const currentBadges = profile.badges ?? [];
  const newBadges: string[] = [];
  const badgeThresholds: Record<string, number> = {
    "explorer": 50, "curious-mind": 150, "deep-diver": 300, "ai-whisperer": 500, "nexus-scholar": 1000,
  };
  for (const [badge, threshold] of Object.entries(badgeThresholds)) {
    if (newXp >= threshold && !currentBadges.includes(badge)) {
      currentBadges.push(badge); newBadges.push(badge);
    }
  }
  if (streak >= 3 && !currentBadges.includes("streak-3")) { currentBadges.push("streak-3"); newBadges.push("streak-3"); }
  if (streak >= 7 && !currentBadges.includes("streak-7")) { currentBadges.push("streak-7"); newBadges.push("streak-7"); }
  await db.update(visitorProfiles).set({
    pagesVisited: pages, visitCount: profile.visitCount + 1, lastVisit: new Date(),
    xp: newXp, level: newLevel, streak, lastStreakDate, badges: currentBadges, updatedAt: new Date(),
  }).where(eq(visitorProfiles.cookieId, cookieId));
  return { xp: newXp, level: newLevel, streak, newBadges };
}

export async function addXP(cookieId: string, amount: number): Promise<{ xp: number; level: number; newBadges: string[] }> {
  const db = await getDb();
  if (!db) return { xp: 0, level: 1, newBadges: [] };
  const profile = await getOrCreateVisitorProfile(cookieId);
  if (!profile) return { xp: 0, level: 1, newBadges: [] };
  const newXp = profile.xp + amount;
  const newLevel = Math.floor(newXp / 100) + 1;
  const currentBadges = profile.badges ?? [];
  const newBadges: string[] = [];
  const badgeThresholds: Record<string, number> = {
    "explorer": 50, "curious-mind": 150, "deep-diver": 300, "ai-whisperer": 500, "nexus-scholar": 1000,
  };
  for (const [badge, threshold] of Object.entries(badgeThresholds)) {
    if (newXp >= threshold && !currentBadges.includes(badge)) {
      currentBadges.push(badge); newBadges.push(badge);
    }
  }
  const aiInteractions = profile.aiInteractions + 1;
  if (aiInteractions >= 5 && !currentBadges.includes("ai-conversationalist")) {
    currentBadges.push("ai-conversationalist"); newBadges.push("ai-conversationalist");
  }
  await db.update(visitorProfiles).set({ xp: newXp, level: newLevel, badges: currentBadges, aiInteractions, updatedAt: new Date() }).where(eq(visitorProfiles.cookieId, cookieId));
  return { xp: newXp, level: newLevel, newBadges };
}

export async function getChatHistory(cookieId: string, limit = 20): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages).where(eq(chatMessages.cookieId, cookieId)).orderBy(desc(chatMessages.createdAt)).limit(limit).then((rows) => rows.reverse());
}

export async function saveChatMessage(cookieId: string, role: "user" | "assistant", content: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatMessages).values({ cookieId, role, content });
}

export async function saveContactSubmission(data: { cookieId?: string; name: string; email: string; subject?: string; message: string }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactSubmissions).values(data);
}

export async function getCodexEntries(category?: string) {
  const db = await getDb();
  if (!db) return [];
  if (category) return db.select().from(codexEntries).where(eq(codexEntries.category, category));
  return db.select().from(codexEntries).orderBy(desc(codexEntries.createdAt));
}

export async function seedCodexEntries(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(codexEntries).limit(1);
  if (existing.length > 0) return;
  const entries = [
    { title: "The Illustrated Guide to Neural Networks", description: "A visual, intuitive walkthrough of how neural networks learn — from perceptrons to deep learning architectures.", url: "https://colah.github.io/posts/2015-09-Visual-Information/", category: "AI & Machine Learning", tags: ["neural-networks", "deep-learning", "visualization"], difficulty: "intermediate" as const, featured: true },
    { title: "Attention Is All You Need", description: "The landmark paper introducing the Transformer architecture that powers modern LLMs including GPT and Gemini.", url: "https://arxiv.org/abs/1706.03762", category: "AI & Machine Learning", tags: ["transformers", "attention", "nlp", "research"], difficulty: "advanced" as const, featured: true },
    { title: "Andrej Karpathy: Neural Networks Zero to Hero", description: "A complete video series building neural networks from scratch in Python — the best practical deep learning course available.", url: "https://karpathy.ai/zero-to-hero.html", category: "AI & Machine Learning", tags: ["neural-networks", "python", "course"], difficulty: "intermediate" as const, featured: true },
    { title: "Three.js Journey", description: "The most comprehensive Three.js course — learn WebGL and 3D graphics for the web from scratch.", url: "https://threejs-journey.com", category: "Web Development", tags: ["threejs", "webgl", "3d", "javascript"], difficulty: "intermediate" as const, featured: true },
    { title: "Framer Motion Documentation", description: "Production-ready animation library for React. The definitive reference for building fluid, physics-based UI animations.", url: "https://www.framer.com/motion/", category: "Web Development", tags: ["animation", "react", "ux", "motion"], difficulty: "intermediate" as const, featured: false },
    { title: "The Pragmatic Programmer", description: "Essential reading for every software engineer. Timeless principles for writing clean, maintainable, and effective code.", url: "https://pragprog.com/titles/tpp20/", category: "Software Engineering", tags: ["best-practices", "career", "architecture", "book"], difficulty: "intermediate" as const, featured: true },
    { title: "System Design Interview — Alex Xu", description: "The definitive guide to designing scalable distributed systems. Essential for senior engineering roles.", url: "https://www.amazon.com/System-Design-Interview-insiders-Second/dp/B08CMF2CQF", category: "Software Engineering", tags: ["system-design", "scalability", "distributed-systems"], difficulty: "advanced" as const, featured: false },
    { title: "Refactoring UI", description: "Practical design advice for developers. Learn to make your UIs look professional without being a designer.", url: "https://www.refactoringui.com", category: "Design", tags: ["ui-design", "css", "visual-design", "book"], difficulty: "beginner" as const, featured: true },
    { title: "Laws of UX", description: "A collection of the key psychological principles that designers should know when building products.", url: "https://lawsofux.com", category: "Design", tags: ["ux", "psychology", "design-principles"], difficulty: "beginner" as const, featured: true },
    { title: "Gemini API Documentation", description: "Official Google Gemini API docs — multimodal AI capabilities, function calling, and streaming responses.", url: "https://ai.google.dev/docs", category: "AI & Machine Learning", tags: ["gemini", "google", "api", "llm"], difficulty: "intermediate" as const, featured: false },
    { title: "The Missing Semester of Your CS Education", description: "MIT course covering essential tools every developer needs: shell, vim, git, debugging, and more.", url: "https://missing.csail.mit.edu", category: "Software Engineering", tags: ["tools", "shell", "git", "productivity", "mit"], difficulty: "beginner" as const, featured: false },
    { title: "Designing Data-Intensive Applications", description: "The definitive guide to building reliable, scalable, and maintainable data systems. A must-read for backend engineers.", url: "https://dataintensive.net", category: "Software Engineering", tags: ["databases", "distributed-systems", "backend", "book"], difficulty: "advanced" as const, featured: true },
  ];
  for (const entry of entries) {
    await db.insert(codexEntries).values(entry);
  }
}

// ─── Research Sessions ────────────────────────────────────────────────────────
export async function saveResearchSession(data: {
  cookieId: string;
  title: string;
  sourceText?: string;
  sourceUrl?: string;
  summary?: string;
  keyInsights?: string[];
  notes?: string;
  tags?: string[];
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(researchSessions).values(data);
  return (result as unknown as { insertId: number }).insertId ?? 0;
}

export async function getResearchSessions(cookieId: string): Promise<ResearchSession[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(researchSessions)
    .where(eq(researchSessions.cookieId, cookieId))
    .orderBy(desc(researchSessions.createdAt))
    .limit(20);
}

export async function updateResearchSessionNotes(id: number, notes: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(researchSessions).set({ notes, updatedAt: new Date() }).where(eq(researchSessions.id, id));
}

// ─── Flashcard Decks & Cards ──────────────────────────────────────────────────
import {
  flashcardDecks, flashcards, flashcardReviews,
  aiProviderSettings, mindMaps, libraryResources,
  FlashcardDeck, Flashcard, AIProviderSettings, MindMap, LibraryResource,
  MindMapNode,
} from "../drizzle/schema";

export async function createFlashcardDeck(data: {
  cookieId: string;
  title: string;
  description?: string;
  sourceType?: "research" | "manual" | "ai_generated";
  sourceId?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(flashcardDecks).values({
    cookieId: data.cookieId,
    title: data.title,
    description: data.description,
    sourceType: data.sourceType ?? "ai_generated",
    sourceId: data.sourceId,
  });
  return (result as unknown as { insertId: number }).insertId ?? 0;
}

export async function addFlashcardsToDecks(deckId: number, cards: Array<{ front: string; back: string }>): Promise<void> {
  const db = await getDb();
  if (!db || cards.length === 0) return;
  const now = new Date();
  // Bulk INSERT — single round-trip instead of N individual inserts
  await db.insert(flashcards).values(
    cards.map((card) => ({ deckId, front: card.front, back: card.back, dueDate: now }))
  );
  await db.update(flashcardDecks).set({ cardCount: cards.length, updatedAt: now }).where(eq(flashcardDecks.id, deckId));
}

export async function getFlashcardDecks(cookieId: string): Promise<FlashcardDeck[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flashcardDecks)
    .where(eq(flashcardDecks.cookieId, cookieId))
    .orderBy(desc(flashcardDecks.createdAt));
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

/** SM-2 spaced repetition algorithm */
export async function reviewFlashcard(
  cardId: number,
  deckId: number,
  cookieId: string,
  rating: "again" | "hard" | "good" | "easy"
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const cards = await db.select().from(flashcards).where(eq(flashcards.id, cardId)).limit(1);
  if (!cards.length) return;
  const card = cards[0];

  // SM-2 quality: again=0, hard=2, good=3, easy=5
  const qualityMap = { again: 0, hard: 2, good: 3, easy: 5 };
  const q = qualityMap[rating];

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

  await db.update(flashcards).set({ easeFactor, repetitions, interval, dueDate, updatedAt: new Date() }).where(eq(flashcards.id, cardId));
  await db.insert(flashcardReviews).values({ cardId, deckId, cookieId, rating });
}

// ─── AI Provider Settings ─────────────────────────────────────────────────────
export async function getAIProviderSettings(cookieId: string): Promise<AIProviderSettings | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(aiProviderSettings).where(eq(aiProviderSettings.cookieId, cookieId)).limit(1);
  if (!rows[0]) return null;
  const row = rows[0];
  // Decrypt API key before returning — decrypt() handles legacy plaintext gracefully
  if (row.apiKey) row.apiKey = decrypt(row.apiKey);
  return row;
}

export async function upsertAIProviderSettings(cookieId: string, data: {
  provider: "gemini" | "perplexity" | "openai";
  apiKey?: string;
  model?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Encrypt API key before storing
  const encryptedKey = data.apiKey ? encrypt(data.apiKey) : null;
  await db.insert(aiProviderSettings)
    .values({ cookieId, provider: data.provider, apiKey: encryptedKey, model: data.model ?? null })
    .onDuplicateKeyUpdate({
      set: { provider: data.provider, apiKey: encryptedKey, model: data.model ?? null, updatedAt: new Date() },
    });
}

// ─── Mind Maps ────────────────────────────────────────────────────────────────
export async function getMindMaps(cookieId: string): Promise<MindMap[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mindMaps).where(eq(mindMaps.cookieId, cookieId)).orderBy(desc(mindMaps.updatedAt));
}

export async function getMindMapById(id: number): Promise<MindMap | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(mindMaps).where(eq(mindMaps.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function saveMindMap(data: {
  cookieId: string;
  title: string;
  rootTopic: string;
  nodesJson: MindMapNode[];
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(mindMaps).values(data);
  return (result as unknown as { insertId: number }).insertId ?? 0;
}

export async function updateMindMap(id: number, data: { title?: string; nodesJson?: MindMapNode[] }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(mindMaps).set({ ...data, updatedAt: new Date() }).where(eq(mindMaps.id, id));
}

export async function deleteMindMap(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(mindMaps).where(eq(mindMaps.id, id));
}

// ─── Library Resources ────────────────────────────────────────────────────────
export async function getLibraryResources(category?: string, search?: string): Promise<LibraryResource[]> {
  const db = await getDb();
  if (!db) return [];
  await seedLibraryResources();
  if (category && category !== "All") {
    return db.select().from(libraryResources).where(eq(libraryResources.category, category)).orderBy(desc(libraryResources.featured));
  }
  return db.select().from(libraryResources).orderBy(desc(libraryResources.featured));
}

export async function seedLibraryResources(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(libraryResources).limit(1);
  if (existing.length > 0) return;

  const resources = [
    // AI & Machine Learning
    { title: "Attention Is All You Need", url: "https://arxiv.org/abs/1706.03762", description: "The landmark 2017 paper introducing the Transformer architecture that powers every modern LLM — GPT, Gemini, Claude. Essential reading for understanding how AI actually works.", category: "AI & Machine Learning", tags: ["transformers", "attention", "nlp", "research-paper"], difficulty: "advanced" as const, type: "paper" as const, featured: true },
    { title: "Andrej Karpathy: Neural Networks Zero to Hero", url: "https://karpathy.ai/zero-to-hero.html", description: "Build neural networks from scratch in Python — the most respected practical deep learning course on the internet. Covers backprop, GPT, and more.", category: "AI & Machine Learning", tags: ["neural-networks", "python", "backprop", "gpt"], difficulty: "intermediate" as const, type: "course" as const, featured: true },
    { title: "Google Gemini API Documentation", url: "https://ai.google.dev/docs", description: "Official Gemini API reference — multimodal capabilities, function calling, streaming, and system instructions. The foundation for building AI-powered apps.", category: "AI & Machine Learning", tags: ["gemini", "api", "llm", "google"], difficulty: "intermediate" as const, type: "article" as const, featured: true },
    { title: "Illustrated Guide to Transformers", url: "https://jalammar.github.io/illustrated-transformer/", description: "Jay Alammar's visual, step-by-step walkthrough of the Transformer architecture. The clearest explanation of attention mechanisms available.", category: "AI & Machine Learning", tags: ["transformers", "visualization", "nlp"], difficulty: "intermediate" as const, type: "article" as const, featured: true },
    { title: "Fast.ai Practical Deep Learning", url: "https://course.fast.ai", description: "Top-down, practical approach to deep learning. Learn to build state-of-the-art models before diving into theory. Free and world-class.", category: "AI & Machine Learning", tags: ["deep-learning", "pytorch", "course", "free"], difficulty: "intermediate" as const, type: "course" as const, featured: false },
    { title: "Hugging Face Hub", url: "https://huggingface.co", description: "The GitHub of machine learning — thousands of pre-trained models, datasets, and spaces. The central hub for the open-source AI ecosystem.", category: "AI & Machine Learning", tags: ["models", "datasets", "nlp", "community"], difficulty: "intermediate" as const, type: "tool" as const, featured: false },
    { title: "Perplexity AI", url: "https://www.perplexity.ai", description: "AI-powered search engine that provides cited, up-to-date answers. Excellent for research that requires current information beyond LLM training cutoffs.", category: "AI & Machine Learning", tags: ["search", "research", "citations", "real-time"], difficulty: "beginner" as const, type: "tool" as const, featured: false },
    { title: "LangChain Documentation", url: "https://docs.langchain.com", description: "Framework for building LLM-powered applications — chains, agents, RAG pipelines, and memory systems. The standard toolkit for production AI apps.", category: "AI & Machine Learning", tags: ["langchain", "rag", "agents", "python"], difficulty: "advanced" as const, type: "article" as const, featured: false },

    // Web Development
    { title: "The Odin Project", url: "https://www.theodinproject.com", description: "Free, open-source full-stack curriculum covering HTML, CSS, JavaScript, Node.js, and React. One of the most comprehensive free paths to becoming a web developer.", category: "Web Development", tags: ["html", "css", "javascript", "fullstack", "free"], difficulty: "beginner" as const, type: "course" as const, featured: true },
    { title: "Josh W. Comeau: CSS for JavaScript Developers", url: "https://css-for-js.dev", description: "The definitive course on CSS for developers who want to truly understand the language rather than copy-paste from Stack Overflow.", category: "Web Development", tags: ["css", "layout", "animations", "course"], difficulty: "intermediate" as const, type: "course" as const, featured: true },
    { title: "Framer Motion Documentation", url: "https://www.framer.com/motion/", description: "Production-ready animation library for React. Build fluid, physics-based UI animations with a declarative API.", category: "Web Development", tags: ["animation", "react", "motion", "ux"], difficulty: "intermediate" as const, type: "article" as const, featured: false },
    { title: "tRPC Documentation", url: "https://trpc.io/docs", description: "End-to-end type-safe APIs without code generation. Build full-stack TypeScript apps where your types flow from server to client automatically.", category: "Web Development", tags: ["typescript", "api", "fullstack", "react"], difficulty: "intermediate" as const, type: "article" as const, featured: false },
    { title: "Tailwind CSS Documentation", url: "https://tailwindcss.com/docs", description: "Utility-first CSS framework that lets you build custom designs directly in your markup. The fastest way to build beautiful, responsive UIs.", category: "Web Development", tags: ["css", "tailwind", "utility-first", "responsive"], difficulty: "beginner" as const, type: "article" as const, featured: false },
    { title: "Three.js Journey", url: "https://threejs-journey.com", description: "The most comprehensive Three.js course — learn WebGL and 3D graphics for the web from scratch. Build stunning interactive 3D experiences.", category: "Web Development", tags: ["threejs", "webgl", "3d", "javascript"], difficulty: "intermediate" as const, type: "course" as const, featured: false },

    // Computer Science
    { title: "CS50: Introduction to Computer Science", url: "https://cs50.harvard.edu/x/", description: "Harvard's legendary intro CS course — free, rigorous, and comprehensive. Covers C, Python, SQL, and web development from first principles.", category: "Computer Science", tags: ["cs50", "harvard", "python", "c", "free"], difficulty: "beginner" as const, type: "course" as const, featured: true },
    { title: "The Missing Semester of Your CS Education", url: "https://missing.csail.mit.edu", description: "MIT course covering the tools every developer needs but no class teaches: shell, vim, git, debugging, security, and more.", category: "Computer Science", tags: ["shell", "git", "vim", "tools", "mit"], difficulty: "beginner" as const, type: "course" as const, featured: true },
    { title: "Nand to Tetris", url: "https://www.nand2tetris.org", description: "Build a modern computer from first principles — starting with NAND gates and ending with a working OS. The most mind-expanding CS course available.", category: "Computer Science", tags: ["hardware", "architecture", "os", "compilers"], difficulty: "intermediate" as const, type: "course" as const, featured: false },
    { title: "Algorithm Visualizer", url: "https://algorithm-visualizer.org", description: "Interactive visualizations of classic algorithms and data structures. Watch sorting, pathfinding, and graph algorithms execute step-by-step.", category: "Computer Science", tags: ["algorithms", "data-structures", "visualization", "interactive"], difficulty: "beginner" as const, type: "tool" as const, featured: false },

    // Data Science
    { title: "Kaggle Learn", url: "https://www.kaggle.com/learn", description: "Free, hands-on micro-courses in Python, ML, SQL, and data visualization. The fastest path from zero to competing in real ML competitions.", category: "Data Science", tags: ["python", "ml", "sql", "free", "hands-on"], difficulty: "beginner" as const, type: "course" as const, featured: true },
    { title: "Towards Data Science", url: "https://towardsdatascience.com", description: "The leading publication for data science and ML practitioners — tutorials, case studies, and deep dives on every topic in the field.", category: "Data Science", tags: ["tutorials", "ml", "statistics", "python"], difficulty: "intermediate" as const, type: "article" as const, featured: false },
    { title: "Pandas Documentation", url: "https://pandas.pydata.org/docs/", description: "The essential Python library for data manipulation and analysis. Master DataFrames, groupby, merging, and time series operations.", category: "Data Science", tags: ["pandas", "python", "data-manipulation"], difficulty: "intermediate" as const, type: "article" as const, featured: false },

    // Software Engineering
    { title: "Designing Data-Intensive Applications", url: "https://dataintensive.net", description: "The definitive guide to building reliable, scalable, and maintainable data systems. Required reading for senior engineers.", category: "Software Engineering", tags: ["databases", "distributed-systems", "scalability", "book"], difficulty: "advanced" as const, type: "book" as const, featured: true },
    { title: "The Pragmatic Programmer", url: "https://pragprog.com/titles/tpp20/", description: "Timeless principles for writing clean, maintainable, and effective code. Every software engineer should read this at least once.", category: "Software Engineering", tags: ["best-practices", "career", "clean-code", "book"], difficulty: "intermediate" as const, type: "book" as const, featured: true },
    { title: "Refactoring — Martin Fowler", url: "https://refactoring.com", description: "The definitive guide to improving the design of existing code. Learn to recognize code smells and apply targeted refactoring techniques.", category: "Software Engineering", tags: ["refactoring", "clean-code", "patterns", "book"], difficulty: "intermediate" as const, type: "book" as const, featured: false },
    { title: "GitHub: Awesome Lists", url: "https://github.com/sindresorhus/awesome", description: "Curated lists of awesome resources for every programming language, framework, and topic. The starting point for any deep dive.", category: "Software Engineering", tags: ["curated", "resources", "community", "github"], difficulty: "beginner" as const, type: "repo" as const, featured: false },

    // Research Methods
    { title: "Connected Papers", url: "https://www.connectedpapers.com", description: "Explore the academic paper landscape visually — find related papers, trace citation networks, and discover influential prior work.", category: "Research Methods", tags: ["papers", "citations", "visualization", "academic"], difficulty: "beginner" as const, type: "tool" as const, featured: true },
    { title: "Semantic Scholar", url: "https://www.semanticscholar.org", description: "AI-powered academic search engine with free access to millions of papers. Surfaces the most influential research across all fields.", category: "Research Methods", tags: ["papers", "search", "ai", "academic"], difficulty: "beginner" as const, type: "tool" as const, featured: true },
    { title: "Zotero", url: "https://www.zotero.org", description: "Free, open-source reference manager. Collect, organize, cite, and share research sources across all your projects.", category: "Research Methods", tags: ["citations", "references", "productivity", "free"], difficulty: "beginner" as const, type: "tool" as const, featured: false },
    { title: "Obsidian", url: "https://obsidian.md", description: "A powerful knowledge management tool based on linked Markdown notes. Build a personal knowledge graph that grows with you.", category: "Research Methods", tags: ["note-taking", "knowledge-graph", "markdown", "pkm"], difficulty: "beginner" as const, type: "tool" as const, featured: false },

    // Productivity & Learning
    { title: "Anki — Spaced Repetition", url: "https://apps.ankiweb.net", description: "The gold standard for spaced repetition flashcards. Scientifically proven to maximize long-term retention with minimal study time.", category: "Productivity", tags: ["flashcards", "spaced-repetition", "memory", "free"], difficulty: "beginner" as const, type: "tool" as const, featured: true },
    { title: "How to Take Smart Notes", url: "https://www.soenkeahrens.de/en/takesmartnotes", description: "The Zettelkasten method for building a knowledge system that generates insights. Transform how you read, think, and write.", category: "Productivity", tags: ["zettelkasten", "note-taking", "learning", "book"], difficulty: "beginner" as const, type: "book" as const, featured: false },
    { title: "Pomodoro Technique", url: "https://francescocirillo.com/products/the-pomodoro-technique", description: "The classic time management method — 25-minute focused work sessions separated by short breaks. Simple, effective, and battle-tested.", category: "Productivity", tags: ["time-management", "focus", "productivity"], difficulty: "beginner" as const, type: "article" as const, featured: false },
  ];

  for (const resource of resources) {
    await db.insert(libraryResources).values(resource);
  }
}

// ─── Lessons (AI-Generated Content) ─────────────────────────────────
export async function saveLesson(data: InsertLesson): Promise<Lesson | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lessons).values(data);
  const id = (result as any).insertId;
  return getLessonById(id);
}

export async function getLessonById(id: number): Promise<Lesson | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getLessonsByCurriculum(cookieId: string, curriculumId: string): Promise<Lesson[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons)
    .where(sql`cookieId = ${cookieId} AND curriculumId = ${curriculumId}`)
    .orderBy(lessons.order);
}

export async function markLessonComplete(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(lessons)
    .set({ completed: true, completedAt: new Date() })
    .where(eq(lessons.id, id));
}


// ─── Lesson Q&A Functions ───────────────────────────────────────────────────
export async function askLessonQuestion(lessonId: number, cookieId: string, question: string): Promise<LessonQuestion | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lessonQuestions).values({ lessonId, cookieId, question });
  if (result[0].insertId) {
    return db.select().from(lessonQuestions).where(eq(lessonQuestions.id, result[0].insertId as number)).limit(1).then(r => r[0] || null);
  }
  return null;
}

export async function saveLessonAnswer(questionId: number, aiResponse: string): Promise<LessonAnswer | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lessonAnswers).values({ questionId, aiResponse });
  if (result[0].insertId) {
    return db.select().from(lessonAnswers).where(eq(lessonAnswers.id, result[0].insertId as number)).limit(1).then(r => r[0] || null);
  }
  return null;
}

export async function getLessonQuestions(lessonId: number): Promise<LessonQuestion[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonQuestions).where(eq(lessonQuestions.lessonId, lessonId)).orderBy(desc(lessonQuestions.createdAt));
}

export async function getQuestionAnswer(questionId: number): Promise<LessonAnswer | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(lessonAnswers).where(eq(lessonAnswers.questionId, questionId)).limit(1);
  return result[0] || null;
}

export async function markAnswerHelpful(answerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(lessonAnswers)
    .set({ helpfulCount: sql`helpfulCount + 1` })
    .where(eq(lessonAnswers.id, answerId));
}

export async function incrementLessonViewCount(lessonId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(lessons)
    .set({ viewCount: sql`viewCount + 1` })
    .where(eq(lessons.id, lessonId));
}

export async function searchSharedLessons(query: string): Promise<Lesson[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons)
    .where(sql`isShared = true AND (title LIKE ${`%${query}%`} OR description LIKE ${`%${query}%`})`)
    .orderBy(desc(lessons.viewCount))
    .limit(20);
}

export async function getOrCreateLesson(lesson: InsertLesson): Promise<Lesson | null> {
  const db = await getDb();
  if (!db) return null;
  // Check if lesson with same title and curriculum already exists
  const existing = await db.select().from(lessons)
    .where(sql`title = ${lesson.title} AND curriculumId = ${lesson.curriculumId}`)
    .limit(1);
  if (existing.length > 0) return existing[0];
  // Create new lesson
  const result = await db.insert(lessons).values(lesson);
  if (result[0].insertId) {
    return db.select().from(lessons).where(eq(lessons.id, result[0].insertId as number)).limit(1).then(r => r[0] || null);
  }
  return null;
}

export async function markLessonAsShared(lessonId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(lessons)
    .set({ isShared: true })
    .where(eq(lessons.id, lessonId));
}

// Lesson Ratings & Feedback
export async function rateLessonAndFeedback(lessonId: number, cookieId: string, rating: number, feedback: string, category: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(lessonRatings).where(and(eq(lessonRatings.lessonId, lessonId), eq(lessonRatings.cookieId, cookieId))).limit(1);
  if (existing.length > 0) {
    await db.update(lessonRatings).set({ rating, updatedAt: new Date() }).where(and(eq(lessonRatings.lessonId, lessonId), eq(lessonRatings.cookieId, cookieId)));
  } else {
    await db.insert(lessonRatings).values({ lessonId, cookieId, rating });
  }
  if (feedback.trim()) {
    await db.insert(lessonFeedback).values({ lessonId, cookieId, feedback, category: category as any });
  }
}

export async function getLessonRating(lessonId: number, cookieId: string): Promise<LessonRating | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(lessonRatings).where(and(eq(lessonRatings.lessonId, lessonId), eq(lessonRatings.cookieId, cookieId))).limit(1);
  return result[0] || null;
}

export async function getLessonStats(lessonId: number): Promise<{ avgRating: number; ratingCount: number; feedbackCount: number }> {
  const db = await getDb();
  if (!db) return { avgRating: 0, ratingCount: 0, feedbackCount: 0 };
  const ratingResult = await db.select({ avgRating: sql<number>`AVG(rating)`, ratingCount: sql<number>`COUNT(*)` }).from(lessonRatings).where(eq(lessonRatings.lessonId, lessonId));
  const feedbackResult = await db.select({ feedbackCount: sql<number>`COUNT(*)` }).from(lessonFeedback).where(eq(lessonFeedback.lessonId, lessonId));
  return { avgRating: ratingResult[0]?.avgRating || 0, ratingCount: ratingResult[0]?.ratingCount || 0, feedbackCount: feedbackResult[0]?.feedbackCount || 0 };
}

// Lesson Progress Tracking
export async function startLessonProgress(cookieId: string, lessonId: number): Promise<LessonProgress | null> {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(lessonProgress).where(and(eq(lessonProgress.cookieId, cookieId), eq(lessonProgress.lessonId, lessonId))).limit(1);
  if (existing.length > 0) {
    await db.update(lessonProgress).set({ lastAccessedAt: new Date(), attempts: sql`attempts + 1` }).where(and(eq(lessonProgress.cookieId, cookieId), eq(lessonProgress.lessonId, lessonId)));
    return existing[0];
  }
  const result = await db.insert(lessonProgress).values({ cookieId, lessonId });
  if (result[0].insertId) {
    return db.select().from(lessonProgress).where(eq(lessonProgress.id, result[0].insertId as number)).limit(1).then(r => r[0] || null);
  }
  return null;
}

export async function completeLessonProgress(cookieId: string, lessonId: number, timeSpentSeconds: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(lessonProgress).set({ completedAt: new Date(), timeSpentSeconds, lastAccessedAt: new Date() }).where(and(eq(lessonProgress.cookieId, cookieId), eq(lessonProgress.lessonId, lessonId)));
}

export async function getLessonProgress(cookieId: string, lessonId: number): Promise<LessonProgress | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(lessonProgress).where(and(eq(lessonProgress.cookieId, cookieId), eq(lessonProgress.lessonId, lessonId))).limit(1);
  return result[0] || null;
}

export async function getUserProgress(cookieId: string): Promise<{ lessons: LessonProgress[]; curricula: CurriculumProgress[] }> {
  const db = await getDb();
  if (!db) return { lessons: [], curricula: [] };
  const lessons_data = await db.select().from(lessonProgress).where(eq(lessonProgress.cookieId, cookieId));
  const curricula = await db.select().from(curriculumProgress).where(eq(curriculumProgress.cookieId, cookieId));
  return { lessons: lessons_data, curricula };
}

export async function getStudyStats(cookieId: string): Promise<{ totalTimeSeconds: number; lessonsCompleted: number; streak: number; lastStudyDate: Date | null }> {
  const db = await getDb();
  if (!db) return { totalTimeSeconds: 0, lessonsCompleted: 0, streak: 0, lastStudyDate: null };
  const result = await db.select({ totalTimeSeconds: sql<number>`COALESCE(SUM(timeSpentSeconds), 0)`, lessonsCompleted: sql<number>`COUNT(CASE WHEN completedAt IS NOT NULL THEN 1 END)`, lastStudyDate: sql<Date>`MAX(lastAccessedAt)` }).from(lessonProgress).where(eq(lessonProgress.cookieId, cookieId));
  const profile = await db.select({ streak: visitorProfiles.streak }).from(visitorProfiles).where(eq(visitorProfiles.cookieId, cookieId)).limit(1);
  return { totalTimeSeconds: result[0]?.totalTimeSeconds || 0, lessonsCompleted: result[0]?.lessonsCompleted || 0, streak: profile[0]?.streak || 0, lastStudyDate: result[0]?.lastStudyDate || null };
}

export async function startCurriculumProgress(cookieId: string, curriculumId: string, totalLessons: number): Promise<CurriculumProgress | null> {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(curriculumProgress).where(and(eq(curriculumProgress.cookieId, cookieId), eq(curriculumProgress.curriculumId, curriculumId))).limit(1);
  if (existing.length > 0) return existing[0];
  const result = await db.insert(curriculumProgress).values({ cookieId, curriculumId, totalLessons });
  if (result[0].insertId) {
    return db.select().from(curriculumProgress).where(eq(curriculumProgress.id, result[0].insertId as number)).limit(1).then(r => r[0] || null);
  }
  return null;
}

export async function updateCurriculumProgress(cookieId: string, curriculumId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const completed = await db.select({ count: sql<number>`COUNT(*)` }).from(lessonProgress).innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId)).where(and(eq(lessonProgress.cookieId, cookieId), eq(lessons.curriculumId, curriculumId), sql`${lessonProgress.completedAt} IS NOT NULL`));
  await db.update(curriculumProgress).set({ lessonsCompleted: completed[0]?.count || 0, lastAccessedAt: new Date() }).where(and(eq(curriculumProgress.cookieId, cookieId), eq(curriculumProgress.curriculumId, curriculumId)));
}

export async function getCurriculumProgress(cookieId: string, curriculumId: string): Promise<CurriculumProgress | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(curriculumProgress).where(and(eq(curriculumProgress.cookieId, cookieId), eq(curriculumProgress.curriculumId, curriculumId))).limit(1);
  return result[0] || null;
}
