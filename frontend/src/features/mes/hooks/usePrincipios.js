// Hook: fetch per-principle targets + realized spend from /api/principles/summary.
//
// Backend contract (PR-D1, to land):
//   { month, principles: [{ id, target_pct, realized_pct, realized_amount }] }
//
// NOTE: At the time this hook was written, /api/principles/summary is not yet
// implemented in the backend. The useApi hook will surface an HTTP error and
// the PrincipiosSection renders a graceful placeholder. Once PR-D1 is merged,
// this hook works without changes.

import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

export function usePrincipios() {
  const { selectedMonth, refreshKey } = useMonth();
  return useApi(
    `/api/principles/summary?month=${selectedMonth}`,
    [selectedMonth, refreshKey],
  );
}
