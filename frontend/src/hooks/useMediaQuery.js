import { useEffect, useState } from 'react';

// Reactive wrapper around `window.matchMedia` for responsive layouts.
//
// Usage:
//   const isDesktop = useMediaQuery('(min-width: 768px)');
//
// SSR-safe: returns `true` (desktop-first) when `window.matchMedia` is not
// available at first render. On the client the initial render still reads
// the real query synchronously so there is no "flash of wrong layout".
//
// Introduced in PR-U1 to drive the sidebar-vs-bottom-nav swap in App.jsx.

export function useMediaQuery(query) {
  const getMatch = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mql = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    // Sync in case the query changed between initial render and effect.
    setMatches(mql.matches);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Safari < 14 fallback.
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}
