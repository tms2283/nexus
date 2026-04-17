import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

type TrackerState = {
  keystrokes: number;
  backspaces: number;
  pauseCount: number;
  totalBurstLength: number;
  burstCount: number;
  activeFieldCount: number;
  lastKeyAt: number;
  focusStartedAt: number;
  seenFields: Set<string>;
};

function createState(): TrackerState {
  return {
    keystrokes: 0,
    backspaces: 0,
    pauseCount: 0,
    totalBurstLength: 0,
    burstCount: 0,
    activeFieldCount: 0,
    lastKeyAt: 0,
    focusStartedAt: Date.now(),
    seenFields: new Set<string>(),
  };
}

function isTrackableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  if (target instanceof HTMLInputElement) {
    const type = target.type?.toLowerCase();
    return !["password", "hidden"].includes(type);
  }

  return (
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

export function usePsychSignalTracker(enabled: boolean) {
  const mutation = trpc.psych.recordTypingSummary.useMutation();
  const stateRef = useRef<TrackerState>(createState());

  useEffect(() => {
    if (!enabled) return;

    stateRef.current = createState();

    const flush = () => {
      const state = stateRef.current;
      if (state.keystrokes === 0 && state.backspaces === 0) return;

      mutation.mutate({
        path: window.location.pathname,
        focusSeconds: Math.max(
          0,
          Math.round((Date.now() - state.focusStartedAt) / 1000)
        ),
        keystrokes: state.keystrokes,
        backspaces: state.backspaces,
        pauseCount: state.pauseCount,
        averageBurstLength:
          state.burstCount > 0
            ? Number((state.totalBurstLength / state.burstCount).toFixed(2))
            : 0,
        activeFieldCount: state.activeFieldCount,
      });

      stateRef.current = createState();
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (!isTrackableTarget(event.target)) return;

      const now = Date.now();
      const state = stateRef.current;

      if (state.lastKeyAt > 0 && now - state.lastKeyAt > 1500) {
        state.pauseCount += 1;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        state.backspaces += 1;
      } else if (event.key.length === 1 || event.key === "Enter" || event.key === "Tab") {
        state.keystrokes += 1;
      } else {
        return;
      }

      state.lastKeyAt = now;
      state.totalBurstLength += 1;
      state.burstCount += 1;

      const target = event.target as HTMLElement;
      const fieldKey =
        target.getAttribute("name") ||
        target.getAttribute("id") ||
        target.tagName.toLowerCase();

      if (!state.seenFields.has(fieldKey)) {
        state.seenFields.add(fieldKey);
        state.activeFieldCount = state.seenFields.size;
      }
    };

    const intervalId = window.setInterval(flush, 45000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const handlePageHide = () => flush();

    window.addEventListener("keydown", handleKeydown, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.clearInterval(intervalId);
      flush();
      window.removeEventListener("keydown", handleKeydown, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [enabled, mutation]);
}
