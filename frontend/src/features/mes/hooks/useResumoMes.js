// useResumoMes — fetches /api/month-summary for the active month.
//
// Backend contract (PR-F1-1, see backend/app/routes/month_summary.py):
//   {
//     month, income, expense,
//     expense_via_assets, expense_via_credit_card, credit_card_payment,
//     credit_card_debt_today, debt_start_of_month, debt_end_of_month,
//     leftover,                  // signed
//     last_updated               // ISO-8601 string or empty string
//   }
//
// All five visible cards on the Mês tab read from this single response,
// so Mes.jsx owns the call and prop-drills `summary` down. The expansion
// rows that need *additional* data (Receita's grouped-by-type list, the
// per-card list inside Cartões) own their own fetches.
//
// Refetches when MonthContext.selectedMonth or refreshKey change — the
// pull-to-refresh gesture in App.jsx bumps refreshKey to force a reload
// without changing the URL or the month.

import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

export function useResumoMes() {
  const { selectedMonth, refreshKey } = useMonth();
  const { data, error, loading } = useApi(
    `/api/month-summary?month=${selectedMonth}`,
    [selectedMonth, refreshKey],
  );
  return { summary: data, error, loading };
}

export default useResumoMes;
