// Hook: fetch monthly net worth evolution from /api/networth.
//
// Backend contract (see backend/app/routes/networth.py):
//   {
//     months: [
//       { mes: 'YYYY-MM', assets: number, liabilities: number, net: number },
//       ...
//     ],
//   }
//
// Re-fetches when `months` or the global `refreshKey` changes.

import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

export function useNetworth(months = 12) {
  const { refreshKey } = useMonth();
  return useApi(`/api/networth?months=${months}`, [months, refreshKey]);
}

export default useNetworth;
