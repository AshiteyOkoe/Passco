import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  dark: boolean;
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

function getSystemDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('passco-theme-mode') as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
      const legacy = localStorage.getItem('passco-theme');
      if (legacy) return legacy === 'dark' ? 'dark' : 'light';
    }
    return 'system';
  });

  const [systemDark, setSystemDark] = useState(getSystemDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  const dark = mode === 'system' ? systemDark : mode === 'dark';

  useEffect(() => {
    const resolved = mode === 'system' ? systemDark : mode === 'dark';
    const root = document.documentElement;
    root.classList.toggle('dark', resolved);
    localStorage.setItem('passco-theme-mode', mode);
    localStorage.setItem('passco-theme', resolved ? 'dark' : 'light');
  }, [mode, systemDark]);

  const toggle = useCallback(() => {
    setModeState((prev) =>
      prev === 'dark' || (prev === 'system' && getSystemDark()) ? 'light' : 'dark'
    );
  }, []);

  const setMode = useCallback((m: ThemeMode) => setModeState(m), []);

  return (
    <ThemeContext.Provider value={{ dark, mode, toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}