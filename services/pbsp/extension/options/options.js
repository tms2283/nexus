document.addEventListener("DOMContentLoaded", () => {
  const apiUrl = document.getElementById("apiUrl");
  const apiKey = document.getElementById("apiKey");
  const saveBtn = document.getElementById("saveBtn");
  const status = document.getElementById("status");

  // Load
  chrome.storage.local.get("pbspConfig", (result) => {
    const cfg = result.pbspConfig || {};
    apiUrl.value = cfg.apiUrl || "http://127.0.0.1:8002/api";
    apiKey.value = cfg.apiKey || "";
  });

  // Save
  saveBtn.addEventListener("click", () => {
    chrome.storage.local.get("pbspConfig", (result) => {
      const cfg = result.pbspConfig || {};
      cfg.apiUrl = apiUrl.value.trim();
      cfg.apiKey = apiKey.value.trim();
      chrome.storage.local.set({ pbspConfig: cfg }, () => {
        status.textContent = "Settings saved!";
        setTimeout(() => (status.textContent = ""), 3000);
      });
    });
  });
});
