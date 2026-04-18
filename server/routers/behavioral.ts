/**
 * Nexus tRPC Router — Behavioral Signal Processor integration.
 *
 * Proxies requests to the PBSP FastAPI service on port 8002.
 * All procedures fall back gracefully when PBSP is unavailable so Nexus
 * continues to work even if the desktop agent isn't running.
 */

import { z } from "zod";
import { router, publicProcedure } from "../../_core/trpc";

const PBSP_SERVICE_URL =
  process.env.PBSP_SERVICE_URL || "http://localhost:8002/api";
const PBSP_API_KEY = process.env.PBSP_API_KEY || "";

// ── Service Call Helper ──────────────────────────────────────────────────────

async function callPBSP<T>(
  path: string,
  options: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {}
): Promise<T> {
  const { method = options.body ? "POST" : "GET", body } = options;
  const res = await fetch(`${PBSP_SERVICE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PBSP_API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`PBSP ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const ContentCandidateSchema = z.object({
  content_id: z.string(),
  title: z.string(),
  topic_tags: z.array(z.string()).default([]),
  difficulty: z.number().int().min(1).max(5).default(3),
  content_type: z
    .enum(["video", "article", "quiz", "exercise", "lesson"])
    .default("lesson"),
  estimated_minutes: z.number().positive().default(10),
  lesson_id: z.string().nullable().optional(),
  course_id: z.string().nullable().optional(),
});

const FeedbackSchema = z.object({
  lesson_id: z.string(),
  course_id: z.string().optional(),
  content_type: z.string().optional(),
  topic_tags: z.array(z.string()).default([]),
  difficulty_felt: z.enum(["too_easy", "just_right", "too_hard"]).optional(),
  helpfulness: z.number().int().min(1).max(5).optional(),
  engagement: z.number().int().min(1).max(5).optional(),
  would_revisit: z.boolean().optional(),
  free_text: z.string().max(1000).optional(),
  user_nexus_id: z.string().optional(),
});

const EventContextSchema = z.object({
  app: z.string().optional(),
  window_title: z.string().optional(),
  url: z.string().optional(),
  domain: z.string().optional(),
  domain_category: z.string().optional(),
  duration: z.number().optional(),
  lesson_id: z.string().optional(),
  course_id: z.string().optional(),
  topic_tags: z.array(z.string()).default([]),
  difficulty: z.number().optional(),
  content_type: z.string().optional(),
});

const BehavioralEventSchema = z.object({
  type: z.string(),
  source: z.string(),
  confidence: z.number().default(1.0),
  context: EventContextSchema.optional(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.number().optional(),
});

// ── Type Definitions ──────────────────────────────────────────────────────────

interface LearningInsights {
  learning_profile: {
    style_primary: string | null;
    style_secondary: string | null;
    approach: string | null;
    mode: string | null;
  };
  optimal_study_times: Array<{
    hour: number;
    focus_probability: number;
    sample_size: number;
  }>;
  current_interests: Array<{
    topic: string;
    confidence: number;
    frequency: number;
  }>;
  struggle_areas: Array<{ topic: string; frequency: number }>;
  recommendations: Array<{ type: string; message: string }>;
  burnout_risk: { score: number; label: string };
  mode_distribution: Record<string, number>;
  total_sessions_analyzed: number;
}

interface BehavioralTraits {
  traits: {
    exploration_breadth: number;
    focus_consistency: number;
    social_orientation: number;
    friction_tolerance: number;
    emotional_volatility: number;
    confidence: number;
  };
  trait_descriptions: Record<string, string>;
  learning_style: {
    primary: string | null;
    secondary: string | null;
    approach: string | null;
    mode: string | null;
  };
}

interface BehavioralProfile {
  trait_exploration_breadth: number;
  trait_focus_consistency: number;
  trait_social_orientation: number;
  trait_friction_tolerance: number;
  trait_emotional_volatility: number;
  trait_confidence: number;
  avg_focus_score: number;
  avg_struggle_score: number;
  total_sessions: number;
  total_events: number;
  burnout_risk_score: number;
  last_updated: number;
}

interface RecommendedItem {
  content_id: string;
  title: string;
  score: number;
  reasons: string[];
  topic_tags: string[];
  difficulty: number;
  content_type: string;
  estimated_minutes: number;
  lesson_id: string | null;
  course_id: string | null;
}

interface SessionData {
  session_id: string;
  start_time: number;
  end_time: number | null;
  duration_minutes: number;
  focus_score: number;
  struggle_score: number;
  productivity_score: number;
  dominant_mode: string;
}

interface ConnectorInfo {
  connector_id: string;
  display_name: string;
  auth_type: string;
  description: string;
  status: string;
  last_sync: number | null;
}

// ── Router ────────────────────────────────────────────────────────────────────

export const behavioralRouter = router({
  /**
   * Primary endpoint for Nexus personalization — learning profile, optimal
   * study times, struggle areas, interests, and recommendations.
   */
  getLearningInsights: publicProcedure.query(async () => {
    try {
      return await callPBSP<LearningInsights>("/insights/learning");
    } catch (err) {
      console.warn("PBSP learning insights unavailable:", err);
      return {
        learning_profile: { style_primary: null, style_secondary: null, approach: null, mode: null },
        optimal_study_times: [],
        current_interests: [],
        struggle_areas: [],
        recommendations: [],
        burnout_risk: { score: 0, label: "unknown" },
        mode_distribution: {},
        total_sessions_analyzed: 0,
      } satisfies LearningInsights;
    }
  }),

  /** Full behavioral profile (trait scores, aggregates). */
  getProfile: publicProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        const path = input.userId ? `/profile/${input.userId}` : "/profile";
        return await callPBSP<BehavioralProfile>(path);
      } catch (err) {
        console.warn("PBSP profile unavailable:", err);
        return null;
      }
    }),

  /**
   * Behavioral trait scores + learning style.
   * Replaces the old "personality" endpoint — same data, honest names.
   */
  getTraits: publicProcedure.query(async () => {
    try {
      return await callPBSP<BehavioralTraits>("/insights/personality");
    } catch (err) {
      console.warn("PBSP traits unavailable:", err);
      return null;
    }
  }),

  /** Optimal study/focus times based on historical session data. */
  getOptimalTimes: publicProcedure.query(async () => {
    try {
      return await callPBSP<{
        optimal_times: Array<{
          hour: number;
          day: string;
          focus_probability: number;
          sample_size: number;
        }>;
      }>("/insights/optimal-times");
    } catch {
      return { optimal_times: [] };
    }
  }),

  /** Current struggle areas with topic and duration breakdown. */
  getStruggles: publicProcedure.query(async () => {
    try {
      return await callPBSP<{
        struggles: Array<{
          topic: string;
          frequency: number;
          avg_struggle_duration: number;
        }>;
      }>("/insights/struggles");
    } catch {
      return { struggles: [] };
    }
  }),

  /** Interest graph with confidence scores derived from search and lesson history. */
  getInterests: publicProcedure.query(async () => {
    try {
      return await callPBSP<{
        interests: Array<{
          topic: string;
          confidence: number;
          frequency: number;
          trend: string;
        }>;
      }>("/insights/interests");
    } catch {
      return { interests: [] };
    }
  }),

  /** Burnout risk assessment with contributing factors. */
  getBurnoutRisk: publicProcedure.query(async () => {
    try {
      return await callPBSP<{
        score: number;
        label: string;
        factors: string[];
      }>("/insights/burnout-risk");
    } catch {
      return { score: 0, label: "unknown", factors: [] };
    }
  }),

  /**
   * Rank a list of Nexus content candidates for the current user.
   *
   * Send your full candidate pool; receive them sorted by predicted fit
   * with human-readable reason strings for each recommendation.
   */
  getRecommendations: publicProcedure
    .input(
      z.object({
        candidates: z.array(ContentCandidateSchema).min(1).max(200),
        top_n: z.number().int().min(1).max(50).default(10),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await callPBSP<{
          recommendations: RecommendedItem[];
          total_candidates: number;
          returned: number;
        }>("/recommend", { body: input });
      } catch (err) {
        console.warn("PBSP recommendations unavailable:", err);
        // Return candidates in original order as a neutral fallback
        return {
          recommendations: input.candidates.slice(0, input.top_n).map((c) => ({
            ...c,
            lesson_id: c.lesson_id ?? null,
            course_id: c.course_id ?? null,
            score: 0,
            reasons: [],
          })),
          total_candidates: input.candidates.length,
          returned: Math.min(input.candidates.length, input.top_n),
        };
      }
    }),

  /**
   * Submit user feedback on a piece of Nexus content.
   * Call this after a rating widget interaction or lesson completion survey.
   */
  submitFeedback: publicProcedure
    .input(FeedbackSchema)
    .mutation(async ({ input }) => {
      try {
        return await callPBSP<{ id: number; recorded_at: number }>(
          "/feedback",
          { body: input }
        );
      } catch (err) {
        console.warn("PBSP feedback submission failed:", err);
        return null;
      }
    }),

  /**
   * Push Nexus behavioral events (e.g. video paused, lesson started) back to PBSP.
   */
  trackEvent: publicProcedure
    .input(BehavioralEventSchema)
    .mutation(async ({ input }) => {
      try {
        const payload = {
          events: [{ ...input, timestamp: input.timestamp || (Date.now() / 1000) }]
        };
        return await callPBSP<{ accepted: number; total: number }>(
          "/events/ingest",
          { body: payload }
        );
      } catch (err) {
        console.warn("PBSP event tracking failed:", err);
        return { accepted: 0, total: 1 };
      }
    }),

  /** Aggregated feedback stats for a single lesson (for content editors). */
  getLessonFeedbackSummary: publicProcedure
    .input(z.object({ lessonId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await callPBSP<{
          lesson_id: string;
          summary: {
            response_count: number;
            avg_helpfulness: number | null;
            avg_engagement: number | null;
            too_hard_count: number;
            just_right_count: number;
            too_easy_count: number;
            would_revisit_count: number;
          };
        }>(`/feedback/${input.lessonId}/summary`);
      } catch {
        return null;
      }
    }),

  /** Recent behavioral sessions. */
  getSessions: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(200).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        return await callPBSP<{ sessions: SessionData[]; count: number }>(
          `/sessions?limit=${input.limit}&offset=${input.offset}`
        );
      } catch {
        return { sessions: [], count: 0 };
      }
    }),

  /** Connected platform status. */
  getConnectors: publicProcedure.query(async () => {
    try {
      return await callPBSP<{ connectors: ConnectorInfo[] }>("/connectors");
    } catch {
      return { connectors: [] };
    }
  }),

  /** Live marker state from the running desktop agent. */
  getLiveMarkers: publicProcedure.query(async () => {
    try {
      return await callPBSP<{
        recent_markers: Array<{
          type: string;
          confidence: number;
          timestamp: number;
          app: string;
        }>;
        current_state: {
          active_app: string;
          window_title: string;
          keystroke_rate: number;
          focus_duration: number;
          idle_seconds: number;
          app_switches: number;
        } | null;
      }>("/markers/live");
    } catch {
      return { recent_markers: [], current_state: null };
    }
  }),

  /** PBSP health check — is the agent running? */
  getHealth: publicProcedure.query(async () => {
    try {
      const health = await callPBSP<{ status: string; uptime: number }>(
        "/health"
      );
      return { ...health, available: true };
    } catch {
      return { status: "unavailable", uptime: 0, available: false };
    }
  }),
});
