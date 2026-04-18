/**
 * PBSP Content Script — injected into every page.
 *
 * Tracks scroll depth and time-on-page for reading time estimation.
 * Does NOT capture page content, form inputs, or any text the user types.
 */

(function () {
  "use strict";

  let maxScrollDepth = 0;
  let scrollTimeout = null;

  // Track scroll depth as a percentage of total page height
  function updateScrollDepth() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll > 0) {
      const depth = Math.round((scrollTop / maxScroll) * 100);
      if (depth > maxScrollDepth) {
        maxScrollDepth = depth;
      }
    }
  }

  // Throttled scroll handler
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        updateScrollDepth();
        scrollTimeout = null;
      }, 500);
    },
    { passive: true }
  );

  // Report scroll depth periodically and before unload
  function reportScrollDepth() {
    if (maxScrollDepth > 0) {
      try {
        chrome.runtime.sendMessage({
          type: "SCROLL_DEPTH",
          depth: maxScrollDepth,
        });
      } catch {
        // Extension context may be invalidated
      }
    }
  }

  // Report every 30 seconds if the user is scrolling
  setInterval(reportScrollDepth, 30_000);

  // Report on page unload
  window.addEventListener("beforeunload", reportScrollDepth);

  // Report on visibility change (tab switch)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      reportScrollDepth();
    }
  });

  // Initial measurement
  updateScrollDepth();
})();
