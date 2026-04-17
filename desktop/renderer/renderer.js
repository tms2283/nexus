/* global require, monaco */
const state = {
  editor: null,
  currentFilePath: null,
  tree: [],
  builder: null,
};

const $ = (id) => document.getElementById(id);

function setStatus(text) {
  const meta = $("meta");
  if (meta) meta.innerText = text;
}

function setActiveTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.id === `tab-${tabId}`);
  });
}

function inferLanguage(filePath) {
  if (!filePath) return "plaintext";
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript";
  if (lower.endsWith(".js") || lower.endsWith(".jsx") || lower.endsWith(".cjs")) return "javascript";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".html")) return "html";
  if (lower.endsWith(".md")) return "markdown";
  if (lower.endsWith(".sql")) return "sql";
  if (lower.endsWith(".sh") || lower.endsWith(".ps1")) return "shell";
  return "plaintext";
}

function renderTree() {
  const treeEl = $("file-tree");
  treeEl.innerHTML = "";

  state.tree.forEach((item) => {
    const btn = document.createElement("button");
    btn.className = `file-row ${item.type}${state.currentFilePath === item.path ? " active" : ""}`;
    btn.style.paddingLeft = `${Math.max(0, item.depth - 1) * 14 + 10}px`;
    btn.innerText = `${item.type === "dir" ? "📁" : "📄"} ${item.name}`;
    if (item.type === "file") {
      btn.onclick = () => openFile(item.path);
    }
    treeEl.appendChild(btn);
  });
}

async function refreshTree() {
  const root = $("editor-root").value?.trim() || ".";
  const list = await window.nexusDesktop.listDirectory({ relativePath: root, depth: 6 });
  state.tree = list.filter((item) => item.type === "dir" || item.path.startsWith(root));
  renderTree();
}

async function openFile(relativePath) {
  const file = await window.nexusDesktop.readFile({ relativePath });
  state.currentFilePath = file.relativePath;
  $("current-file").innerText = file.relativePath;
  const model = monaco.editor.createModel(file.content, inferLanguage(file.relativePath));
  state.editor.setModel(model);
  renderTree();
}

async function saveCurrentFile() {
  if (!state.currentFilePath || !state.editor) return;
  await window.nexusDesktop.writeFile({
    relativePath: state.currentFilePath,
    content: state.editor.getValue(),
  });
  setStatus(`Saved ${state.currentFilePath}`);
}

function initMonaco() {
  return new Promise((resolve) => {
    window.require.config({
      paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.47.0/min/vs",
      },
    });
    window.require(["vs/editor/editor.main"], () => {
      state.editor = monaco.editor.create($("editor"), {
        value: "// Pick a file from the left panel to start editing.",
        language: "javascript",
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: true },
        fontSize: 13,
      });
      resolve();
    });
  });
}

function wireSiteTab() {
  const webview = $("site-webview");
  const urlInput = $("site-url");

  const setWebviewUrl = (url) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    webview.src = trimmed;
  };

  $("open-site").addEventListener("click", () => setWebviewUrl(urlInput.value));
  $("open-admin").addEventListener("click", () => {
    urlInput.value = "https://schmo.tech/admin";
    setWebviewUrl(urlInput.value);
  });
  $("open-studio").addEventListener("click", () => {
    urlInput.value = "https://schmo.tech/studio";
    setWebviewUrl(urlInput.value);
  });
  $("open-external").addEventListener("click", async () => {
    await window.nexusDesktop.openExternal({ url: urlInput.value });
  });
}

function wireAITab() {
  $("ai-send").addEventListener("click", async () => {
    const output = $("ai-output");
    output.textContent = "Running...";
    try {
      const result = await window.nexusDesktop.aiRequest({
        provider: $("ai-provider").value,
        model: $("ai-model").value,
        prompt: $("ai-prompt").value,
        apiKey: $("ai-key").value,
        apiBaseUrl: $("ai-base").value,
        systemPrompt: $("ai-system").value,
      });
      output.textContent = result.text || JSON.stringify(result.raw, null, 2);
    } catch (error) {
      output.textContent = `Error: ${error.message || String(error)}`;
    }
  });
}

function buildReactWrapper(html, css) {
  const escapedHtml = JSON.stringify(html);
  const escapedCss = JSON.stringify(css);
  return [
    "import React from 'react';",
    "",
    "export default function GeneratedBuilderPage() {",
    "  return (",
    "    <>",
    "      <style>{",
    `        ${escapedCss}`,
    "      }</style>",
    "      <div dangerouslySetInnerHTML={{ __html: ",
    `        ${escapedHtml}`,
    "      }} />",
    "    </>",
    "  );",
    "}",
    "",
  ].join("\n");
}

async function initBuilderTab() {
  state.builder = grapesjs.init({
    container: "#grapes-container",
    fromElement: false,
    height: "100%",
    width: "auto",
    storageManager: {
      type: "local",
      options: { local: { key: "nexus-desktop-grapes" } },
    },
    panels: { defaults: [] },
    blockManager: {
      appendTo: ".gjs-blocks-c",
      blocks: [
        { id: "section", label: "Section", content: "<section><h2>Heading</h2><p>Body text.</p></section>" },
        { id: "button", label: "Button", content: "<button class='cta'>Click me</button>" },
        { id: "hero", label: "Hero", content: "<section class='hero'><h1>Hero title</h1><p>Hero subtitle</p></section>" },
      ],
    },
    styleManager: { appendTo: ".gjs-sm-sector" },
  });

  $("builder-reset").addEventListener("click", () => {
    state.builder.setComponents("<main><h1>Nexus Visual Builder</h1><p>Start dragging blocks.</p></main>");
    state.builder.setStyle(
      "body { font-family: system-ui; margin: 0; } main { padding: 24px; } .hero { padding: 48px; background: #0f172a; color: #fff; border-radius: 16px; } .cta { border: 0; padding: 10px 16px; border-radius: 10px; background: #f59e0b; color: #111; }",
    );
  });

  $("builder-load-file").addEventListener("click", async () => {
    try {
      const relativePath = $("builder-file").value.trim();
      const file = await window.nexusDesktop.readFile({ relativePath });
      state.builder.setComponents(`<pre>${file.content.replaceAll("<", "&lt;")}</pre>`);
      setStatus(`Loaded source from ${relativePath} into builder canvas.`);
    } catch (error) {
      setStatus(`Builder load error: ${error.message || String(error)}`);
    }
  });

  $("builder-save-file").addEventListener("click", async () => {
    try {
      const relativePath = $("builder-file").value.trim();
      const html = state.builder.getHtml();
      const css = state.builder.getCss();
      const generated = buildReactWrapper(html, css);
      await window.nexusDesktop.writeFile({ relativePath, content: generated });
      setStatus(`Builder export saved to ${relativePath}`);
    } catch (error) {
      setStatus(`Builder save error: ${error.message || String(error)}`);
    }
  });
}

function wireDeployTab() {
  const output = $("deploy-output");
  const print = (value) => {
    output.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  };

  const getSSHConfig = () => ({
    host: $("deploy-host").value.trim(),
    user: $("deploy-user").value.trim(),
    port: $("deploy-port").value.trim(),
    keyPath: $("deploy-key").value.trim(),
    appDir: $("deploy-appdir").value.trim(),
  });

  $("deploy-full").addEventListener("click", async () => {
    print("Running full deploy...");
    try {
      const result = await window.nexusDesktop.deploySSH({
        ...getSSHConfig(),
        action: "full",
        timeoutMs: 600000,
      });
      print(result);
    } catch (error) {
      print(`Error: ${error.message || String(error)}`);
    }
  });

  $("deploy-migrate").addEventListener("click", async () => {
    print("Running migrations...");
    try {
      const result = await window.nexusDesktop.deploySSH({
        ...getSSHConfig(),
        action: "migrate",
        timeoutMs: 420000,
      });
      print(result);
    } catch (error) {
      print(`Error: ${error.message || String(error)}`);
    }
  });

  $("deploy-logs").addEventListener("click", async () => {
    print("Fetching logs...");
    try {
      const result = await window.nexusDesktop.deploySSH({
        ...getSSHConfig(),
        action: "logs",
      });
      print(result);
    } catch (error) {
      print(`Error: ${error.message || String(error)}`);
    }
  });

  $("deploy-webhook").addEventListener("click", async () => {
    print("Triggering webhook...");
    try {
      const result = await window.nexusDesktop.deployWebhook({
        webhookUrl: $("deploy-webhook-url").value.trim(),
        secret: $("deploy-webhook-secret").value.trim(),
      });
      print(result);
    } catch (error) {
      print(`Error: ${error.message || String(error)}`);
    }
  });

  $("deploy-health").addEventListener("click", async () => {
    print("Checking site health...");
    try {
      const result = await window.nexusDesktop.deployHealth({
        siteUrl: $("deploy-health-url").value.trim(),
      });
      print(result);
    } catch (error) {
      print(`Error: ${error.message || String(error)}`);
    }
  });
}

function wireMcpTab() {
  $("mcp-run").addEventListener("click", async () => {
    const output = $("mcp-output");
    output.textContent = "Running...";
    try {
      const args = $("mcp-args")
        .value.split(" ")
        .map((s) => s.trim())
        .filter(Boolean);
      const result = await window.nexusDesktop.mcpRun({
        command: $("mcp-command").value.trim(),
        args,
        input: $("mcp-input").value,
        timeoutMs: 20000,
      });
      output.textContent = JSON.stringify(result, null, 2);
    } catch (error) {
      output.textContent = `Error: ${error.message || String(error)}`;
    }
  });
}

async function boot() {
  const info = await window.nexusDesktop.getInfo();
  setStatus(
    [
      `App: ${info.appName} v${info.version}`,
      `Platform: ${info.platform}`,
      `Workspace: ${info.workspaceRoot}`,
    ].join("\n"),
  );

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  wireSiteTab();
  wireAITab();
  wireDeployTab();
  await initBuilderTab();
  wireMcpTab();
  await initMonaco();

  $("refresh-tree").addEventListener("click", refreshTree);
  $("save-file").addEventListener("click", saveCurrentFile);
  await refreshTree();
}

boot().catch((err) => {
  setStatus(`Boot failed: ${err.message || String(err)}`);
});
