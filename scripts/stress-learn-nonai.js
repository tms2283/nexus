const BASE_URL = process.env.STRESS_BASE_URL || "http://localhost:3000";
const LESSON_ID = Number(process.env.STRESS_LESSON_ID || 1);
const READ_BURST = Number(process.env.STRESS_READ_BURST || 300);
const READ_CONCURRENCY = Number(process.env.STRESS_READ_CONCURRENCY || 50);
const WRITE_BURST = Number(process.env.STRESS_WRITE_BURST || 300);
const WRITE_CONCURRENCY = Number(process.env.STRESS_WRITE_CONCURRENCY || 50);
const SECTION_IDS = ["stress-sec-1","stress-sec-2","stress-sec-3","stress-sec-4","stress-sec-5"];

const now = () => Date.now();

function percentile(values, p) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[idx];
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

async function runBurst(total, concurrency, fn) {
  let next = 0;
  const ok = [];
  const errors = [];

  async function worker() {
    while (true) {
      const i = next;
      if (i >= total) break;
      next += 1;
      const t0 = now();
      try {
        await fn(i);
        ok.push(now() - t0);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => worker()));

  return {
    total,
    ok: ok.length,
    failed: errors.length,
    p50: percentile(ok, 50),
    p95: percentile(ok, 95),
    p99: percentile(ok, 99),
    min: ok.length ? Math.min(...ok) : 0,
    max: ok.length ? Math.max(...ok) : 0,
    sampleErrors: errors.slice(0, 5),
  };
}

async function main() {
  const warm = await trpcQuery("lesson.getLessonWithSections", { lessonId: LESSON_ID, cookieId: "warmup" });
  if (!warm?.sections?.length) {
    throw new Error("Seed lesson has no sections");
  }

  const readResult = await runBurst(READ_BURST, READ_CONCURRENCY, async (i) => {
    await trpcQuery("lesson.getLessonWithSections", { lessonId: LESSON_ID, cookieId: `read-${i}` });
  });

  const writeResult = await runBurst(WRITE_BURST, WRITE_CONCURRENCY, async (i) => {
    const sectionId = SECTION_IDS[i % SECTION_IDS.length];
    await trpcMutation("lesson.submitRetrievalAnswer", {
      lessonId: LESSON_ID,
      sectionId,
      cookieId: `write-${i}`,
      answer: "A",
      questionType: "multiple_choice",
      timeSpentSeconds: 5,
    });
  });

  console.log(JSON.stringify({
    baseUrl: BASE_URL,
    lessonId: LESSON_ID,
    readResult,
    writeResult,
    at: new Date().toISOString(),
  }, null, 2));

  if (readResult.failed > 0 || writeResult.failed > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error(JSON.stringify({ fatal: err instanceof Error ? err.message : String(err) }, null, 2));
  process.exit(1);
});
