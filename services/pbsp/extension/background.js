/**
 * PBSP Browser Extension — Service Worker (Manifest V3)
 *
 * Captures behavioral signals from browsing activity:
 * - Tab switches and active tab tracking
 * - Search query detection (Google, Bing, YouTube, DuckDuckGo, Perplexity)
 * - Reading time estimation per page
 * - Tab open/close patterns
 * - Bookmark additions
 *
 * Events are batched and sent to the PBSP API server (localhost:8002).
 * No page content or raw text is captured — only behavioral patterns.
 */

const PBSP_API_URL = "http://127.0.0.1:8002/api";
const BATCH_INTERVAL_MS = 10_000; // Flush every 10 seconds
const MAX_BATCH_SIZE = 50;

// ── State ──────────────────────────────────────────────────────────────────

let config = {
  apiKey: "",
  enabled: true,
  trackSearches: true,
  trackReadingTime: true,
  trackTabPatterns: true,
  trackBookmarks: true,
};

let eventBuffer = [];
let tabState = {}; // tabId -> { url, title, domain, activatedAt, scrollDepth }
let activeTabId = null;
let lastActiveTabId = null;
let tabSwitchTimestamps = []; // for switch-rate calculation

// ── Config ─────────────────────────────────────────────────────────────────

chrome.storage.local.get("pbspConfig", (result) => {
  if (result.pbspConfig) {
    config = { ...config, ...result.pbspConfig };
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.pbspConfig) {
    config = { ...config, ...changes.pbspConfig.newValue };
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isSearchUrl(url) {
  const searchPatterns = [
    { domain: "google.com", param: "q", engine: "google" },
    { domain: "bing.com", param: "q", engine: "bing" },
    { domain: "duckduckgo.com", param: "q", engine: "duckduckgo" },
    { domain: "search.yahoo.com", param: "p", engine: "yahoo" },
    { domain: "youtube.com", param: "search_query", engine: "youtube" },
    { domain: "perplexity.ai", param: "q", engine: "perplexity" },
  ];

  try {
    const u = new URL(url);
    const hostname = u.hostname.replace(/^www\./, "");
    for (const { domain, param, engine } of searchPatterns) {
      if (hostname.includes(domain)) {
        const query = u.searchParams.get(param);
        if (query) return { query, engine };
      }
    }
  } catch {}
  return null;
}

function createEvent(type, context = {}, metadata = {}) {
  return {
    event_id: crypto.randomUUID(),
    type,
    source: "browser",
    timestamp: Date.now() / 1000,
    confidence: 0.85,
    context: {
      app: "browser",
      window_title: context.title || null,
      url: context.url || null,
      domain: context.domain || null,
      domain_category: "unknown",
      duration: context.duration || null,
      ...context,
    },
    metadata,
  };
}

function queueEvent(event) {
  if (!config.enabled) return;
  eventBuffer.push(event);
  if (eventBuffer.length >= MAX_BATCH_SIZE) {
    flushEvents();
  }
}

async function flushEvents() {
  if (eventBuffer.length === 0) return;
  const batch = eventBuffer.splice(0, MAX_BATCH_SIZE);

  try {
    const response = await fetch(`${PBSP_API_URL}/events/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ events: batch }),
    });

    if (!response.ok) {
      console.warn(`PBSP: Failed to flush events (${response.status})`);
      // Put events back at the front of the buffer
      eventBuffer.unshift(...batch);
    }
  } catch (err) {
    // API not reachable — buffer events for later
    eventBuffer.unshift(...batch);
    if (eventBuffer.length > 500) {
      // Prevent unbounded growth if API is down
      eventBuffer = eventBuffer.slice(-200);
    }
  }
}

// ── Tab Tracking ───────────────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!config.enabled || !config.trackTabPatterns) return;

  const now = Date.now() / 1000;
  lastActiveTabId = activeTabId;
  activeTabId = activeInfo.tabId;

  // Record tab switch timestamp
  tabSwitchTimestamps.push(now);
  // Keep only last 60 seconds of switch timestamps
  tabSwitchTimestamps = tabSwitchTimestamps.filter((t) => now - t < 60);

  // Calculate reading time for the tab we just left
  if (lastActiveTabId && tabState[lastActiveTabId]) {
    const prev = tabState[lastActiveTabId];
    const duration = now - (prev.activatedAt || now);
    if (duration > 2 && duration < 3600 && config.trackReadingTime) {
      queueEvent(
        createEvent(
          "READING_TIME",
          {
            title: prev.title,
            url: prev.url,
            domain: prev.domain,
            duration,
          },
          {
            reading_seconds: Math.round(duration),
            scroll_depth: prev.scrollDepth || 0,
          }
        )
      );
    }
  }

  // Get info about newly activated tab
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      tabState[activeInfo.tabId] = {
        url: tab.url,
        title: tab.title || "",
        domain: extractDomain(tab.url),
        activatedAt: now,
        scrollDepth: 0,
      };

      // Detect search queries
      if (config.trackSearches) {
        const search = isSearchUrl(tab.url);
        if (search) {
          queueEvent(
            createEvent(
              "SEARCH_QUERY",
              { title: tab.title, url: tab.url, domain: extractDomain(tab.url) },
              { query: search.query, search_engine: search.engine }
            )
          );
        }
      }
    }
  } catch {}

  // Detect tab hopping (5+ switches in 60 seconds)
  if (tabSwitchTimestamps.length >= 5) {
    queueEvent(
      createEvent(
        "TAB_HOPPING",
        {},
        { switches_per_minute: tabSwitchTimestamps.length }
      )
    );
  }
});

// Tab updated (navigation within a tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!config.enabled) return;
  if (changeInfo.status !== "complete" || !tab.url) return;

  const now = Date.now() / 1000;
  const domain = extractDomain(tab.url);

  tabState[tabId] = {
    url: tab.url,
    title: tab.title || "",
    domain,
    activatedAt: tabState[tabId]?.activatedAt || now,
    scrollDepth: 0,
  };

  // Detect search queries on navigation
  if (config.trackSearches && tabId === activeTabId) {
    const search = isSearchUrl(tab.url);
    if (search) {
      queueEvent(
        createEvent(
          "SEARCH_QUERY",
          { title: tab.title, url: tab.url, domain },
          { query: search.query, search_engine: search.engine }
        )
      );
    }
  }
});

// Tab closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabState[tabId];
});

// ── Bookmark Tracking ──────────────────────────────────────────────────────

chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  if (!config.enabled || !config.trackBookmarks) return;

  queueEvent(
    createEvent(
      "BOOKMARK_ADDED",
      {
        title: bookmark.title,
        url: bookmark.url,
        domain: bookmark.url ? extractDomain(bookmark.url) : null,
      },
      { bookmark_id: id }
    )
  );
});

// ── Content Script Messages ────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SCROLL_DEPTH" && sender.tab) {
    const tabId = sender.tab.id;
    if (tabState[tabId]) {
      tabState[tabId].scrollDepth = Math.max(
        tabState[tabId].scrollDepth || 0,
        message.depth
      );
    }
  }

  if (message.type === "PAGE_INTERACTION") {
    queueEvent(
      createEvent(message.eventType, message.context, message.metadata)
    );
  }

  sendResponse({ ok: true });
});

// ── Idle Detection ─────────────────────────────────────────────────────────

chrome.idle.setDetectionInterval(300); // 5 minutes
chrome.idle.onStateChanged.addListener((state) => {
  if (!config.enabled) return;

  if (state === "idle" || state === "locked") {
    // End reading time for current tab
    const now = Date.now() / 1000;
    if (activeTabId && tabState[activeTabId]) {
      const prev = tabState[activeTabId];
      const duration = now - (prev.activatedAt || now);
      if (duration > 5 && config.trackReadingTime) {
        queueEvent(
          createEvent(
            "READING_TIME",
            {
              title: prev.title,
              url: prev.url,
              domain: prev.domain,
              duration,
            },
            {
              reading_seconds: Math.round(duration),
              scroll_depth: prev.scrollDepth || 0,
              ended_by: state,
            }
          )
        );
      }
    }
    // Flush buffer on idle
    flushEvents();
  }

  if (state === "active") {
    // Reset activation time for current tab
    if (activeTabId && tabState[activeTabId]) {
      tabState[activeTabId].activatedAt = Date.now() / 1000;
    }
  }
});

// ── Periodic Flush ─────────────────────────────────────────────────────────

chrome.alarms.create("pbspFlush", { periodInMinutes: 0.17 }); // ~10 seconds

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pbspFlush") {
    flushEvents();
  }
});

// ── History Search (on-demand, not continuous) ─────────────────────────────

async function getRecentHistory(hours = 24) {
  const since = Date.now() - hours * 3600 * 1000;
  return new Promise((resolve) => {
    chrome.history.search(
      { text: "", startTime: since, maxResults: 500 },
      (results) => resolve(results || [])
    );
  });
}

// Expose for popup/options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_STATUS") {
    sendResponse({
      enabled: config.enabled,
      buffered: eventBuffer.length,
      tabCount: Object.keys(tabState).length,
      switches: tabSwitchTimestamps.length,
    });
    return true;
  }

  if (message.type === "GET_HISTORY") {
    getRecentHistory(message.hours || 24).then((history) => {
      sendResponse({ history });
    });
    return true;
  }
});

console.log("PBSP Browser Extension loaded");
