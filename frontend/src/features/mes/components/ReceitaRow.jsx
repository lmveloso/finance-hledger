// Row in the revenues section: date, description, amount.
//
// Visual pattern mirrors the "maiores gastos" rows in Resumo.jsx, but with a
// positive-feedback color (income = green) and no drill-down chevron.

import React from 'react';
import { color } from '../../../theme/tokens';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  });

function ReceitaRow({ date, description, amount, isLast }) {
  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: isLast ? 'none' : `1px solid ${color.border.default}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span
          className="serif"
          style={{
            fontSize: 15,
            color: color.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {description || '—'}
        </span>
        <span
          className="sans"
          style={{ fontSize: 11, color: color.text.muted }}
        >
          {date}
        </span>
      </div>
      <span
        className="serif"
        style={{
          fontSize: 16,
          color: color.feedback.positive,
          whiteSpace: 'nowrap',
          fontWeight: 600,
        }}
      >
        {BRL(amount)}
      </span>
    </div>
  );
}

export default ReceitaRow;
