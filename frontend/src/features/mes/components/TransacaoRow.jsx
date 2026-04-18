// Row per transaction in the "Top 10" section.
//
// Layout: description on the left with date+category underneath; amount on the
// right in accent.warm. Values displayed as absolute BRL (top-expenses already
// returns positive amounts).

import React from 'react';
import { color } from '../../../theme/tokens';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  });

function TransacaoRow({ data, descricao, categoria, valor, isLast }) {
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
          {descricao || '—'}
        </span>
        <span
          className="sans"
          style={{ fontSize: 11, color: color.text.muted }}
        >
          {categoria ? `${categoria} · ${data}` : data}
        </span>
      </div>
      <span
        className="serif"
        style={{
          fontSize: 16,
          color: color.accent.warm,
          whiteSpace: 'nowrap',
        }}
      >
        {BRL(valor)}
      </span>
    </div>
  );
}

export default TransacaoRow;
