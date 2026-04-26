import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Login from './Login.jsx';
import { isLoggedIn, fetchAuthMode } from './api.js';
import { ThemeProvider, useTheme } from './contexts/ThemeContext.jsx';
import { PrivacyProvider, usePrivacy } from './contexts/PrivacyContext.jsx';
import { color } from './theme/tokens';
import { t } from './i18n';

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

// Boot state machine:
//   'loading'     — waiting on /api/auth/mode (PR-AS3)
//   'needsLogin'  — either auth is required and no token, or mode fetch failed
//   'ready'       — render <App /> (no auth, or logged in)
//
// Failing closed to 'needsLogin' on mode fetch failure is intentional: if the
// mode endpoint is broken, the rest of the API is almost certainly broken too,
// and showing an open app over a dead backend would recreate the inverse of
// the "protected-app illusion" bug this PR fixes.
function Root() {
  const [state, setState] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    fetchAuthMode()
      .then((info) => {
        if (cancelled) return;
        if (info && info.required === false) {
          setState('ready');
        } else {
          setState(isLoggedIn() ? 'ready' : 'needsLogin');
        }
      })
      .catch(() => {
        if (!cancelled) setState('needsLogin');
      });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') {
    const loadingStyles = {
      wrapper: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: color.bg.pageAlt,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      text: {
        color: color.text.secondary,
        fontSize: '0.9rem',
      },
    };
    return (
      <div style={loadingStyles.wrapper}>
        <div style={loadingStyles.text}>{t('auth.loading')}</div>
      </div>
    );
  }

  if (state === 'needsLogin') {
    return <Login onLogin={() => setState('ready')} />;
  }

  return <App />;
}

// Wrapping Root in a remounting shell so the entire tree refreshes when the
// theme mode flips. Necessary because many memoised closures (Recharts
// configs, tooltip styles, inline style objects) capture token values on
// first render. PR-U1 landed the nav shell (Sidebar/TopBar/BottomNav) — the
// `key={mode}` remount decision still stands because the tab feature code
// continues to read from the `color` proxy directly.
//
// The `/api/auth/mode` boot fetch inside Root re-runs on theme flip — that's
// fine; the endpoint is cheap and unauthenticated.
function ThemedApp() {
  const { mode } = useTheme();
  const { isPrivate } = usePrivacy();
  // Privacy mode is part of the remount key for the same reason as theme:
  // many BRL formatter calls run inside memoised closures (Recharts configs,
  // feature-tab inline styles) that cache the formatted string. Flipping
  // privacy must invalidate those caches, and the cheapest correct way is
  // to remount the tree below the providers.
  return <Root key={`${mode}:${isPrivate ? 'p' : 'o'}`} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <PrivacyProvider>
        <ThemedApp />
      </PrivacyProvider>
    </ThemeProvider>
  </React.StrictMode>
);
