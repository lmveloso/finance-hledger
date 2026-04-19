// Main App
const { useState: useAppState, useEffect: useAppEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "variation": "rounded",
  "fontPair": "jakarta"
}/*EDITMODE-END*/;

function App() {
  const saved = (() => { try { return JSON.parse(localStorage.getItem('fp-tweaks') || '{}'); } catch { return {}; } })();
  const [theme,     setTheme]     = useAppState(saved.theme     || TWEAK_DEFAULTS.theme);
  const [variation, setVariation] = useAppState(saved.variation || TWEAK_DEFAULTS.variation);
  const [fontPair,  setFontPair]  = useAppState(saved.fontPair  || TWEAK_DEFAULTS.fontPair);
  const [activeTab, setActiveTab] = useAppState(localStorage.getItem('fp-tab') || 'resumo');
  const [monthIdx,  setMonthIdx]  = useAppState(3); // Abr 2025
  const [tweaksOpen, setTweaksOpen] = useAppState(false);

  // Persist
  useAppEffect(() => { localStorage.setItem('fp-tweaks', JSON.stringify({ theme, variation, fontPair })); }, [theme, variation, fontPair]);
  useAppEffect(() => { localStorage.setItem('fp-tab', activeTab); }, [activeTab]);

  // Tweaks protocol
  useAppEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode')   setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const sendTweaks = (key, value) => {
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: value } }, '*');
  };

  function handleTheme(v)     { setTheme(v);     sendTweaks('theme', v); }
  function handleVariation(v) { setVariation(v); sendTweaks('variation', v); }
  function handleFont(v)      { setFontPair(v);  sendTweaks('fontPair', v); }

  const tabContent = {
    resumo:     React.createElement(window.TabResumo),
    mes:        React.createElement(window.TabMes),
    ano:        React.createElement(window.TabAno),
    fluxo:      React.createElement(window.TabFluxo),
    orcamento:  React.createElement(window.TabOrcamento),
    patrimonio: React.createElement(window.TabPatrimonio),
  };

  const T = window.THEME[theme];

  return (
    <window.ThemeProvider theme={theme} variation={variation} fontPair={fontPair}>
      {/* Global font + reset */}
      <style>{`
        body { background: ${T.bg.page}; }
        button { cursor: pointer; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: ${T.border.default}; border-radius: 3px; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Desktop layout */}
      <div className="desktop-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Sidebar — desktop only */}
        <div className="sidebar-wrap" style={{ display: 'none' }}>
          <window.Sidebar
            active={activeTab} onNav={setActiveTab}
            onThemeToggle={() => handleTheme(theme === 'dark' ? 'light' : 'dark')}
          />
        </div>

        {/* Main column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <window.TopBar active={activeTab} monthIdx={monthIdx} onMonthChange={setMonthIdx} />
          <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 80px', background: T.bg.page }}>
            {tabContent[activeTab] || null}
          </main>
        </div>
      </div>

      {/* Tweaks */}
      <window.TweaksPanel
        open={tweaksOpen}
        theme={theme} variation={variation} fontPair={fontPair}
        onTheme={handleTheme} onVariation={handleVariation} onFont={handleFont}
      />

      {/* Mobile bottom nav */}
      <window.BottomNav active={activeTab} onNav={setActiveTab} />

      {/* Responsive styles */}
      <style>{`
        @media (min-width: 769px) {
          .sidebar-wrap { display: block !important; }
          .desktop-layout > div:last-child > main { padding-bottom: 24px; }
        }
        @media (max-width: 768px) {
          .desktop-layout { flex-direction: column; }
        }
      `}</style>
    </window.ThemeProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
