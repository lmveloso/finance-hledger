// Mes — the merged Month tab (Fase UX-Polish #3).
//
// Replaces the old "Resumo + Mês" split. The surface is now:
//
//   1. Three KPI cards (Receita / Despesa / Saldo) with sparklines.
//      Clicking a card expands an inline panel BELOW the grid. Only one
//      panel can be expanded at a time. Clicking the same card again
//      collapses it.
//
//   2. Expanded panel (one of):
//      - Receita: grouped-by-type list + total.
//      - Despesa: two-column — CategoriasSection (drill-down) +
//                 MaioresGastosSection.
//      - Saldo:   Contábil × Caixa real × Δ reconciliation strip.
//
//   3. Cartões de crédito (always visible below the expansion).
//
// Removed in this merge:
//   - The old full-list ReceitasSection (replaced by grouped list in the
//     Receita expansion).
//   - DespesasSection (replaced by CategoriasSection in the Despesa
//     expansion — the two were almost identical).
//   - TopTransacoesSection (replaced by MaioresGastosSection in the same
//     expansion — Maiores gastos + "Ver todas" cover the same need).
//   - PrincipiosSection references (moved to Ano drill-down in UX-Polish #4).
//
// Drill-downs inside sections are still inline, never modals
// (see frontend-dev rules).

import React, { useState } from 'react';
import KpiSection from './sections/KpiSection.jsx';
import ReceitaExpanded from './sections/ReceitaExpanded.jsx';
import DespesaExpanded from './sections/DespesaExpanded.jsx';
import SaldoExpanded from './sections/SaldoExpanded.jsx';
import CreditCardSection from './sections/CreditCardSection.jsx';

function Mes() {
  // `expandedKpi` is one of 'receita' | 'despesa' | 'saldo' | null.
  // Mutual exclusion: toggling a card either expands it (if another was
  // open) or collapses it (if it was already open).
  const [expandedKpi, setExpandedKpi] = useState(null);

  const onToggle = (id) => {
    setExpandedKpi((prev) => (prev === id ? null : id));
  };

  // Only render the expanded panel currently in view — avoids unnecessary
  // fetches (each panel owns its own /api calls).
  const renderExpanded = () => {
    if (expandedKpi === 'receita') {
      return (
        <div id="mes-kpi-panel-receita" role="region">
          <ReceitaExpanded />
        </div>
      );
    }
    if (expandedKpi === 'despesa') {
      return (
        <div id="mes-kpi-panel-despesa" role="region">
          <DespesaExpanded />
        </div>
      );
    }
    if (expandedKpi === 'saldo') {
      return (
        <div id="mes-kpi-panel-saldo" role="region">
          <SaldoExpanded />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid" style={{ gap: 20 }}>
      <KpiSection expandedKpi={expandedKpi} onToggle={onToggle} />
      {renderExpanded()}
      <CreditCardSection />
    </div>
  );
}

export default Mes;
