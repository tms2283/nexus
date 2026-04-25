import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Zap,
  ChevronDown,
  Brain,
  Network,
  Settings2,
  Target,
  BarChart3,
  Trophy,
  BookOpen,
  Search,
  Flame,
  GraduationCap,
  TrendingUp,
  User,
  BookMarked,
  Layers,
  ShieldCheck,
  MonitorCog,
  LogOut,
  PenSquare,
  Sun,
  Moon,
  Sparkles,
  Contrast,
} from "lucide-react";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEditMode } from "@/contexts/EditModeContext";
import { useTheme } from "@/contexts/ThemeContext";

const navLinks = [
  { href: "/app", label: "Home" },
  { href: "/learn", label: "Learn" },
  { href: "/research", label: "Research" },
  { href: "/depth", label: "Depth" },
  { href: "/library", label: "Library" },
  { href: "/lab", label: "Lab" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const toolsLinks = [
  {
    href: "/flashcards",
    label: "Flashcards",
    Icon: Brain,
    desc: "Spaced repetition",
  },
  {
    href: "/mindmap",
    label: "Mind Maps",
    Icon: Network,
    desc: "Visual concept maps",
  },
  {
    href: "/settings",
    label: "AI Settings",
    Icon: Settings2,
    desc: "Provider & API keys",
  },
  {
    href: "/testing",
    label: "Testing Center",
    Icon: Target,
    desc: "Assess your knowledge",
  },
  {
    href: "/dashboard",
    label: "My Progress",
    Icon: BarChart3,
    desc: "Track your learning",
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    Icon: Trophy,
    desc: "Global XP rankings",
  },
  {
    href: "/study-buddy",
    label: "Study Buddy",
    Icon: BookOpen,
    desc: "AI-powered tutoring",
  },
  {
    href: "/daily",
    label: "Daily Challenge",
    Icon: Flame,
    desc: "Today's AI challenge",
  },
  {
    href: "/ai-literacy",
    label: "AI Literacy Course",
    Icon: GraduationCap,
    desc: "Module 1 - Intro to AI",
  },
  {
    href: "/ai-by-ai",
    label: "AI by AI",
    Icon: Sparkles,
    desc: "A course about AI, written by AI",
  },
  {
    href: "/learn/my-profile",
    label: "My Learner Profile",
    Icon: User,
    desc: "How adaptive lessons are tuned for you",
  },
  {
    href: "/progress",
    label: "Progress",
    Icon: TrendingUp,
    desc: "Your learning stats",
  },
  {
    href: "/reading-list",
    label: "Reading List",
    Icon: BookMarked,
    desc: "Saved resources",
  },
  {
    href: "/skills",
    label: "Skill Tree",
    Icon: Layers,
    desc: "Your skill mastery",
  },
  {
    href: "/profile",
    label: "Profile",
    Icon: User,
    desc: "Your account & preferences",
  },
  {
    href: "/admin",
    label: "Web Admin Lite",
    Icon: ShieldCheck,
    desc: "Operations and publishing controls",
  },
  {
    href: "/studio",
    label: "Desktop Studio",
    Icon: MonitorCog,
    desc: "Draft sync and conflict workspace",
  },
];

export default function Navigation() {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const { profile } = usePersonalization();
  const { user, isGuest, logout } = useAuth();
  const { isEditMode, toggleEditMode } = useEditMode();
  const { theme, toggleTheme, switchable, displayMode, toggleDisplayMode } = useTheme();
  const toolsRef = useRef<HTMLDivElement>(null);
  const canEdit = user?.role === "admin";
  const isDarkTheme = theme === "dark";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setToolsOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isToolsActive = toolsLinks.some(t => location === t.href);

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          scrolled
            ? "glass-strong border-b border-white/5 shadow-2xl shadow-black/50"
            : "bg-transparent"
        }`}
      >
        <div className="container flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <motion.div
              className="flex items-center gap-2 cursor-pointer group"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-sm">N</span>
                </div>
              </div>
              <span className="font-bold text-lg tracking-tight text-gradient-gold">
                Nexus
              </span>
            </motion.div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              const isActive = location === link.href;
              return (
                <Link key={link.href} href={link.href}>
                  <motion.div
                    className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? "text-[oklch(0.85_0.18_55)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-lg bg-[oklch(0.75_0.18_55_/_0.12)] border border-[oklch(0.75_0.18_55_/_0.25)]"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.4,
                        }}
                      />
                    )}
                    <span className="relative z-10">{link.label}</span>
                  </motion.div>
                </Link>
              );
            })}

            {/* Tools dropdown */}
            <div ref={toolsRef} className="relative">
              <motion.button
                onClick={() => setToolsOpen(o => !o)}
                className={`flex items-center gap-1 relative px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  isToolsActive
                    ? "text-[oklch(0.85_0.18_55)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isToolsActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-[oklch(0.75_0.18_55_/_0.12)] border border-[oklch(0.75_0.18_55_/_0.25)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">Tools</span>
                <motion.div
                  animate={{ rotate: toolsOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative z-10"
                >
                  <ChevronDown size={14} />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {toolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-52 glass-strong rounded-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
                  >
                    {toolsLinks.map(({ href, label, Icon, desc }) => {
                      const isActive = location === href;
                      return (
                        <Link key={href} href={href}>
                          <div
                            className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${isActive ? "bg-[oklch(0.75_0.18_55_/_0.12)]" : "hover:bg-white/5"}`}
                          >
                            <div className="p-1.5 rounded-lg bg-violet-500/10">
                              <Icon size={14} className="text-violet-400" />
                            </div>
                            <div>
                              <p
                                className={`text-sm font-medium ${isActive ? "text-[oklch(0.85_0.18_55)]" : "text-foreground"}`}
                              >
                                {label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {desc}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Ctrl/Cmd+K search button */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={toggleDisplayMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                displayMode === "focus"
                  ? "border-[oklch(0.65_0.22_200_/_0.4)] bg-[oklch(0.65_0.22_200_/_0.1)] text-[oklch(0.75_0.2_200)]"
                  : "border-border/70 bg-card/80 text-muted-foreground hover:text-foreground hover:border-ring/40 hover:bg-card"
              }`}
              aria-label={displayMode === "focus" ? "Switch to Glass mode" : "Switch to Focus mode"}
              title={displayMode === "focus" ? "Glass mode (default)" : "Focus mode (high contrast)"}
            >
              <Contrast size={12} />
              <span>{displayMode === "focus" ? "Glass" : "Focus"}</span>
            </button>
            {switchable && (
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/70 bg-card/80 text-xs text-muted-foreground hover:text-foreground hover:border-ring/40 hover:bg-card transition-colors"
                aria-label={`Switch to ${isDarkTheme ? "light" : "dark"} mode`}
                title={`Switch to ${isDarkTheme ? "light" : "dark"} mode`}
              >
                {isDarkTheme ? <Sun size={12} /> : <Moon size={12} />}
                <span>{isDarkTheme ? "Light" : "Dark"} Mode</span>
              </button>
            )}

            {canEdit && (
              <button
                onClick={toggleEditMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                  isEditMode
                    ? "border-[oklch(0.75_0.18_55_/_0.45)] bg-[oklch(0.75_0.18_55_/_0.18)] text-[oklch(0.85_0.18_55)]"
                    : "bg-white/5 border-white/8 text-muted-foreground hover:bg-white/8 hover:text-foreground"
                }`}
              >
                <PenSquare size={12} />
                {isEditMode ? "Editing" : "Edit Mode"}
              </button>
            )}

            <button
              onClick={() => {
                const event = new KeyboardEvent("keydown", {
                  key: "k",
                  metaKey: true,
                  ctrlKey: true,
                  bubbles: true,
                });
                window.dispatchEvent(event);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-xs text-muted-foreground hover:bg-white/8 hover:text-foreground transition-all group"
            >
              <Search size={12} />
              <span>Search</span>
              <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/8 text-[10px] font-mono group-hover:bg-white/12 transition-colors">
                Ctrl/Cmd+K
              </kbd>
            </button>
          </div>

          {/* XP indicator + user info + mobile menu */}
          <div className="flex items-center gap-3">
            {profile.xp > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-[10px] opacity-50 hover:opacity-80 transition-opacity"
                title={`${profile.xp} XP · Level ${profile.level}`}
              >
                <Zap size={9} className="text-[oklch(0.75_0.18_55)]" />
                <span className="text-muted-foreground font-medium">
                  Lv.{profile.level}
                </span>
              </motion.div>
            )}

            {/* User avatar / guest indicator */}
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name ?? ""}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[oklch(0.75_0.18_55_/_0.2)] flex items-center justify-center">
                      <User size={12} className="text-[oklch(0.75_0.18_55)]" />
                    </div>
                  )}
                  <span className="text-xs text-foreground font-medium max-w-[80px] truncate">
                    {user.name ?? user.email}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
                  title="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : isGuest ? (
              <Link
                href="/register"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
              >
                <User size={12} />
                Sign Up
              </Link>
            ) : null}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-30 glass-strong border-b border-white/5 md:hidden"
          >
            <div className="container py-4 flex flex-col gap-1">
              {navLinks.map(link => {
                const isActive = location === link.href;
                return (
                  <Link key={link.href} href={link.href}>
                    <div
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[oklch(0.75_0.18_55_/_0.12)] text-[oklch(0.85_0.18_55)] border border-[oklch(0.75_0.18_55_/_0.2)]"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }`}
                    >
                      {link.label}
                    </div>
                  </Link>
                );
              })}
              <div className="border-t border-white/5 mt-2 pt-2">
                <p className="text-xs text-muted-foreground px-4 py-1 uppercase tracking-widest">
                  Tools
                </p>
                {toolsLinks.map(({ href, label, Icon, desc }) => {
                  const isActive = location === href;
                  return (
                    <Link key={href} href={href}>
                      <div
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? "bg-[oklch(0.75_0.18_55_/_0.12)] text-[oklch(0.85_0.18_55)]" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
                      >
                        <Icon size={16} className="text-violet-400" />
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs opacity-60">{desc}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <button
              onClick={toggleDisplayMode}
              className={`mt-3 w-full flex items-center gap-2 px-4 py-3 rounded-lg border text-sm transition-colors ${
                displayMode === "focus"
                  ? "border-[oklch(0.65_0.22_200_/_0.4)] bg-[oklch(0.65_0.22_200_/_0.1)] text-[oklch(0.75_0.2_200)]"
                  : "border-border/70 bg-card/70 text-foreground hover:bg-card"
              }`}
            >
              <Contrast size={15} />
              {displayMode === "focus" ? "Switch to Glass Mode" : "Switch to Focus Mode (high contrast)"}
            </button>
            {switchable && (
              <button
                onClick={toggleTheme}
                className="mt-2 w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border/70 bg-card/70 text-sm text-foreground hover:bg-card transition-colors"
                aria-label={`Switch to ${isDarkTheme ? "light" : "dark"} mode`}
              >
                <span className="flex items-center gap-2">
                  {isDarkTheme ? <Sun size={15} /> : <Moon size={15} />}
                  {isDarkTheme ? "Switch to Light Mode" : "Switch to Dark Mode"}
                </span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
