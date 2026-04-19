import React, { createContext, useContext, useCallback, useState } from 'react';

// Navigation state lifted out of App.jsx (formerly Dashboard.jsx) during PR-F3.
//
// Holds:
//   - activeTab / setActiveTab — which top-level tab is rendered. Was called
//     `aba` inline in the monolith; renamed to align with the PR-F3 spec and
//     to read naturally in English.
//   - navCategory / setNavCategory — cross-tab handoff value used by
//     `goToTransactions` so the Transações tab can pre-filter by category.
//   - goToTransactions(category?) — convenience action used from Resumo /
//     category drill-downs.
//
// A `drawerOpen` slot was listed in the spec but no drawer exists in the
// current UI, so it is intentionally omitted. It can be added when a drawer
// is introduced.

const NavContext = createContext(null);

// Fase U hides `plano` and `previsão` from the primary nav (see
// docs/04-PRD-ui-ux.md §4.1). The route handlers in App.jsx are preserved so
// the tabs can be re-enabled without code surgery. `ALL_TABS` is exported for
// any route-legality logic that still needs to recognise the hidden tabs.
const TABS = ['resumo', 'mês', 'ano', 'fluxo', 'orçamento', 'patrimônio', 'transações'];
const ALL_TABS = ['resumo', 'mês', 'ano', 'plano', 'fluxo', 'orçamento', 'previsão', 'patrimônio', 'transações'];

export function NavProvider({ children, initialTab = 'resumo' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [navCategory, setNavCategory] = useState(null);

  const goToTransactions = useCallback((category) => {
    setNavCategory(category || null);
    setActiveTab('transações');
  }, []);

  return (
    <NavContext.Provider value={{
      activeTab, setActiveTab,
      navCategory, setNavCategory,
      goToTransactions,
      tabs: TABS,
      allTabs: ALL_TABS,
    }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (ctx === null) {
    throw new Error('useNav must be used inside <NavProvider>');
  }
  return ctx;
}
