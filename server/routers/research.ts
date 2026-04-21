import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  saveResearchSession, getResearchSessions, getDb, addXP,
} from "../db";
import { callAI } from "./shared";
import { researchSources, researchProjects, audioOverviews } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { recordPsychSignalAndRefresh } from "../services/personalityAnalyzer";
import { ENV } from "../_core/env";
const RESEARCH_SERVICE_URL = process.env.RESEARCH_SERVICE_URL || "http://localhost:8001/api";

// ─── Gemini Google-Search grounding fallback for source discovery ───────────
// When the Python research microservice is unavailable, use Gemini's native
// google_search tool to return grounded web results with real URIs.
type GeminiGroundingChunk = { web?: { uri?: string; title?: string } };
type GeminiGroundingResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      groundingChunks?: GeminiGroundingChunk[];
      webSearchQueries?: string[];
    };
  }>;
};

async function geminiGroundedDiscover(
  topic: string,
  maxResults: number,
): Promise<Array<{ title: string; url: string; description: string; score: number; published_date?: string }>> {
  const apiKey = ENV.geminiApiKey || ENV.geminiApiKeyBackup;
  if (!apiKey) throw new Error("No Gemini API key configured");
  const model = "gemini-2.5-flash";
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Find the ${maxResults} most authoritative, diverse, and recent web sources about: "${topic}". Prefer primary sources, academic papers, reputable journalism, and official documentation. For each source, give a one-sentence description of what it covers. Number them.`,
          },
        ],
      },
    ],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
  };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!res.ok) throw new Error(`Gemini grounding error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as GeminiGroundingResponse;
  const candidate = data.candidates?.[0];
  const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
  const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join("\n");

  // Try to map each grounded URI to a description line from the model text.
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const seen = new Set<string>();
  const sources: Array<{ title: string; url: string; description: string; score: number }> = [];
  for (let i = 0; i < chunks.length && sources.length < maxResults; i++) {
    const web = chunks[i]?.web;
    if (!web?.uri) continue;
    // Resolve Google's redirect URLs into real URLs where possible via a HEAD fetch is costly; keep original.
    if (seen.has(web.uri)) continue;
    seen.add(web.uri);
    // Best-effort description: pick the i-th numbered line if it exists.
    const descCandidate = lines.find((l) => new RegExp(`^${i + 1}[\\).:\\-]`).test(l)) || lines[i] || "";
    const description = descCandidate.replace(/^\d+[\).:\-]\s*/, "").replace(/\*\*/g, "").slice(0, 400);
    sources.push({
      title: (web.title || new URL(web.uri).hostname).slice(0, 200),
      url: web.uri,
      description: description || `Grounded web source about ${topic}.`,
      score: Math.max(0.3, 1 - i * 0.04),
    });
  }
  return sources;
}
const RESEARCH_SERVICE_ORIGIN = RESEARCH_SERVICE_URL.replace(/\/api$/, "");

type ResearchServiceSource = {
  id: number;
  title: string;
  url: string;
  author?: string | null;
  publish_date?: string | null;
  summary?: string | null;
  topics?: string[];
};

type ResearchServiceSourceDetail = {
  id: number;
  title: string;
  url: string;
  author?: string | null;
  publish_date?: string | null;
  full_text?: string | null;
  description?: string | null;
  summary?: {
    short?: string | null;
    detailed?: string | null;
    key_points?: string[];
    topics?: string[];
  };
};

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

async function assertProjectOwnership(cookieId: string, projectId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const rows = await db.select().from(researchProjects).where(eq(researchProjects.id, projectId)).limit(1);
  const project = rows[0];
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  if (project.cookieId !== cookieId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }
  return project;
}

function getServiceProjectId(project: { id: number; sessionId: number | null }) {
  return project.sessionId ?? project.id;
}

function resolveResearchServiceUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${RESEARCH_SERVICE_ORIGIN}${url}`;
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
      let response: string;
      try {
        response = await callAI(input.cookieId, prompt, undefined, 3000);
      } catch (_e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI analysis failed. Please try again." });
      }
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
    .mutation(async ({ input, ctx }) => {
      const id = await saveResearchSession(input);
      await addXP(input.cookieId, 10);
      const userId = ctx.user?.id;
      if (userId && input.tags?.length) {
        await recordPsychSignalAndRefresh(userId, {
          source: "research",
          signalType: "session.saved",
          path: "/research",
          metrics: { tags: input.tags, title: input.title },
        });
      }
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
      try {
        const response = await callAI(input.cookieId, prompt, undefined, 500);
        try {
          const m = response.match(/\{[\s\S]*\}/);
          if (m) return JSON.parse(m[0]) as { citation: string; inText: string; notes: string };
        } catch (_e) { return { citation: response, inText: "", notes: "" }; }
      } catch (_e) { /* fallback */ }
      return { citation: `${input.author ?? "Unknown"}. (${input.year ?? new Date().getFullYear()}). ${input.title}. ${input.publisher ?? ""}`, inText: "", notes: "" };
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
      try {
        const response = await callAI(input.cookieId, prompt, undefined, 2000);
        try {
          const m = response.match(/\{[\s\S]*\}/);
          if (m) return JSON.parse(m[0]) as { title: string; overview: string; similarities: string[]; differences: Array<{ aspect: string; topicA: string; topicB: string }>; verdict: string; useCases: { topicA: string[]; topicB: string[] } };
        } catch (_e) { /* fallback */ }
        return { title: "Comparison", overview: response, similarities: [], differences: [], verdict: "", useCases: { topicA: [], topicB: [] } };
      } catch (_e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Comparison failed. Please try again." });
      }
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
        // Python research service unreachable — fall back to Gemini Google-Search grounding.
        console.warn("[research.discover] Python service unavailable, trying Gemini grounding:", err);
        try {
          const sources = await geminiGroundedDiscover(input.topic, input.maxResults);
          if (sources.length > 0) {
            await addXP(input.cookieId, 10);
            return { sources, count: sources.length };
          }
          return { sources: [], count: 0, error: "No sources found for that topic. Try broadening or rephrasing the query." };
        } catch (fallbackErr) {
          console.error("[research.discover] Gemini grounding fallback also failed:", fallbackErr);
          return { sources: [], count: 0, error: "Source discovery is temporarily unavailable. Use the text/URL analysis above to analyze content directly." };
        }
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
      // Try the Python research pipeline (scrape + embed). If unavailable,
      // fall back to a local-only project: store the sources in MySQL so the
      // notebook/workspace can still render them, and mark sessionId=null so
      // downstream features that need embeddings know this is a lite project.
      let externalProjectId: number | null = null;
      try {
        const serviceProject = await callResearchService<{
          project_id: number;
          project_name: string;
          created: number;
          failed: number;
          processing: string;
        }>("/sources/create-batch", {
          sources: input.sources,
          project_name: input.projectName,
        });
        if (serviceProject?.project_id) externalProjectId = serviceProject.project_id;
      } catch (err) {
        console.warn("[research.ingest] Python pipeline unavailable — creating local-only notebook:", err);
      }
      // Create project record (linked to external project when available)
      const insertResult = await db.insert(researchProjects).values({
        cookieId: input.cookieId,
        sessionId: externalProjectId,
        name: input.projectName,
        topic: input.projectName,
        sourceCount: input.sources.length,
      });
      const projectId = (insertResult[0] as { insertId?: number }).insertId ?? 0;
      // Save source stubs to MySQL immediately (full text fills in async)
      for (const src of input.sources) {
        await db.insert(researchSources).values({
          cookieId: input.cookieId, sessionId: null,
          url: src.url, title: src.title,
          shortSummary: src.description ?? null,
          score: src.score ?? 0.5,
        }).onDuplicateKeyUpdate({ set: { title: src.title } }).catch(() => {});
      }
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

  // ─── RAG chat over a project's sources ───────────────────────────────────
  ragChat: publicProcedure
    .input(z.object({ cookieId: z.string(), projectId: z.number(), question: z.string().min(2).max(2000) }))
    .mutation(async ({ input }) => {
      const project = await assertProjectOwnership(input.cookieId, input.projectId);
      const serviceProjectId = getServiceProjectId(project);
      try {
        const result = await callResearchService<{ answer: string; citations: Array<{ title: string; url: string; excerpt: string }> }>(
          "/chat", { question: input.question, project_id: serviceProjectId, top_k: 5 }
        );
        await addXP(input.cookieId, 5);
        return result;
      } catch (_err) {
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
      const project = await assertProjectOwnership(input.cookieId, input.projectId);
      const serviceProjectId = getServiceProjectId(project);
      try {
        const result = await callResearchService<string | Record<string, unknown>>(
          `/export/${serviceProjectId}?format=${input.format}`
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

  getProjectWorkspace: publicProcedure
    .input(z.object({ cookieId: z.string(), projectId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const project = await assertProjectOwnership(input.cookieId, input.projectId);
      const serviceProjectId = getServiceProjectId(project);
      try {
        const [sourcesResult, summaryResult, insightsResult, graphResult] = await Promise.all([
          callResearchService<{ sources: ResearchServiceSource[]; count: number }>(`/projects/${serviceProjectId}/sources`),
          callResearchService<{ global_summary: string; source_count: number }>(`/projects/${serviceProjectId}/summary`),
          callResearchService<Record<string, unknown>>(`/projects/${serviceProjectId}/insights`),
          callResearchService<{ nodes: Array<{ id: string; label: string; type: string }>; edges: Array<{ from: string; to: string; label: string }> }>(`/projects/${serviceProjectId}/graph`),
        ]);

        return {
          project: {
            id: project.id,
            name: project.name,
            topic: project.topic,
            sourceCount: project.sourceCount,
            isIndexed: !!project.sessionId,
            createdAt: project.createdAt,
          },
          sources: sourcesResult.sources ?? [],
          summary: summaryResult.global_summary ?? "",
          insights: insightsResult,
          graph: graphResult,
        };
      } catch (err) {
        // Python pipeline unavailable — serve a local-only workspace from MySQL
        // so the notebook at least shows the selected sources.
        console.warn("[research.getProjectWorkspace] Python pipeline unavailable, serving local data:", err);
        const db2 = await getDb();
        const localSources = db2
          ? await db2.select().from(researchSources)
              .where(eq(researchSources.cookieId, input.cookieId))
              .orderBy(desc(researchSources.id)).limit(100)
          : [];
        const mapped = localSources
          .filter((s: any) => !s.sessionId || s.sessionId === (project.sessionId ?? project.id))
          .slice(0, project.sourceCount || 50)
          .map((s: any, i: number) => ({
            id: s.id ?? i,
            title: s.title ?? "Untitled",
            url: s.url ?? "",
            author: null,
            publish_date: null,
            summary: s.shortSummary ?? null,
            topics: [],
          }));
        return {
          project: {
            id: project.id,
            name: project.name,
            topic: project.topic,
            sourceCount: project.sourceCount,
            isIndexed: false,
            createdAt: project.createdAt,
          },
          sources: mapped,
          summary: "",
          insights: {},
          graph: { nodes: [], edges: [] },
        };
      }
    }),

  getSourceDetail: publicProcedure
    .input(z.object({
      cookieId: z.string(),
      projectId: z.number().int().positive(),
      sourceId: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const project = await assertProjectOwnership(input.cookieId, input.projectId);
      const serviceProjectId = getServiceProjectId(project);

      const projectSources = await callResearchService<{ sources: ResearchServiceSource[]; count: number }>(
        `/projects/${serviceProjectId}/sources`
      );
      const belongsToProject = (projectSources.sources ?? []).some((source) => source.id === input.sourceId);
      if (!belongsToProject) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source not found in this project" });
      }

      return callResearchService<ResearchServiceSourceDetail>(`/sources/${input.sourceId}`);
    }),

  listProjectAudioOverviews: publicProcedure
    .input(z.object({ cookieId: z.string(), projectId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const project = await assertProjectOwnership(input.cookieId, input.projectId);
      const serviceProjectId = getServiceProjectId(project);
      const response = await callResearchService<{ items: Array<{
        id: number;
        title: string;
        summary: string;
        voice_a: string;
        voice_b: string;
        style: string;
        duration_seconds: number;
        created_at: string | null;
        audio_url: string;
        cached?: boolean;
      }> }>(`/projects/${serviceProjectId}/audio-overviews`);
      return {
        items: (response.items ?? []).map((item) => ({
          ...item,
          audio_url: resolveResearchServiceUrl(item.audio_url),
        })),
      };
    }),

  generateProjectAudioOverview: publicProcedure
    .input(z.object({
      cookieId: z.string(),
      projectId: z.number().int().positive(),
      forceRefresh: z.boolean().optional(),
      voiceA: z.string().optional(),
      voiceB: z.string().optional(),
      style: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const project = await assertProjectOwnership(input.cookieId, input.projectId);
      const serviceProjectId = getServiceProjectId(project);
      const item = await callResearchService<{
        id: number;
        title: string;
        summary: string;
        voice_a: string;
        voice_b: string;
        style: string;
        duration_seconds: number;
        created_at: string | null;
        audio_url: string;
        cached?: boolean;
      }>(`/projects/${serviceProjectId}/audio-overviews`, {
        force_refresh: input.forceRefresh ?? false,
        voice_a: input.voiceA ?? "Kore",
        voice_b: input.voiceB ?? "Puck",
        style: input.style ?? "conversational",
      });
      return {
        ...item,
        audio_url: resolveResearchServiceUrl(item.audio_url),
      };
    }),

  // ─── Generate audio overview (ElevenLabs) ───────────────────────────────
  generateAudioOverview: publicProcedure
    .input(z.object({ cookieId: z.string(), sessionId: z.number(), title: z.string(), summary: z.string(), keyInsights: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      // Ownership check — verify session belongs to caller
      const db = await getDb();
      if (db) {
        const { researchSessions } = await import("../../drizzle/schema");
        const sessions = await db.select({ cookieId: researchSessions.cookieId })
          .from(researchSessions).where(eq(researchSessions.id, input.sessionId)).limit(1);
        if (sessions.length > 0 && sessions[0].cookieId !== input.cookieId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
      }
      const { generateAudioOverview } = await import("../audio");
      const result = await generateAudioOverview({ cookieId: input.cookieId, sourceType: "research_session", sourceId: input.sessionId, title: input.title, content: `${input.summary}\n\nKey Insights:\n${input.keyInsights.map((k, i) => `${i + 1}. ${k}`).join("\n")}` });
      if (result.success) await addXP(input.cookieId, 30);
      return result;
    }),

  // ─── Generate content (study guide, FAQ, briefing, etc.) ────────────────
  generateContent: publicProcedure
    .input(z.object({
      cookieId: z.string(),
      projectId: z.number().int().positive(),
      type: z.enum(["study-guide", "briefing", "faq", "timeline", "mindmap", "summary"]),
    }))
    .mutation(async ({ input }) => {
      const project = await assertProjectOwnership(input.cookieId, input.projectId);
      const serviceProjectId = getServiceProjectId(project);
      const sourcesResult = await callResearchService<{ sources: ResearchServiceSource[]; count: number }>(
        `/projects/${serviceProjectId}/sources`
      );
      const context = (sourcesResult.sources ?? [])
        .slice(0, 15)
        .map(s => `[${s.title}]${s.topics?.length ? ` (${s.topics.slice(0, 4).join(', ')})` : ''}\n${s.summary || ''}`)
        .join('\n\n---\n\n')
        .slice(0, 12000);
      const prompts: Record<string, string> = {
        "study-guide": `Create a comprehensive study guide with key concepts, definitions, and review questions based on these research sources:\n\nSOURCES:\n${context}`,
        "briefing": `Create a professional executive briefing document with key findings, insights, and recommendations based on these sources:\n\nSOURCES:\n${context}`,
        "faq": `Generate 10 insightful frequently asked questions with detailed answers based on these research sources:\n\nSOURCES:\n${context}`,
        "timeline": `Extract all dates, events, and milestones from these sources and present them as a chronological timeline:\n\nSOURCES:\n${context}`,
        "mindmap": `Create a hierarchical mind map outline (use indented text with dashes and sub-dashes) showing the main topics and their conceptual relationships from these sources:\n\nSOURCES:\n${context}`,
        "summary": `Create a comprehensive synthesis covering all major themes, findings, and connections across these research sources:\n\nSOURCES:\n${context}`,
      };
      const content = await callAI(input.cookieId, prompts[input.type], undefined, 2500);
      await addXP(input.cookieId, 5);
      return { content, type: input.type };
    }),

  // ─── Expand a knowledge tree topic (AI summary + subtopics) ─────────────
  expandKnowledgeTopic: publicProcedure
    .input(z.object({
      cookieId: z.string(),
      topic: z.string().min(1).max(300),
      exclusions: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const exclusionText = (input.exclusions?.length ?? 0) > 0
        ? `Do not repeat these already-mapped topics: ${input.exclusions!.slice(0, 20).join(', ')}.`
        : "Return a balanced mix of foundational and adjacent concepts.";
      const prompt = `You are building a knowledge graph. For the topic "${input.topic}", return ONLY valid JSON with no other text:
{"summary":"4-6 sentence wiki-style factual overview covering definition, significance, and connections to other ideas","subtopics":["specific topic 1","specific topic 2","specific topic 3","specific topic 4","specific topic 5","specific topic 6"]}
Requirements: subtopics must be specific adjacent concepts worth exploring next, not generic terms. No duplicates. ${exclusionText}`;
      const raw = await callAI(input.cookieId, prompt, undefined, 700);
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]) as { summary: string; subtopics: string[] };
      } catch (_) { /* fallthrough */ }
      return { summary: raw.slice(0, 700), subtopics: [] };
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
