// Hook: fetch per-principle targets + realized spend for the Resumo tab.
//
// Self-contained inside the `resumo` feature (per the PR-U2 plan: "features
// stay self-contained"). The sibling "Metas por princípio" card used to
// live in the Mês tab too — it was removed in Fase UX-Polish (#4) and is
// now a per-month drill-down inside Ano, which uses `useApi` directly
// with the clicked month rather than MonthContext.
//
// Backend contract (see backend/app/principles/models.py::PrincipleSummary):
//   { month, breakdown: [{ principle, meta_pct, realizado_pct, valor, ... }] }

import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

export function usePrincipiosResumo() {
  const { selectedMonth, refreshKey } = useMonth();
  return useApi(
    `/api/principles/summary?month=${selectedMonth}`,
    [selectedMonth, refreshKey],
  );
}
