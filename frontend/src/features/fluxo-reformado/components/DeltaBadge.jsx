import React from 'react';
import { color } from '../../../theme/tokens';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

// Delta badge used on account nodes. The "good" direction depends on the
// account's accounting nature:
//   - Asset: delta > 0 is good (balance grew) → green.
//   - Liability: delta < 0 is good (debt shrank) → green.
// The zero case is neutral. A compact icon ↑/↓ makes the direction readable
// at a glance even without the sign.
function DeltaBadge({ delta, tipo }) {
  const v = delta ?? 0;
  let kind = 'neutral';
  if (v > 0) kind = tipo === 'ativo' ? 'good' : 'bad';
  else if (v < 0) kind = tipo === 'ativo' ? 'bad' : 'good';

  const fg = {
    good: color.feedback.positive,
    bad: color.feedback.negative,
    neutral: color.text.muted,
  }[kind];

  const arrow = v > 0 ? '↑' : v < 0 ? '↓' : '·';

  return (
    <span
      className="sans"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        color: fg,
        background: `${fg}22`,
        border: `1px solid ${fg}55`,
        borderRadius: 2,
        padding: '2px 6px',
        whiteSpace: 'nowrap',
      }}
      title={tipo === 'ativo' ? 'Variação do ativo' : 'Variação da dívida'}
    >
      <span style={{ fontFamily: 'inherit' }}>{arrow}</span>
      {BRL(Math.abs(v))}
    </span>
  );
}

export default DeltaBadge;
