import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Login from './Login.jsx';
import { isLoggedIn } from './api.js';
import { ThemeProvider, useTheme } from './contexts/ThemeContext.jsx';

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

function Root() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  return loggedIn
    ? <App />
    : <Login onLogin={() => setLoggedIn(true)} />;
}

// Wrapping Root in a remounting shell so the entire tree refreshes when the
// theme mode flips. Necessary because many memoised closures (Recharts
// configs, tooltip styles, inline style objects) capture token values on
// first render. PR-U1 landed the nav shell (Sidebar/TopBar/BottomNav) — the
// `key={mode}` remount decision still stands because the tab feature code
// continues to read from the `color` proxy directly.
function ThemedApp() {
  const { mode } = useTheme();
  return <Root key={mode} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </React.StrictMode>
);
