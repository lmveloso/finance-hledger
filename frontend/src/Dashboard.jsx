import React, { useState, useCallback } from 'react';
import { ChevronRight, ChevronLeft, CalendarDays, RefreshCw } from 'lucide-react';
import { usePullToRefresh } from './hooks/usePullToRefresh.js';
import { color } from './theme/tokens';
import { MonthProvider, useMonth } from './contexts/MonthContext.jsx';
import { NavProvider, useNav } from './contexts/NavContext.jsx';
import Resumo from './features/resumo';
import Fluxo from './features/fluxo';
import Orcamento from './features/orcamento';
import Previsao from './features/previsao';
import Contas from './features/contas';
import Transacoes from './features/transacoes';

// ── Month helpers ──────────────────────────────────────────────────────
// `MonthProvider` / `useMonth` / month-navigation helpers live in
// contexts/MonthContext.jsx since PR-F3. `formatMonthBR` stays here because
// it is used by the header label (MonthPicker) and will migrate with the
// MonthPicker component in a later PR.

function formatMonthBR(ym) {
  const [y, m] = ym.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  // Capitalize first letter
  const str = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── MonthPicker ────────────────────────────────────────────────────────
function MonthPicker() {
  const { selectedMonth, compareMode, setCompareMode, goPrev, goNext, goToday, isCurrentMonth } = useMonth();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={goPrev}
          className="sans"
          style={navBtnStyle}
          title="Mês anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="serif" style={{ fontSize: 18, fontWeight: 600, minWidth: 160, textAlign: 'center', color: color.text.primary }}>
          {formatMonthBR(selectedMonth)}
        </span>
        <button
          onClick={goNext}
          className="sans"
          style={navBtnStyle}
          title="Próximo mês"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {!isCurrentMonth && (
        <button
          onClick={goToday}
          className="sans"
          style={{
            ...navBtnStyle,
            fontSize: 11,
            padding: '4px 10px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
          title="Voltar ao mês atual"
        >
          <CalendarDays size={12} style={{ marginRight: 4 }} /> Hoje
        </button>
      )}
      <label className="sans" style={{
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        fontSize: 12, color: color.text.muted, marginLeft: 8,
      }}>
        <input
          type="checkbox"
          checked={compareMode}
          onChange={(e) => setCompareMode(e.target.checked)}
          style={{ accentColor: color.accent.warm }}
        />
        vs ano anterior
      </label>
    </div>
  );
}

const navBtnStyle = {
  background: color.bg.card,
  border: `1px solid ${color.border.default}`,
  borderRadius: 3,
  color: color.accent.warm,
  cursor: 'pointer',
  padding: '4px 6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.12s',
};

// ── Pull-to-refresh indicator ──────────────────────────────────────────
function PullIndicator({ pullState, pullDistance }) {
  if (pullState === 'idle') return null;

  const labels = {
    pulling: 'Puxe para atualizar...',
    ready: 'Solte para atualizar...',
    refreshing: 'Atualizando...',
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
      color: pullState === 'ready' ? color.accent.warm : color.text.muted,
      fontSize: 13,
      fontFamily: 'Inter, system-ui, sans-serif',
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
export default function Dashboard() {
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
        <DashboardInner />
      </NavProvider>
    </MonthProvider>
  );
}

function DashboardInner() {
  const { selectedMonth } = useMonth();
  const { activeTab, setActiveTab, tabs } = useNav();
  return (
    <div style={{ minHeight: '100vh', background: color.bg.page, color: color.text.primary, fontFamily: 'Georgia, serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; }
        .serif { font-family: 'Fraunces', Georgia, serif; }
        .sans { font-family: 'Inter', system-ui, sans-serif; }
        .card { background: ${color.bg.card}; border: 1px solid ${color.border.default}; border-radius: 4px; padding: 24px; }
        .tab { padding: 10px 16px; cursor: pointer; border: none; background: transparent; color: ${color.text.muted}; font-family: 'Inter', sans-serif; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 2px solid transparent; transition: all 0.15s; }
        .tab:hover { color: ${color.text.secondary}; }
        .tab.active { color: ${color.accent.warm}; border-bottom-color: ${color.accent.warm}; }
        .grid { display: grid; gap: 20px; }
        .crow { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid ${color.border.default}; cursor: pointer; transition: background 0.12s; }
        .crow:hover { background: ${color.bg.hover}; margin: 0 -24px; padding: 14px 24px; }
        .crow:last-child { border-bottom: none; }
        @media (min-width: 900px) { .g3 { grid-template-columns: 2fr 1fr; } }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        <header style={{ marginBottom: 36, borderBottom: `1px solid ${color.border.default}`, paddingBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="sans" style={{ fontSize: 11, letterSpacing: '0.2em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 8 }}>
                {formatMonthBR(selectedMonth)} · Visão familiar
              </div>
              <h1 className="serif" style={{ fontSize: 'clamp(34px, 6vw, 58px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>
                Finanças <em style={{ fontWeight: 400, color: color.accent.warm }}>Pessoais</em>
              </h1>
            </div>
            <MonthPicker />
          </div>
        </header>

        <nav style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: `1px solid ${color.border.default}`, overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
        </nav>

        {activeTab === 'resumo' && <Resumo />}
        {activeTab === 'fluxo' && <Fluxo />}
        {activeTab === 'orçamento' && <Orcamento />}
        {activeTab === 'previsão' && <Previsao />}
        {activeTab === 'contas' && <Contas />}
        {activeTab === 'transações' && <Transacoes />}

        <footer className="sans" style={{ marginTop: 48, paddingTop: 20, borderTop: `1px solid ${color.border.default}`, fontSize: 11, color: color.text.disabled, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          hledger · via Tailscale
        </footer>
      </div>
    </div>
  );
}
