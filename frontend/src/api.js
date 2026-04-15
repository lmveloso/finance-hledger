import { useEffect, useState, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || '';  // same-origin em prod

/** Headers with Bearer token from localStorage, if present. */
function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

/** Check if we have a stored token. */
export function isLoggedIn() {
  return !!localStorage.getItem('token');
}

/** Hook simples pra fetch com loading/error. Suporta params dinâmicos. */
export function useApi(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API}${path}`, { headers: authHeaders() })
      .then(r => {
        if (r.status === 401) {
          localStorage.removeItem('token');
          throw new Error('401');
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading };
}

export async function fetchCategoryDetail(category, month) {
  const q = month ? `?month=${month}` : '';
  const r = await fetch(`${API}/api/categories/${encodeURIComponent(category.toLowerCase())}${q}`, { headers: authHeaders() });
  if (r.status === 401) {
    localStorage.removeItem('token');
    throw new Error('401');
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
