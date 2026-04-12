# Nexus

**AI-powered adaptive learning platform** — research, study, and master any topic with spaced repetition, mind maps, AI tutoring, and gamification.

[![Deploy](https://github.com/tms2283/nexus/actions/workflows/deploy.yml/badge.svg)](https://github.com/tms2283/nexus/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## What is Nexus?

Nexus is a full-stack learning platform that combines AI-generated content with proven study techniques like spaced repetition (SM-2) and knowledge graphs. It helps self-directed learners research topics, generate structured curricula, review flashcards on an optimal schedule, and track their progress through gamification. Users can get started immediately as visitors or sign in via OAuth for a persistent account.

## Features

- **AI Chat & Depth Engine** — Multi-turn AI conversations with a 5-level depth explainer (ELI5 through PhD-level)
- **Adaptive Curriculum Generator** — AI-generated lesson plans with objectives, key points, and resources
- **Research Forge** — Analyze URLs and text, extract key insights, and generate citations
- **Spaced Repetition Flashcards** — SM-2 algorithm with quality ratings (again/hard/good/easy) and optimal review scheduling
- **Mind Maps** — AI-generated knowledge graphs with radial layout, expandable nodes, and categories
- **Interactive Lab** — Prompt engineering, chain-of-thought, text classification, debate, and code debugging experiments
- **Testing Center** — Subject quizzes and IQ assessments with score history and trend analysis
- **Library** — Curated resource collection with reading lists and difficulty ratings
- **Codex** — Knowledge base of featured articles, papers, courses, and tools
- **Daily Challenges** — AI-generated daily learning challenges across AI topics
- **Skill Mastery Tracking** — Evidence-based skill level tracking
- **Study Buddy** — AI-powered study companion
- **Gamification** — XP, levels (XP/100 + 1), streaks, badges, and a public leaderboard
- **Audio Overviews** — Two-voice podcast-style audio summaries via ElevenLabs TTS
- **Multi-Provider AI** — Built-in platform LLM with optional user-supplied keys for Gemini, OpenAI, or Perplexity
- **Dark Mode** — Full dark/light theme support

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4, Radix UI, Framer Motion, Recharts, Wouter (routing), TanStack React Query |
| **Backend** | Express 4, tRPC 11, TypeScript, Zod (validation) |
| **Database** | MySQL 8 via Drizzle ORM |
| **AI** | Built-in Manus Forge (Gemini 2.5 Flash), Google Gemini, OpenAI (GPT-4o-mini), Perplexity (Llama 3.1 Sonar) |
| **Audio** | ElevenLabs TTS (two-voice podcast generation) |
| **Search** | Exa API (source discovery) |
| **Deployment** | Nginx (reverse proxy + rate limiting), PM2 (process manager), GitHub Actions CI/CD |

## Prerequisites

- **Node.js** 20+
- **pnpm** 10+
- **MySQL** 8.0+
- **API Keys** (at minimum the built-in Forge key):

| Key | Where to get it | Required? |
|---|---|---|
| `BUILT_IN_FORGE_API_KEY` | Manus Forge platform | Yes |
| `ELEVENLABS_API_KEY` | [elevenlabs.io/api](https://elevenlabs.io/api) | For audio features |
| `EXA_API_KEY` | [exa.ai](https://exa.ai) | For research source discovery |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) | Optional (user-supplied) |
| `GEMINI_API_KEY` | [ai.google.dev](https://ai.google.dev) | Optional (user-supplied) |
| `PERPLEXITY_API_KEY` | [perplexity.ai](https://www.perplexity.ai) | Optional (user-supplied) |

## Getting Started

```bash
# Clone the repository
git clone https://github.com/tms2283/nexus.git
cd nexus

# Copy environment template and fill in your values
cp .env.example .env

# Install dependencies
pnpm install

# Generate and run database migrations
pnpm db:push

# Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build frontend (Vite) and backend (esbuild) for production |
| `pnpm start` | Run production build |
| `pnpm check` | TypeScript type checking |
| `pnpm test` | Run test suite (Vitest) |
| `pnpm format` | Format code with Prettier |
| `pnpm db:push` | Generate and apply database migrations |

## Environment Variables

| Variable | Description | Required | Example |
|---|---|---|---|
| `NODE_ENV` | Runtime environment | Yes | `production` |
| `PORT` | Server port | No (default: 3000) | `3000` |
| `VITE_APP_ID` | App identifier | Yes | `nexus` |
| `DATABASE_URL` | MySQL connection string | Yes | `mysql://nexus_user:pass@localhost:3306/nexus` |
| `JWT_SECRET` | Session signing key (64+ chars) | Yes | (random string) |
| `OWNER_OPEN_ID` | Admin user's OAuth ID | Yes | (your OAuth sub) |
| `ENCRYPTION_KEY` | API key encryption (64-char hex) | Yes | (generated hex string) |
| `OAUTH_SERVER_URL` | OAuth provider URL | No | `https://accounts.google.com` |
| `BUILT_IN_FORGE_API_URL` | Manus Forge endpoint | Yes | `https://api.manus.im/v1` |
| `BUILT_IN_FORGE_API_KEY` | Manus Forge API key | Yes | (your key) |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS API key | No | (your key) |
| `ELEVENLABS_VOICE_A` | Voice ID for Host A | No | `21m00Tcm4TlvDq8ikWAM` |
| `ELEVENLABS_VOICE_B` | Voice ID for Host B | No | `pNInz6obpgDQGcFmaJgB` |
| `AUDIO_DIR` | Server path for generated audio | No | `/var/www/nexus/public/audio` |
| `AUDIO_URL_BASE` | Public URL prefix for audio | No | `https://yourdomain.com/audio` |
| `RESEARCH_SERVICE_URL` | Python research microservice URL | No | `http://localhost:8001/api` |
| `EXA_API_KEY` | Exa search API key | No | (your key) |
| `VITE_ANALYTICS_ENDPOINT` | Plausible analytics endpoint | No | (your endpoint) |
| `VITE_ANALYTICS_WEBSITE_ID` | Plausible site ID | No | (your site ID) |

Generate the encryption key with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Project Structure

```
nexus/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── _core/          # tRPC client, query client setup
│   │   ├── components/     # UI components and layouts
│   │   ├── contexts/       # React contexts (Theme, Personalization)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions (cn, etc.)
│   │   └── pages/          # Route pages (25 pages)
│   └── public/             # Static assets
├── server/                  # Express + tRPC backend
│   ├── _core/              # Server infrastructure (entry, auth, env, cookies, trpc)
│   ├── routers/            # tRPC routers (14 feature routers)
│   ├── aiProvider.ts       # Multi-provider AI routing with retry & fallback
│   ├── crypto.ts           # API key encryption/decryption
│   └── db.ts               # Database functions (Drizzle queries)
├── drizzle/                 # Database schema and migrations
│   ├── schema.ts           # All 31 table definitions
│   ├── relations.ts        # Table relationships
│   └── meta/               # Migration history
├── shared/                  # Shared types and constants
├── deploy/                  # Deployment configs (Nginx, systemd, backup)
├── scripts/                 # Utility and migration scripts
├── .github/workflows/       # CI/CD (GitHub Actions)
├── ecosystem.config.cjs     # PM2 process manager config
└── vitest.config.ts         # Test configuration
```

## API Overview

Nexus uses [tRPC](https://trpc.io) for type-safe API communication. All procedures are defined as tRPC routers:

| Router | Description |
|---|---|
| `auth` | Login status (`me`) and logout |
| `system` | Health check endpoint |
| `visitor` | Visitor profiles, page tracking, XP, interests |
| `ai` | AI chat, greeting generation, quiz generation, depth engine, codex explanations |
| `research` | Content analysis, session management, citation generation, audio overviews |
| `flashcards` | Deck CRUD, SM-2 review, AI deck generation, session completion |
| `mindmap` | Mind map CRUD, AI generation, node expansion |
| `lesson` | Curriculum generation, lesson creation, ratings, progress tracking |
| `lab` | Prompt experiments, chain-of-thought, classification, debate, code debugging |
| `library` | Resource listing, contributions |
| `testing` | Quiz results, IQ assessments, score history |
| `dashboard` | Activity heatmap, learning insights |
| `leaderboard` | Top users by XP/streak, personal rank |
| `contact` | Contact form submissions |
| `codex` | Knowledge base entries |
| `aiProvider` | User AI provider settings (get/set/test/clear) |
| `daily` | Daily AI challenges |
| `skills` | Skill mastery tracking |

Three procedure levels enforce access control:
- **`publicProcedure`** — Anyone (visitors and authenticated users)
- **`protectedProcedure`** — Authenticated users only (returns 401 otherwise)
- **`adminProcedure`** — Admin users only (returns 403 otherwise)

## Deployment

Nexus is designed for deployment on a VPS (Ubuntu 22.04+) with:

1. **Nginx** — Reverse proxy with SSL (Let's Encrypt), rate limiting (30 req/min API, 60 req/min general), gzip compression, and security headers
2. **PM2** — Node.js process manager (single fork mode, 512MB max memory, auto-restart)
3. **GitHub Actions** — CI/CD pipeline: checkout, type check, build, SSH deploy, PM2 reload, health check
4. **Python Research Service** — Optional FastAPI microservice for advanced research pipelines (systemd-managed, port 8001)

See [`deploy/DEPLOYMENT.md`](deploy/DEPLOYMENT.md) for the full deployment guide including MySQL setup, Nginx configuration, SSL certificates, and PM2 configuration.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and add tests
4. Run the test suite: `pnpm test`
5. Run type checking: `pnpm check`
6. Commit with clear, imperative messages
7. Open a pull request as a draft

## License

This project is licensed under the [MIT License](LICENSE).
