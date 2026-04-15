import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../server/routers/index";
import superjson from "superjson";

type FlowMetrics = {
  flowId: number;
  ok: boolean;
  lessonId?: number;
  error?: string;
  ms: number;
  steps: Record<string, number>;
};

const BASE_URL = process.env.STRESS_BASE_URL || "http://localhost:3000";
const FLOWS = Number(process.env.STRESS_FLOWS || 3);
const READ_BURST = Number(process.env.STRESS_READ_BURST || 80);
const READ_CONCURRENCY = Number(process.env.STRESS_READ_CONCURRENCY || 20);

const client = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: `${BASE_URL}/api/trpc`,
      maxURLLength: 2083,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          headers: {
            ...(options?.headers || {}),
            "x-stress-test": "learn-pipeline",
          },
        });
      },
    }),
  ],
});

const now = () => Date.now();

async function timeStep<T>(label: string, fn: () => Promise<T>, steps: Record<string, number>): Promise<T> {
  const start = now();
  const result = await fn();
  steps[label] = now() - start;
  return result;
}

async function runFlow(flowId: number): Promise<FlowMetrics> {
  const t0 = now();
  const steps: Record<string, number> = {};
  const cookieId = `stress-${Date.now()}-${flowId}`;
  try {
    const created = await timeStep("createLessonWithResources", () =>
      client.lesson.createLessonWithResources.mutate({
        cookieId,
        title: `Stress Lesson ${flowId}`,
        topic: `Stress Topic ${flowId}`,
        objectives: [
          "Understand core mechanics",
          "Apply concept to a concrete scenario",
          "Recall key ideas after retrieval",
        ],
        curriculumId: `stress-curriculum-${flowId}`,
      }),
      steps
    );

    const blueprint = await timeStep("blueprintLesson", () =>
      client.lesson.blueprintLesson.mutate({
        lessonId: created.id,
        cookieId,
        topic: created.title,
        depth: 3,
      }),
      steps
    );

    await timeStep("generateLessonSections", () =>
      client.lesson.generateLessonSections.mutate({
        lessonId: created.id,
        blueprintId: blueprint.blueprintId,
        cookieId,
      }),
      steps
    );

    const bundle = await timeStep("getLessonWithSections", () =>
      client.lesson.getLessonWithSections.query({
        lessonId: created.id,
        cookieId,
      }),
      steps
    );

    if (!bundle || !bundle.sections || bundle.sections.length === 0) {
      throw new Error("No sections returned after generation.");
    }

    const firstSection = bundle.sections[0];
    await timeStep("generateSectionImage", () =>
      client.lesson.generateSectionImage.mutate({
        sectionId: firstSection.id,
        lessonTitle: bundle.lesson.title,
        sectionTitle: firstSection.title,
        sectionContent: String(firstSection.content || "").slice(0, 700),
        assetType: (firstSection.visualAsset || "diagram") as any,
        cookieId,
      }),
      steps
    );

    // One flow includes video generation to stress long-running media path.
    if (flowId === 1) {
      const conceptSection = bundle.sections.find((s) => s.type === "concept" || s.type === "visual_explainer");
      if (conceptSection) {
        await timeStep("generateSectionVideo", () =>
          client.lesson.generateSectionVideo.mutate({
            sectionId: conceptSection.id,
            conceptPrompt: `Explain ${conceptSection.title} visually in 45 seconds with a dark background and clean educational animation.`,
            cookieId,
          }),
          steps
        );
      }
    }

    // Complete all retrieval checkpoints with non-AI grading path for stress throughput.
    for (const section of bundle.sections) {
      await client.lesson.submitRetrievalAnswer.mutate({
        lessonId: created.id,
        sectionId: section.id,
        cookieId,
        answer: "A",
        questionType: "multiple_choice",
      });
    }

    await timeStep("completeLesson", () =>
      client.lesson.completeLesson.mutate({
        lessonId: created.id,
        cookieId,
      }),
      steps
    );

    return {
      flowId,
      ok: true,
      lessonId: created.id,
      ms: now() - t0,
      steps,
    };
  } catch (err) {
    return {
      flowId,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      ms: now() - t0,
      steps,
    };
  }
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

async function runReadBurst(lessonId: number, cookieId: string) {
  const timings: number[] = [];
  const errors: string[] = [];
  let completed = 0;

  const worker = async () => {
    while (true) {
      const myIndex = completed;
      if (myIndex >= READ_BURST) break;
      completed += 1;
      const t = now();
      try {
        await client.lesson.getLessonWithSections.query({ lessonId, cookieId });
        timings.push(now() - t);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
  };

  const workers = Array.from({ length: Math.min(READ_CONCURRENCY, READ_BURST) }, () => worker());
  await Promise.all(workers);

  return {
    total: READ_BURST,
    ok: timings.length,
    failed: errors.length,
    p50: percentile(timings, 50),
    p95: percentile(timings, 95),
    p99: percentile(timings, 99),
    max: timings.length ? Math.max(...timings) : 0,
    min: timings.length ? Math.min(...timings) : 0,
    sampleErrors: errors.slice(0, 5),
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log(JSON.stringify({ phase: "start", startedAt, baseUrl: BASE_URL, flows: FLOWS, readBurst: READ_BURST, readConcurrency: READ_CONCURRENCY }, null, 2));

  const flowPromises = Array.from({ length: FLOWS }, (_, i) => runFlow(i + 1));
  const flowResults = await Promise.all(flowPromises);

  const successful = flowResults.filter((r) => r.ok && r.lessonId);
  const failed = flowResults.filter((r) => !r.ok);

  let readBurstResult: any = null;
  if (successful.length > 0) {
    const seed = successful[0];
    readBurstResult = await runReadBurst(seed.lessonId!, `stress-read-${Date.now()}`);
  }

  const flowTimes = successful.map((r) => r.ms);
  const summary = {
    phase: "done",
    endedAt: new Date().toISOString(),
    flowSummary: {
      total: FLOWS,
      ok: successful.length,
      failed: failed.length,
      p50ms: percentile(flowTimes, 50),
      p95ms: percentile(flowTimes, 95),
      maxMs: flowTimes.length ? Math.max(...flowTimes) : 0,
      minMs: flowTimes.length ? Math.min(...flowTimes) : 0,
    },
    readBurst: readBurstResult,
    failedFlows: failed,
    flows: flowResults,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (failed.length > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error(JSON.stringify({ phase: "fatal", error: err instanceof Error ? err.message : String(err) }, null, 2));
  process.exit(1);
});
