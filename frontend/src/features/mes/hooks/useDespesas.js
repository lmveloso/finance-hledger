// Hook: fetch expenses grouped by category (level 2) from /api/categories.
//
// Backend contract (app/routes/categories.py):
//   { month, categorias: [{ nome, segmento_raw, valor }] }

import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

export function useDespesas() {
  const { selectedMonth, refreshKey } = useMonth();
  return useApi(`/api/categories?month=${selectedMonth}&depth=2`, [selectedMonth, refreshKey]);
}
