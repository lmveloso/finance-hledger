// Single source for BRL formatting across the dashboard.
//
// Honesty rule: every figure traces back to the journal, which carries cents.
// Headlines and detail rows therefore agree on precision (2 fraction digits)
// so a value never gains or loses pennies between a KPI summary and its
// expansion.
//
// Privacy mode: when active, every formatted value renders as a masked
// placeholder ("R$ ••••"). The flag lives at module scope so that all
// call sites — including local BRL helpers in feature folders that
// delegate here — flip atomically when PrivacyContext toggles. The
// surrounding tree is remounted via `key=` in main.jsx so memoised
// formatter closures re-evaluate.

const MASK = 'R$ ••••';

let _privacyMode = false;

export function _setPrivacyMode(next) {
  _privacyMode = !!next;
}

export function _isPrivate() {
  return _privacyMode;
}

export function formatBRL(n, options = {}) {
  if (_privacyMode) return MASK;
  const { fractionDigits = 2 } = options;
  return (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}
