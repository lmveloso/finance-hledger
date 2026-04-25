import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { _setActiveMode, getModeTokens } from '../theme/tokens';

// ThemeContext — dual-mode (dark / light) theme state for Fase U.
//
// Exposes:
//   { mode, tokens, toggle, setMode }
//
// Persistence:
//   - localStorage key `finance.theme`.
//   - First-load precedence:
//       1. value stored under `finance.theme`
//       2. fallback `'light'` — light is the system default; users opt in
//          to dark via the toggle, which then persists for them.
//   - The OS `prefers-color-scheme` is intentionally ignored: the project
//     decides its own default surface and lets the user override.
//
// Side-effect: flipping the mode also calls `_setActiveMode(mode)` on the
// tokens module so that the live `color` proxy resolves against the new
// palette. Components that cache token values (Recharts configs, closures)
// must either call `useTheme()` and re-derive on `mode` change, or rely on
// the `key={mode}` remount wrapper applied higher up in the tree.

const STORAGE_KEY = 'finance.theme';

function readInitialMode() {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // localStorage can throw in private-mode / sandboxed iframes — fall through.
  }
  return 'light';
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    const initial = readInitialMode();
    _setActiveMode(initial);
    return initial;
  });

  const setMode = useCallback((next) => {
    if (next !== 'dark' && next !== 'light') {
      throw new Error(`ThemeProvider.setMode: invalid mode "${next}"`);
    }
    _setActiveMode(next);
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures (private mode, quota, etc.).
    }
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  // Ensure the tokens module matches the provider's state even if some
  // other code path flipped `_activeMode` between renders.
  useEffect(() => {
    _setActiveMode(mode);
  }, [mode]);

  const value = useMemo(() => ({
    mode,
    tokens: getModeTokens(mode),
    toggle,
    setMode,
  }), [mode, toggle, setMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}

// Exposed for tests.
export const __THEME_STORAGE_KEY = STORAGE_KEY;
