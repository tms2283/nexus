const path = require("node:path");
const fs = require("node:fs/promises");
const { constants: fsConstants } = require("node:fs");
const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const { spawn } = require("node:child_process");

const APP_NAME = "Nexus Desktop Studio";
const WORKSPACE_ROOT = path.resolve(
  process.env.NEXUS_WORKSPACE_ROOT || path.resolve(__dirname, ".."),
);
const MAX_LIST_ENTRIES = 2500;

const isProd = app.isPackaged;

function safePath(relativePath = ".") {
  const targetPath = path.resolve(WORKSPACE_ROOT, relativePath);
  const relativeToRoot = path.relative(WORKSPACE_ROOT, targetPath);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new Error("Path is outside workspace root.");
  }
  return targetPath;
}

async function listDirectory(relativePath = ".", depth = 3, maxEntries = MAX_LIST_ENTRIES) {
  const absPath = safePath(relativePath);
  const out = [];
  const queue = [{ abs: absPath, rel: path.relative(WORKSPACE_ROOT, absPath), level: 0 }];

  while (queue.length > 0 && out.length < maxEntries) {
    const next = queue.shift();
    if (!next) break;

    let dirEntries;
    try {
      dirEntries = await fs.readdir(next.abs, { withFileTypes: true });
    } catch {
      continue;
    }

    dirEntries
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((entry) => {
        const childAbs = path.join(next.abs, entry.name);
        const childRel = path.relative(WORKSPACE_ROOT, childAbs);
        if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") {
          return;
        }

        out.push({
          path: childRel,
          name: entry.name,
          type: entry.isDirectory() ? "dir" : "file",
          depth: next.level + 1,
        });

        if (entry.isDirectory() && next.level + 1 < depth && out.length < maxEntries) {
          queue.push({ abs: childAbs, rel: childRel, level: next.level + 1 });
        }
      });
  }

  return out;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1560,
    height: 980,
    title: APP_NAME,
    autoHideMenuBar: false,
    backgroundColor: "#0B1020",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      spellcheck: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const indexPath = path.join(__dirname, "renderer", "index.html");
  win.loadFile(indexPath);
  if (!isProd) {
    win.webContents.openDevTools({ mode: "detach" });
  }
}

async function ensureReadable(absPath) {
  await fs.access(absPath, fsConstants.R_OK);
}

async function ensureWritable(absPath) {
  await fs.access(path.dirname(absPath), fsConstants.W_OK);
}

async function runMcpProcess({ command, args = [], input = "", timeoutMs = 15000 }) {
  if (!command || typeof command !== "string") {
    throw new Error("Command is required.");
  }

  const proc = spawn(command, args, {
    cwd: WORKSPACE_ROOT,
    windowsHide: true,
    shell: false,
  });

  let stdout = "";
  let stderr = "";
  let didTimeout = false;

  const timeout = setTimeout(() => {
    didTimeout = true;
    proc.kill("SIGTERM");
  }, timeoutMs);

  return await new Promise((resolve, reject) => {
    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        code,
        stdout,
        stderr,
        timedOut: didTimeout,
      });
    });

    if (input) {
      proc.stdin.write(input);
    }
    proc.stdin.end();
  });
}

async function runCommand({
  command,
  args = [],
  timeoutMs = 120000,
  cwd = WORKSPACE_ROOT,
  shell = false,
}) {
  if (!command || typeof command !== "string") {
    throw new Error("Command is required.");
  }

  const proc = spawn(command, args, {
    cwd,
    windowsHide: true,
    shell,
  });

  let stdout = "";
  let stderr = "";
  let didTimeout = false;

  const timeout = setTimeout(() => {
    didTimeout = true;
    proc.kill("SIGTERM");
  }, timeoutMs);

  return await new Promise((resolve, reject) => {
    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        code,
        stdout,
        stderr,
        timedOut: didTimeout,
        command,
        args,
      });
    });
  });
}

async function runAIRequest(input) {
  const {
    provider,
    model,
    prompt,
    apiKey,
    apiBaseUrl,
    systemPrompt,
    temperature = 0.4,
    maxOutputTokens = 1200,
  } = input || {};

  if (!provider || !model || !prompt || !apiKey) {
    throw new Error("provider, model, prompt, and apiKey are required.");
  }

  if (provider === "gemini") {
    const endpoint =
      apiBaseUrl && apiBaseUrl.trim()
        ? `${apiBaseUrl.replace(/\/$/, "")}/models/${model}:generateContent?key=${apiKey}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    };

    if (systemPrompt?.trim()) {
      body.systemInstruction = {
        role: "system",
        parts: [{ text: systemPrompt.trim() }],
      };
    }

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await resp.json();
    if (!resp.ok) {
      throw new Error(json?.error?.message || "Gemini request failed.");
    }

    const text =
      json?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .join("\n")
        .trim() || "";

    return {
      provider: "gemini",
      model,
      text,
      raw: json,
    };
  }

  if (provider === "openai_compatible") {
    if (!apiBaseUrl) throw new Error("apiBaseUrl is required for openai_compatible.");
    const endpoint = `${apiBaseUrl.replace(/\/$/, "")}/chat/completions`;
    const messages = [];
    if (systemPrompt?.trim()) {
      messages.push({ role: "system", content: systemPrompt.trim() });
    }
    messages.push({ role: "user", content: prompt });

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxOutputTokens,
        messages,
      }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      throw new Error(json?.error?.message || "OpenAI-compatible request failed.");
    }
    const text = json?.choices?.[0]?.message?.content || "";
    return {
      provider: "openai_compatible",
      model,
      text,
      raw: json,
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

function registerIpc() {
  ipcMain.handle("desktop:get-info", async () => {
    return {
      appName: APP_NAME,
      workspaceRoot: WORKSPACE_ROOT,
      version: app.getVersion(),
      platform: process.platform,
    };
  });

  ipcMain.handle("desktop:list-directory", async (_event, input) => {
    const relativePath = input?.relativePath || ".";
    const depth = Number(input?.depth || 3);
    return listDirectory(relativePath, Math.max(1, Math.min(depth, 8)));
  });

  ipcMain.handle("desktop:read-file", async (_event, input) => {
    const relativePath = input?.relativePath;
    if (!relativePath) throw new Error("relativePath is required.");
    const absPath = safePath(relativePath);
    await ensureReadable(absPath);
    const content = await fs.readFile(absPath, "utf8");
    return { relativePath, content };
  });

  ipcMain.handle("desktop:write-file", async (_event, input) => {
    const relativePath = input?.relativePath;
    const content = String(input?.content ?? "");
    if (!relativePath) throw new Error("relativePath is required.");
    const absPath = safePath(relativePath);
    await ensureWritable(absPath);
    await fs.writeFile(absPath, content, "utf8");
    return { ok: true, relativePath };
  });

  ipcMain.handle("desktop:select-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      defaultPath: WORKSPACE_ROOT,
      title: "Select workspace root (read/write scope)",
    });
    return { canceled: result.canceled, filePaths: result.filePaths || [] };
  });

  ipcMain.handle("desktop:open-external", async (_event, input) => {
    const url = input?.url;
    if (!url) throw new Error("url is required.");
    await shell.openExternal(url);
    return { ok: true };
  });

  ipcMain.handle("desktop:ai-request", async (_event, input) => {
    return runAIRequest(input);
  });

  ipcMain.handle("desktop:mcp-run", async (_event, input) => {
    return runMcpProcess(input || {});
  });

  ipcMain.handle("desktop:deploy:health", async (_event, input) => {
    const siteUrl = String(input?.siteUrl || "").trim();
    if (!siteUrl) throw new Error("siteUrl is required.");
    const response = await fetch(siteUrl, {
      method: "GET",
      headers: { "user-agent": "nexus-desktop-studio/1.0" },
    });
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: siteUrl,
    };
  });

  ipcMain.handle("desktop:deploy:webhook", async (_event, input) => {
    const webhookUrl = String(input?.webhookUrl || "").trim();
    const secret = String(input?.secret || "").trim();
    if (!webhookUrl || !secret) {
      throw new Error("webhookUrl and secret are required.");
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": secret,
        "x-nexus-deploy-secret": secret,
      },
      body: JSON.stringify({
        source: "nexus-desktop-studio",
        event: "manual_deploy",
        timestamp: new Date().toISOString(),
      }),
    });

    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body,
    };
  });

  ipcMain.handle("desktop:deploy:ssh", async (_event, input) => {
    const host = String(input?.host || "").trim();
    const user = String(input?.user || "root").trim();
    const port = String(input?.port || "22").trim();
    const keyPath = String(input?.keyPath || "").trim();
    const action = String(input?.action || "full").trim();
    const appDir = String(input?.appDir || "/var/www/nexus").trim();

    if (!host) throw new Error("host is required.");

    const sshArgs = ["-p", port, "-o", "StrictHostKeyChecking=no"];
    if (keyPath) {
      sshArgs.push("-i", keyPath);
    }

    let remoteCommand;
    if (action === "full") {
      remoteCommand = [
        `cd ${appDir}`,
        "git pull origin main",
        "pnpm install --frozen-lockfile",
        "pnpm run build",
        "cd /docker/nexus && docker compose restart",
      ].join(" && ");
    } else if (action === "migrate") {
      remoteCommand = [`cd ${appDir}`, "npx drizzle-kit push", "node scripts/migrate-auth.mjs"].join(
        " && ",
      );
    } else if (action === "logs") {
      remoteCommand = "docker logs nexus-nexus-1 --tail 100";
    } else {
      throw new Error(`Unsupported deploy action: ${action}`);
    }

    sshArgs.push(`${user}@${host}`, remoteCommand);
    return runCommand({
      command: "ssh",
      args: sshArgs,
      timeoutMs: Number(input?.timeoutMs || 300000),
    });
  });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
