import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { parse as parseCookie } from "cookie";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers/index";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startJobRunner } from "./jobRunner";
import { csrfMiddleware } from "./csrf";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Cookie parsing middleware — populates req.cookies
  app.use((req, _res, next) => {
    req.cookies = {};
    if (req.headers.cookie) {
      try {
        req.cookies = parseCookie(req.headers.cookie) as Record<string, string>;
      } catch {
        // Ignore invalid cookies
      }
    }
    next();
  });

  // CSRF protection middleware
  app.use(csrfMiddleware);

  // Body parser — 2mb is sufficient for all tRPC payloads; large content is
  // chunked or handled via the research pipeline service.
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
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
  });
}

startServer().catch(console.error);
