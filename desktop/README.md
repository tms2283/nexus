# Nexus Desktop Studio

Nexus Desktop Studio is a free/open desktop admin surface for the website.

## Included open-source building blocks

- [Electron](https://www.electronjs.org/) for desktop shell
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for full code editing

## What it gives you

- Live embedded admin/studio browser (`https://schmo.tech/admin`, `https://schmo.tech/studio`)
- Local workspace file explorer + full code editor + save
- Visual drag-and-drop page builder (GrapesJS) with file export
- AI panel with Gemini or OpenAI-compatible API support
- VPS deployment controls (SSH deploy, migrations, logs, webhook trigger, health check)
- MCP command console for local MCP server testing through stdio

## Run locally

```bash
pnpm install
pnpm desktop:start
```

## Build installer (Windows)

```bash
pnpm desktop:dist
```

Artifacts are written to `desktop-dist/`.

Optional workspace override:

```bash
NEXUS_WORKSPACE_ROOT="L:\\Website\\MANUS2" pnpm desktop:start
```

## Security notes

- API keys are used in-memory in the desktop session only.
- File operations are restricted to `NEXUS_WORKSPACE_ROOT` (or project root by default).
- MCP command runner can execute local commands; use only trusted commands.
- Deploy actions can execute SSH commands on your VPS; keep credentials local and rotate secrets regularly.
