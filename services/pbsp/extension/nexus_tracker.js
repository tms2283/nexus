/**
 * PBSP Nexus Tracker — content script injected only on the Nexus domain.
 *
 * Built specifically for the Nexus 2042 SPA (Vite + React, Wouter router,
 * hash-based section navigation). Captures the behavioral signals that
 * reveal how users engage with and respond to Nexus content:
 *
 *   • Which sections they visit and in what order
 *   • How long they dwell in each section
 *   • Which CTAs, nav links, and pricing tiers they interact with
 *   • Email signup intent and completion
 *   • Card hover patterns (which features resonate)
 *   • Scroll depth milestones
 *
 * Privacy: no text typed into forms is captured — only interaction patterns
 * (focus, blur, submission success). No page content is extracted.
 *
 * Events are forwarded to background.js via PAGE_INTERACTION messages,
 * which the service worker batches and POSTs to the PBSP API as
 * NEXUS_* MarkerType events.
 */

(function () {
  "use strict";

  // ── Helpers ──────────────────────────────────────────────────────────────

  function now() {
    return Date.now() / 1000;
  }

  function send(eventType, metadata = {}) {
    try {
      chrome.runtime.sendMessage({
        type: "PAGE_INTERACTION",
        eventType,
        context: {
          app: "browser",
          url: location.href,
          domain: location.hostname,
          domain_category: "nexus",
          window_title: document.title,
        },
        metadata,
      });
    } catch {
      // Extension context may be invalidated; silently ignore
    }
  }

  // ── Section definitions ───────────────────────────────────────────────────
  // Maps hash / element ID to a human-readable label used in event metadata.

  const SECTIONS = {
    "":              "home",
    "protocol":      "protocol",
    "grid":          "nexus-grid",
    "consciousness": "consciousness",
    "nodes":         "nodes",
    "interface":     "interface",
  };

  // ── Section dwell-time tracking ───────────────────────────────────────────

  const sectionEnteredAt = {}; // sectionId -> timestamp

  function currentHash() {
    return location.hash.replace(/^#/, "");
  }

  function onSectionEnter(sectionId) {
    const label = SECTIONS[sectionId] || sectionId;
    sectionEnteredAt[sectionId] = now();
    send("NEXUS_SECTION_VIEWED", { section: label, hash: sectionId || "home" });
  }

  function onSectionLeave(sectionId) {
    if (!sectionEnteredAt[sectionId]) return;
    const dwell = Math.round(now() - sectionEnteredAt[sectionId]);
    if (dwell < 1) return; // sub-second transitions aren't meaningful
    const label = SECTIONS[sectionId] || sectionId;
    send("NEXUS_SECTION_TIME", { section: label, dwell_seconds: dwell });
    delete sectionEnteredAt[sectionId];
  }

  // Track initial section on load
  let activeSection = currentHash();
  onSectionEnter(activeSection);

  // Hash-change fires when nav links scroll to a section anchor
  window.addEventListener("hashchange", () => {
    const prev = activeSection;
    const next = currentHash();
    if (prev !== next) {
      onSectionLeave(prev);
      activeSection = next;
      onSectionEnter(next);
    }
  });

  // ── IntersectionObserver: track sections scrolled into view ──────────────
  // Nexus uses #id anchors for sections. We observe each section element and
  // fire section-viewed when >40% is visible (handles tall viewports).

  const sectionLastFired = {};

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = entry.target.id || "";
        if (!id) continue;
        if (entry.isIntersecting) {
          // Debounce: don't re-fire within 5 seconds for the same section
          const lastFired = sectionLastFired[id] || 0;
          if (now() - lastFired > 5) {
            sectionLastFired[id] = now();
            sectionEnteredAt[id] = sectionEnteredAt[id] || now();
            const label = SECTIONS[id] || id;
            send("NEXUS_SECTION_VIEWED", {
              section: label,
              hash: id,
              scroll_triggered: true,
            });
          }
        } else if (sectionEnteredAt[id]) {
          const dwell = Math.round(now() - sectionEnteredAt[id]);
          if (dwell >= 2) {
            const label = SECTIONS[id] || id;
            send("NEXUS_SECTION_TIME", { section: label, dwell_seconds: dwell });
          }
          delete sectionEnteredAt[id];
        }
      }
    },
    { threshold: 0.4 }
  );

  // Observe all section elements once DOM is ready
  function observeSections() {
    Object.keys(SECTIONS).forEach((id) => {
      if (!id) return;
      const el = document.getElementById(id);
      if (el) sectionObserver.observe(el);
    });
  }
  observeSections();
  // Re-observe after React renders (SPA may not have elements immediately)
  setTimeout(observeSections, 1000);

  // ── Scroll depth milestones ───────────────────────────────────────────────

  const scrollMilestonesFired = new Set();

  window.addEventListener(
    "scroll",
    () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const pct = Math.round((scrollTop / scrollHeight) * 100);
      for (const milestone of [25, 50, 75, 100]) {
        if (pct >= milestone && !scrollMilestonesFired.has(milestone)) {
          scrollMilestonesFired.add(milestone);
          send("NEXUS_SCROLL_MILESTONE", { depth_percent: milestone });
        }
      }
    },
    { passive: true }
  );

  // ── Navigation link tracking ──────────────────────────────────────────────
  // Nexus nav links are <a href="#section"> anchors. We capture which link
  // was clicked so we can map navigation intent vs. scroll discovery.

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href^='#'], nav a");
    if (!link) return;
    const target = (link.getAttribute("href") || "").replace(/^#/, "");
    const label = SECTIONS[target] || target || "unknown";
    send("NEXUS_NAV_CLICKED", {
      target_section: label,
      link_text: link.textContent.trim().slice(0, 50),
      is_mobile_menu: !!link.closest("[data-mobile-menu], .mobile-menu"),
    });
  });

  // ── CTA button tracking ───────────────────────────────────────────────────
  // Covers: "Enter the Nexus", "Learn the Protocol", "Connect", pricing CTAs.

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const text = btn.textContent.trim().slice(0, 60);
    const section = activeSection || currentHash();
    const label = SECTIONS[section] || section;

    // Identify pricing tier buttons by proximity to tier card
    const tierCard = btn.closest("[data-tier], .pricing-card, .tier-card");
    const tierName = tierCard
      ? tierCard.dataset.tier ||
        tierCard.querySelector("h3, h2, [class*='tier']")?.textContent?.trim()?.slice(0, 30)
      : null;

    send("NEXUS_CTA_CLICKED", {
      button_text: text,
      section: label,
      tier: tierName || null,
      is_pricing_cta: !!tierCard,
    });
  });

  // ── Pricing section view tracking ─────────────────────────────────────────
  // Track which pricing tier cards enter the viewport and for how long.

  const pricingTierEnteredAt = {};

  function attachPricingObserver() {
    // Target the three tier cards in the Interface section
    const tierSelectors = [
      "[data-tier]",
      ".pricing-card",
      ".tier-card",
      // Fallback: children of the pricing grid in #interface
      "#interface > div > div > div, #interface section > div > div",
    ];

    const tierEls = document.querySelectorAll(tierSelectors.join(", "));
    if (!tierEls.length) return;

    const tierObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const tierName =
            entry.target.dataset.tier ||
            entry.target.querySelector("h3, h2")?.textContent?.trim()?.slice(0, 30) ||
            "unknown";

          if (entry.isIntersecting) {
            pricingTierEnteredAt[tierName] = now();
            send("NEXUS_PRICING_VIEWED", { tier: tierName });
          } else if (pricingTierEnteredAt[tierName]) {
            const dwell = Math.round(now() - pricingTierEnteredAt[tierName]);
            if (dwell >= 1) {
              send("NEXUS_PRICING_VIEWED", { tier: tierName, dwell_seconds: dwell });
            }
            delete pricingTierEnteredAt[tierName];
          }
        }
      },
      { threshold: 0.5 }
    );

    tierEls.forEach((el) => tierObserver.observe(el));
  }

  setTimeout(attachPricingObserver, 1500);

  // ── Card hover tracking ───────────────────────────────────────────────────
  // Protocol cards, testimonial cards, and capability cards all use hover
  // animations. Sustained hover (>600ms) signals real interest.

  const cardHoverStart = new WeakMap();

  document.addEventListener("mouseover", (e) => {
    const card = e.target.closest(
      ".quantum-glass, [class*='card'], [class*='Card'], " +
      "[class*='protocol'], [class*='Protocol']"
    );
    if (!card || cardHoverStart.has(card)) return;
    cardHoverStart.set(card, now());
  });

  document.addEventListener("mouseout", (e) => {
    const card = e.target.closest(
      ".quantum-glass, [class*='card'], [class*='Card'], " +
      "[class*='protocol'], [class*='Protocol']"
    );
    if (!card || !cardHoverStart.has(card)) return;

    const dwell = now() - cardHoverStart.get(card);
    cardHoverStart.delete(card);

    if (dwell < 0.6) return; // ignore brief mouse-overs

    const section = activeSection || currentHash();
    const cardTitle =
      card.querySelector("h3, h2, h4, [class*='title']")?.textContent?.trim()?.slice(0, 50) || null;

    send("NEXUS_CARD_HOVERED", {
      section: SECTIONS[section] || section,
      card_title: cardTitle,
      dwell_seconds: Math.round(dwell * 10) / 10,
    });
  });

  // ── Email signup tracking ─────────────────────────────────────────────────
  // The Interface section has an email input + "Sync" button. We track:
  //   - Focus (interest), interaction duration, and submission.
  // We never capture the email address itself.

  let emailFocusedAt = null;

  document.addEventListener(
    "focusin",
    (e) => {
      if (e.target.type === "email" || e.target.placeholder?.toLowerCase().includes("mind@")) {
        emailFocusedAt = now();
        send("NEXUS_EMAIL_SIGNUP", { event: "focus" });
      }
    },
    true
  );

  document.addEventListener(
    "focusout",
    (e) => {
      if (
        emailFocusedAt &&
        (e.target.type === "email" || e.target.placeholder?.toLowerCase().includes("mind@"))
      ) {
        const dwell = Math.round(now() - emailFocusedAt);
        send("NEXUS_EMAIL_SIGNUP", { event: "blur", focus_duration_seconds: dwell });
        emailFocusedAt = null;
      }
    },
    true
  );

  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (!form.querySelector('input[type="email"]')) return;
    const emailInput = form.querySelector('input[type="email"]');
    const hasValue = emailInput && emailInput.value.trim().length > 0;
    send("NEXUS_EMAIL_SIGNUP", {
      event: "submit",
      has_email: hasValue,
    });
  });

  // Also catch click on the "Sync" button (Nexus may use a button-type submit)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const text = btn.textContent.trim().toLowerCase();
    if (text === "sync" || text === "subscribe" || text === "connect") {
      // Check if it's near an email input
      const form = btn.closest("form") || btn.parentElement;
      if (form && form.querySelector('input[type="email"]')) {
        send("NEXUS_EMAIL_SIGNUP", { event: "sync_button_clicked" });
      }
    }
  });

  // ── Learning feature hooks (forward compatibility) ────────────────────────
  // When Nexus adds lessons, videos, and quizzes, the tracker auto-activates
  // these handlers. No code changes needed in the extension.

  // Video player detection (future)
  function attachVideoListeners(video) {
    video.addEventListener("pause", () => {
      send("NEXUS_VIDEO_PAUSED", {
        position_seconds: Math.round(video.currentTime),
        duration_seconds: Math.round(video.duration) || null,
      });
    });
    video.addEventListener("seeked", () => {
      send("NEXUS_VIDEO_REWOUND", {
        position_seconds: Math.round(video.currentTime),
      });
    });
    video.addEventListener("ended", () => {
      send("NEXUS_VIDEO_COMPLETED", {
        duration_seconds: Math.round(video.duration) || null,
      });
    });
  }
  document.querySelectorAll("video").forEach(attachVideoListeners);
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === "VIDEO") attachVideoListeners(node);
        node.querySelectorAll?.("video").forEach(attachVideoListeners);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Lesson start/complete detection (future — triggered by data attributes)
  document.addEventListener("click", (e) => {
    const lessonStart = e.target.closest("[data-lesson-id][data-action='start']");
    if (lessonStart) {
      send("NEXUS_LESSON_STARTED", {
        lesson_id: lessonStart.dataset.lessonId,
        course_id: lessonStart.dataset.courseId || null,
        topic_tags: lessonStart.dataset.topics?.split(",").map((t) => t.trim()) || [],
        difficulty: parseInt(lessonStart.dataset.difficulty, 10) || null,
        content_type: lessonStart.dataset.contentType || "lesson",
      });
    }

    const lessonComplete = e.target.closest(
      "[data-complete-lesson], .complete-lesson, [data-action='complete-lesson']"
    );
    if (lessonComplete) {
      send("NEXUS_LESSON_COMPLETED", {
        lesson_id: lessonComplete.dataset.lessonId || null,
        content_type: lessonComplete.dataset.contentType || "lesson",
      });
    }

    const rec = e.target.closest("[data-recommendation-id], [data-rec-id]");
    if (rec) {
      send("NEXUS_RECOMMENDATION_CLICKED", {
        recommendation_id: rec.dataset.recommendationId || rec.dataset.recId || null,
        lesson_id: rec.dataset.lessonId || null,
      });
    }
  });

  // In-site search (future search bar)
  document.addEventListener("input", (e) => {
    const target = e.target;
    if (
      target.tagName !== "INPUT" ||
      !target.closest("[data-search], [placeholder*='Search'], [placeholder*='search']")
    )
      return;
    clearTimeout(target._nexusSearchTimer);
    target._nexusSearchTimer = setTimeout(() => {
      const query = target.value.trim();
      if (query.length > 2) {
        send("NEXUS_SEARCH_PERFORMED", { query_length: query.length });
      }
    }, 600);
  });

  // ── Cleanup on page unload ────────────────────────────────────────────────

  window.addEventListener("beforeunload", () => {
    const section = activeSection || currentHash();
    if (sectionEnteredAt[section]) {
      onSectionLeave(section);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      const section = activeSection || currentHash();
      onSectionLeave(section);
    } else {
      const section = activeSection || currentHash();
      onSectionEnter(section);
    }
  });
})();
