// Hook: aggregate credit-card spending for the selected month.
//
// Strategy (per docs plan-u3-refined.md §1 — no backend changes):
//   1. Fetch /api/flow?month=YYYY-MM and /api/accounts in parallel.
//   2. Union card-liability accounts from both sources: any card with
//      outstanding balance (from /api/accounts) stays visible even with zero
//      purchases in the month; any card with monthly activity (from /api/flow)
//      stays visible even if the liability payload skips it.
//   3. For each card present in flow, parallel-fetch /api/transactions with
//      account=<card>&limit=500 and aggregate purchases client-side. Cards
//      that are outstanding-only skip the tx fetch entirely.
//
// Aggregation (issue #5 contract): from the card's liability perspective, a
// purchase posts a NEGATIVE valor (balance grows more negative) and is tagged
// 'debito'; a refund/chargeback posts a POSITIVE valor and is tagged
// 'credito'. Both are card activity; we take the absolute value so totals
// read as positive spend.
//
// Output shape:
//   {
//     cards: [{
//       conta, nome,
//       monthlySpend,            // spend posted in the selected month
//       outstandingBalance,      // abs(saldo) from /api/accounts, >= 0
//       hasMonthlyActivity,      // monthlySpend > 0
//       categories: [{ raw, nome, valor, pct, color }],
//       transactions: [...],     // top 10 by |valor|, shaped from /api/transactions
//     }],
//     loading, error,
//   }
//
// Sorting: active cards (hasMonthlyActivity true) first by monthlySpend desc,
// then dormant cards by outstandingBalance desc. Issue #20 — outstanding cards
// must remain discoverable.

import { useEffect, useState } from 'react';
import { useMonth } from '../../../contexts/MonthContext.jsx';
import { useInstallments } from '../../../hooks/useInstallments.js';
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

// Card-account predicate. Accepts both /api/flow rows (which expose `conta`)
// and /api/accounts rows (which expose `caminho`). The tipo check narrows to
// passivos in both shapes.
function isCardPath(path) {
  if (!path) return false;
  const lower = String(path).toLowerCase();
  return (
    lower.startsWith('liabilities:cartao') ||
    lower.startsWith('liabilities:cartão')
  );
}

function isFlowCardAccount(c) {
  if (!c || c.tipo !== 'passivo') return false;
  return isCardPath(c.conta);
}

function isAccountsCardRow(c) {
  if (!c || c.tipo !== 'passivo') return false;
  return isCardPath(c.caminho);
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

export function aggregateCard(conta, nome, txResponse, palette) {
  const all = Array.isArray(txResponse?.transactions)
    ? txResponse.transactions
    : [];
  // Purchases: contra-posting lands in an expense account. Backend tags these
  // as 'debito' (negative valor on the liability) for a real purchase or
  // 'credito' (positive valor) for a refund/chargeback. Both are card
  // activity we want to surface. Transfers (contra starts with 'assets:' /
  // 'liabilities:') and opening balances ('saldo_inicial') are excluded by
  // the expense-prefix test; we still check tipo_movimento to be defensive.
  const purchases = all.filter(
    (tx) =>
      (tx.tipo_movimento === 'debito' || tx.tipo_movimento === 'credito') &&
      typeof tx.contra_conta === 'string' &&
      tx.contra_conta.startsWith('expenses:'),
  );

  // Flip sign so aggregates read as positive spend regardless of the
  // liability-side sign convention.
  const total = purchases.reduce((s, tx) => s + Math.abs(tx.valor || 0), 0);

  // Group by L1 category (second segment of 'expenses:<l1>:...').
  const byCategory = new Map();
  for (const tx of purchases) {
    const parts = (tx.contra_conta || '').split(':');
    const raw = parts[1] || 'outros';
    const prev = byCategory.get(raw) || { raw, valor: 0 };
    prev.valor += Math.abs(tx.valor || 0);
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

// Pure helper: union the cards discovered in /api/flow contas and in
// /api/accounts contas, then merge per-card aggregates (already produced by
// aggregateCard) into the unified list. Exported for unit testing.
//
// Inputs:
//   - flowContas:               array of rows from /api/flow response.
//   - accounts:                 array of rows from /api/accounts response
//                               (shape: caminho, nome, tipo, saldo).
//   - aggregates:               Map<conta, { total, categories, transactions }>
//                               produced by aggregateCard for every card that
//                               was present in flow.
//   - installmentsByAccount:    Map<account, Installment[]> from
//                               useInstallments() (defaults to empty).
//   - totalRemainingByAccount:  Map<account, number> from useInstallments()
//                               (defaults to empty).
//
// Each output row carries `installments` (array, possibly empty) and
// `installmentsRemainingValue` (sum of remaining values for that card; 0 when
// no parcelamento touches it).
//
// Output: array of unified card entries, sorted per the rules in the hook
// docblock.
export function buildCardList({
  flowContas,
  accounts,
  aggregates,
  installmentsByAccount,
  totalRemainingByAccount,
}) {
  const flowCards = (flowContas || []).filter(isFlowCardAccount);
  const accountsCards = (accounts || []).filter(isAccountsCardRow);
  const byAcct = installmentsByAccount || new Map();
  const totalsByAcct = totalRemainingByAccount || new Map();

  // Index /api/accounts rows by path for O(1) outstanding lookups.
  const accountsByPath = new Map();
  for (const row of accountsCards) {
    accountsByPath.set(row.caminho, row);
  }

  // Start from the set of flow cards (they drive monthly aggregates) and add
  // any accounts card not yet present.
  const seen = new Set();
  const rows = [];

  for (const c of flowCards) {
    seen.add(c.conta);
    const agg = aggregates?.get(c.conta) || {
      total: 0,
      categories: [],
      transactions: [],
    };
    const acctRow = accountsByPath.get(c.conta);
    const outstandingBalance = acctRow ? Math.abs(acctRow.saldo || 0) : 0;
    rows.push({
      conta: c.conta,
      nome: c.nome || (acctRow ? acctRow.nome : c.conta),
      monthlySpend: agg.total,
      outstandingBalance,
      hasMonthlyActivity: agg.total > 0,
      categories: agg.categories,
      transactions: agg.transactions,
      installments: byAcct.get(c.conta) || [],
      installmentsRemainingValue: totalsByAcct.get(c.conta) || 0,
    });
  }

  for (const row of accountsCards) {
    if (seen.has(row.caminho)) continue;
    const outstandingBalance = Math.abs(row.saldo || 0);
    // Only include outstanding-only cards when they actually owe something;
    // a fully settled card with zero balance and no monthly spend adds noise.
    if (outstandingBalance < 0.01) continue;
    rows.push({
      conta: row.caminho,
      nome: row.nome || row.caminho,
      monthlySpend: 0,
      outstandingBalance,
      hasMonthlyActivity: false,
      categories: [],
      transactions: [],
      installments: byAcct.get(row.caminho) || [],
      installmentsRemainingValue: totalsByAcct.get(row.caminho) || 0,
    });
  }

  // Active first (by monthly spend desc), then dormant (by outstanding desc).
  rows.sort((a, b) => {
    if (a.hasMonthlyActivity !== b.hasMonthlyActivity) {
      return a.hasMonthlyActivity ? -1 : 1;
    }
    if (a.hasMonthlyActivity) {
      return b.monthlySpend - a.monthlySpend;
    }
    return b.outstandingBalance - a.outstandingBalance;
  });

  return rows;
}

export function useCreditCards() {
  const { selectedMonth, refreshKey } = useMonth();
  const [base, setBase] = useState({ flowContas: null, accounts: null, aggregates: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Parcelamentos comprometidos (ADR-011). Surfaces in the Mês card detail
  // until the Plano tab is reactivated. The hook fetches once per refreshKey;
  // we merge into the per-card row in the second effect below.
  const {
    byAccount: installmentsByAccount,
    totalRemainingByAccount,
    error: instError,
  } = useInstallments();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBase({ flowContas: null, accounts: null, aggregates: null });

    (async () => {
      try {
        const [flow, accountsResp] = await Promise.all([
          fetchJson(`/api/flow?month=${selectedMonth}`),
          fetchJson('/api/accounts'),
        ]);
        if (cancelled) return;

        const flowContas = flow?.contas || [];
        const accounts = accountsResp?.contas || [];
        const cardAccounts = flowContas.filter(isFlowCardAccount);

        // Snapshot the palette at fetch-time. The tokens proxy resolves per
        // mode, but consumers re-render via the ThemeContext key=mode remount.
        const palette = color.chart.colors;

        // Only fetch transactions for cards that are in flow — outstanding-only
        // cards have no month postings to aggregate.
        const aggregates = new Map();
        if (cardAccounts.length > 0) {
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
          for (const r of results) aggregates.set(r.conta, r);
        }

        if (!cancelled) setBase({ flowContas, accounts, aggregates });
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

  // Merge installments into the per-card rows. We treat installment loading
  // as non-blocking: if the call fails or is still loading, show the cards
  // without comprometido (the breakdown line and PARCELAS FUTURAS section
  // hide automatically when the values are 0/empty).
  const cards =
    base.flowContas == null
      ? []
      : buildCardList({
          flowContas: base.flowContas,
          accounts: base.accounts,
          aggregates: base.aggregates,
          installmentsByAccount,
          totalRemainingByAccount,
        });

  // Surface installments errors only when the primary data already resolved
  // — otherwise the primary error is the more useful message. Installment
  // loading is non-blocking: cards render once primary data is in; the
  // comprometido breakdown line and PARCELAS FUTURAS section appear as the
  // installments hook resolves (their visibility gates on > 0 / non-empty).
  const compoundError = error || (base.flowContas != null ? instError : null);

  return { cards, loading, error: compoundError };
}

export default useCreditCards;
