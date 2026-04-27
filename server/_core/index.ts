import "dotenv/config";
import path from "node:path";
import { validateEnv } from "./validateEnv";

// ─── Validate environment variables before anything else ─────────────────────
// Exits with code 1 if required vars are missing — prevents cryptic runtime failures.
validateEnv();

import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers/index";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerSeoRoutes } from "./seo";
import { startJobRunner } from "./jobRunner";
import { applyCsrfProtection } from "./csrf";
import { ensureAdaptiveLessonTables } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => { server.close(() => resolve(true)); });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Body parser — 2mb cap; large payloads go through the research service
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  // ─── CSRF protection (Fix 3) ──────────────────────────────────────────────
  // Applies to all state-mutating routes. tRPC mutations are covered here.
  applyCsrfProtection(app);

  // OAuth callback
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );

  // Standalone Research Engine API
  const { researchEngineRouter } = require("../routers/researchEngine");
  app.use("/api/research", researchEngineRouter);

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    // In production the server bundle lands at dist/index.js, so
    // import.meta.dirname resolves to the dist/ folder.
    // The Vite client build outputs to dist/public/ — same as vite.ts uses.
    const distPublicPath = path.resolve(import.meta.dirname, "public");

    // SEO routes (robots.txt, sitemap.xml, per-route meta injection)
    // must be registered BEFORE the static file fallback so they take priority.
    registerSeoRoutes(app, distPublicPath);
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    startJobRunner();
    ensureAdaptiveLessonTables().catch((err) =>
      console.error("[Bootstrap] ensureAdaptiveLessonTables threw:", err)
    );
  });
}

startServer().catch(console.error);
