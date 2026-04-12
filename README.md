# Nexus — AI-Powered Learning Platform

> Learn anything, deeply. Nexus combines adaptive AI curricula, spaced repetition, mind mapping, research intelligence, and Socratic tutoring into one cohesive platform.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What Is Nexus?

Nexus is a full-stack AI learning platform built for serious self-directed learners. It wraps around any AI provider (Gemini, OpenAI, Perplexity, or your own API key) and adds the retention infrastructure that raw LLMs lack: structured curricula, SM-2 spaced repetition, knowledge graph visualisation, and gamification that keeps adults engaged.

**14+ integrated features:**

| Feature | Description |
|---|---|
| **Adaptive Curriculum** | AI generates personalised multi-phase learning paths from a goal |
| **Research Forge** | Paste text or URLs → AI analysis, summaries, auto-flashcards, audio overview |
| **Depth Engine** | Explain any concept at 5 levels: child → student → expert → Socratic → analogy |
| **Spaced Repetition** | SM-2 algorithm flashcards with due-date tracking |
| **Mind Maps** | AI-generated concept maps with expandable nodes |
| **Lab** | Prompt experiments, chain-of-thought, bias detection, AI debates |
| **Testing Center** | AI-generated adaptive quizzes + IQ assessment |
| **Skill Tree** | Prerequisite-aware mastery tracking across 80 skills / 10 domains |
| **Library** | Curated + community resources with Kanban reading list |
| **Audio Overviews** | ElevenLabs TTS podcast-style summaries (Alex + Morgan) |
| **Socratic Tutor** | Multi-turn guided discovery sessions |
| **Dashboard** | Activity heatmaps, performance insights, study stats |
| **Gamification** | XP, levels, badges, streaks, leaderboards, daily challenges |
| **Research Pipeline** | FAISS vector search + RAG via Python microservice |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS v4, Framer Motion |
| API | tRPC 11 (end-to-end type-safe, zero codegen) |
| Backend | Express 4, Node.js |
| Database | MySQL 8 via Drizzle ORM |
| Auth | JWT (jose) + OAuth via Manus platform |
| AI | Gemini, OpenAI, Perplexity (user-selectable), ElevenLabs TTS |
| Research | Python FastAPI + FAISS + Exa search |
| Deploy | PM2 + Nginx + GitHub Actions CI/CD |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- MySQL 8
- A Manus platform account (for OAuth)

### 1. Clone and install

```bash
git clone https://github.com/tms2283/nexus.git
cd nexus
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values. The minimum required set:

```env
DATABASE_URL=mysql://user:password@localhost:3306/nexus
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
ENCRYPTION_KEY=<generate: openssl rand -hex 32>
```

> **The server will not start** if `DATABASE_URL`, `JWT_SECRET`, or `ENCRYPTION_KEY` are missing. This is intentional — silent misconfiguration causes security failures.

### 3. Set up the database

```bash
mysql -u root -p -e "CREATE DATABASE nexus CHARACTER SET utf8mb4;"
node scripts/migrate-v4.mjs
```

### 4. Run in development

```bash
pnpm dev
```

The app starts at `http://localhost:3000`.

---

## Project Structure

```
nexus/
├── client/src/
│   ├── pages/          # 22 page components (lazy-loaded)
│   ├── components/     # Shared UI components
│   ├── contexts/       # React contexts (PersonalizationContext, ThemeContext)
│   └── lib/            # tRPC client setup
├── server/
│   ├── _core/          # Express server, auth, CSRF, job runner, validation
│   ├── routers/        # 14 tRPC domain routers
│   ├── db/             # Database layer split by domain
│   │   ├── connection.ts, users.ts, gamification.ts
│   │   ├── flashcards.ts, mindmaps.ts, lessons.ts
│   │   ├── research.ts, library.ts, aiProviders.ts
│   │   └── index.ts    # Re-exports everything
│   ├── db.ts           # Backward-compat shim → server/db/index
│   ├── audio.ts        # ElevenLabs two-voice audio generation
│   ├── crypto.ts       # AES-256-GCM encryption for API keys
│   └── skillTree.ts    # 80-skill taxonomy
├── drizzle/schema.ts   # Full MySQL schema (Drizzle ORM)
├── shared/             # Types and constants shared between client/server
├── scripts/            # DB migration scripts
└── deploy/             # Nginx, PM2, systemd, GitHub Actions configs
```

---

## Security

Key security properties:

- **Session auth**: JWT verified server-side via `jose`. Never trusts client-supplied identity.
- **CSRF protection**: Double-submit cookie pattern (`csrf_token` + `x-csrf-token` header). `sameSite: lax`.
- **Ownership checks**: All resource mutations verify `cookieId` ownership before proceeding.
- **Encrypted API keys**: User-supplied AI provider keys encrypted at rest with AES-256-GCM.
- **SSRF protection**: URL fetch blocks all private IP ranges including IPv6, link-local, and cloud metadata endpoints.
- **Startup validation**: Server exits with a clear error if required env vars are missing.
- **Rate limiting**: AI calls (120/hr) and XP grants (50/min) are rate-limited per visitor.

See `USER_AUTH_GUIDE.md` for full authentication architecture documentation.

---

## Deployment

Full step-by-step VPS deployment (Hostinger KVM2 + Nginx + SSL + PM2 + GitHub Actions):

```
deploy/DEPLOYMENT.md
```

Quick summary:
1. Provision Ubuntu 22.04 VPS
2. Install Node 20, pnpm, PM2, MySQL 8, Nginx, Certbot
3. Clone repo, configure `.env`
4. Run `node scripts/migrate-v4.mjs`
5. `pm2 start ecosystem.config.cjs --env production`
6. Configure Nginx with `deploy/nginx.conf`, obtain SSL cert
7. Add GitHub secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`) for CI/CD

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Development server with HMR |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm check` | TypeScript type check |
| `pnpm test` | Run Vitest tests |
| `pnpm lint` | ESLint with zero warnings |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Prettier format |
| `pnpm db:push` | Generate + apply DB migrations |

---

## Contributing

This is a solo project by Tim Schmoyer (Fredericksburg, VA). If you find a security issue, please open a private issue rather than a public one.

---

## License

MIT
