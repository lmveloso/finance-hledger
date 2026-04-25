// Single source for BRL formatting across the Mês tab.
//
// Honesty rule: every figure traces back to the journal, which carries cents.
// Headlines and detail rows therefore agree on precision (2 fraction digits)
// so a value never gains or loses pennies between a KPI summary and its
// expansion. Other tabs migrate to this utility incrementally.
export function formatBRL(n, options = {}) {
  const { fractionDigits = 2 } = options;
  return (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}
