import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type DisplayMode = "glass" | "focus";

const THEME_STORAGE_KEY = "nexus-theme";
const DISPLAY_STORAGE_KEY = "nexus-display-mode";

const isTheme = (value: string | null): value is Theme =>
  value === "light" || value === "dark";

const isDisplayMode = (value: string | null): value is DisplayMode =>
  value === "glass" || value === "focus";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
  displayMode: DisplayMode;
  toggleDisplayMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (!switchable) return defaultTheme;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : defaultTheme;
  });

  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    const stored = localStorage.getItem(DISPLAY_STORAGE_KEY);
    return isDisplayMode(stored) ? stored : "glass";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.style.colorScheme = theme;
    if (switchable) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme, switchable]);

  useEffect(() => {
    const root = document.documentElement;
    if (displayMode === "focus") {
      root.classList.add("focus-mode");
    } else {
      root.classList.remove("focus-mode");
    }
    localStorage.setItem(DISPLAY_STORAGE_KEY, displayMode);
  }, [displayMode]);

  const toggleTheme = switchable
    ? () => setTheme(prev => (prev === "light" ? "dark" : "light"))
    : undefined;

  const toggleDisplayMode = () =>
    setDisplayMode(prev => (prev === "glass" ? "focus" : "glass"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable, displayMode, toggleDisplayMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
