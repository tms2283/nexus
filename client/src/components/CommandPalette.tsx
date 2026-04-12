import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, BookOpen, Search, Library, FlaskConical, Info, Mail,
  Brain, Network, Settings2, Target, BarChart3, Trophy, Zap,
  GraduationCap, Map, Lightbulb, X, ArrowRight, Keyboard
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
  keywords?: string[];
}

// ─── Keyboard Shortcut Overlay ────────────────────────────────────────────────
function ShortcutOverlay({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: ["⌘", "K"], desc: "Open command palette" },
    { keys: ["?"], desc: "Show keyboard shortcuts" },
    { keys: ["Esc"], desc: "Close dialog / cancel" },
    { keys: ["↑", "↓"], desc: "Navigate command palette" },
    { keys: ["↵"], desc: "Select / confirm" },
    { keys: ["⌘", "←"], desc: "Go back" },
    { keys: ["/"], desc: "Focus search (when available)" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15 }}
        className="bg-[oklch(0.14_0.02_265)] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-[oklch(0.65_0.22_200)]" />
            <span className="text-sm font-semibold text-foreground">Keyboard Shortcuts</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-2">
          {shortcuts.map(({ keys, desc }) => (
            <div key={desc} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">{desc}</span>
              <div className="flex items-center gap-1">
                {keys.map((k, i) => (
                  <kbd key={i} className="px-2 py-0.5 rounded bg-white/8 border border-white/10 text-xs font-mono text-foreground/80">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-white/8 text-center">
          <span className="text-[10px] text-muted-foreground/50">Press <kbd className="px-1 py-0.5 rounded bg-white/8 font-mono text-[10px]">?</kbd> or <kbd className="px-1 py-0.5 rounded bg-white/8 font-mono text-[10px]">Esc</kbd> to close</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Command Palette ─────────────────────────────────────────────────────
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const goto = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, [navigate]);

  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    { id: "home", label: "Home", description: "Back to the main page", icon: <Home size={16} />, action: () => goto("/"), category: "Navigate", keywords: ["start", "main"] },
    { id: "learn", label: "Learn", description: "AI learning paths & curriculum", icon: <GraduationCap size={16} />, action: () => goto("/learn"), category: "Navigate", keywords: ["course", "path", "curriculum"] },
    { id: "research", label: "Research Forge", description: "AI-powered deep research", icon: <Search size={16} />, action: () => goto("/research"), category: "Navigate", keywords: ["research", "analyze", "forge"] },
    { id: "depth", label: "Depth Engine", description: "Deep-dive topic exploration", icon: <Lightbulb size={16} />, action: () => goto("/depth"), category: "Navigate", keywords: ["depth", "explore", "deep"] },
    { id: "library", label: "Library", description: "AI knowledge resources", icon: <Library size={16} />, action: () => goto("/library"), category: "Navigate", keywords: ["books", "resources", "knowledge"] },
    { id: "lab", label: "AI Lab", description: "Hands-on AI experiments", icon: <FlaskConical size={16} />, action: () => goto("/lab"), category: "Navigate", keywords: ["experiments", "lab", "hands-on"] },
    { id: "about", label: "About", description: "About the Nexus platform", icon: <Info size={16} />, action: () => goto("/about"), category: "Navigate" },
    { id: "contact", label: "Contact", description: "Get in touch", icon: <Mail size={16} />, action: () => goto("/contact"), category: "Navigate" },
    // Tools
    { id: "flashcards", label: "Flashcards", description: "Spaced repetition learning", icon: <Brain size={16} />, action: () => goto("/flashcards"), category: "Tools", keywords: ["flash", "cards", "memory", "spaced"] },
    { id: "mindmap", label: "Mind Maps", description: "Visual concept mapping", icon: <Network size={16} />, action: () => goto("/mindmap"), category: "Tools", keywords: ["mind", "map", "visual", "concept"] },
    { id: "testing", label: "Testing Center", description: "Knowledge assessments & IQ test", icon: <Target size={16} />, action: () => goto("/testing"), category: "Tools", keywords: ["test", "quiz", "iq", "assess"] },
    { id: "study-buddy", label: "Study Buddy", description: "AI tutor & adaptive quizzing", icon: <BookOpen size={16} />, action: () => goto("/study-buddy"), category: "Tools", keywords: ["tutor", "study", "quiz", "adaptive"] },
    { id: "dashboard", label: "My Progress", description: "Track your learning journey", icon: <BarChart3 size={16} />, action: () => goto("/dashboard"), category: "Tools", keywords: ["progress", "stats", "charts", "scores"] },
    { id: "leaderboard", label: "Leaderboard", description: "Global XP rankings", icon: <Trophy size={16} />, action: () => goto("/leaderboard"), category: "Tools", keywords: ["rank", "top", "xp", "global"] },
    { id: "settings", label: "AI Settings", description: "Configure AI providers & API keys", icon: <Settings2 size={16} />, action: () => goto("/settings"), category: "Tools", keywords: ["api", "key", "provider", "config"] },
    // Quick actions
    { id: "iq-test", label: "Take IQ Test", description: "Start the full IQ assessment", icon: <Zap size={16} />, action: () => goto("/testing"), category: "Quick Actions", keywords: ["iq", "intelligence", "test"] },
    { id: "new-research", label: "Start Research Session", description: "Open Research Forge", icon: <Search size={16} />, action: () => goto("/research"), category: "Quick Actions", keywords: ["research", "new", "start"] },
    { id: "new-mindmap", label: "Create Mind Map", description: "Open the Mind Map builder", icon: <Map size={16} />, action: () => goto("/mindmap"), category: "Quick Actions", keywords: ["mind", "map", "create", "new"] },
    { id: "shortcuts", label: "Keyboard Shortcuts", description: "View all keyboard shortcuts", icon: <Keyboard size={16} />, action: () => { setOpen(false); setShowShortcuts(true); }, category: "Quick Actions", keywords: ["keyboard", "hotkey", "shortcut"] },
  ], [goto]);

  const filtered = useMemo(() => query.trim()
    ? commands.filter(cmd => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.category.toLowerCase().includes(q) ||
          cmd.keywords?.some(k => k.includes(q))
        );
      })
    : commands, [commands, query]);

  const grouped = useMemo(() => filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {}), [filtered]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => Object.values(grouped).flat(), [grouped]);

  // Reset selection when query changes
  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${selectedIndex}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Open/close palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery("");
        setSelectedIndex(0);
        return;
      }
      // Show shortcuts overlay
      if (!open && e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }
      if (e.key === "Escape") {
        if (open) { setOpen(false); setQuery(""); setSelectedIndex(0); }
        if (showShortcuts) setShowShortcuts(false);
        return;
      }
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flatItems[selectedIndex];
        if (item) item.action();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, showShortcuts, flatItems, selectedIndex]);

  // Track flat index across groups
  let flatIdx = 0;

  return (
    <>
      <AnimatePresence>
        {showShortcuts && <ShortcutOverlay onClose={() => setShowShortcuts(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
              onClick={() => { setOpen(false); setQuery(""); setSelectedIndex(0); }}
            />
            {/* Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed top-[15vh] left-1/2 -translate-x-1/2 w-full max-w-xl z-[201] px-4"
            >
              <div className="bg-[oklch(0.14_0.02_265)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
                  <Search size={16} className="text-muted-foreground shrink-0" />
                  <input
                    ref={inputRef}
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search pages, tools, actions..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  {query && (
                    <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X size={14} />
                    </button>
                  )}
                  <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/8 text-[10px] text-muted-foreground font-mono">
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
                  {Object.keys(grouped).length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No results for "{query}"
                    </div>
                  ) : (
                    Object.entries(grouped).map(([category, items]) => (
                      <div key={category} className="mb-1">
                        <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          {category}
                        </div>
                        {items.map(item => {
                          const idx = flatIdx++;
                          const isSelected = idx === selectedIndex;
                          return (
                            <button
                              key={item.id}
                              data-idx={idx}
                              onClick={item.action}
                              onMouseEnter={() => setSelectedIndex(idx)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors group text-left ${isSelected ? "bg-white/8" : "hover:bg-white/5"}`}
                            >
                              <span className={`transition-colors shrink-0 ${isSelected ? "text-[oklch(0.75_0.18_265)]" : "text-muted-foreground group-hover:text-[oklch(0.75_0.18_265)]"}`}>
                                {item.icon}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground">{item.label}</div>
                                {item.description && (
                                  <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                                )}
                              </div>
                              <ArrowRight size={12} className={`transition-colors shrink-0 ${isSelected ? "text-muted-foreground" : "text-muted-foreground/40 group-hover:text-muted-foreground"}`} />
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-white/8 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/50">
                    {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded bg-white/8 font-mono">↑↓</kbd> navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded bg-white/8 font-mono">↵</kbd> select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded bg-white/8 font-mono">?</kbd> shortcuts
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
