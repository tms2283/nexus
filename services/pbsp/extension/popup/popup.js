document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // Load config
  chrome.storage.local.get("pbspConfig", (result) => {
    const cfg = result.pbspConfig || {};
    $("toggleEnabled").checked = cfg.enabled !== false;
    $("toggleSearches").checked = cfg.trackSearches !== false;
    $("toggleReading").checked = cfg.trackReadingTime !== false;
    $("toggleTabs").checked = cfg.trackTabPatterns !== false;
  });

  // Save config on toggle
  function saveConfig() {
    const cfg = {
      enabled: $("toggleEnabled").checked,
      trackSearches: $("toggleSearches").checked,
      trackReadingTime: $("toggleReading").checked,
      trackTabPatterns: $("toggleTabs").checked,
      trackBookmarks: true,
      apiKey: "", // Set via options page
    };
    chrome.storage.local.set({ pbspConfig: cfg });
  }

  $("toggleEnabled").addEventListener("change", saveConfig);
  $("toggleSearches").addEventListener("change", saveConfig);
  $("toggleReading").addEventListener("change", saveConfig);
  $("toggleTabs").addEventListener("change", saveConfig);

  // Get status from background
  function updateStatus() {
    chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
      if (!response) return;
      $("bufferedCount").textContent = response.buffered || 0;
      $("tabCount").textContent = response.tabCount || 0;
      $("switchRate").textContent = response.switches || 0;
      $("statusIndicator").className = response.enabled
        ? "indicator"
        : "indicator off";
      $("statusText").textContent = response.enabled ? "Active" : "Paused";
    });
  }

  updateStatus();
  setInterval(updateStatus, 2000);
});
