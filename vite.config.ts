import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import fs from "node:fs";

// pnpm strict isolation keeps some direct deps only in the .pnpm store,
// not at the top-level node_modules. Find them in the store so Rollup can resolve them.
function findInPnpmStore(pkg: string, filename = "src/index.js"): string | undefined {
  const pnpmDir = path.resolve(import.meta.dirname, "node_modules/.pnpm");
  if (!fs.existsSync(pnpmDir)) return undefined;
  // Find the versioned folder e.g. "d3-force@3.0.0"
  const match = fs.readdirSync(pnpmDir).find(d => d.startsWith(`${pkg}@`));
  if (!match) return undefined;
  const resolved = path.join(pnpmDir, match, "node_modules", pkg, filename);
  return fs.existsSync(resolved) ? resolved : undefined;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      // Point pnpm-isolated packages directly to their store entry points
      // so Rollup can resolve them at build time.
      ...(findInPnpmStore("d3-force") ? { "d3-force": findInPnpmStore("d3-force")! } : {}),
      ...(findInPnpmStore("mermaid", "dist/mermaid.esm.mjs") ? { "mermaid": findInPnpmStore("mermaid", "dist/mermaid.esm.mjs")! } : {}),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  optimizeDeps: {
    include: ["superjson"],
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
