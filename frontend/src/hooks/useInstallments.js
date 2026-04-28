// Hook: fetch active credit-card installments from /api/installments.
//
// Backend contract (see backend/app/routes/installments.py):
//   {
//     installments: [
//       { name, description, monthly_value, paid, total,
//         remaining, remaining_value, end_date, account },
//       ...
//     ],
//     total_monthly: number,
//     total_remaining: number,
//   }
//
// Each installment row carries the credit-card liability `account` (e.g.
// "liabilities:cartao:xp-visa") so consumers can group rows per card.
//
// Re-fetches when the global `refreshKey` changes.
//
// ── API ───────────────────────────────────────────────────────────────────
//
//   useInstallments()
//     → returns the full payload, with derived `byAccount` and
//       `totalRemainingByAccount` Maps keyed by the row's `account`.
//
//   useInstallments({ accountFilter })
//     → same as above, but the returned `installments` array is filtered to
//       rows matching `accountFilter`. The `byAccount` /
//       `totalRemainingByAccount` Maps remain unfiltered so callers that
//       want both views can have them.
//
// Output shape:
//   {
//     data,                       // raw response (or null while loading)
//     installments,               // possibly filtered list (always an array)
//     totalMonthly,               // number (filtered when accountFilter is set)
//     totalRemaining,             // number (filtered when accountFilter is set)
//     byAccount,                  // Map<account, Installment[]>  (unfiltered)
//     totalRemainingByAccount,    // Map<account, number>         (unfiltered)
//     loading,
//     error,
//   }

import { useMemo } from 'react';
import { useApi } from '../api.js';
import { useMonth } from '../contexts/MonthContext.jsx';

export function useInstallments(options = {}) {
  const { accountFilter } = options;
  const { refreshKey } = useMonth();
  const { data, loading, error } = useApi('/api/installments', [refreshKey]);

  const all = useMemo(
    () => (Array.isArray(data?.installments) ? data.installments : []),
    [data],
  );

  // Always derive the unfiltered Maps. Callers that want both per-card and
  // total views read these directly.
  const byAccount = useMemo(() => {
    const map = new Map();
    for (const row of all) {
      const acct = row?.account;
      if (!acct) continue;
      const list = map.get(acct);
      if (list) list.push(row);
      else map.set(acct, [row]);
    }
    return map;
  }, [all]);

  const totalRemainingByAccount = useMemo(() => {
    const map = new Map();
    for (const row of all) {
      const acct = row?.account;
      if (!acct) continue;
      map.set(acct, (map.get(acct) || 0) + (row.remaining_value || 0));
    }
    return map;
  }, [all]);

  // Filtered view used by callers that only care about a single account.
  const installments = useMemo(() => {
    if (!accountFilter) return all;
    return all.filter((row) => row?.account === accountFilter);
  }, [all, accountFilter]);

  const totalMonthly = useMemo(() => {
    if (!accountFilter) return data?.total_monthly ?? 0;
    return installments.reduce((s, r) => s + (r.monthly_value || 0), 0);
  }, [accountFilter, installments, data]);

  const totalRemaining = useMemo(() => {
    if (!accountFilter) return data?.total_remaining ?? 0;
    return installments.reduce((s, r) => s + (r.remaining_value || 0), 0);
  }, [accountFilter, installments, data]);

  return {
    data,
    installments,
    totalMonthly,
    totalRemaining,
    byAccount,
    totalRemainingByAccount,
    loading,
    error,
  };
}

export default useInstallments;
