// Hook: fetch per-principle targets + realized spend for the Resumo tab.
//
// Intentionally duplicated from `features/mes/hooks/usePrincipios.js` instead
// of cross-importing (per the PR-U2 plan: "duplicate the 3-line hook, don't
// cross-import"). Features stay self-contained.
//
// Backend contract (see backend/app/principles/models.py::PrincipleSummary):
//   { month, breakdown: [{ principle, meta_pct, realizado_pct, realizado_valor, ... }] }

import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

export function usePrincipiosResumo() {
  const { selectedMonth, refreshKey } = useMonth();
  return useApi(
    `/api/principles/summary?month=${selectedMonth}`,
    [selectedMonth, refreshKey],
  );
}
