// Hook: derive 6-month sparkline series from /api/cashflow.
//
// Backend contract (app/routes/cashflow.py):
//   { months: [{ mes: "YYYY-MM", receitas: number, despesas: number }, ...] }
//
// We ask for 6 months and compute the two series we need on the client:
//   - despesas: monthly expense series (already absolute in the response)
//   - saldo:    monthly net balance (receitas - despesas)
//
// Frontend-only derivation per the PR-U2 plan; no backend change.

import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

export function useSparklines() {
  const { refreshKey } = useMonth();
  const { data, error, loading } = useApi('/api/cashflow?months=6', [refreshKey]);

  const months = data?.months || [];
  const despesas = months.map((m) => m.despesas ?? 0);
  const saldo = months.map((m) => (m.receitas ?? 0) - (m.despesas ?? 0));

  return { despesas, saldo, loading, error };
}
