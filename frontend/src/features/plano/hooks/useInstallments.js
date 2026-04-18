// Hook: fetch active credit-card installments from /api/installments (PR-D5a).
//
// Backend contract (see backend/app/routes/installments.py):
//   {
//     installments: [
//       { name, description, monthly_value, paid, total,
//         remaining, remaining_value, end_date },
//       ...
//     ],
//     total_monthly: number,
//     total_remaining: number,
//   }
//
// Re-fetches when the global `refreshKey` changes.

import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

export function useInstallments() {
  const { refreshKey } = useMonth();
  return useApi('/api/installments', [refreshKey]);
}

export default useInstallments;
