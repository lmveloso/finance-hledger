// Hook: fetch monthly income/expense/balance KPIs from /api/summary.
//
// Backend contract (app/routes/summary.py):
//   { month, receitas, despesas, saldo }

import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

export function useKpiData() {
  const { selectedMonth, refreshKey } = useMonth();
  return useApi(`/api/summary?month=${selectedMonth}`, [selectedMonth, refreshKey]);
}
