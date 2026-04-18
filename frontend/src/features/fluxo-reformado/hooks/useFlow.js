// Hook: fetch per-account flow breakdown from /api/flow.
//
// Backend contract (see backend/app/routes/flow.py):
//   {
//     month: 'YYYY-MM',
//     total_entradas: number,
//     total_saidas: number,
//     total_economia: number,
//     contas: [
//       {
//         conta, nome, tipo: 'ativo' | 'passivo',
//         saldo_inicial, saldo_final,
//         entradas_externas, saidas_externas,
//         transfers_in, transfers_out,
//       }
//     ],
//     transferencias: [{ from, from_nome, to, to_nome, valor }],
//   }
//
// Re-fetches when `month` or the global `refreshKey` changes.

import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';

export function useFlow(month) {
  const { refreshKey } = useMonth();
  return useApi(`/api/flow?month=${month}`, [month, refreshKey]);
}

export default useFlow;
