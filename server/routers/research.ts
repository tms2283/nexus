import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  saveResearchSession, getResearchSessions, getDb, addXP,
} from "../db";
import { callAI } from "./shared";
import { researchSources, researchProjects, audioOverviews } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const RESEARCH_SERVICE_URL = process.env.RESEARCH_SERVICE_URL || "http://localhost:8001/api";

// ─── SSRF protection — block private/loopback/link-local IP ranges ───────────
// Covers IPv4 private ranges, IPv6 loopback/link-local, AWS metadata, and
// common DNS rebinding targets (.local, .internal).
const BLOCKED_PATTERNS = [
  // IPv4 loopback and private ranges
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/0\./,
  /^https?:\/\/10\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/172\.(1[6-9]|2[0-9]|3[01])\./,
  /^https?:\/\/169\.254\./,        // Link-local / AWS metadata endpoint
  /^https?:\/\/100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./,  // CGNAT (RFC 6598)

  // IPv6 loopback and link-local
  /^https?:\/\/\[::1\]/,           // IPv6 loopback
  /^https?:\/\/\[fe80::/i,         // IPv6 link-local
  /^https?:\/\/\[fc0[0-9a-f]::/i,  // IPv6 unique local
  /^https?:\/\/\[fd[0-9a-f]{2}::/i,// IPv6 unique local (fd prefix)
  /^https?:\/\/\[::ffff:/i,        // IPv4-mapped IPv6

  // DNS rebinding / internal service discovery
  /^https?:\/\/[^/]*\.internal/i,
  /^https?:\/\/[^/]*\.local(?:host)?/i,
  /^https?:\/\/metadata\.google\.internal/i,
  /^https?:\/\/169\.254\.169\.254/,// AWS/GCP/Azure instance metadata
];

function isSsrfBlocked(url: string): boolean {
  return BLOCKED_PATTERNS.some(p => p.test(url));
}

async function callResearchService<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${RESEARCH_SERVICE_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Research service error ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

export const researchRouter = router({
  // ─── Existing analysis (text/URL paste) ──────────────────────────────────
  analyze: publicProcedure
    .input(z.object({
      cookieId: z.string().optional(),
      content: z.string().max(50000),
      mode: z.enum(["text", "url"]),
    }))
    .mutation(async ({ input }) => {
      let textToAnalyze = input.content;
      if (input.mode === "url") {
        if (isSsrfBlocked(input.content)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "That URL is not allowed. Please paste the text content directly." });
        }
        try {
          const res = await fetch(input.content, { headers: { "User-Agent": "Mozilla/5.0 (compatible; NexusBot/1.0)" }, signal: AbortSignal.timeout(15000) });
          const html = await res.text();
          textToAnalyze = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 15000);
        } catch (_e) {
          textToAnalyze = `Content from URL: ${input.content}. Could not fetch — paste the text directly.`;
        }
      }
      const prompt = `Analyze this content and return ONLY valid JSON:
{"title":"...","summary":"markdown summary (3-5 paragraphs)","keyInsights":["insight1","insight2","insight3","insight4","insight5"],"flashcards":[{"front":"question","back":"answer"},{"front":"question","back":"answer"},{"front":"question","back":"answer"},{"front":"question","back":"answer"},{"front":"question","back":"answer"}],"tags":["tag1","tag2","tag3","tag4"]}
Content:\n${textToAnalyze.slice(0, 12000)}`;
      const response = await callAI(input.cookieId, prompt, undefined, 3000);
      try {
        const m = response.match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]) as { title: string; summary: string; keyInsights: string[]; flashcards: Array<{ front: string; back: string }>; tags: string[] };
      } catch (_e) { /* fallback */ }
      return { title: "Analysis Complete", summary: response, keyInsights: ["See full summary"], flashcards: [], tags: [] };
    }),

  save: publicProcedure
    .input(z.object({
      cookieId: z.string(), title: z.string(),
      sourceText: z.string().optional(), sourceUrl: z.string().optional(),
      summary: z.string().optional(), keyInsights: z.array(z.string()).optional(),
      notes: z.string().optional(), tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await saveResearchSession(input);
      await addXP(input.cookieId, 10);
      return { id, success: true };
    }),

  getSessions: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input }) => getResearchSessions(input.cookieId)),

  generateCitation: publicProcedure
    .input(z.object({
      cookieId: z.string().optional(), title: z.string(),
      url: z.string().optional(), author: z.string().optional(),
      year: z.string().optional(), publisher: z.string().optional(),
      format: z.enum(["apa", "mla", "chicago", "harvard"]),
    }))
    .mutation(async ({ input }) => {
      const prompt = `Generate a ${input.format.toUpperCase()} citation. Return ONLY valid JSON:
{"citation":"complete citation string","inText":"in-text format","notes":"any important notes"}
Title: ${input.title}, URL: ${input.url ?? "N/A"}, Author: ${input.author ?? "Unknown"}, Year: ${input.year ?? new Date().getFullYear()}, Publisher: ${input.publisher ?? "N/A"}`;
      const response = await callAI(input.cookieId, prompt, undefined, 500);
      try {
        const m = response.match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]) as { citation: string; inText: string; notes: string };
      } catch (_e) { /* fallback */ }
      return { citation: response, inText: "", notes: "" };
    }),

  compareTopics: publicProcedure
    .input(z.object({
      cookieId: z.string().optional(),
      topicA: z.string().min(2).max(500), topicB: z.string().min(2).max(500),
      context: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `Compare "${input.topicA}" vs "${input.topicB}"${input.context ? ` in context of: ${input.context}` : ""}. Return ONLY valid JSON:
{"title":"...","overview":"2-3 sentence overview","similarities":["...","...","..."],"differences":[{"aspect":"...","topicA":"...","topicB":"..."},{"aspect":"...","topicA":"...","topicB":"..."},{"aspect":"...","topicA":"...","topicB":"..."},{"aspect":"...","topicA":"...","topicB":"..."}],"verdict":"balanced conclusion","useCases":{"topicA":["...","..."],"topicB":["...","..."]}}`;
      const response = await callAI(input.cookieId, prompt, undefined, 2000);
      try {
        const m = response.match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]) as { title: string; overview: string; similarities: string[]; differences: Array<{ aspect: string; topicA: string; topicB: string }>; verdict: string; useCases: { topicA: string[]; topicB: string[] } };
      } catch (_e) { /* fallback */ }
      return { title: "Comparison", overview: response, similarities: [], differences: [], verdict: "", useCases: { topicA: [], topicB: [] } };
    }),

  // ─── NEW: Source discovery via Python microservice ────────────────────────
  discover: publicProcedure
    .input(z.object({ cookieId: z.string(), topic: z.string().min(2).max(300), maxResults: z.number().min(5).max(50).default(20) }))
    .mutation(async ({ input }) => {
      try {
        const result = await callResearchService<{ sources: Array<{ title: string; url: string; description: string; score: number; published_date?: string }>; count: number }>(
          "/discover", { topic: input.topic, max_results: input.maxResults }
        );
        await addXP(input.cookieId, 10);
        return result;
      } catch (err) {
        // Graceful fallback: research service may not be running
        console.warn("[research.discover] Research service unavailable:", err);
        return { sources: [], count: 0, error: "Research pipeline is not available. Use the text/URL analysis above to analyze content directly." };
      }
    }),

  // ─── NEW: Ingest selected sources (scrape + embed) ────────────────────────
  ingest: publicProcedure
    .input(z.object({
      cookieId: z.string(), projectName: z.string().min(1).max(200),
      sources: z.array(z.object({ url: z.string().url(), title: z.string(), description: z.string().optional(), score: z.number().optional() })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      // Create project record
      const insertResult = await db.insert(researchProjects).values({ cookieId: input.cookieId, name: input.projectName, topic: input.projectName, sourceCount: 0 });
      const projectId = (insertResult[0] as { insertId?: number }).insertId ?? 0;
      // Fire-and-forget scrape + embed via Python service
      callResearchService("/sources/create-batch", {
        sources: input.sources, project_name: input.projectName,
      }).catch(err => console.warn("[research.ingest] Research service unavailable:", err));
      // Save source stubs to MySQL immediately (full text fills in async)
      for (const src of input.sources) {
        await db.insert(researchSources).values({
          cookieId: input.cookieId, sessionId: null,
          url: src.url, title: src.title,
          shortSummary: src.description ?? null,
          score: src.score ?? 0.5,
        }).onDuplicateKeyUpdate({ set: { title: src.title } }).catch(() => {});
      }
      await db.update(researchProjects).set({ sourceCount: input.sources.length }).where(eq(researchProjects.id, projectId));
      await addXP(input.cookieId, 25);
      return { projectId, sourceCount: input.sources.length, success: true };
    }),

  // ─── Semantic search across embedded sources ─────────────────────────────
  globalSearch: publicProcedure
    .input(z.object({ cookieId: z.string(), query: z.string().min(2).max(500), topK: z.number().min(1).max(20).default(8) }))
    .query(async ({ input }) => {
      try {
        const result = await callResearchService<{ results: Array<{ source_id: number; score: number; title: string; url: string; excerpt: string }> }>(
          "/search", { query: input.query, top_k: input.topK }
        );
        return result;
      } catch (_err) {
        return { results: [] };
      }
    }),

  // ─── NEW: RAG chat over a project's sources ───────────────────────────────
  ragChat: publicProcedure
    .input(z.object({ cookieId: z.string(), projectId: z.number(), question: z.string().min(2).max(2000) }))
    .mutation(async ({ input }) => {
      try {
        const result = await callResearchService<{ answer: string; citations: Array<{ title: string; url: string; excerpt: string }> }>(
          "/chat", { question: input.question, project_id: input.projectId, top_k: 5 }
        );
        await addXP(input.cookieId, 5);
        return result;
      } catch (_err) {
        // Fallback: use plain AI without RAG context
        const answer = await callAI(input.cookieId, input.question, "You are a helpful research assistant.", 1024);
        return { answer, citations: [] };
      }
    }),

  // ─── Export a research project (uses Python service project ID) ──────────
  exportSession: publicProcedure
    .input(z.object({
      cookieId: z.string(),
      projectId: z.number().int().positive(),
      format: z.enum(["json", "csv", "markdown", "anki"]),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await callResearchService<string | Record<string, unknown>>(
          `/export/${input.projectId}?format=${input.format}`
        );
        const content = typeof result === "string" ? result : JSON.stringify(result, null, 2);
        return { content, format: input.format };
      } catch (_err) {
        return { content: "", format: input.format, error: "Export service unavailable. Ensure the research pipeline is running." };
      }
    }),

  // ─── NEW: List research projects ──────────────────────────────────────────
  listProjects: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { projects: [] };
      const projects = await db.select().from(researchProjects).where(eq(researchProjects.cookieId, input.cookieId)).orderBy(desc(researchProjects.createdAt)).limit(50);
      return { projects };
    }),

  // ─── NEW: Generate audio overview (ElevenLabs) ───────────────────────────
  generateAudioOverview: publicProcedure
    .input(z.object({ cookieId: z.string(), sessionId: z.number(), title: z.string(), summary: z.string(), keyInsights: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      const { generateAudioOverview } = await import("../audio");
      const result = await generateAudioOverview({ cookieId: input.cookieId, sourceType: "research_session", sourceId: input.sessionId, title: input.title, content: `${input.summary}\n\nKey Insights:\n${input.keyInsights.map((k, i) => `${i + 1}. ${k}`).join("\n")}` });
      if (result.success) await addXP(input.cookieId, 30);
      return result;
    }),

  // ─── Get audio overviews for a source ────────────────────────────────────
  getAudioOverviews: publicProcedure
    .input(z.object({ cookieId: z.string(), sourceType: z.enum(["research_session", "lesson"]), sourceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { overviews: [] };
      const overviews = await db.select().from(audioOverviews).where(eq(audioOverviews.sourceId, input.sourceId)).orderBy(desc(audioOverviews.createdAt)).limit(5);
      return { overviews };
    }),
});
