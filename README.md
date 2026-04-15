# Nexus

Nexus is a full-stack AI learning platform built with React, Vite, Express, tRPC, and MySQL via Drizzle ORM. It combines AI-assisted learning flows with persistent visitor profiles, account-based auth, flashcards, research tools, study tracking, and provider-configurable AI features.

## Stack

- Frontend: React 19, Vite 7, TypeScript, Tailwind CSS v4, Framer Motion
- API: tRPC 11
- Backend: Express 4 on Node.js
- Database: MySQL 8 with Drizzle ORM
- Auth: Email/password JWT sessions, Google sign-in, legacy OAuth session compatibility
- Testing: Vitest

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- MySQL 8

### Install

```bash
pnpm install
```

### Configure environment

Copy `.env.example` to `.env` and fill in the required values.

Minimum required variables:

```env
DATABASE_URL=mysql://user:password@localhost:3306/nexus
JWT_SECRET=<64+ random characters>
ENCRYPTION_KEY=<64 hex characters>
```

Important notes:

- Do not put `NODE_ENV` in `.env`. The npm scripts set it explicitly.
- Google sign-in requires `VITE_GOOGLE_CLIENT_ID`.
- Built-in AI access requires the Manus Forge URL and key if you want that provider enabled.

### Database

Create the database, then either run one of the migration scripts in `scripts/` or use:

```bash
pnpm db:push
```

### Run locally

```bash
pnpm dev
```

The development server starts on port `3000` by default.

## Scripts

| Command        | Description                               |
| -------------- | ----------------------------------------- |
| `pnpm dev`     | Start the development server              |
| `pnpm build`   | Build the frontend and bundle the backend |
| `pnpm start`   | Run the production server from `dist/`    |
| `pnpm check`   | Run TypeScript type-checking              |
| `pnpm test`    | Run the Vitest suite                      |
| `pnpm format`  | Format the repo with Prettier             |
| `pnpm db:push` | Generate and apply Drizzle migrations     |

## Project Structure

```text
client/src/
  components/   Shared UI building blocks
  contexts/     Auth and personalization state
  pages/        App routes and feature pages
  lib/          Client-side helpers such as tRPC setup

server/
  _core/        Express bootstrap, env loading, cookies, CSRF, context
  routers/      tRPC domain routers
  auth.ts       Session token and cookie helpers
  db.ts         Main database access layer

shared/
  Shared constants and cross-runtime types

drizzle/
  Drizzle schema and generated metadata

scripts/
  One-off migration and seeding utilities
```

## Auth Overview

- Guests get a persistent `tv_visitor_id` cookie for visitor-scoped progress and personalization.
- Signed-in users get an `app_session_id` httpOnly session cookie.
- Email/password and Google sign-in both issue the same app JWT session format.
- The server still accepts legacy OAuth-style session tokens so older sessions do not break immediately.

More detail lives in [USER_AUTH_GUIDE.md](/L:/Website/MANUS2/USER_AUTH_GUIDE.md).

## Notes

- `package.json` still uses the historical package name `timverse`, but the product and UI branding are Nexus.
- Facebook auth is currently a UI stub and server-side placeholder, not a working sign-in method.
