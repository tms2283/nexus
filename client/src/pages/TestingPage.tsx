/**
 * TestingPage — unified Testing + Labs page with top-level tabs:
 *   Challenge   → Daily AI Challenge (top) + Coding Challenges (below)
 *   Experiments → AI Experiment lab
 *   Tests       → IQ / knowledge / aptitude tests
 */

import { useState } from "react";
import { Suspense } from "react";
import PageWrapper from "@/components/PageWrapper";
import { DailyCore } from "@/pages/Daily";
import { LabCore } from "@/pages/Lab";
import { TestingCore } from "@/pages/TestingCenter";
import { Flame, FlaskConical, Brain } from "lucide-react";

type UnifiedTab = "challenge" | "experiments" | "tests";

const TABS: [UnifiedTab, typeof Flame, string][] = [
  ["challenge",    Flame,        "⚡ Challenge"],
  ["experiments",  FlaskConical, "🧪 Experiments"],
  ["tests",        Brain,        "🧠 Tests"],
];

function TabSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[oklch(0.65_0.22_200)] border-t-transparent animate-spin" />
    </div>
  );
}

export default function TestingPage() {
  const [activeTab, setActiveTab] = useState<UnifiedTab>("challenge");

  return (
    <PageWrapper pageName="testing">
      <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)", paddingTop: "4rem" }}>
        {/* ── Tab bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-0.5 sm:gap-1 border-b border-white/10 bg-[rgba(5,7,16,0.95)] px-2 sm:px-4 py-2 flex-none overflow-x-auto">
          {TABS.map(([tab, , label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                activeTab === tab
                  ? "bg-[oklch(0.72_0.18_200_/_0.18)] text-[oklch(0.83_0.15_200)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ──────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {activeTab === "challenge" && (
            <div className="flex flex-1 flex-col overflow-auto">
              {/* Daily Challenge section */}
              <div className="border-b border-white/10">
                <DailyCore />
              </div>
              {/* Coding Challenges section */}
              <div className="flex-1">
                <div className="px-6 pt-6 pb-2">
                  <h2 className="text-xl font-bold text-foreground mb-1">Coding Challenges</h2>
                  <p className="text-sm text-muted-foreground">Sharpen your JavaScript skills. Solve challenges to earn XP.</p>
                </div>
                <LabCore initialSection="challenges" hideSectionTabs={true} />
              </div>
            </div>
          )}

          {activeTab === "experiments" && (
            <Suspense fallback={<TabSkeleton />}>
              <LabCore initialSection="experiments" hideSectionTabs={true} />
            </Suspense>
          )}

          {activeTab === "tests" && (
            <Suspense fallback={<TabSkeleton />}>
              <TestingCore />
            </Suspense>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
