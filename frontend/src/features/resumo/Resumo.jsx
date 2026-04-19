// Resumo — redesigned in PR-U2 (see docs/04-PRD-ui-ux.md, PR-U2 plan).
//
// Thin composer. Sections are self-contained and own their own data fetches
// via MonthContext. Layout target:
//
//   ┌────────────────────────────────────────────────┐
//   │  KPIs (Despesas + Saldo + sparklines)         │
//   ├──────────────────────────┬─────────────────────┤
//   │  Categorias              │  Maiores gastos     │
//   ├──────────────────────────┴─────────────────────┤
//   │  Princípios (compact)                          │
//   └────────────────────────────────────────────────┘
//
// Removed in PR-U2 (vs. prior implementation):
//   - Recharts (PieChart + ResponsiveContainer)
//   - SavingsGoal card (superseded by Princípios)
//   - Alerts banner (move to a future alerts surface)
//   - accrual-vs-caixa reconciliation (may return in PR-U5)
//   - /api/flow, /api/savings-goal, /api/alerts calls
//
// Kept:
//   - `compareMode` + `DeltaBadge` (still drive KPIs via KpiSection)
//   - `goToTransactions` drill-down wiring via NavContext
//   - MonthContext consumption (selectedMonth + refreshKey)

import React from 'react';
import KpiSection from './sections/KpiSection.jsx';
import CategoriasSection from './sections/CategoriasSection.jsx';
import MaioresGastosSection from './sections/MaioresGastosSection.jsx';
import PrincipiosSection from './sections/PrincipiosSection.jsx';

function Resumo() {
  return (
    <div className="grid" style={{ gap: 20 }}>
      <KpiSection />
      <div className="grid g3">
        <CategoriasSection />
        <MaioresGastosSection />
      </div>
      <PrincipiosSection />
    </div>
  );
}

export default Resumo;
