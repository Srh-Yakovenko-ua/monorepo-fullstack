import { useCallback, useEffect, useState } from "react";

export type ResolvedTheme = "dark" | "light";
export type Theme = "dark" | "light" | "system";

const STORAGE_KEY = "monorepo-theme";
const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStored);
  const [systemDark, setSystemDark] = useState<boolean>(readSystemIsDark);

  const resolvedTheme: ResolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    applyTheme(resolvedTheme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [resolvedTheme, theme]);

  useEffect(() => {
    const mql = window.matchMedia(SYSTEM_QUERY);
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);

  return { resolvedTheme, setTheme, theme };
}

function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
}

function readStored(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function readSystemIsDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia(SYSTEM_QUERY).matches;
}
