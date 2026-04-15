const BASE_URL = process.env.STRESS_BASE_URL || "http://localhost:3000";
const FLOWS = Number(process.env.STRESS_FLOWS || 2);
const READ_BURST = Number(process.env.STRESS_READ_BURST || 40);
const READ_CONCURRENCY = Number(process.env.STRESS_READ_CONCURRENCY || 10);

const now = () => Date.now();

async function trpcMutation(path, input) {
  const res = await fetch(`${BASE_URL}/api/trpc/${path}?batch=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-stress-test": "learn-http-harness" },
    body: JSON.stringify({ 0: { json: input } }),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 240)}`);
  }
  const row = Array.isArray(parsed) ? parsed[0] : parsed;
  if (row?.error?.json) {
    throw new Error(`${path}: ${row.error.json.message}`);
  }
  return row?.result?.data?.json;
}

async function trpcQuery(path, input) {
  const encoded = encodeURIComponent(JSON.stringify({ 0: { json: input } }));
  const res = await fetch(`${BASE_URL}/api/trpc/${path}?batch=1&input=${encoded}`, {
    headers: { "x-stress-test": "learn-http-harness" },
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 240)}`);
  }
  const row = Array.isArray(parsed) ? parsed[0] : parsed;
  if (row?.error?.json) {
    throw new Error(`${path}: ${row.error.json.message}`);
  }
  return row?.result?.data?.json;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[idx];
}

async function timeStep(name, fn, steps) {
  const t0 = now();
  const result = await fn();
  steps[name] = now() - t0;
  return result;
}

async function runFlow(flowId) {
  const steps = {};
  const t0 = now();
  const cookieId = `stress-${Date.now()}-${flowId}`;

  try {
    const created = await timeStep("createLessonWithResources", () => trpcMutation("lesson.createLessonWithResources", {
      cookieId,
      title: `Stress Lesson ${flowId}`,
      topic: `Stress Topic ${flowId}`,
      objectives: ["Understand", "Apply", "Recall"],
      curriculumId: `stress-curriculum-${flowId}`,
    }), steps);

    const blueprint = await timeStep("blueprintLesson", () => trpcMutation("lesson.blueprintLesson", {
      lessonId: created.id,
      cookieId,
      topic: created.title,
      depth: 3,
    }), steps);

    await timeStep("generateLessonSections", () => trpcMutation("lesson.generateLessonSections", {
      lessonId: created.id,
      blueprintId: blueprint.blueprintId,
      cookieId,
    }), steps);

    const bundle = await timeStep("getLessonWithSections", () => trpcQuery("lesson.getLessonWithSections", {
      lessonId: created.id,
      cookieId,
    }), steps);

    if (!bundle?.sections?.length) {
      throw new Error("No sections returned");
    }

    const first = bundle.sections[0];
    await timeStep("generateSectionImage", () => trpcMutation("lesson.generateSectionImage", {
      sectionId: first.id,
      lessonTitle: bundle.lesson.title,
      sectionTitle: first.title,
      sectionContent: String(first.content || "").slice(0, 600),
      assetType: first.visualAsset || "diagram",
      cookieId,
    }), steps);

    if (flowId === 1) {
      const concept = bundle.sections.find((s) => s.type === "concept" || s.type === "visual_explainer");
      if (concept) {
        await timeStep("generateSectionVideo", () => trpcMutation("lesson.generateSectionVideo", {
          sectionId: concept.id,
          conceptPrompt: `Generate 45-second visual explainer for ${concept.title}`,
          cookieId,
        }), steps);
      }
    }

    for (const s of bundle.sections) {
      await trpcMutation("lesson.submitRetrievalAnswer", {
        lessonId: created.id,
        sectionId: s.id,
        cookieId,
        answer: "A",
        questionType: "multiple_choice",
      });
    }

    await timeStep("completeLesson", () => trpcMutation("lesson.completeLesson", {
      lessonId: created.id,
      cookieId,
    }), steps);

    return { flowId, ok: true, lessonId: created.id, ms: now() - t0, steps };
  } catch (err) {
    return { flowId, ok: false, ms: now() - t0, steps, error: err instanceof Error ? err.message : String(err) };
  }
}

async function runReadBurst(lessonId) {
  const timings = [];
  const errors = [];
  let counter = 0;

  async function worker() {
    while (true) {
      const idx = counter;
      if (idx >= READ_BURST) break;
      counter += 1;
      const t0 = now();
      try {
        await trpcQuery("lesson.getLessonWithSections", { lessonId, cookieId: `stress-read-${idx}` });
        timings.push(now() - t0);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
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
  console.log(JSON.stringify({ phase: "start", baseUrl: BASE_URL, flows: FLOWS, readBurst: READ_BURST, readConcurrency: READ_CONCURRENCY, at: new Date().toISOString() }, null, 2));

  const flows = await Promise.all(Array.from({ length: FLOWS }, (_, i) => runFlow(i + 1)));
  const okFlows = flows.filter((f) => f.ok);
  const failFlows = flows.filter((f) => !f.ok);

  const readBurst = okFlows.length ? await runReadBurst(okFlows[0].lessonId) : null;
  const flowTimes = okFlows.map((f) => f.ms);

  console.log(JSON.stringify({
    phase: "done",
    at: new Date().toISOString(),
    flowSummary: {
      total: FLOWS,
      ok: okFlows.length,
      failed: failFlows.length,
      p50ms: percentile(flowTimes, 50),
      p95ms: percentile(flowTimes, 95),
      minMs: flowTimes.length ? Math.min(...flowTimes) : 0,
      maxMs: flowTimes.length ? Math.max(...flowTimes) : 0,
    },
    readBurst,
    failedFlows: failFlows,
    flows,
  }, null, 2));

  if (failFlows.length) process.exitCode = 2;
}

main().catch((err) => {
  console.error(JSON.stringify({ phase: "fatal", error: err instanceof Error ? err.message : String(err) }, null, 2));
  process.exit(1);
});
