// Hook: fetch revenues for a given month from /api/revenues.
//
// Backend contract (PR-D2a, see backend/app/routes/revenues.py):
//   { month, revenues: [{ date, description, amount }], total }

import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

export function useReceitas() {
  const { selectedMonth, refreshKey } = useMonth();
  return useApi(`/api/revenues?month=${selectedMonth}`, [selectedMonth, refreshKey]);
}
