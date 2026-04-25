import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, Zap, Brain, Settings2, Target, BarChart3, Trophy,
  BookOpen, Search, Flame, GraduationCap, TrendingUp, User,
  BookMarked, Layers, LogOut, PenSquare, Sun, Moon, Sparkles,
  FlaskConical, Network, Code2, ChevronRight, MessageSquare,
  Lightbulb, Home, Library, Map,
} from "lucide-react";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEditMode } from "@/contexts/EditModeContext";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Navigation structure: 4 clear sections ──────────────────────────────────
const NAV_SECTIONS = [
  {
    label: "Learn",
    href: "/learn",
    items: [
      { href: "/learn", label: "Learning Paths", icon: GraduationCap, desc: "AI Mastery, Critical Thinking, and more" },
      { href: "/depth", label: "Depth Engine", icon: Layers, desc: "Any concept explained at 5 levels of depth" },
      { href: "/study-buddy", label: "Study Buddy", icon: MessageSquare, desc: "AI tutoring on demand" },
      { href: "/ai-by-ai", label: "AI by AI", icon: Sparkles, desc: "A course about AI, written by AI" },
    ],
  },
  {
    label: "Practice",
    href: "/testing",
    items: [
      { href: "/testing", label: "Testing Center", icon: Target, desc: "Assess and measure your knowledge" },
      { href: "/flashcards", label: "Flashcards", icon: BookOpen, desc: "Spaced repetition system" },
      { href: "/daily", label: "Daily Challenge", icon: Flame, desc: "5-question challenge, fresh every day" },
      { href: "/mindmap", label: "Mind Maps", icon: Network, desc: "Visual concept mapping tool" },
      { href: "/lab", label: "The Lab", icon: Code2, desc: "Interactive coding challenges" },
    ],
  },
  {
    label: "Explore",
    href: "/research",
    items: [
      { href: "/research", label: "Research Forge", icon: FlaskConical, desc: "Document intelligence & summarization" },
      { href: "/library", label: "Knowledge Library", icon: Library, desc: "Curated resources with AI context" },
      { href: "/about", label: "About Nexus", icon: Map, desc: "What this platform is and why it exists" },
      { href: "/contact", label: "Contact", icon: MessageSquare, desc: "Get in touch" },
    ],
  },
  {
    label: "My Nexus",
    href: "/dashboard",
    items: [
      { href: "/dashboard", label: "My Progress", icon: BarChart3, desc: "XP, streaks, and performance trends" },
      { href: "/progress", label: "Stats", icon: TrendingUp, desc: "Detailed learning statistics" },
      { href: "/skills", label: "Skill Tree", icon: Layers, desc: "Your knowledge mastery map" },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy, desc: "Global XP rankings" },
      { href: "/reading-list", label: "Reading List", icon: BookMarked, desc: "Saved resources" },
      { href: "/profile", label: "Profile", icon: User, desc: "Account and preferences" },
      { href: "/settings", label: "AI Settings", icon: Settings2, desc: "Provider & API keys" },
    ],
  },
];

// Mobile bottom tab bar (5 tabs)
const MOBILE_TABS = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/learn", label: "Learn", icon: GraduationCap },
  { href: "/testing", label: "Practice", icon: Target },
  { href: "/research", label: "Explore", icon: FlaskConical },
  { href: "/dashboard", label: "My Nexus", icon: User },
];

export default function Navigation() {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const { profile } = usePersonalization();
  const { user, isGuest, logout } = useAuth();
  const { isEditMode, toggleEditMode } = useEditMode();
  const { theme, toggleTheme, switchable } = useTheme();
  const canEdit = user?.role === "admin";
  const isDarkTheme = theme === "dark";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpenSection(null); setMobileMenuOpen(false); }, [location]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenSection(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const activeSectionLabel = NAV_SECTIONS.find(section =>
    location === section.href || section.items.some(item => location.startsWith(item.href) && item.href.length > 1)
  )?.label ?? null;

  return (
    <>
      {/* ── Top nav bar ────────────────────────────────────────────────────── */}
      <motion.nav
        ref={navRef}
        initial={{ y: -56, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
        style={{
          height: "56px",
          background: scrolled ? "oklch(0.09 0.010 255 / 0.96)" : "transparent",
          borderBottom: scrolled ? "1px solid oklch(0.20 0.016 255)" : "1px solid transparent",
          boxShadow: scrolled ? "0 1px 24px oklch(0 0 0 / 0.22)" : "none",
          backdropFilter: scrolled ? "blur(24px) saturate(160%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(24px) saturate(160%)" : "none",
        }}
      >
        <div className="section-container flex items-center justify-between h-full">
          {/* Logo */}
          <Link href="/app">
            <motion.div className="flex items-center gap-2 cursor-pointer" whileHover={{ opacity: 0.82 }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.78 0.16 52)" }}>
                <span style={{ color: "oklch(0.09 0.010 255)", fontWeight: 700, fontSize: "13px", lineHeight: 1 }}>N</span>
              </div>
              <span className="font-semibold text-[0.9375rem] tracking-tight text-foreground">
                Nex<span style={{ color: "oklch(0.78 0.16 52)" }}>us</span>
              </span>
            </motion.div>
          </Link>

          {/* Desktop nav sections */}
          <div className="hidden md:flex items-center">
            {NAV_SECTIONS.map(section => {
              const isActive = activeSectionLabel === section.label;
              const isOpen = openSection === section.label;
              return (
                <div key={section.label} className="relative">
                  <button
                    onClick={() => setOpenSection(isOpen ? null : section.label)}
                    onMouseEnter={() => setOpenSection(section.label)}
                    className="relative flex items-center px-3.5 text-sm font-medium transition-colors duration-150"
                    style={{
                      height: "56px",
                      color: isActive ? "oklch(0.92 0.008 255)" : "oklch(0.55 0.010 255)",
                    }}
                    onMouseLeave={(e) => {
                      // Only close if not hovering the dropdown
                      const related = e.relatedTarget as Node;
                      if (!navRef.current?.contains(related)) setOpenSection(null);
                    }}
                  >
                    {section.label}
                    {/* Active bottom indicator */}
                    {isActive && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-2 right-2 rounded-t-sm"
                        style={{ height: "2px", background: "oklch(0.78 0.16 52)" }}
                        transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                      />
                    )}
                  </button>

                  {/* Mega menu panel */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.985 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                        onMouseEnter={() => setOpenSection(section.label)}
                        onMouseLeave={() => setOpenSection(null)}
                        className="absolute top-full left-0 mt-0.5 w-72 rounded-xl overflow-hidden z-50"
                        style={{
                          background: "oklch(0.12 0.012 255)",
                          border: "1px solid oklch(0.22 0.016 255)",
                          boxShadow: "0 16px 48px oklch(0 0 0 / 0.42), 0 0 0 1px oklch(0.14 0.012 255)",
                        }}
                      >
                        <div className="p-1.5">
                          {section.items.map(item => {
                            const Icon = item.icon;
                            const itemActive = location === item.href;
                            return (
                              <Link key={item.href} href={item.href}>
                                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                                  style={{ background: itemActive ? "oklch(0.78 0.16 52 / 0.10)" : "transparent" }}
                                  onMouseEnter={e => { if (!itemActive) (e.currentTarget as HTMLElement).style.background = "oklch(0.16 0.014 255)"; }}
                                  onMouseLeave={e => { if (!itemActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: itemActive ? "oklch(0.78 0.16 52 / 0.18)" : "oklch(0.16 0.014 255)" }}>
                                    <Icon size={13} style={{ color: itemActive ? "oklch(0.88 0.16 52)" : "oklch(0.52 0.010 255)" }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium" style={{ color: itemActive ? "oklch(0.88 0.16 52)" : "oklch(0.88 0.008 255)" }}>{item.label}</p>
                                    <p className="text-xs truncate" style={{ color: "oklch(0.46 0.010 255)" }}>{item.desc}</p>
                                  </div>
                                  {itemActive && <ChevronRight size={12} style={{ color: "oklch(0.78 0.16 52)" }} className="shrink-0" />}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true }))}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
              style={{ color: "oklch(0.46 0.010 255)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "oklch(0.88 0.008 255)"; (e.currentTarget as HTMLElement).style.background = "oklch(0.15 0.014 255)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "oklch(0.46 0.010 255)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Search size={13} />
              <span className="hidden lg:inline">Search</span>
              <kbd className="hidden lg:flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ background: "oklch(0.16 0.014 255)", border: "1px solid oklch(0.22 0.016 255)", color: "oklch(0.46 0.010 255)" }}>
                ⌘K
              </kbd>
            </button>

            {/* XP pill */}
            {profile.xp > 0 && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                style={{ border: "1px solid oklch(0.78 0.16 52 / 0.25)", background: "oklch(0.78 0.16 52 / 0.08)" }}>
                <Zap size={10} style={{ color: "oklch(0.78 0.16 52)" }} />
                <span style={{ color: "oklch(0.88 0.16 52)" }} className="font-semibold">{profile.xp}</span>
                <span style={{ color: "oklch(0.46 0.010 255)" }}>xp</span>
              </div>
            )}

            {/* Theme toggle */}
            {switchable && (
              <button onClick={toggleTheme} aria-label="Toggle theme"
                className="p-2 rounded-lg transition-all"
                style={{ color: "oklch(0.46 0.010 255)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "oklch(0.88 0.008 255)"; (e.currentTarget as HTMLElement).style.background = "oklch(0.15 0.014 255)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "oklch(0.46 0.010 255)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                {isDarkTheme ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            )}

            {/* Edit mode (admin) */}
            {canEdit && (
              <button onClick={toggleEditMode}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                style={isEditMode
                  ? { background: "oklch(0.78 0.16 52 / 0.14)", color: "oklch(0.88 0.16 52)", border: "1px solid oklch(0.78 0.16 52 / 0.35)" }
                  : { color: "oklch(0.46 0.010 255)", border: "1px solid transparent" }
                }
                onMouseEnter={e => { if (!isEditMode) (e.currentTarget as HTMLElement).style.background = "oklch(0.15 0.014 255)"; }}
                onMouseLeave={e => { if (!isEditMode) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <PenSquare size={12} />{isEditMode ? "Editing" : "Edit"}
              </button>
            )}

            {/* User */}
            {user ? (
              <div className="hidden sm:flex items-center gap-0.5">
                <Link href="/profile">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "oklch(0.15 0.014 255)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name ?? ""} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                        style={{ background: "oklch(0.78 0.16 52 / 0.18)", color: "oklch(0.78 0.16 52)" }}>
                        {(user.name ?? user.email ?? "U")[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-medium max-w-[72px] truncate hidden lg:block" style={{ color: "oklch(0.78 0.008 255)" }}>
                      {user.name ?? user.email}
                    </span>
                  </div>
                </Link>
                <button onClick={logout} title="Sign out"
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: "oklch(0.46 0.010 255)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "oklch(0.88 0.008 255)"; (e.currentTarget as HTMLElement).style.background = "oklch(0.15 0.014 255)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "oklch(0.46 0.010 255)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <LogOut size={13} />
                </button>
              </div>
            ) : isGuest ? (
              <Link href="/register">
                <div className="hidden sm:flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  style={{ background: "oklch(0.78 0.16 52)", color: "oklch(0.09 0.010 255)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "oklch(0.82 0.16 52)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "oklch(0.78 0.16 52)"}>
                  Sign Up
                </div>
              </Link>
            ) : null}

            {/* Mobile hamburger (for full menu — bottom tabs handle primary nav) */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg transition-all"
              style={{ color: "oklch(0.46 0.010 255)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "oklch(0.15 0.014 255)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ── Mobile full-screen menu ───────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-0 top-14 z-30 md:hidden overflow-y-auto"
            style={{
              maxHeight: "calc(100vh - 56px - 60px)",
              background: "oklch(0.09 0.010 255 / 0.98)",
              borderBottom: "1px solid oklch(0.20 0.016 255)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="p-4 space-y-4">
              {NAV_SECTIONS.map(section => (
                <div key={section.label}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] px-2 mb-2"
                    style={{ color: "oklch(0.38 0.010 255)" }}>
                    {section.label}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map(item => {
                      const Icon = item.icon;
                      const isActive = location === item.href;
                      return (
                        <Link key={item.href} href={item.href}>
                          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                            style={{
                              background: isActive ? "oklch(0.78 0.16 52 / 0.10)" : "transparent",
                              color: isActive ? "oklch(0.88 0.16 52)" : "oklch(0.62 0.010 255)",
                            }}>
                            <Icon size={15} />
                            <div>
                              <p className="text-sm font-medium">{item.label}</p>
                              <p className="text-xs" style={{ color: "oklch(0.42 0.010 255)" }}>{item.desc}</p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Bottom controls in mobile menu */}
              <div className="pt-2 border-t" style={{ borderColor: "oklch(0.18 0.014 255)" }}>
                {switchable && (
                  <button onClick={toggleTheme}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors"
                    style={{ color: "oklch(0.58 0.010 255)" }}>
                    {isDarkTheme ? <Sun size={15} /> : <Moon size={15} />}
                    {isDarkTheme ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  </button>
                )}
                {user && (
                  <button onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors"
                    style={{ color: "oklch(0.58 0.010 255)" }}>
                    <LogOut size={15} />Sign Out
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile bottom tab bar ─────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-1"
        style={{
          height: "60px",
          background: "oklch(0.10 0.012 255 / 0.98)",
          borderTop: "1px solid oklch(0.18 0.014 255)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {MOBILE_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = location === tab.href || (tab.href !== "/app" && location.startsWith(tab.href));
          return (
            <Link key={tab.href} href={tab.href}>
              <div className="flex flex-col items-center gap-0.5 px-3 py-1 cursor-pointer">
                <Icon size={20} style={{ color: isActive ? "oklch(0.78 0.16 52)" : "oklch(0.42 0.010 255)" }} />
                <span className="text-[9px] font-semibold tracking-wide"
                  style={{ color: isActive ? "oklch(0.78 0.16 52)" : "oklch(0.42 0.010 255)" }}>
                  {tab.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
