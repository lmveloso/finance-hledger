// Hook: fetch N-month forecast from /api/forecast.
//
// Backend contract (see backend/app/routes/cashflow.py → forecast):
//   {
//     months: [{ mes: 'YYYY-MM', receitas, despesas, saldo }, ...],
//     forecast: true,
//   }
//
// Re-fetches when `months` or the global `refreshKey` changes.

import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

export function useForecast(months = 6) {
  const { refreshKey } = useMonth();
  return useApi(`/api/forecast?months=${months}`, [months, refreshKey]);
}

export default useForecast;
