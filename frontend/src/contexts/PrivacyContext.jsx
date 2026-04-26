import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { _setPrivacyMode } from '../lib/formatBRL';

// PrivacyContext — masks all monetary values behind a placeholder when active.
//
// Persistence: localStorage key `finance.privacy`. Last state is restored on
// boot so the user does not have to re-enable it every session.
//
// Keyboard shortcut: pressing `h` (hide) anywhere outside an editable element
// flips the flag. This is the same idea as the "olho" toggle on banking apps,
// but driven from the keyboard for desktop ergonomics.
//
// Side-effect: flipping calls `_setPrivacyMode` so that the module-level flag
// in lib/formatBRL.js stays in sync. Components that cache formatter results
// (Recharts configs, memoised closures) must rely on the `key={...}` remount
// applied higher in the tree.

const STORAGE_KEY = 'finance.privacy';

function readInitial() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const PrivacyContext = createContext(null);

export function PrivacyProvider({ children }) {
  const [isPrivate, setState] = useState(() => {
    const initial = readInitial();
    _setPrivacyMode(initial);
    return initial;
  });

  const setPrivate = useCallback((next) => {
    const v = !!next;
    _setPrivacyMode(v);
    setState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    } catch {
      // Ignore storage failures (private mode, quota, etc.).
    }
  }, []);

  const toggle = useCallback(() => {
    setPrivate(!isPrivate);
  }, [isPrivate, setPrivate]);

  // Keep the formatBRL flag aligned even if some other code path flipped it.
  useEffect(() => {
    _setPrivacyMode(isPrivate);
  }, [isPrivate]);

  // Keyboard shortcut: `h` toggles privacy when not typing in a field.
  useEffect(() => {
    function isEditable(el) {
      if (!el) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      return el.isContentEditable === true;
    }
    function onKey(e) {
      if (e.key !== 'h' && e.key !== 'H') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;
      e.preventDefault();
      toggle();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  const value = useMemo(() => ({
    isPrivate,
    toggle,
    setPrivate,
  }), [isPrivate, toggle, setPrivate]);

  return (
    <PrivacyContext.Provider value={value}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (ctx === null) {
    throw new Error('usePrivacy must be used inside <PrivacyProvider>');
  }
  return ctx;
}

export const __PRIVACY_STORAGE_KEY = STORAGE_KEY;
