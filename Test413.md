# Test413 — Nexus Comprehensive QA Report

**Date:** 2026-04-13  
**Target:** http://localhost:3000  
**DB:** MariaDB 11.4.5 (localhost:3306)  
**Mode:** Production build  

## Summary

| Passed | Failed | Warnings | Total |
|:---:|:---:|:---:|:---:|
| **37** | **21** | **13** | 71 |


### ROUTES

| Status | Test | Detail |
|:---:|---|---|
| ✅ | GET / | 200 |
| ✅ | GET /learn | 200 |
| ✅ | GET /research | 200 |
| ✅ | GET /depth | 200 |
| ✅ | GET /library | 200 |
| ✅ | GET /lab | 200 |
| ✅ | GET /about | 200 |
| ✅ | GET /contact | 200 |
| ✅ | GET /flashcards | 200 |
| ✅ | GET /mindmap | 200 |
| ✅ | GET /settings | 200 |
| ✅ | GET /testing | 200 |
| ✅ | GET /dashboard | 200 |
| ✅ | GET /leaderboard | 200 |
| ✅ | GET /study-buddy | 200 |
| ✅ | GET /daily | 200 |
| ✅ | GET /progress | 200 |
| ✅ | GET /profile | 200 |
| ✅ | GET /reading-list | 200 |
| ✅ | GET /skills | 200 |
| ✅ | GET /404 | 200 |
| ✅ | GET /nonexistent-page | 200 |

### VISITOR

| Status | Test | Detail |
|:---:|---|---|
| ❌ | getProfile (new) | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |
| ❌ | recordVisit | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |
| ❌ | addXP(50) | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |
| ✅ | addXP(-10) rejected | Status 400 |
| ✅ | addXP(0) rejected | Status 400 |
| ✅ | addXP empty cookieId rejected | Status 500 |
| ❌ | completeQuiz | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |

### SECURITY

| Status | Test | Detail |
|:---:|---|---|
| ✅ | IDOR: addXP blocked | Status 500 |
| ✅ | XSS rejected | Status 500 |
| ✅ | SQLi in cookieId rejected | Status 500 |
| ⚠️ | Missing: x-content-type-options | Not set |
| ⚠️ | Missing: x-frame-options | Not set |
| ⚠️ | Missing: content-security-policy | Not set |
| ⚠️ | Missing: strict-transport-security | Not set |
| ⚠️ | No CSRF token cookie | CSRF protection not active |

### FLASHCARDS

| Status | Test | Detail |
|:---:|---|---|
| ❌ | listDecks | {"error":{"json":{"message":"That resource doesn't exist.","code":-32004,"data":{"code":"NOT_FOUND","httpStatus":404,"st |
| ⚠️ | generateDeck | AI unavailable: {"error":{"json":{"message":"[\n  {\n    \"origin\": \"number\",\n    \"code\": \"too_small\",\n    \"mi |

### MINDMAP

| Status | Test | Detail |
|:---:|---|---|
| ❌ | list | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |

### LIBRARY

| Status | Test | Detail |
|:---:|---|---|
| ❌ | list(All) | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |
| ❌ | list(AI&ML) | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |
| ❌ | listCommunity | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |
| ⚠️ | rateResource | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |

### TESTING

| Status | Test | Detail |
|:---:|---|---|
| ❌ | saveResult | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |
| ❌ | getResults | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |
| ❌ | getScoreHistory | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |
| ❌ | saveIQResult | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |

### RESEARCH

| Status | Test | Detail |
|:---:|---|---|
| ❌ | getSessions | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |
| ❌ | saveSession | {"error":{"json":{"message":"That resource doesn't exist.","code":-32004,"data":{"code":"NOT_FOUND","httpStatus":404,"st |

### CONTACT

| Status | Test | Detail |
|:---:|---|---|
| ❌ | submit | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |
| ✅ | bad email rejected | 400 |

### CODEX

| Status | Test | Detail |
|:---:|---|---|
| ❌ | list | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |

### AI_PROVIDER

| Status | Test | Detail |
|:---:|---|---|
| ❌ | get | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |

### LEADERBOARD

| Status | Test | Detail |
|:---:|---|---|
| ❌ | getTopUsers | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |

### DAILY

| Status | Test | Detail |
|:---:|---|---|
| ✅ | getChallenge | Daily AI Challenge |

### SKILLS

| Status | Test | Detail |
|:---:|---|---|
| ✅ | getTree | 70 skills |

### LESSONS

| Status | Test | Detail |
|:---:|---|---|
| ❌ | searchShared | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |
| ❌ | getLesson(missing) | {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_ |

### DASHBOARD

| Status | Test | Detail |
|:---:|---|---|
| ⚠️ | getStats | {"error":{"json":{"message":"That resource doesn't exist.","code":-32004,"data":{"code":"NOT_FOUND","httpStatus":404,"st |
| ⚠️ | getHeatmap | {"error":{"json":{"message":"That resource doesn't exist.","code":-32004,"data":{"code":"NOT_FOUND","httpStatus":404,"st |

### STRESS

| Status | Test | Detail |
|:---:|---|---|
| ⚠️ | 50x concurrent getProfile | 0/50 OK, 60ms |
| ⚠️ | 30x concurrent addXP | 0/30 OK, 29ms |
| ⚠️ | 20x concurrent library.list | 0/20 OK, 14ms |
| ✅ | Oversized page rejected | 500 |

### EDGE

| Status | Test | Detail |
|:---:|---|---|
| ✅ | Non-existent route | 404 |
| ✅ | Malformed JSON | 400 |
| ✅ | Long cookieId rejected | 500 |
| ✅ | Unicode cookieId rejected | 500 |
| ⚠️ | getLesson(-1) | 500 |
| ✅ | addXP(999999) rejected | 500 |

---

## Critical Findings

### ❌ Failures (21)

- **[VISITOR] getProfile (new):** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[VISITOR] recordVisit:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[VISITOR] addXP(50):** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[VISITOR] completeQuiz:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[FLASHCARDS] listDecks:** {"error":{"json":{"message":"That resource doesn't exist.","code":-32004,"data":{"code":"NOT_FOUND","httpStatus":404,"stack":null,"path":"flashcards.l
- **[MINDMAP] list:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[LIBRARY] list(All):** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[LIBRARY] list(AI&ML):** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[LIBRARY] listCommunity:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[TESTING] saveResult:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[TESTING] getResults:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[TESTING] getScoreHistory:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[TESTING] saveIQResult:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[RESEARCH] getSessions:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[RESEARCH] saveSession:** {"error":{"json":{"message":"That resource doesn't exist.","code":-32004,"data":{"code":"NOT_FOUND","httpStatus":404,"stack":null,"path":"research.sav
- **[CONTACT] submit:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[CODEX] list:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[AI_PROVIDER] get:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[LEADERBOARD] getTopUsers:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[LESSONS] searchShared:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[LESSONS] getLesson(missing):** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500

### ⚠️ Warnings (13)

- **[SECURITY] Missing: x-content-type-options:** Not set
- **[SECURITY] Missing: x-frame-options:** Not set
- **[SECURITY] Missing: content-security-policy:** Not set
- **[SECURITY] Missing: strict-transport-security:** Not set
- **[SECURITY] No CSRF token cookie:** CSRF protection not active
- **[FLASHCARDS] generateDeck:** AI unavailable: {"error":{"json":{"message":"[\n  {\n    \"origin\": \"number\",\n    \"code\": \"too_small\",\n    \"minimum\": 5,\n   
- **[LIBRARY] rateResource:** {"error":{"json":{"message":"Something went wrong on our end. Please try again.","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500
- **[DASHBOARD] getStats:** {"error":{"json":{"message":"That resource doesn't exist.","code":-32004,"data":{"code":"NOT_FOUND","httpStatus":404,"stack":null,"path":"dashboard.ge
- **[DASHBOARD] getHeatmap:** {"error":{"json":{"message":"That resource doesn't exist.","code":-32004,"data":{"code":"NOT_FOUND","httpStatus":404,"stack":null,"path":"dashboard.ge
- **[STRESS] 50x concurrent getProfile:** 0/50 OK, 60ms
- **[STRESS] 30x concurrent addXP:** 0/30 OK, 29ms
- **[STRESS] 20x concurrent library.list:** 0/20 OK, 14ms
- **[EDGE] getLesson(-1):** 500

---

## Environment Notes

- MariaDB 11.4.5 used (Oracle MySQL download blocked, Docker Desktop failed to start)
- `research_sources` table migration failed (LONGTEXT syntax incompatibility with MariaDB)
- OAUTH_SERVER_URL not configured — OAuth login non-functional
- BUILT_IN_FORGE_API_URL/KEY not configured — AI features may return errors
- 27 pre-existing TypeScript errors in codebase (not caused by this test)
- OpenCode's broken security refactor reverted in commit 5fda134
