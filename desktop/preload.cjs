const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nexusDesktop", {
  getInfo: () => ipcRenderer.invoke("desktop:get-info"),
  listDirectory: (input) => ipcRenderer.invoke("desktop:list-directory", input),
  readFile: (input) => ipcRenderer.invoke("desktop:read-file", input),
  writeFile: (input) => ipcRenderer.invoke("desktop:write-file", input),
  openExternal: (input) => ipcRenderer.invoke("desktop:open-external", input),
  selectFolder: () => ipcRenderer.invoke("desktop:select-folder"),
  aiRequest: (input) => ipcRenderer.invoke("desktop:ai-request", input),
  mcpRun: (input) => ipcRenderer.invoke("desktop:mcp-run", input),
  deployHealth: (input) => ipcRenderer.invoke("desktop:deploy:health", input),
  deployWebhook: (input) => ipcRenderer.invoke("desktop:deploy:webhook", input),
  deploySSH: (input) => ipcRenderer.invoke("desktop:deploy:ssh", input),
});
