import React, { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from './hooks/usePullToRefresh.js';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import { color, fonts } from './theme/tokens';
import { t } from './i18n';
import { MonthProvider } from './contexts/MonthContext.jsx';
import { NavProvider, useNav } from './contexts/NavContext.jsx';
import { useTheme } from './contexts/ThemeContext.jsx';
import { Sidebar, MobileTopBar, BottomNav } from './components/nav';
import Mes from './features/mes';
import Resumo from './features/resumo';
import Ano from './features/ano';
import Plano from './features/plano';
import Fluxo from './features/fluxo-reformado';
import Orcamento from './features/orcamento';
import Previsao from './features/previsao';
import Patrimonio from './features/patrimonio';
import Transacoes from './features/transacoes';

// ── Pull-to-refresh indicator ──────────────────────────────────────────
// Remains above every nav surface (z-index 1000 > BottomNav 200). Uses
// the `color` proxy intentionally — it captures token values on render
// but the whole tree remounts when the theme flips (see main.jsx).
function PullIndicator({ pullState, pullDistance }) {
  if (pullState === 'idle') return null;

  const labels = {
    pulling: t('pull.pulling'),
    ready: t('pull.ready'),
    refreshing: t('pull.refreshing'),
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '10px 0',
      background: `linear-gradient(to bottom, ${color.bg.card} 0%, transparent 100%)`,
      color: pullState === 'ready' ? color.accent.primary : color.text.muted,
      fontSize: 13,
      fontFamily: fonts.jakarta.body,
      transform: `translateY(${pullState === 'refreshing' ? 0 : pullDistance - 40}px)`,
      opacity: pullState === 'refreshing' ? 1 : Math.min(pullDistance / 60, 1),
      transition: pullState === 'refreshing' ? 'transform 0.2s ease' : 'none',
      pointerEvents: 'none',
    }}>
      <RefreshCw
        size={16}
        style={{
          animation: pullState === 'refreshing' ? 'spin 1s linear infinite' : 'none',
          transform: pullState === 'ready' ? 'rotate(180deg)' : `rotate(${pullDistance * 2}deg)`,
          transition: pullState === 'ready' ? 'transform 0.15s ease' : 'none',
        }}
      />
      {labels[pullState]}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────
// `NavProvider` / `useNav` moved to contexts/NavContext.jsx in PR-F3.
// The nav shell (Sidebar / BottomNav / MobileTopBar) landed in PR-U1.
export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const doRefresh = useCallback(() => {
    return new Promise(resolve => {
      // Small delay so the API has time to re-fetch and the indicator is visible
      setRefreshKey(k => k + 1);
      setTimeout(resolve, 600);
    });
  }, []);

  const { pullDistance, pullState } = usePullToRefresh(doRefresh, 80);

  return (
    <MonthProvider refreshKey={refreshKey}>
      <NavProvider>
        <PullIndicator pullState={pullState} pullDistance={pullDistance} />
        <AppInner />
      </NavProvider>
    </MonthProvider>
  );
}

function TabRoutes() {
  const { activeTab } = useNav();
  // NOTE: Portuguese-with-diacritics tab IDs are load-bearing — NavContext
  // defines them verbatim and renaming is out of scope for PR-U1.
  return (
    <>
      {activeTab === 'resumo' && <Resumo />}
      {activeTab === 'mês' && <Mes />}
      {activeTab === 'ano' && <Ano />}
      {activeTab === 'plano' && <Plano />}
      {activeTab === 'fluxo' && <Fluxo />}
      {activeTab === 'orçamento' && <Orcamento />}
      {activeTab === 'previsão' && <Previsao />}
      {activeTab === 'patrimônio' && <Patrimonio />}
      {activeTab === 'transações' && <Transacoes />}
    </>
  );
}

function AppInner() {
  const { tokens } = useTheme();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Global styles. Card / tab / grid helpers preserved from pre-PR-U1 so
  // the feature tabs keep rendering unchanged while the nav shell lands.
  const globalStyles = `
    @keyframes spin { to { transform: rotate(360deg); } }
    * { box-sizing: border-box; margin: 0; }
    body { background: ${tokens.bg.page}; }
    .serif { font-family: 'Instrument Serif', Georgia, serif; }
    .sans { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
    .card { background: ${tokens.bg.card}; border: 1px solid ${tokens.border.default}; border-radius: 4px; padding: 24px; }
    .tab { padding: 10px 16px; cursor: pointer; border: none; background: transparent; color: ${tokens.text.muted}; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 2px solid transparent; transition: all 0.15s; }
    .tab:hover { color: ${tokens.text.secondary}; }
    .tab.active { color: ${tokens.accent.primary}; border-bottom-color: ${tokens.accent.primary}; }
    .grid { display: grid; gap: 20px; }
    .crow { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid ${tokens.border.default}; cursor: pointer; transition: background 0.12s; }
    .crow:hover { background: ${tokens.bg.hover}; margin: 0 -24px; padding: 14px 24px; }
    .crow:last-child { border-bottom: none; }
    @media (min-width: 900px) { .g3 { grid-template-columns: 2fr 1fr; } }
  `;

  const pageBase = {
    minHeight: '100vh',
    background: tokens.bg.page,
    color: tokens.text.primary,
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  };

  if (isDesktop) {
    return (
      <div style={{ ...pageBase, display: 'flex', alignItems: 'stretch' }}>
        <style>{globalStyles}</style>
        <Sidebar />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: '28px 32px',
            overflowX: 'hidden',
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <TabRoutes />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ ...pageBase, display: 'flex', flexDirection: 'column' }}>
      <style>{globalStyles}</style>
      <MobileTopBar />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: '16px 16px 0',
          paddingBottom: 'calc(58px + env(safe-area-inset-bottom, 0px) + 16px)',
        }}
      >
        <TabRoutes />
      </main>
      <BottomNav />
    </div>
  );
}
