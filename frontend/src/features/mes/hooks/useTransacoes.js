// Hook: fetch the top-N largest transactions of the month from /api/top-expenses.
//
// Backend contract (app/routes/transactions.py):
//   { month, transacoes: [{ data, descricao, categoria, conta_raw, valor }] }

import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

export function useTransacoes(limit = 10) {
  const { selectedMonth, refreshKey } = useMonth();
  return useApi(
    `/api/top-expenses?month=${selectedMonth}&limit=${limit}`,
    [selectedMonth, refreshKey, limit],
  );
}
