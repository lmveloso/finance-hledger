// Mes — the reformed "Month" tab.
//
// Per docs/02-PRD-dashboard-v2.md §5, this tab replaces the old "Resumo" as
// the app's default entry and follows a strict vertical flow:
//
//   1. Receitas       — anchor the month with income first
//   2. KPIs           — revenue / expense / result
//   3. Principios     — targets by principle (7 rows)
//   4. Despesas       — expense categories (level 2)
//   5. Top 10         — biggest transactions
//   6. Cartões        — credit card spending (PR-U3)
//
// No tabs within the page. Drill-downs (credit card rows, etc.) are inline
// expansions per the frontend-dev rules (no modals).

import React from 'react';
import ReceitasSection from './sections/ReceitasSection.jsx';
import KpiSection from './sections/KpiSection.jsx';
import PrincipiosSection from './sections/PrincipiosSection.jsx';
import DespesasSection from './sections/DespesasSection.jsx';
import TopTransacoesSection from './sections/TopTransacoesSection.jsx';
import CreditCardSection from './sections/CreditCardSection.jsx';

function Mes() {
  return (
    <div className="grid" style={{ gap: 20 }}>
      <ReceitasSection />
      <KpiSection />
      <PrincipiosSection />
      <DespesasSection />
      <TopTransacoesSection />
      <CreditCardSection />
    </div>
  );
}

export default Mes;
