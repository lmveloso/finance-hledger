import React from 'react';
import { color } from '../theme/tokens';

// Small uppercase chip that labels a transaction movement type.
// Accepted `tipo` values: 'credito', 'debito', 'transferencia', 'saldo_inicial'.
// Unknown values fall back to the 'debito' styling, matching the previous
// inline definition in Dashboard.jsx. Strings remain hardcoded pt-BR until
// the i18n pass (post PR-F9).
function TipoChip({ tipo }) {
  const map = {
    credito:       { label: 'Crédito',       bg: color.overlay.credito,       fg: color.feedback.positive },
    debito:        { label: 'Débito',        bg: color.overlay.debito,        fg: color.feedback.negative },
    transferencia: { label: 'Transferência', bg: color.overlay.transferencia, fg: color.feedback.info },
    saldo_inicial: { label: 'Saldo inicial', bg: color.overlay.saldoInicial,  fg: color.text.muted },
  };
  const s = map[tipo] || map.debito;
  return (
    <span
      className="sans"
      style={{
        fontSize: 10,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.fg}33`,
        borderRadius: 3,
        padding: '2px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  );
}

export default TipoChip;
