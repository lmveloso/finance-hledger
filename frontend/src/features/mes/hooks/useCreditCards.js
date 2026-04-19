// Hook: aggregate credit-card spending for the selected month.
//
// Strategy (per docs plan-u3-refined.md §1 — no backend changes):
//   1. Fetch /api/flow?month=YYYY-MM and filter to liability card accounts.
//   2. For each discovered card, parallel-fetch /api/transactions with
//      account=<card>&limit=500.
//   3. Aggregate per card client-side: purchases only (tipo_movimento ===
//      'credito' AND contra_conta starts with 'expenses:'), grouped by L1
//      category (second segment of the expense account path).
//
// Output shape:
//   {
//     cards: [{
//       conta, nome, total,
//       categories: [{ raw, nome, valor, pct, color }],
//       transactions: [...],  // top 10 by |valor|, shaped from /api/transactions
//     }],
//     loading, error,
//   }
//
// Cards sorted by total desc. Empty cards (no purchases) are filtered out.

import { useEffect, useState } from 'react';
import { useMonth } from '../../../contexts/MonthContext.jsx';
import { color } from '../../../theme/tokens';

const API = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

// Client-side L1 category labels. Mirrors the 7 buckets used elsewhere in the
// UI. Falls back to the raw segment (title-cased) if unknown.
const L1_LABELS_PT = {
  moradia: 'Moradia',
  alimentacao: 'Alimentação',
  'alimentação': 'Alimentação',
  transporte: 'Transporte',
  saude: 'Saúde',
  'saúde': 'Saúde',
  lazer: 'Lazer',
  educacao: 'Educação',
  'educação': 'Educação',
  pessoais: 'Pessoais',
  vestuario: 'Vestuário',
  'vestuário': 'Vestuário',
  servicos: 'Serviços',
  'serviços': 'Serviços',
  assinaturas: 'Assinaturas',
  outros: 'Outros',
};

function labelForL1(raw) {
  if (!raw) return 'Outros';
  const key = raw.toLowerCase();
  if (L1_LABELS_PT[key]) return L1_LABELS_PT[key];
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function isCardAccount(c) {
  if (!c || c.tipo !== 'passivo') return false;
  const acct = c.conta || '';
  return (
    acct.startsWith('liabilities:cartao') ||
    acct.startsWith('liabilities:cartão')
  );
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

function aggregateCard(conta, nome, txResponse, palette) {
  const all = Array.isArray(txResponse?.transactions)
    ? txResponse.transactions
    : [];
  // Purchases only: the liability shows tipo_movimento='credito' with the
  // contra posting going to an expense account.
  const purchases = all.filter(
    (tx) =>
      tx.tipo_movimento === 'credito' &&
      typeof tx.contra_conta === 'string' &&
      tx.contra_conta.startsWith('expenses:'),
  );

  const total = purchases.reduce((s, tx) => s + (tx.valor || 0), 0);

  // Group by L1 category (second segment of 'expenses:<l1>:...').
  const byCategory = new Map();
  for (const tx of purchases) {
    const parts = (tx.contra_conta || '').split(':');
    const raw = parts[1] || 'outros';
    const prev = byCategory.get(raw) || { raw, valor: 0 };
    prev.valor += tx.valor || 0;
    byCategory.set(raw, prev);
  }

  const categories = Array.from(byCategory.values())
    .sort((a, b) => b.valor - a.valor)
    .map((c, i) => ({
      raw: c.raw,
      nome: labelForL1(c.raw),
      valor: c.valor,
      pct: total > 0 ? (c.valor / total) * 100 : 0,
      color: palette[i % palette.length],
    }));

  // Top 10 purchases by absolute value.
  const transactions = purchases
    .slice()
    .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
    .slice(0, 10);

  return { conta, nome, total, categories, transactions };
}

export function useCreditCards() {
  const { selectedMonth, refreshKey } = useMonth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCards([]);

    (async () => {
      try {
        const flow = await fetchJson(`/api/flow?month=${selectedMonth}`);
        if (cancelled) return;

        const cardAccounts = (flow?.contas || []).filter(isCardAccount);
        if (cardAccounts.length === 0) {
          setCards([]);
          return;
        }

        // Snapshot the palette at fetch-time. The tokens proxy resolves per
        // mode, but consumers re-render via the ThemeContext key=mode remount.
        const palette = color.chart.colors;

        const results = await Promise.all(
          cardAccounts.map(async (c) => {
            const tx = await fetchJson(
              `/api/transactions?month=${selectedMonth}` +
                `&account=${encodeURIComponent(c.conta)}&limit=500`,
            );
            return aggregateCard(c.conta, c.nome, tx, palette);
          }),
        );
        if (cancelled) return;

        const nonEmpty = results
          .filter((r) => r.total > 0)
          .sort((a, b) => b.total - a.total);
        setCards(nonEmpty);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, refreshKey]);

  return { cards, loading, error };
}

export default useCreditCards;
