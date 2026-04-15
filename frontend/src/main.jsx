import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import Dashboard from './Dashboard.jsx';
import Login from './Login.jsx';
import { isLoggedIn } from './api.js';

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  return loggedIn
    ? <Dashboard />
    : <Login onLogin={() => setLoggedIn(true)} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
