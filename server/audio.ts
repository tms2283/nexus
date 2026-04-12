/**
 * audio.ts — ElevenLabs two-voice audio overview generator for Nexus.
 *
 * Generates a podcast-style dialogue from any content using two distinct
 * ElevenLabs voices (Host A: curious learner, Host B: domain expert).
 * Audio is written to /public/audio/ and served via Nginx.
 */
import path from "path";
import fs from "fs/promises";
import { createHash } from "crypto";
import { getDb } from "./db";
import { audioOverviews } from "../drizzle/schema";
import { callAI } from "./routers/shared";

// ─── Script-level cache: keyed by SHA-256 of (title + content) ───────────────
// Stores the generated dialogue lines so identical content never hits the LLM twice.
// The cache is in-process and survives restarts only via the DB audioUrl record.
const scriptCache = new Map<string, Array<{ speaker: "A" | "B"; text: string }>>();

function contentHash(title: string, content: string): string {
  return createHash("sha256").update(`${title}\n${content}`).digest("hex").slice(0, 16);
}

// ─── ElevenLabs voice IDs ─────────────────────────────────────────────────────
// Host A: Rachel (warm, curious female voice)
const VOICE_A_ID = process.env.ELEVENLABS_VOICE_A ?? "21m00Tcm4TlvDq8ikWAM";
// Host B: Adam (deep, articulate male voice)
const VOICE_B_ID = process.env.ELEVENLABS_VOICE_B ?? "pNInz6obpgDQGcFmaJgB";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? "";
const AUDIO_DIR = process.env.AUDIO_DIR ?? path.join(process.cwd(), "public", "audio");
const AUDIO_URL_BASE = process.env.AUDIO_URL_BASE ?? "/audio";

interface AudioOverviewInput {
  cookieId: string;
  sourceType: "research_session" | "lesson";
  sourceId: number;
  title: string;
  content: string;
}

interface AudioOverviewResult {
  success: boolean;
  audioUrl?: string;
  transcript?: string;
  durationSeconds?: number;
  error?: string;
}

// ─── Generate two-host dialogue script ───────────────────────────────────────
async function generateDialogueScript(cookieId: string, title: string, content: string): Promise<Array<{ speaker: "A" | "B"; text: string }>> {
  const prompt = `You are writing a podcast dialogue between two hosts discussing: "${title}"

Host A (Alex) is curious, asks questions, and represents the learner.
Host B (Morgan) is the knowledgeable expert who explains clearly.

Source content to discuss:
${content.slice(0, 3000)}

Write a natural 8-12 exchange dialogue. Each line must be under 60 words.
Format EXACTLY as JSON array:
[{"speaker":"A","text":"Alex's line..."},{"speaker":"B","text":"Morgan's line..."}]

Start with Alex greeting and introducing the topic. End with a thought-provoking question from Alex.`;

  try {
    const raw = await callAI(cookieId, prompt, "You are a podcast script writer. Return only a valid JSON array, no markdown fences.", 1500);
    const parsed = JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0] ?? "[]") as Array<{ speaker: string; text: string }>;
    const lines = parsed.filter(l => (l.speaker === "A" || l.speaker === "B") && l.text).map(l => ({ speaker: l.speaker as "A" | "B", text: l.text }));
    if (lines.length > 0) return lines;
  } catch { /* fall through to defaults */ }

  return [
    { speaker: "A", text: `Welcome to today's discussion about ${title}.` },
    { speaker: "B", text: `Great topic. Let's break down the key ideas.` },
  ];
}

// ─── Synthesize a single line via ElevenLabs ─────────────────────────────────
async function synthesizeLine(text: string, voiceId: string): Promise<Buffer | null> {
  if (!ELEVENLABS_API_KEY) return null;
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.warn(`[audio] ElevenLabs error ${res.status}: ${await res.text()}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn("[audio] ElevenLabs synthesis failed:", err);
    return null;
  }
}

// ─── Concatenate MP3 buffers (simple binary concat works for MP3 frames) ─────
function concatMp3Buffers(buffers: Buffer[]): Buffer {
  return Buffer.concat(buffers.filter(b => b.length > 0));
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateAudioOverview(input: AudioOverviewInput): Promise<AudioOverviewResult> {
  if (!ELEVENLABS_API_KEY) {
    return {
      success: false,
      error: "Audio generation requires an ElevenLabs API key. Add ELEVENLABS_API_KEY to your .env file and restart the server.",
    };
  }

  try {
    // 1. Generate dialogue script — use cache to avoid re-hitting LLM for identical content
    const hash = contentHash(input.title, input.content);
    let lines = scriptCache.get(hash);
    if (!lines) {
      lines = await generateDialogueScript(input.cookieId, input.title, input.content);
      if (lines.length > 0) scriptCache.set(hash, lines);
    }
    if (lines.length === 0) return { success: false, error: "Failed to generate dialogue script." };

    const transcript = lines.map(l => `${l.speaker === "A" ? "Alex" : "Morgan"}: ${l.text}`).join("\n");

    // 2. Synthesize lines in parallel batches of 4 to avoid sequential timeouts
    const BATCH_SIZE = 4;
    const audioChunks: Array<Buffer | null> = new Array(lines.length).fill(null);
    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
      const batch = lines.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((line) => synthesizeLine(line.text, line.speaker === "A" ? VOICE_A_ID : VOICE_B_ID))
      );
      results.forEach((chunk, j) => { audioChunks[i + j] = chunk; });
    }
    const validChunks = audioChunks.filter((c): c is Buffer => c !== null);

    if (validChunks.length === 0) {
      return { success: false, error: "All synthesis requests failed. Check your ElevenLabs API key." };
    }

    // 3. Concatenate and write to disk
    const finalAudio = concatMp3Buffers(validChunks);
    await fs.mkdir(AUDIO_DIR, { recursive: true });
    const filename = `nexus-${input.sourceType}-${input.sourceId}-${Date.now()}.mp3`;
    const filePath = path.join(AUDIO_DIR, filename);
    await fs.writeFile(filePath, finalAudio);

    const audioUrl = `${AUDIO_URL_BASE}/${filename}`;
    // Rough duration estimate: ~150 words per minute for dialogue
    const wordCount = lines.reduce((acc, l) => acc + l.text.split(/\s+/).length, 0);
    const durationSeconds = Math.round((wordCount / 150) * 60);

    // 4. Save record to DB
    const db = await getDb();
    if (db) {
      await db.insert(audioOverviews).values({
        cookieId: input.cookieId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        audioUrl,
        transcript,
        durationSeconds,
      });
    }

    return { success: true, audioUrl, transcript, durationSeconds };
  } catch (err) {
    console.error("[audio] generateAudioOverview error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error during audio generation." };
  }
}
