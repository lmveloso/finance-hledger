// Hook: derive 6-month sparkline series from /api/cashflow.
//
// Backend contract (app/routes/cashflow.py):
//   { months: [{ mes: "YYYY-MM", receitas: number, despesas: number }, ...] }
//
// We ask for 6 months and compute the three series we need on the client:
//   - receitas: monthly revenue series
//   - despesas: monthly expense series (already absolute in the response)
//   - saldo:    monthly net balance (receitas - despesas)
//
// Ported from `features/resumo/hooks/useSparklines.js` during the
// Resumo + Mês merge (Fase UX-Polish #3), with the `receitas` series added
// so the new Receita KPI card can show its own sparkline.

import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

export function useSparklines() {
  const { refreshKey } = useMonth();
  const { data, error, loading } = useApi('/api/cashflow?months=6', [refreshKey]);

  const months = data?.months || [];
  const receitas = months.map((m) => m.receitas ?? 0);
  const despesas = months.map((m) => m.despesas ?? 0);
  const saldo = months.map((m) => (m.receitas ?? 0) - (m.despesas ?? 0));

  return { receitas, despesas, saldo, loading, error };
}
