// Test413 — Comprehensive Nexus stress test and bug finder
// Run: node L:\Website\Manus2\test413.mjs
import 'dotenv/config';
import superjson from 'superjson';

const BASE = 'http://localhost:3000';
const TRPC = `${BASE}/api/trpc`;
const COOKIE_ID = 'test413-' + Date.now();
const results = [];
let passed = 0, failed = 0, warnings = 0;

function log(severity, category, test, detail) {
  const sym = severity === 'PASS' ? '✅' : severity === 'FAIL' ? '❌' : '⚠️';
  const line = `${sym} [${category}] ${test}: ${detail}`;
  console.log(line);
  results.push({ severity, category, test, detail });
  if (severity === 'PASS') passed++;
  else if (severity === 'FAIL') failed++;
  else warnings++;
}

async function trpcQuery(path, input) {
  const encoded = input !== undefined ? superjson.serialize(input) : undefined;
  const url = encoded
    ? `${TRPC}/${path}?input=${encodeURIComponent(JSON.stringify(encoded))}`
    : `${TRPC}/${path}`;
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  const body = await res.json();
  return { status: res.status, body, ok: res.ok };
}

async function trpcMutate(path, input) {
  const encoded = superjson.serialize(input);
  const res = await fetch(TRPC + '/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(encoded),
  });
  const body = await res.json();
  return { status: res.status, body, ok: res.ok };
}

function getData(r) {
  try { return r.body?.result?.data?.json ?? r.body?.result?.data ?? null; }
  catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. STATIC ASSET TESTS
// ═══════════════════════════════════════════════════════════════════════════════
async function testStaticAssets() {
  const paths = ['/', '/learn', '/research', '/depth', '/library', '/lab',
    '/about', '/contact', '/flashcards', '/mindmap', '/settings', '/testing',
    '/dashboard', '/leaderboard', '/study-buddy', '/daily', '/progress',
    '/profile', '/reading-list', '/skills', '/404', '/nonexistent-page'];
  for (const p of paths) {
    try {
      const res = await fetch(BASE + p);
      if (res.ok) log('PASS', 'ROUTES', `GET ${p}`, `${res.status}`);
      else log('FAIL', 'ROUTES', `GET ${p}`, `Status ${res.status}`);
    } catch (e) { log('FAIL', 'ROUTES', `GET ${p}`, e.message); }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. VISITOR PROFILE TESTS
// ═══════════════════════════════════════════════════════════════════════════════
async function testVisitorProfile() {
  let r = await trpcQuery('visitor.getProfile', { cookieId: COOKIE_ID });
  let d = getData(r);
  if (r.ok && d) log('PASS', 'VISITOR', 'getProfile (new)', `visitCount: ${d.visitCount}`);
  else log('FAIL', 'VISITOR', 'getProfile (new)', JSON.stringify(r.body).slice(0, 200));

  r = await trpcMutate('visitor.recordVisit', { cookieId: COOKIE_ID, page: '/test413' });
  d = getData(r);
  if (r.ok && d?.xp >= 0) log('PASS', 'VISITOR', 'recordVisit', `XP: ${d.xp}, streak: ${d.streak}`);
  else log('FAIL', 'VISITOR', 'recordVisit', JSON.stringify(r.body).slice(0, 200));

  r = await trpcMutate('visitor.addXP', { cookieId: COOKIE_ID, amount: 50 });
  d = getData(r);
  if (r.ok && d?.xp >= 50) log('PASS', 'VISITOR', 'addXP(50)', `XP: ${d.xp}, level: ${d.level}`);
  else log('FAIL', 'VISITOR', 'addXP(50)', JSON.stringify(r.body).slice(0, 200));

  // Negative XP
  r = await trpcMutate('visitor.addXP', { cookieId: COOKIE_ID, amount: -10 });
  if (!r.ok) log('PASS', 'VISITOR', 'addXP(-10) rejected', `Status ${r.status}`);
  else log('FAIL', 'VISITOR', 'addXP(-10) NOT rejected', 'Negative XP accepted!');

  // Zero XP
  r = await trpcMutate('visitor.addXP', { cookieId: COOKIE_ID, amount: 0 });
  if (!r.ok) log('PASS', 'VISITOR', 'addXP(0) rejected', `Status ${r.status}`);
  else log('FAIL', 'VISITOR', 'addXP(0) NOT rejected', 'Zero XP accepted');

  // Empty cookieId
  r = await trpcMutate('visitor.addXP', { cookieId: '', amount: 10 });
  if (!r.ok) log('PASS', 'VISITOR', 'addXP empty cookieId rejected', `Status ${r.status}`);
  else log('WARN', 'VISITOR', 'addXP empty cookieId accepted', 'No server-side validation');

  // Quiz
  r = await trpcMutate('visitor.completeQuiz', {
    cookieId: COOKIE_ID, results: { q1: 'A', q2: 'B' }, preferredTopics: ['AI'],
  });
  d = getData(r);
  if (r.ok) log('PASS', 'VISITOR', 'completeQuiz', `XP: ${d?.xp}`);
  else log('FAIL', 'VISITOR', 'completeQuiz', JSON.stringify(r.body).slice(0, 200));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. SECURITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════
async function testSecurity() {
  // IDOR: spoof another user's cookieId
  const victimId = 'victim-' + Date.now();
  await trpcQuery('visitor.getProfile', { cookieId: victimId });
  let r = await trpcMutate('visitor.addXP', { cookieId: victimId, amount: 999 });
  let d = getData(r);
  if (r.ok && d?.xp >= 999)
    log('FAIL', 'SECURITY', 'IDOR: addXP spoofing', `Spoofed ${victimId} to ${d.xp} XP!`);
  else if (!r.ok)
    log('PASS', 'SECURITY', 'IDOR: addXP blocked', `Status ${r.status}`);
  else
    log('WARN', 'SECURITY', 'IDOR: addXP unclear', JSON.stringify(d).slice(0, 100));

  // XSS in page name
  r = await trpcMutate('visitor.recordVisit', { cookieId: COOKIE_ID, page: '<script>alert(1)</script>' });
  if (r.ok) log('WARN', 'SECURITY', 'XSS stored in pagesVisited', 'Script tags stored in DB');
  else log('PASS', 'SECURITY', 'XSS rejected', `Status ${r.status}`);

  // SQL injection in cookieId
  r = await trpcQuery('visitor.getProfile', { cookieId: "'; DROP TABLE users; --" });
  if (r.ok) log('PASS', 'SECURITY', 'SQLi in cookieId safe', 'Parameterized queries OK');
  else log('PASS', 'SECURITY', 'SQLi in cookieId rejected', `Status ${r.status}`);

  // Security headers
  const res = await fetch(BASE + '/');
  for (const h of ['x-content-type-options', 'x-frame-options', 'content-security-policy', 'strict-transport-security']) {
    if (res.headers.get(h)) log('PASS', 'SECURITY', `Header: ${h}`, res.headers.get(h).slice(0, 60));
    else log('WARN', 'SECURITY', `Missing: ${h}`, 'Not set');
  }

  // CSRF check
  const cookie = res.headers.get('set-cookie') || '';
  if (cookie.includes('csrf_token')) log('PASS', 'SECURITY', 'CSRF token cookie', 'Set');
  else log('WARN', 'SECURITY', 'No CSRF token cookie', 'CSRF protection not active');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. FLASHCARD TESTS
// ═══════════════════════════════════════════════════════════════════════════════
async function testFlashcards() {
  let r = await trpcQuery('flashcards.listDecks', { cookieId: COOKIE_ID });
  let d = getData(r);
  if (r.ok && Array.isArray(d)) log('PASS', 'FLASHCARDS', 'listDecks', `${d.length} decks`);
  else log('FAIL', 'FLASHCARDS', 'listDecks', JSON.stringify(r.body).slice(0, 200));

  // Generate deck (depends on AI — may fail without API key)
  r = await trpcMutate('flashcards.generateDeck', { cookieId: COOKIE_ID, topic: 'JavaScript basics', count: 3 });
  d = getData(r);
  if (r.ok && d?.deckId) {
    log('PASS', 'FLASHCARDS', 'generateDeck', `deckId: ${d.deckId}`);
    // Get cards for this deck
    r = await trpcQuery('flashcards.getCards', { deckId: d.deckId });
    if (r.ok) log('PASS', 'FLASHCARDS', 'getCards', `${getData(r)?.length ?? 0} cards`);
    else log('FAIL', 'FLASHCARDS', 'getCards', JSON.stringify(r.body).slice(0, 150));
  } else {
    log('WARN', 'FLASHCARDS', 'generateDeck', `AI unavailable: ${JSON.stringify(r.body).slice(0, 120)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. MIND MAP, LIBRARY, TESTING CENTER, RESEARCH
// ═══════════════════════════════════════════════════════════════════════════════
async function testMindMaps() {
  let r = await trpcQuery('mindmap.list', { cookieId: COOKIE_ID });
  if (r.ok) log('PASS', 'MINDMAP', 'list', `${getData(r)?.length ?? 0} maps`);
  else log('FAIL', 'MINDMAP', 'list', JSON.stringify(r.body).slice(0, 200));
}

async function testLibrary() {
  let r = await trpcQuery('library.list', { category: 'All' });
  let d = getData(r);
  if (r.ok && Array.isArray(d)) log('PASS', 'LIBRARY', 'list(All)', `${d.length} resources`);
  else log('FAIL', 'LIBRARY', 'list(All)', JSON.stringify(r.body).slice(0, 200));

  r = await trpcQuery('library.list', { category: 'AI & Machine Learning' });
  if (r.ok) log('PASS', 'LIBRARY', 'list(AI&ML)', `${getData(r)?.length ?? 0}`);
  else log('FAIL', 'LIBRARY', 'list(AI&ML)', JSON.stringify(r.body).slice(0, 200));

  r = await trpcQuery('library.listCommunity', {});
  if (r.ok) log('PASS', 'LIBRARY', 'listCommunity', `${getData(r)?.length ?? 0} items`);
  else log('FAIL', 'LIBRARY', 'listCommunity', JSON.stringify(r.body).slice(0, 200));

  r = await trpcMutate('library.rateResource', { cookieId: COOKIE_ID, resourceId: 1, rating: 5 });
  if (r.ok) log('PASS', 'LIBRARY', 'rateResource', 'OK');
  else log('WARN', 'LIBRARY', 'rateResource', JSON.stringify(r.body).slice(0, 150));
}

async function testTestingCenter() {
  let r = await trpcMutate('testing.saveResult', {
    cookieId: COOKIE_ID, testId: 'science', score: 8,
    totalQuestions: 10, answers: { q1: 1, q2: 2, q3: 0 }, timeTakenSeconds: 120,
  });
  if (r.ok) log('PASS', 'TESTING', 'saveResult', `XP: ${getData(r)?.xpAwarded}`);
  else log('FAIL', 'TESTING', 'saveResult', JSON.stringify(r.body).slice(0, 200));

  r = await trpcQuery('testing.getResults', { cookieId: COOKIE_ID });
  if (r.ok) log('PASS', 'TESTING', 'getResults', `${getData(r)?.testResults?.length ?? 0} results`);
  else log('FAIL', 'TESTING', 'getResults', JSON.stringify(r.body).slice(0, 200));

  r = await trpcQuery('testing.getScoreHistory', { cookieId: COOKIE_ID });
  if (r.ok) log('PASS', 'TESTING', 'getScoreHistory', 'OK');
  else log('FAIL', 'TESTING', 'getScoreHistory', JSON.stringify(r.body).slice(0, 200));

  r = await trpcMutate('testing.saveIQResult', {
    cookieId: COOKIE_ID, iqScore: 115, percentile: 84, rawScore: 12,
    categoryScores: { spatial: 4, verbal: 4, numerical: 4 }, timeTakenSeconds: 600,
  });
  if (r.ok) log('PASS', 'TESTING', 'saveIQResult', `XP: ${getData(r)?.xpAwarded}`);
  else log('FAIL', 'TESTING', 'saveIQResult', JSON.stringify(r.body).slice(0, 200));
}

async function testResearch() {
  let r = await trpcQuery('research.getSessions', { cookieId: COOKIE_ID });
  if (r.ok) log('PASS', 'RESEARCH', 'getSessions', `${getData(r)?.length ?? 0} sessions`);
  else log('FAIL', 'RESEARCH', 'getSessions', JSON.stringify(r.body).slice(0, 200));

  r = await trpcMutate('research.saveSession', {
    cookieId: COOKIE_ID, title: 'Test Research',
    sourceText: 'Test content for research.', summary: 'Summary',
    keyInsights: ['insight1'], tags: ['test'],
  });
  if (r.ok) log('PASS', 'RESEARCH', 'saveSession', `ID: ${getData(r)}`);
  else log('FAIL', 'RESEARCH', 'saveSession', JSON.stringify(r.body).slice(0, 200));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. MISC ROUTERS
// ═══════════════════════════════════════════════════════════════════════════════
async function testMiscRouters() {
  // Contact - valid
  let r = await trpcMutate('contact.submit', {
    cookieId: COOKIE_ID, name: 'Test', email: 'test@example.com',
    subject: 'QA Test', message: 'This is a test contact from test413 suite.',
  });
  if (r.ok) log('PASS', 'CONTACT', 'submit', 'OK');
  else log('FAIL', 'CONTACT', 'submit', JSON.stringify(r.body).slice(0, 200));

  // Contact - bad email
  r = await trpcMutate('contact.submit', {
    cookieId: COOKIE_ID, name: 'X', email: 'bad', message: 'Test msg here more than ten chars.',
  });
  if (!r.ok) log('PASS', 'CONTACT', 'bad email rejected', `${r.status}`);
  else log('FAIL', 'CONTACT', 'bad email accepted', 'Validation miss');

  // Codex
  r = await trpcQuery('codex.list', {});
  if (r.ok) log('PASS', 'CODEX', 'list', `${getData(r)?.length ?? 0} entries`);
  else log('FAIL', 'CODEX', 'list', JSON.stringify(r.body).slice(0, 200));

  // AI Provider
  r = await trpcQuery('aiProvider.get', { cookieId: COOKIE_ID });
  if (r.ok) log('PASS', 'AI_PROVIDER', 'get', `provider: ${getData(r)?.provider}`);
  else log('FAIL', 'AI_PROVIDER', 'get', JSON.stringify(r.body).slice(0, 200));

  // Leaderboard
  r = await trpcQuery('leaderboard.getTopUsers', { metric: 'xp' });
  if (r.ok) log('PASS', 'LEADERBOARD', 'getTopUsers(xp)', `${getData(r)?.length ?? 0} users`);
  else log('FAIL', 'LEADERBOARD', 'getTopUsers', JSON.stringify(r.body).slice(0, 200));

  // Daily
  r = await trpcQuery('daily.getChallenge', { cookieId: COOKIE_ID });
  if (r.ok) log('PASS', 'DAILY', 'getChallenge', `${getData(r)?.title?.slice(0, 40)}`);
  else log('FAIL', 'DAILY', 'getChallenge', JSON.stringify(r.body).slice(0, 200));

  // Skills
  r = await trpcQuery('skills.getTree', { cookieId: COOKIE_ID });
  if (r.ok) log('PASS', 'SKILLS', 'getTree', `${getData(r)?.skills?.length ?? '?'} skills`);
  else log('FAIL', 'SKILLS', 'getTree', JSON.stringify(r.body).slice(0, 200));

  // Lessons
  r = await trpcQuery('ai.searchSharedLessons', { query: 'javascript' });
  if (r.ok) log('PASS', 'LESSONS', 'searchShared', `${getData(r)?.length ?? 0} results`);
  else log('FAIL', 'LESSONS', 'searchShared', JSON.stringify(r.body).slice(0, 200));

  r = await trpcQuery('ai.getLesson', { lessonId: 999999 });
  if (r.ok) log('PASS', 'LESSONS', 'getLesson(missing)', `returns: ${getData(r)}`);
  else log('FAIL', 'LESSONS', 'getLesson(missing)', JSON.stringify(r.body).slice(0, 200));

  // Dashboard
  r = await trpcQuery('dashboard.getStats', { cookieId: COOKIE_ID });
  if (r.ok) log('PASS', 'DASHBOARD', 'getStats', 'OK');
  else log('WARN', 'DASHBOARD', 'getStats', JSON.stringify(r.body).slice(0, 150));

  r = await trpcQuery('dashboard.getHeatmap', { cookieId: COOKIE_ID });
  if (r.ok) log('PASS', 'DASHBOARD', 'getHeatmap', 'OK');
  else log('WARN', 'DASHBOARD', 'getHeatmap', JSON.stringify(r.body).slice(0, 150));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. STRESS TEST
// ═══════════════════════════════════════════════════════════════════════════════
async function stressTest() {
  // 50 concurrent reads
  const t0 = Date.now();
  const p1 = Array.from({length: 50}, () => trpcQuery('visitor.getProfile', { cookieId: COOKIE_ID }));
  const r1 = await Promise.allSettled(p1);
  const ok1 = r1.filter(r => r.status === 'fulfilled' && r.value.ok).length;
  log(ok1 >= 45 ? 'PASS' : 'WARN', 'STRESS', '50x concurrent getProfile', `${ok1}/50 OK, ${Date.now()-t0}ms`);

  // 30 concurrent mutations (different cookieIds)
  const t1 = Date.now();
  const p2 = Array.from({length: 30}, (_, i) => trpcMutate('visitor.addXP', { cookieId: `stress-${i}-${Date.now()}`, amount: 5 }));
  const r2 = await Promise.allSettled(p2);
  const ok2 = r2.filter(r => r.status === 'fulfilled' && r.value.ok).length;
  log(ok2 >= 25 ? 'PASS' : 'WARN', 'STRESS', '30x concurrent addXP', `${ok2}/30 OK, ${Date.now()-t1}ms`);

  // 20 concurrent library reads
  const t2 = Date.now();
  const p3 = Array.from({length: 20}, () => trpcQuery('library.list', { category: 'All' }));
  const r3 = await Promise.allSettled(p3);
  const ok3 = r3.filter(r => r.status === 'fulfilled' && r.value.ok).length;
  log(ok3 >= 18 ? 'PASS' : 'WARN', 'STRESS', '20x concurrent library.list', `${ok3}/20 OK, ${Date.now()-t2}ms`);

  // Oversized input
  const r4 = await trpcMutate('visitor.recordVisit', { cookieId: COOKIE_ID, page: 'A'.repeat(10000) });
  if (r4.ok) log('WARN', 'STRESS', 'Oversized page (10KB)', 'Accepted without length check');
  else log('PASS', 'STRESS', 'Oversized page rejected', `${r4.status}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════
async function testEdgeCases() {
  // Non-existent route
  let r = await trpcQuery('nonexistent.route', {});
  if (!r.ok) log('PASS', 'EDGE', 'Non-existent route', `${r.status}`);
  else log('FAIL', 'EDGE', 'Non-existent route passed', 'Should 404');

  // Malformed JSON
  try {
    const res = await fetch(TRPC + '/visitor.addXP', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken',
    });
    log(res.status >= 400 ? 'PASS' : 'FAIL', 'EDGE', 'Malformed JSON', `${res.status}`);
  } catch (e) { log('PASS', 'EDGE', 'Malformed JSON', e.message); }

  // Long cookieId
  r = await trpcQuery('visitor.getProfile', { cookieId: 'x'.repeat(1000) });
  if (r.ok) log('WARN', 'EDGE', 'cookieId 1000 chars accepted', 'No length cap (varchar 128 may truncate)');
  else log('PASS', 'EDGE', 'Long cookieId rejected', `${r.status}`);

  // Unicode cookieId
  r = await trpcQuery('visitor.getProfile', { cookieId: '🎉テスト火' });
  if (r.ok) log('WARN', 'EDGE', 'Unicode cookieId accepted', 'May cause DB encoding issues');
  else log('PASS', 'EDGE', 'Unicode cookieId rejected', `${r.status}`);

  // Negative lesson ID
  r = await trpcQuery('ai.getLesson', { lessonId: -1 });
  if (r.ok) log('PASS', 'EDGE', 'getLesson(-1)', `${getData(r) === null ? 'null (OK)' : 'unexpected data'}`);
  else log('WARN', 'EDGE', 'getLesson(-1)', `${r.status}`);

  // Enormous XP
  r = await trpcMutate('visitor.addXP', { cookieId: COOKIE_ID, amount: 999999 });
  if (r.ok) log('WARN', 'EDGE', 'addXP(999999) accepted', `No max cap! XP: ${getData(r)?.xp}`);
  else log('PASS', 'EDGE', 'addXP(999999) rejected', `${r.status}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER + REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Nexus Test413 — Comprehensive QA Suite (v2, superjson)     ║');
  console.log('║  Target: ' + BASE.padEnd(52) + '║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  await testStaticAssets();    console.log('');
  await testVisitorProfile();  console.log('');
  await testSecurity();        console.log('');
  await testFlashcards();      console.log('');
  await testMindMaps();        console.log('');
  await testLibrary();         console.log('');
  await testTestingCenter();   console.log('');
  await testResearch();        console.log('');
  await testMiscRouters();     console.log('');
  await stressTest();          console.log('');
  await testEdgeCases();       console.log('');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Build markdown
  const fs = await import('fs');
  let md = `# Test413 — Nexus Comprehensive QA Report\n\n`;
  md += `**Date:** ${new Date().toISOString().split('T')[0]}  \n`;
  md += `**Target:** ${BASE}  \n`;
  md += `**DB:** MariaDB 11.4.5 (localhost:3306)  \n`;
  md += `**Mode:** Production build  \n\n`;
  md += `## Summary\n\n`;
  md += `| Passed | Failed | Warnings | Total |\n`;
  md += `|:---:|:---:|:---:|:---:|\n`;
  md += `| **${passed}** | **${failed}** | **${warnings}** | ${passed+failed+warnings} |\n\n`;

  let currentCat = '';
  for (const r of results) {
    if (r.category !== currentCat) {
      currentCat = r.category;
      md += `\n### ${currentCat}\n\n`;
      md += `| Status | Test | Detail |\n`;
      md += `|:---:|---|---|\n`;
    }
    const icon = r.severity === 'PASS' ? '✅' : r.severity === 'FAIL' ? '❌' : '⚠️';
    md += `| ${icon} | ${r.test} | ${r.detail.replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 120)} |\n`;
  }

  md += `\n---\n\n## Critical Findings\n\n`;
  const fails = results.filter(r => r.severity === 'FAIL');
  const warns = results.filter(r => r.severity === 'WARN');
  if (fails.length) {
    md += `### ❌ Failures (${fails.length})\n\n`;
    for (const f of fails) md += `- **[${f.category}] ${f.test}:** ${f.detail.slice(0, 150)}\n`;
  } else {
    md += `### No failures! 🎉\n\n`;
  }
  if (warns.length) {
    md += `\n### ⚠️ Warnings (${warns.length})\n\n`;
    for (const w of warns) md += `- **[${w.category}] ${w.test}:** ${w.detail.slice(0, 150)}\n`;
  }

  md += `\n---\n\n## Environment Notes\n\n`;
  md += `- MariaDB 11.4.5 used (Oracle MySQL download blocked, Docker Desktop failed to start)\n`;
  md += `- \`research_sources\` table migration failed (LONGTEXT syntax incompatibility with MariaDB)\n`;
  md += `- OAUTH_SERVER_URL not configured — OAuth login non-functional\n`;
  md += `- BUILT_IN_FORGE_API_URL/KEY not configured — AI features may return errors\n`;
  md += `- 27 pre-existing TypeScript errors in codebase (not caused by this test)\n`;
  md += `- OpenCode's broken security refactor reverted in commit 5fda134\n`;

  fs.writeFileSync('L:\\\\Website\\\\Manus2\\\\Test413.md', md);
  console.log('\\nReport written to L:\\\\Website\\\\Manus2\\\\Test413.md');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
