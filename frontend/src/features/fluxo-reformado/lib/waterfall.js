// Waterfall composition for the Fluxo tab.
//
// Given the payloads from:
//   GET /api/flow?month=YYYY-MM       → { total_entradas, total_saidas, total_economia, contas, ... }
//   GET /api/categories?month=...     → { categorias: [{ nome, segmento_raw, valor }] }
//
// produce an ordered sequence of waterfall bars suitable for the visual
// rendering in <WaterfallView>. Each entry is a pure object:
//
//   {
//     kind:       'income' | 'expense' | 'result',
//     label:      string,       // display label (already i18n-resolved when applicable)
//     delta:      number,       // signed change for this step
//                               //   income:  +total_entradas
//                               //   expense: -valor            (negative)
//                               //   result:  +total_economia   (signed)
//     start:      number,       // running cumulative BEFORE this step
//                               //   result bars use start = 0 by contract
//     end:        number,       // running cumulative AFTER this step
//                               //   result bars: end = total_economia
//     colorToken: string,       // semantic token path, e.g. 'feedback.positive'
//   }
//
// Sequence: income → top-6 expense categorias (desc by valor) → "Outros" (if
// there are more than 6) → final `result` bar. Zero-valor categorias are
// dropped. Empty data yields an empty array.

export const TOP_N = 6;

/** Default color tokens, overridable via `opts` (handy for tests). */
const DEFAULT_TOKENS = {
  income: 'feedback.positive',
  incomeWarning: 'feedback.warning',
  expense: 'feedback.negative',
  result: 'accent.primary',
  resultNegative: 'feedback.negative',
};

/**
 * @param {object} flow       payload from /api/flow
 * @param {object} categories payload from /api/categories
 * @param {object} [opts]     { outrosLabel, tokens }
 * @returns {Array}           ordered waterfall entries
 */
export function buildWaterfall(flow, categories, opts = {}) {
  const tokens = { ...DEFAULT_TOKENS, ...(opts.tokens || {}) };
  const outrosLabel = opts.outrosLabel || 'Outros';

  if (!flow) return [];

  const totalEntradas = Number(flow.total_entradas) || 0;
  const totalEconomia =
    typeof flow.total_economia === 'number'
      ? flow.total_economia
      : totalEntradas - (Number(flow.total_saidas) || 0);

  const rawCats = Array.isArray(categories?.categorias)
    ? categories.categorias
    : [];

  // Drop zero-valor rows, then sort descending by |valor|.
  const cats = rawCats
    .filter((c) => c && Number(c.valor) > 0)
    .slice()
    .sort((a, b) => Number(b.valor) - Number(a.valor));

  // Treat a completely empty month (no income, no expenses) as "no data".
  if (totalEntradas === 0 && cats.length === 0 && totalEconomia === 0) {
    return [];
  }

  const bars = [];
  let running = 0;

  // Income bar — always present, even if totalEntradas is 0 or negative
  // (negative income is an accounting anomaly we surface via warning color).
  {
    const start = running;
    const end = running + totalEntradas;
    const colorToken =
      totalEntradas < 0 ? tokens.incomeWarning : tokens.income;
    bars.push({
      kind: 'income',
      label: opts.incomeLabel || 'Receitas',
      delta: totalEntradas,
      start,
      end,
      colorToken,
    });
    running = end;
  }

  // Expense bars — top N, with the remainder collapsed into "Outros".
  const top = cats.slice(0, TOP_N);
  const rest = cats.slice(TOP_N);

  for (const c of top) {
    const valor = Number(c.valor) || 0;
    const start = running;
    const end = running - valor;
    bars.push({
      kind: 'expense',
      label: c.nome || c.segmento_raw || '—',
      delta: -valor,
      start,
      end,
      colorToken: tokens.expense,
    });
    running = end;
  }

  if (rest.length > 0) {
    const outrosValor = rest.reduce(
      (sum, c) => sum + (Number(c.valor) || 0),
      0,
    );
    if (outrosValor > 0) {
      const start = running;
      const end = running - outrosValor;
      bars.push({
        kind: 'expense',
        label: outrosLabel,
        delta: -outrosValor,
        start,
        end,
        colorToken: tokens.expense,
      });
      running = end;
    }
  }

  // Final result bar — drawn from 0, not from the running cumulative, so the
  // visual rendering can anchor it at the baseline.
  bars.push({
    kind: 'result',
    label: opts.resultLabel || 'Saldo',
    delta: totalEconomia,
    start: 0,
    end: totalEconomia,
    colorToken: totalEconomia < 0 ? tokens.resultNegative : tokens.result,
  });

  return bars;
}

export default buildWaterfall;
