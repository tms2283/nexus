/**
 * ingest-nexus.ts — One-time (idempotent) ingestion of the Nexus OER asset catalog.
 * Reads data/nexus_catalog.csv, upserts learning_assets, extracts concepts via LLM,
 * maps assets→concepts, and proposes prerequisite edges.
 *
 * Usage: npm run ingest:nexus
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
import { eq, and } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CatalogRow {
  "Source Platform": string;
  "Asset Title": string;
  "URL": string;
  "Content Type": string;
  "License Name": string;
  "License URL": string;
  "Suggested Learning Objective": string;
  "Difficulty Level": string;
  "Est. Duration": string;
  "Assessment Availability": string;
  "Visual/Interactive Tags": string;
  "Priority (1-3)": string;
  "Notes": string;
}

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

// ─── License categorisation ───────────────────────────────────────────────────

function deriveLicenseCategory(licenseName: string): "commercial_ok" | "nc_only" | "deep_link_only" {
  const n = licenseName.toLowerCase();
  if (n.includes("cc by-nc") || n.includes("cc-by-nc") || n.includes("nc")) return "nc_only";
  if (n.includes("cc by") || n.includes("cc0") || n.includes("public domain") ||
      n.includes("cc-by") || n.includes("mit") || n.includes("open")) return "commercial_ok";
  return "deep_link_only";
}

const EMBEDDABLE_PLATFORMS = new Set([
  "youtube", "phet", "mit ocw", "openstax", "saylor", "openlearn",
  "libretexts", "wolfram", "khan academy"  // khan is NC but embeddable
]);
const NON_EMBEDDABLE_PLATFORMS = new Set(["alison"]);

function deriveEmbeddable(platform: string): boolean | null {
  const p = platform.toLowerCase();
  if ([...EMBEDDABLE_PLATFORMS].some(e => p.includes(e))) return true;
  if ([...NON_EMBEDDABLE_PLATFORMS].some(e => p.includes(e))) return false;
  return null;
}

function normaliseContentType(ct: string): InsertLearningAsset["contentType"] {
  const c = ct.toLowerCase();
  if (c.includes("textbook") || c.includes("book")) return "textbook";
  if (c.includes("video") || c.includes("lecture video")) return "video";
  if (c.includes("simulation") || c.includes("sim")) return "simulation";
  if (c.includes("interactive")) return "interactive";
  if (c.includes("problem") || c.includes("exercise") || c.includes("set")) return "problem-set";
  if (c.includes("article") || c.includes("chapter")) return "article";
  if (c.includes("lecture")) return "lecture";
  return "other";
}

function normaliseDifficulty(dl: string): "intro" | "core" | "stretch" {
  const d = dl.toLowerCase();
  if (d.includes("intro") || d.includes("begin") || d.includes("found")) return "intro";
  if (d.includes("adv") || d.includes("stretch") || d.includes("expert")) return "stretch";
  return "core";
}

function parseDurationMinutes(dur: string): number {
  const d = dur.toLowerCase();
  const hrMatch = d.match(/(\d+)\s*h/);
  const minMatch = d.match(/(\d+)\s*m/);
  const numMatch = d.match(/^(\d+)$/);
  if (hrMatch) return parseInt(hrMatch[1]) * 60 + (minMatch ? parseInt(minMatch[1]) : 0);
  if (minMatch) return parseInt(minMatch[1]);
  if (numMatch) return parseInt(numMatch[1]);
  return 15;
}

// ─── LLM passes ──────────────────────────────────────────────────────────────

const EXTRACT_CONCEPTS_SYSTEM = `You are a curriculum designer indexing an open educational resource catalog.
Given assets, output JSON only. No prose. Schema:
{"concepts":[{"conceptId":"<kebab-case-slug>","title":"<Title Case>","summary":"<1-2 sentences, neutral>","domain":"<math|cs|physics|chem|bio|writing|history|ai|econ|other>","bloomLevel":"<remember|understand|apply|analyze|evaluate|create>","estimatedMinutes":<int 5-60>,"assetIndices":[<0-based indices into the input>],"relevanceScores":[<0..1 for each index>]}]}
Guidelines:
- Prefer broad-but-atomic concepts.
- Reuse conceptIds across similar assets; deduplicate aggressively.
- Use the Suggested Learning Objective field when present.
- Bloom: define/identify=understand; apply/calculate=apply; compare/critique=analyze.`;

const PREREQ_SYSTEM = `You are a curriculum architect. Given concepts in one domain, output the prerequisite DAG as JSON only.
Schema: {"edges":[{"from":"<conceptId that must be learned first>","to":"<conceptId>","strength":"<hard|soft>"}]}
Rules:
- Output a DAG; no cycles.
- hard = target genuinely cannot be understood without source.
- soft = source makes target easier but not strictly required.
- Only use conceptIds from the provided list; do not invent new ones.
- Keep the graph sparse — 1-3 prerequisites per concept.`;

async function extractConceptsFromBatch(
  batch: CatalogRow[],
  batchStartIndex: number
): Promise<ExtractedConcept[]> {
  const assetList = batch.map((r, i) =>
    `[${i}] ${r["Asset Title"]} (${r["Source Platform"]}, ${r["Content Type"]})\n    Objective: ${r["Suggested Learning Objective"]}\n    Level: ${r["Difficulty Level"]}`
  ).join("\n");

  const prompt = `Extract concepts from these ${batch.length} assets:\n${assetList}`;
  const DUMMY_COOKIE = "ingest-nexus-script";

  let raw: string;
  try {
    raw = await callAI(DUMMY_COOKIE, prompt, EXTRACT_CONCEPTS_SYSTEM, 2048);
  } catch (e) {
    console.warn(`  [warn] LLM call failed for batch starting at ${batchStartIndex}:`, e);
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
  conceptsInDomain: Array<{ conceptId: string; title: string }>
): Promise<Array<{ from: string; to: string; strength: "hard" | "soft" }>> {
  if (conceptsInDomain.length < 2) return [];
  const list = conceptsInDomain.map(c => `- ${c.conceptId}: ${c.title}`).join("\n");
  const prompt = `Concepts in this domain:\n${list}`;
  const DUMMY_COOKIE = "ingest-nexus-prereqs";

  let raw: string;
  try {
    raw = await callAI(DUMMY_COOKIE, prompt, PREREQ_SYSTEM, 1024);
  } catch {
    return [];
  }
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { edges: Array<{ from: string; to: string; strength: "hard" | "soft" }> };
    return parsed.edges ?? [];
  } catch {
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[ingest-nexus] Starting Nexus catalog ingestion…");
  const db = await getDb();
  if (!db) { console.error("No DB connection"); process.exit(1); }

  // 1. Parse CSV
  const csvPath = path.join(process.cwd(), "data", "nexus_catalog.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCsv(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
  }) as CatalogRow[];
  console.log(`[ingest-nexus] Parsed ${rows.length} rows`);

  // 2. Upsert assets
  const assetIdsByIndex = new Map<number, number>();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r["Asset Title"]?.trim() || !r["URL"]?.trim()) continue;

    const licenseCategory = deriveLicenseCategory(r["License Name"] ?? "");
    const priority = parseInt(r["Priority (1-3)"] ?? "3") || 3;

    const vals: InsertLearningAsset = {
      title: r["Asset Title"].slice(0, 512),
      url: r["URL"].slice(0, 2048),
      sourcePlatform: (r["Source Platform"] ?? "Unknown").slice(0, 128),
      contentType: normaliseContentType(r["Content Type"] ?? ""),
      licenseName: (r["License Name"] ?? "Unknown").slice(0, 128),
      licenseUrl: r["License URL"] ? r["License URL"].slice(0, 1024) : null,
      licenseCategory,
      difficultyLevel: normaliseDifficulty(r["Difficulty Level"] ?? ""),
      estimatedMinutes: parseDurationMinutes(r["Est. Duration"] ?? ""),
      hasAssessment: (r["Assessment Availability"] ?? "").toLowerCase().includes("yes"),
      visualTags: r["Visual/Interactive Tags"]
        ? r["Visual/Interactive Tags"].split(",").map(t => t.trim()).filter(Boolean)
        : [],
      priority,
      embeddable: deriveEmbeddable(r["Source Platform"] ?? ""),
      notes: r["Notes"] ? r["Notes"].slice(0, 1000) : null,
    };

    try {
      await db.insert(learningAssets).values(vals).onDuplicateKeyUpdate({ set: { title: vals.title } });
      // Get the inserted/existing id
      const existing = await db.select({ id: learningAssets.id })
        .from(learningAssets)
        .where(eq(learningAssets.url, vals.url))
        .limit(1);
      if (existing[0]) assetIdsByIndex.set(i, existing[0].id);
    } catch (e) {
      console.warn(`  [warn] Failed to upsert asset ${i} (${r["Asset Title"]}):`, e);
    }
  }
  console.log(`[ingest-nexus] Upserted ${assetIdsByIndex.size} assets`);

  // 3. Extract concepts in batches of 10
  const allConcepts = new Map<string, {
    concept: InsertConcept;
    assetIds: number[];
    relevanceScores: number[];
  }>();

  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    console.log(`[ingest-nexus] Extracting concepts from rows ${i}–${i + batch.length - 1}…`);
    const extracted = await extractConceptsFromBatch(batch, i);

    for (const c of extracted) {
      const existing = allConcepts.get(c.conceptId);
      const mappedAssetIds = c.assetIndices
        .map(idx => assetIdsByIndex.get(idx))
        .filter((id): id is number => id !== undefined);

      if (existing) {
        // Merge asset lists
        existing.assetIds.push(...mappedAssetIds);
        existing.relevanceScores.push(...c.relevanceScores);
      } else {
        const domain = c.domain || "other";
        const bloomLevels = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;
        const bloomLevel = bloomLevels.includes(c.bloomLevel as any) ? c.bloomLevel : "understand";

        allConcepts.set(c.conceptId, {
          concept: {
            id: c.conceptId,
            title: c.title.slice(0, 255),
            summary: c.summary || `Learn about ${c.title}.`,
            domain,
            bloomLevel,
            estimatedMinutes: Math.min(Math.max(c.estimatedMinutes || 15, 5), 60),
            source: "llm-extracted",
            reviewStatus: "draft",
          },
          assetIds: mappedAssetIds,
          relevanceScores: c.relevanceScores,
        });
      }
    }
  }
  console.log(`[ingest-nexus] Extracted ${allConcepts.size} unique concepts`);

  // 4. Upsert concepts
  for (const [id, { concept }] of allConcepts) {
    try {
      await db.insert(concepts).values(concept)
        .onDuplicateKeyUpdate({ set: { title: concept.title, summary: concept.summary } });
    } catch (e) {
      console.warn(`  [warn] Failed to upsert concept ${id}:`, e);
    }
  }

  // 5. Upsert concept→asset mappings
  let assetLinkCount = 0;
  for (const [conceptId, { assetIds, relevanceScores }] of allConcepts) {
    for (let j = 0; j < assetIds.length; j++) {
      const assetId = assetIds[j];
      const score = relevanceScores[j] ?? 0.5;
      try {
        await db.insert(conceptAssets).values({
          conceptId,
          assetId,
          role: j === 0 ? "primary" : "alternate",
          relevanceScore: score,
        }).onDuplicateKeyUpdate({ set: { relevanceScore: score } });
        assetLinkCount++;
      } catch {
        // Skip duplicates
      }
    }
  }
  console.log(`[ingest-nexus] Created ${assetLinkCount} concept→asset links`);

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
    console.log(`[ingest-nexus] Proposing prereqs for domain "${domain}" (${group.length} concepts)…`);
    const rawEdges = await proposePrerequisites(group);
    const conceptIds = group.map(g => g.conceptId);
    const validEdges = dropCycles(rawEdges, conceptIds);

    for (const e of validEdges) {
      try {
        await db.insert(conceptPrerequisites).values({
          conceptId: e.to,
          prerequisiteId: e.from,
          strength: e.strength ?? "hard",
        }).onDuplicateKeyUpdate({ set: { strength: e.strength ?? "hard" } });
        prereqCount++;
      } catch {
        // Skip duplicates
      }
    }
  }
  console.log(`[ingest-nexus] Created ${prereqCount} prerequisite edges`);

  // 7. Validate acyclicity across all concepts
  const allConceptIds = [...allConcepts.keys()];
  const allEdgeRows = await db.select({
    conceptId: conceptPrerequisites.conceptId,
    prerequisiteId: conceptPrerequisites.prerequisiteId,
  }).from(conceptPrerequisites);
  const allEdges = allEdgeRows.map(r => ({ from: r.prerequisiteId, to: r.conceptId }));

  try {
    topoSort(allConceptIds, allEdges);
    console.log("[ingest-nexus] ✓ Acyclicity check passed");
  } catch (e) {
    console.error("[ingest-nexus] ✗ Cycle detected:", e);
  }

  console.log("[ingest-nexus] Done.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
