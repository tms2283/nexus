const BASE_URL = process.env.STRESS_BASE_URL || "http://localhost:3000";
const FLOWS = Number(process.env.STRESS_FLOWS || 6);
const READ_BURST = Number(process.env.STRESS_READ_BURST || 60);
const READ_CONCURRENCY = Number(process.env.STRESS_READ_CONCURRENCY || 12);
const COURSE_ID = process.env.STRESS_FOUNDATION_COURSE || "ai-clarity";
const MODULE_ID = process.env.STRESS_FOUNDATION_MODULE || "ai-m1";
const LESSON_ID = process.env.STRESS_FOUNDATION_LESSON || "ai-m1-l1";

const now = () => Date.now();

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

async function trpcQuery(path, input) {
  const encoded = encodeURIComponent(JSON.stringify({ 0: { json: input } }));
  const res = await fetch(`${BASE_URL}/api/trpc/${path}?batch=1&input=${encoded}`);
  const text = await res.text();
  const parsed = JSON.parse(text);
  const row = Array.isArray(parsed) ? parsed[0] : parsed;
  if (row?.error?.json) throw new Error(row.error.json.message);
  return row?.result?.data?.json;
}

async function trpcMutation(path, input) {
  const res = await fetch(`${BASE_URL}/api/trpc/${path}?batch=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 0: { json: input } }),
  });
  const text = await res.text();
  const parsed = JSON.parse(text);
  const row = Array.isArray(parsed) ? parsed[0] : parsed;
  if (row?.error?.json) throw new Error(row.error.json.message);
  return row?.result?.data?.json;
}

async function timeStep(label, fn, steps) {
  const started = now();
  const result = await fn();
  steps[label] = now() - started;
  return result;
}

async function runFoundationFlow(flowId) {
  const steps = {};
  const started = now();
  const cookieId = `foundation-stress-${Date.now()}-${flowId}`;

  try {
    await timeStep("getTrack", () => trpcQuery("foundation.getTrack", null), steps);
    await timeStep("getCourse", () => trpcQuery("foundation.getCourse", { courseId: COURSE_ID }), steps);

    const progressBefore = await timeStep(
      "getProgressBefore",
      () => trpcQuery("foundation.getProgress", { cookieId }),
      steps
    );

    const template = await timeStep(
      "createTemplateLesson",
      () =>
        trpcMutation("foundation.createTemplateLesson", {
          cookieId,
          courseId: COURSE_ID,
          moduleId: MODULE_ID,
          lessonId: LESSON_ID,
        }),
      steps
    );

    const bundle = await timeStep(
      "getLessonWithSections",
      () => trpcQuery("lesson.getLessonWithSections", { lessonId: template.lessonId, cookieId }),
      steps
    );

    if (!bundle?.sections?.length) {
      throw new Error("Foundation lesson returned no sections.");
    }

    const checkpoint = bundle.sections.find((section) => section.retrievalQuestion);
    if (checkpoint) {
      await timeStep(
        "submitRetrievalAnswer",
        () =>
          trpcMutation("lesson.submitRetrievalAnswer", {
            lessonId: template.lessonId,
            sectionId: checkpoint.id,
            cookieId,
            answer:
              Array.isArray(checkpoint.questionOptions) && checkpoint.questionOptions.length > 0
                ? checkpoint.questionOptions[0]
                : "Stress test answer",
            questionType: checkpoint.questionType || "open_ended",
            timeSpentSeconds: 8,
          }),
        steps
      );
    }

    const completion = await timeStep(
      "completeLesson",
      () => trpcMutation("lesson.completeLesson", { lessonId: template.lessonId, cookieId }),
      steps
    );

    const progressAfter = await timeStep(
      "getProgressAfter",
      () => trpcQuery("foundation.getProgress", { cookieId }),
      steps
    );

    return {
      flowId,
      ok: true,
      lessonDbId: template.lessonId,
      created: template.created,
      completed: completion?.success ?? true,
      progressBefore: progressBefore?.completedLessons ?? 0,
      progressAfter: progressAfter?.completedLessons ?? 0,
      ms: now() - started,
      steps,
    };
  } catch (error) {
    return {
      flowId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      ms: now() - started,
      steps,
    };
  }
}

async function runReadBurst(seedLessonId, seedCookieId) {
  let cursor = 0;
  const timings = [];
  const errors = [];

  async function worker() {
    while (true) {
      const index = cursor;
      if (index >= READ_BURST) break;
      cursor += 1;
      const started = now();
      try {
        await trpcQuery("lesson.getLessonWithSections", { lessonId: seedLessonId, cookieId: `${seedCookieId}-read-${index}` });
        timings.push(now() - started);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(READ_CONCURRENCY, READ_BURST) }, () => worker()));

  return {
    total: READ_BURST,
    ok: timings.length,
    failed: errors.length,
    p50: percentile(timings, 50),
    p95: percentile(timings, 95),
    p99: percentile(timings, 99),
    min: timings.length ? Math.min(...timings) : 0,
    max: timings.length ? Math.max(...timings) : 0,
    sampleErrors: errors.slice(0, 5),
  };
}

async function main() {
  const flows = await Promise.all(Array.from({ length: FLOWS }, (_, index) => runFoundationFlow(index + 1)));
  const successful = flows.filter((flow) => flow.ok);
  const failed = flows.filter((flow) => !flow.ok);

  let readBurst = null;
  if (successful.length > 0) {
    const seed = successful[0];
    readBurst = await runReadBurst(seed.lessonDbId, `foundation-burst-${Date.now()}`);
  }

  const flowTimes = successful.map((flow) => flow.ms);
  const summary = {
    baseUrl: BASE_URL,
    courseId: COURSE_ID,
    moduleId: MODULE_ID,
    lessonId: LESSON_ID,
    flowSummary: {
      total: FLOWS,
      ok: successful.length,
      failed: failed.length,
      p50ms: percentile(flowTimes, 50),
      p95ms: percentile(flowTimes, 95),
      maxMs: flowTimes.length ? Math.max(...flowTimes) : 0,
      minMs: flowTimes.length ? Math.min(...flowTimes) : 0,
    },
    readBurst,
    failedFlows: failed,
    flows,
    at: new Date().toISOString(),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (failed.length > 0 || (readBurst && readBurst.failed > 0)) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ fatal: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
