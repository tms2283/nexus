import { useEffect, useRef } from 'react';
import { trpc } from '../../lib/trpc';

export function BehavioralTracker() {
  const trackEvent = trpc.behavioral.trackEvent.useMutation();
  const lastScrollTime = useRef(Date.now());
  const clickCount = useRef(0);

  useEffect(() => {
    // Track page views and focus
    trackEvent.mutate({
      type: "SESSION_START",
      source: "browser",
      context: {
        url: window.location.href,
        domain_category: "nexus",
        app: "Nexus Web"
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        trackEvent.mutate({
          type: "CONTEXT_ESCAPE",
          source: "browser",
          confidence: 0.8,
          context: {
            url: window.location.href,
            domain_category: "nexus"
          }
        });
      } else {
        trackEvent.mutate({
          type: "SESSION_START",
          source: "browser",
          confidence: 0.8,
          context: {
            url: window.location.href,
            domain_category: "nexus"
          }
        });
      }
    };

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollTime.current > 2000) {
        lastScrollTime.current = now;
        trackEvent.mutate({
          type: "NEXUS_CONTENT_SCROLLED",
          source: "browser",
          confidence: 0.7,
          context: { url: window.location.href }
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Never track clicks on form inputs — avoids re-renders that break focus
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;

      clickCount.current += 1;
      // Identify CTA clicks
      if (tag === 'BUTTON' || target.closest('button') || tag === 'A') {
        trackEvent.mutate({
          type: "NEXUS_CTA_CLICKED",
          source: "browser",
          confidence: 1.0,
          context: { url: window.location.href },
          metadata: { text: target.innerText?.substring(0, 50) }
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClick);
      
      trackEvent.mutate({
        type: "SESSION_END",
        source: "browser",
        context: { url: window.location.href }
      });
    };
  }, []);

  return null; // Invisible tracking component
}
