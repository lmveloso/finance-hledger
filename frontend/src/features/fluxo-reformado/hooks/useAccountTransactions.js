import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

/**
 * Lançamentos do mês para uma conta específica.
 *
 * Backend: GET /api/transactions?account=<conta>&month=YYYY-MM&forecast=true
 *   Retorna { total, limit, offset, transactions: [{data, descricao, conta,
 *   contra_conta, categoria, valor, tipo_movimento}] }.
 *
 * Para passivos (cartão de crédito) o ``forecast=true`` traz parcelas
 * futuras geradas pelas declarações `~ monthly` em parcelamentos.journal
 * (ADR-011). Para ativos não muda nada — não há periódicos relevantes.
 *
 * `account` null/undefined → fetch não dispara.
 */
export function useAccountTransactions(account, month, { forecast = false } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const enabled = Boolean(account && month);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const path = `/api/transactions?account=${encodeURIComponent(account)}&month=${encodeURIComponent(month)}&limit=500${forecast ? '&forecast=true' : ''}`;
    fetch(`${API}${path}`, { headers: authHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [enabled, account, month, forecast]);

  return {
    transactions: data?.transactions || [],
    total: data?.total || 0,
    loading,
    error,
  };
}
