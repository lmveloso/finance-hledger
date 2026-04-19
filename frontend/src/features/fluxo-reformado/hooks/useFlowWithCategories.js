// Hook: compose /api/flow with /api/categories for the Fluxo waterfall.
//
// The Fluxo tab needs both the per-account cash movement (/api/flow) and the
// category-level expense breakdown (/api/categories) to render the waterfall
// view. Rather than adding a dedicated endpoint we compose the two existing
// calls here, mirroring the pattern used by `useCreditCards` in the Mes tab.
//
// Output:
//   { flow, categories, loading, error }
//
// - `loading` is true until BOTH requests resolve.
// - `error` surfaces the first failure; successful payloads on the other side
//   are still returned (callers can guard per-field).
//
// Re-fetches when `month` or the global `refreshKey` changes.

import { useEffect, useState } from 'react';
import { useMonth } from '../../../contexts/MonthContext.jsx';

const API = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

async function fetchJson(path) {
  const r = await fetch(`${API}${path}`, { headers: authHeaders() });
  if (r.status === 401) {
    localStorage.removeItem('token');
    throw new Error('401');
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export function useFlowWithCategories(month) {
  const { refreshKey } = useMonth();
  const [flow, setFlow] = useState(null);
  const [categories, setCategories] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [flowResp, catsResp] = await Promise.all([
          fetchJson(`/api/flow?month=${month}`),
          fetchJson(`/api/categories?month=${month}&depth=2`),
        ]);
        if (cancelled) return;
        setFlow(flowResp);
        setCategories(catsResp);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [month, refreshKey]);

  return { flow, categories, loading, error };
}

export default useFlowWithCategories;
