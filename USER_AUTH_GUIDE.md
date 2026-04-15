# User Authentication Guide

## Overview

Nexus supports both guest usage and authenticated accounts.

- Guest users are tracked with a persistent browser cookie for visitor-scoped progress.
- Authenticated users receive an httpOnly session cookie backed by a signed JWT.
- The server accepts both the current app session format and legacy OAuth-style session tokens so older sessions can continue working during migration.

## Current Session Model

### Guest state

- Visitor cookie: `tv_visitor_id`
- Frontend guest flag: `nexus_guest_mode` in `localStorage`
- Scope: personalization, XP, progress, and other visitor-linked data that is keyed by `cookieId`

### Authenticated state

- Session cookie: `app_session_id`
- Legacy cookie accepted during transition: `nexus_session`
- Login methods:
  - Email/password
  - Google sign-in
  - Legacy OAuth callback support

## Request Flow

### Guest flow

1. `PersonalizationContext` creates or reads `tv_visitor_id`.
2. Visitor-scoped API calls pass that `cookieId`.
3. Server reads and writes visitor data keyed to `cookieId`.

### Authenticated flow

1. A login mutation or OAuth callback creates a session token.
2. The server writes `app_session_id` as an httpOnly cookie.
3. `server/_core/context.ts` resolves the current user from the session token.
4. Protected routes rely on `ctx.user`.

## Session Compatibility

The request context resolves identity in two stages:

1. Try the current app JWT format created by `server/auth.ts`.
2. If that fails, try the legacy OAuth session format through the Manus SDK and map it back to a local user by `openId`.

This lets the app move toward one session contract without immediately invalidating existing sessions.

## Security Properties

- Session cookies are `httpOnly`
- `sameSite` is `lax`
- `secure` is enabled automatically on HTTPS requests
- Required secrets are validated at startup
- CSRF protection is implemented separately with the app CSRF middleware

## Files To Know

- `client/src/contexts/AuthContext.tsx`
- `client/src/contexts/PersonalizationContext.tsx`
- `server/auth.ts`
- `server/_core/context.ts`
- `server/_core/oauth.ts`
- `server/_core/cookies.ts`
- `server/routers/auth.ts`

## Current Limitations

- Facebook sign-in is still a stub
- Guest data is visitor-scoped and not automatically account-scoped everywhere
- The app still carries some legacy OAuth compatibility logic that should eventually be retired once all active sessions use the unified app session format
