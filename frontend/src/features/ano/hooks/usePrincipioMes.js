import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

// Hook: wraps GET /api/principles/yearly?year=YYYY (PR-D3).
// Returns the { data, error, loading } shape straight from `useApi`, re-
// fetching when `year` or the global `refreshKey` changes.
//
// Response shape (see backend/app/principles/models.py → PrincipleYearly):
//   {
//     year: number,
//     months: ['2026-01', ..., '2026-12'],
//     principles: [
//       { principle, display_key, target_pct,
//         monthly: [{ month, value, pct }, ...] },
//       ...
//     ],
//     monthly_totals: [{ month, value }, ...]
//   }
export function usePrincipioMes(year) {
  const { refreshKey } = useMonth();
  return useApi(`/api/principles/yearly?year=${year}`, [year, refreshKey]);
}

export default usePrincipioMes;
