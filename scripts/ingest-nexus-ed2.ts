/**
 * ingest-nexus-ed2.ts — Ingests the supplemental Ed2 OER asset catalog.
 * Column schema differs from Ed1 (Source vs Source Platform, License vs License Name, etc.)
 * All other logic (LLM concept extraction, BKT prereqs, acyclicity check) is identical to ingest-nexus.ts.
 *
 * Usage: npm run ingest:nexus-ed2
 */

import fs from "node:fs";
import path from "node:path";
import { parse as parseCsv } from "csv-parse/sync";
import { getDb } from "../server/db";
import {
  learningAssets, concepts, conceptAssets, conceptPrerequisites,
  type InsertLearningAsset, type InsertConcept,
} from "../drizzle/schema";
import { callAI } from "../server/routers/shared";
import { topoSort, dropCycles } from "../shared/utils/graphSort";
import { eq } from "drizzle-orm";

// ─── Ed2 column shape ─────────────────────────────────────────────────────────

interface Ed2Row {
  "Asset #": string;
  "Source": string;
  "Asset Title": string;
  "URL": string;
  "Content Type": string;
  "License": string;
  "License URL": string;
  "Suggested Learning Objective": string;
  "Difficulty Level": string;
  "Duration": string;
  "Assessment Availability": string;
  "Visual/Interactive Tags": string;
  "Priority": string;
  "Notes": string;
}

// Normalised row shape shared with the rest of the pipeline
interface CatalogRow {
  sourcePlatform: string;
  title: string;
  url: string;
  contentType: string;
  licenseName: string;
  licenseUrl: string;
  objective: string;
  difficulty: string;
  duration: string;
  assessment: string;
  visualTags: string;
  priority: number;
  notes: string;
}

function normalise(r: Ed2Row): CatalogRow {
  return {
    sourcePlatform: (r["Source"] ?? "").trim(),
    title: (r["Asset Title"] ?? "").trim(),
    url: (r["URL"] ?? "").trim(),
    contentType: (r["Content Type"] ?? "").trim(),
    licenseName: (r["License"] ?? "").trim(),
    licenseUrl: (r["License URL"] ?? "").trim(),
    objective: (r["Suggested Learning Objective"] ?? "").trim(),
    difficulty: (r["Difficulty Level"] ?? "").trim(),
    duration: (r["Duration"] ?? "").trim(),
    assessment: (r["Assessment Availability"] ?? "").trim(),
    visualTags: (r["Visual/Interactive Tags"] ?? "").trim(),
    priority: parseInt(r["Priority"] ?? "3") || 3,
    notes: (r["Notes"] ?? "").trim(),
  };
}

// ─── Helpers (same logic as ingest-nexus.ts) ──────────────────────────────────

function deriveLicenseCategory(licenseName: string): "commercial_ok" | "nc_only" | "deep_link_only" {
  const n = licenseName.toLowerCase();
  if (n.includes("cc by-nc") || n.includes("cc-by-nc") || n.includes("nc")) return "nc_only";
  if (n.includes("cc by") || n.includes("cc0") || n.includes("public domain") ||
      n.includes("cc-by") || n.includes("mit") || n.includes("bsd") || n.includes("apache") ||
      n.includes("open")) return "commercial_ok";
  return "deep_link_only";
}

const EMBEDDABLE_PLATFORMS = new Set([
  "youtube", "phet", "mit ocw", "openstax", "saylor", "openlearn",
  "libretexts", "wolfram", "khan academy",
]);

function deriveEmbeddable(platform: string): boolean | null {
  const p = platform.toLowerCase();
  if ([...EMBEDDABLE_PLATFORMS].some(e => p.includes(e))) return true;
  return null;
}

function normaliseContentType(ct: string): InsertLearningAsset["contentType"] {
  const c = ct.toLowerCase();
  if (c.includes("textbook") || c.includes("book")) return "textbook";
  if (c.includes("video") || c.includes("lecture video")) return "video";
  if (c.includes("simulation")) return "simulation";
  if (c.includes("interactive")) return "interactive";
  if (c.includes("problem") || c.includes("exercise")) return "problem-set";
  if (c.includes("article") || c.includes("chapter")) return "article";
  if (c.includes("lecture")) return "lecture";
  return "other";
}

function normaliseDifficulty(dl: string): "intro" | "core" | "stretch" {
  const d = dl.toLowerCase();
  if (d.includes("intro") || d.includes("begin") || d.includes("found") || d.includes("vocational")) return "intro";
  if (d.includes("adv") || d.includes("stretch") || d.includes("expert")) return "stretch";
  return "core";
}

function parseDurationMinutes(dur: string): number {
  const d = dur.toLowerCase().replace(/~/g, "").replace(/,/g, "");
  const hrRange = d.match(/(\d+)\s*[-–]\s*(\d+)\s*h/);
  if (hrRange) return Math.round((parseInt(hrRange[1]) + parseInt(hrRange[2])) / 2) * 60;
  const hrMatch = d.match(/(\d+)\s*h/);
  const minMatch = d.match(/(\d+)\s*m(?!o)/);
  if (hrMatch) return parseInt(hrMatch[1]) * 60 + (minMatch ? parseInt(minMatch[1]) : 0);
  if (minMatch) return parseInt(minMatch[1]);
  const weekMatch = d.match(/(\d+)\s*week/);
  if (weekMatch) return parseInt(weekMatch[1]) * 300;
  return 30;
}

// ─── LLM prompts ──────────────────────────────────────────────────────────────

const EXTRACT_CONCEPTS_SYSTEM = `You are a curriculum designer indexing an open educational resource catalog.
Given assets, output JSON only. No prose. Schema:
{"concepts":[{"conceptId":"<kebab-case-slug>","title":"<Title Case>","summary":"<1-2 sentences, neutral>","domain":"<math|cs|physics|chem|bio|writing|history|ai|econ|health|law|business|other>","bloomLevel":"<remember|understand|apply|analyze|evaluate|create>","estimatedMinutes":<int 5-60>,"assetIndices":[<0-based indices into input>],"relevanceScores":[<0..1 per index>]}]}
Guidelines:
- Prefer broad-but-atomic concepts. Reuse conceptIds across similar assets — deduplicate aggressively.
- Use Suggested Learning Objective. Bloom: define/identify=understand; apply/calculate=apply; compare/critique=analyze.`;

const PREREQ_SYSTEM = `You are a curriculum architect. Given concepts in one domain, output the prerequisite DAG as JSON only.
Schema: {"edges":[{"from":"<conceptId that must be learned first>","to":"<conceptId>","strength":"<hard|soft>"}]}
Rules: Output a DAG with no cycles. hard = strictly required. soft = helpful. Only use provided conceptIds. Keep sparse (1-3 prereqs per concept).`;

interface ExtractedConcept {
  conceptId: string;
  title: string;
  summary: string;
  domain: string;
  bloomLevel: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
  estimatedMinutes: number;
  assetIndices: number[];
  relevanceScores: number[];
}

async function extractConceptsFromBatch(
  batch: CatalogRow[],
  batchStartIndex: number,
): Promise<ExtractedConcept[]> {
  const assetList = batch.map((r, i) =>
    `[${i}] ${r.title} (${r.sourcePlatform}, ${r.contentType})\n    Objective: ${r.objective}\n    Level: ${r.difficulty}`
  ).join("\n");
  const prompt = `Extract concepts from these ${batch.length} assets:\n${assetList}`;

  let raw: string;
  try {
    raw = await callAI("ingest-nexus-ed2", prompt, EXTRACT_CONCEPTS_SYSTEM, 2048);
  } catch (e) {
    console.warn(`  [warn] LLM call failed for batch at ${batchStartIndex}:`, e);
    return [];
  }
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) { console.warn("  [warn] No JSON in LLM response"); return []; }
  try {
    const parsed = JSON.parse(match[0]) as { concepts: ExtractedConcept[] };
    return (parsed.concepts ?? []).map(c => ({
      ...c,
      assetIndices: (c.assetIndices ?? []).map((idx: number) => idx + batchStartIndex),
    }));
  } catch {
    console.warn("  [warn] JSON parse failed"); return [];
  }
}

async function proposePrerequisites(
  group: Array<{ conceptId: string; title: string }>,
): Promise<Array<{ from: string; to: string; strength: "hard" | "soft" }>> {
  if (group.length < 2) return [];
  const list = group.map(c => `- ${c.conceptId}: ${c.title}`).join("\n");
  let raw: string;
  try {
    raw = await callAI("ingest-nexus-ed2-prereqs", `Concepts:\n${list}`, PREREQ_SYSTEM, 1024);
  } catch { return []; }
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { edges: Array<{ from: string; to: string; strength: "hard" | "soft" }> };
    return parsed.edges ?? [];
  } catch { return []; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[ingest-nexus-ed2] Starting Ed2 catalog ingestion…");
  const db = await getDb();
  if (!db) { console.error("No DB connection"); process.exit(1); }

  // 1. Parse CSV
  const csvPath = path.join(process.cwd(), "data", "nexus_catalog_ed2.csv");
  const rawRows = parseCsv(fs.readFileSync(csvPath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
  }) as Ed2Row[];
  const rows = rawRows.map(normalise).filter(r => r.title && r.url);
  console.log(`[ingest-nexus-ed2] Parsed ${rows.length} assets`);

  // 2. Upsert assets
  const assetIdsByIndex = new Map<number, number>();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const vals: InsertLearningAsset = {
      title: r.title.slice(0, 512),
      url: r.url.slice(0, 2048),
      sourcePlatform: r.sourcePlatform.slice(0, 128),
      contentType: normaliseContentType(r.contentType),
      licenseName: r.licenseName.slice(0, 128) || "Unknown",
      licenseUrl: r.licenseUrl ? r.licenseUrl.slice(0, 1024) : null,
      licenseCategory: deriveLicenseCategory(r.licenseName),
      difficultyLevel: normaliseDifficulty(r.difficulty),
      estimatedMinutes: parseDurationMinutes(r.duration),
      hasAssessment: r.assessment.toLowerCase().includes("yes"),
      visualTags: r.visualTags ? r.visualTags.split(",").map(t => t.trim()).filter(Boolean) : [],
      priority: r.priority,
      embeddable: deriveEmbeddable(r.sourcePlatform),
      notes: r.notes ? r.notes.slice(0, 1000) : null,
    };
    try {
      await db.insert(learningAssets).values(vals).onDuplicateKeyUpdate({ set: { title: vals.title } });
      const existing = await db.select({ id: learningAssets.id })
        .from(learningAssets).where(eq(learningAssets.url, vals.url)).limit(1);
      if (existing[0]) assetIdsByIndex.set(i, existing[0].id);
    } catch (e) {
      console.warn(`  [warn] Failed to upsert asset ${i} (${r.title}):`, e);
    }
  }
  console.log(`[ingest-nexus-ed2] Upserted ${assetIdsByIndex.size} assets`);

  // 3. Extract concepts in batches of 10
  const allConcepts = new Map<string, { concept: InsertConcept; assetIds: number[]; relevanceScores: number[] }>();
  const BLOOM_LEVELS = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;

  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    console.log(`[ingest-nexus-ed2] Extracting concepts from rows ${i}–${i + batch.length - 1}…`);
    const extracted = await extractConceptsFromBatch(batch, i);

    for (const c of extracted) {
      const mappedIds = c.assetIndices.map(idx => assetIdsByIndex.get(idx)).filter((id): id is number => id !== undefined);
      const existing = allConcepts.get(c.conceptId);
      if (existing) {
        existing.assetIds.push(...mappedIds);
        existing.relevanceScores.push(...c.relevanceScores);
      } else {
        allConcepts.set(c.conceptId, {
          concept: {
            id: c.conceptId,
            title: c.title.slice(0, 255),
            summary: c.summary || `Learn about ${c.title}.`,
            domain: c.domain || "other",
            bloomLevel: BLOOM_LEVELS.includes(c.bloomLevel as any) ? c.bloomLevel : "understand",
            estimatedMinutes: Math.min(Math.max(c.estimatedMinutes || 15, 5), 60),
            source: "llm-extracted",
            reviewStatus: "draft",
          },
          assetIds: mappedIds,
          relevanceScores: c.relevanceScores,
        });
      }
    }
  }
  console.log(`[ingest-nexus-ed2] Extracted ${allConcepts.size} unique concepts`);

  // 4. Upsert concepts
  for (const [id, { concept }] of allConcepts) {
    try {
      await db.insert(concepts).values(concept)
        .onDuplicateKeyUpdate({ set: { title: concept.title, summary: concept.summary } });
    } catch (e) {
      console.warn(`  [warn] Failed to upsert concept ${id}:`, e);
    }
  }

  // 5. Concept→asset links
  let assetLinkCount = 0;
  for (const [conceptId, { assetIds, relevanceScores }] of allConcepts) {
    for (let j = 0; j < assetIds.length; j++) {
      try {
        const score = relevanceScores[j] ?? 0.5;
        await db.insert(conceptAssets).values({
          conceptId, assetId: assetIds[j],
          role: j === 0 ? "primary" : "alternate",
          relevanceScore: score,
        }).onDuplicateKeyUpdate({ set: { relevanceScore: score } });
        assetLinkCount++;
      } catch { /* Skip duplicates */ }
    }
  }
  console.log(`[ingest-nexus-ed2] Created ${assetLinkCount} concept→asset links`);

  // 6. Propose prerequisites per domain
  const byDomain = new Map<string, Array<{ conceptId: string; title: string }>>();
  for (const [conceptId, { concept }] of allConcepts) {
    const d = concept.domain ?? "other";
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d)!.push({ conceptId, title: concept.title });
  }

  let prereqCount = 0;
  for (const [domain, group] of byDomain) {
    if (group.length < 2) continue;
    console.log(`[ingest-nexus-ed2] Prereqs for "${domain}" (${group.length} concepts)…`);
    const rawEdges = await proposePrerequisites(group);
    const validEdges = dropCycles(rawEdges, group.map(g => g.conceptId));
    for (const e of validEdges) {
      try {
        await db.insert(conceptPrerequisites).values({
          conceptId: e.to, prerequisiteId: e.from, strength: e.strength ?? "hard",
        }).onDuplicateKeyUpdate({ set: { strength: e.strength ?? "hard" } });
        prereqCount++;
      } catch { /* Skip duplicates */ }
    }
  }
  console.log(`[ingest-nexus-ed2] Created ${prereqCount} prerequisite edges`);

  // 7. Acyclicity check across all concepts in DB
  const allEdgeRows = await db.select({
    conceptId: conceptPrerequisites.conceptId,
    prerequisiteId: conceptPrerequisites.prerequisiteId,
  }).from(conceptPrerequisites);
  const allEdges = allEdgeRows.map(r => ({ from: r.prerequisiteId, to: r.conceptId }));
  try {
    topoSort([...allConcepts.keys()], allEdges);
    console.log("[ingest-nexus-ed2] ✓ Acyclicity check passed");
  } catch (e) {
    console.error("[ingest-nexus-ed2] ✗ Cycle detected:", e);
  }

  console.log("[ingest-nexus-ed2] Done.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
