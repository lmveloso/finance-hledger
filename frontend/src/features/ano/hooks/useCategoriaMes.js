import { useEffect, useState } from 'react';
import { useMonth } from '../../../contexts/MonthContext.jsx';

const API = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

// Hook: fetches /api/categories?month=YYYY-MM for each of 12 months in
// parallel and builds a category × month matrix.
//
// Returns:
//   {
//     loading, error,
//     months:     ['2026-01', ..., '2026-12'],
//     categories: ['Moradia', 'Alimentação', ...],  // sorted by total desc
//     matrix:     { [categoryName]: { [month]: value } },
//     totals:     { [month]: value },  // total expenses per month
//   }
export function useCategoriaMes(year) {
  const { refreshKey } = useMonth();
  const [state, setState] = useState({
    loading: true,
    error: null,
    months: [],
    categories: [],
    matrix: {},
    totals: {},
  });

  useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));

    const months = Array.from({ length: 12 }, (_, i) =>
      `${year}-${String(i + 1).padStart(2, '0')}`
    );

    const fetchOne = (month) =>
      fetch(`${API}/api/categories?month=${month}&depth=2`, { headers: authHeaders() })
        .then(r => {
          if (r.status === 401) {
            localStorage.removeItem('token');
            throw new Error('401');
          }
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        });

    Promise.all(months.map(fetchOne))
      .then(results => {
        if (cancelled) return;
        const matrix = {};
        const totals = {};
        const catTotals = {};

        results.forEach((res, idx) => {
          const month = months[idx];
          totals[month] = 0;
          (res?.categorias || []).forEach(c => {
            const name = c.nome;
            if (!matrix[name]) matrix[name] = {};
            matrix[name][month] = (matrix[name][month] || 0) + (c.valor || 0);
            totals[month] += c.valor || 0;
            catTotals[name] = (catTotals[name] || 0) + (c.valor || 0);
          });
        });

        const categories = Object.keys(matrix).sort(
          (a, b) => (catTotals[b] || 0) - (catTotals[a] || 0)
        );

        setState({ loading: false, error: null, months, categories, matrix, totals });
      })
      .catch(err => {
        if (!cancelled) {
          setState(s => ({ ...s, loading: false, error: err.message }));
        }
      });

    return () => { cancelled = true; };
  }, [year, refreshKey]);

  return state;
}

export default useCategoriaMes;
