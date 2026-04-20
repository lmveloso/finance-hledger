// Row per category in the "Despesas" section.
//
// Shows category name, absolute amount, and the share of the month's total
// expenses. Matches the visual language of the existing Resumo category list.

import React from 'react';
import { color } from '../../../theme/tokens';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

function CategoriaRow({ nome, valor, pct, isLast, accentColor }) {
  const pctLabel = Number.isFinite(pct) ? `${Math.round(pct)}%` : '—';
  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: isLast ? 'none' : `1px solid ${color.border.default}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: accentColor || color.accent.primary,
              flexShrink: 0,
            }}
          />
          <span
            className="sans"
            style={{
              fontSize: 14,
              color: color.text.secondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nome}
          </span>
        </div>
        <div
          className="sans"
          style={{
            fontSize: 14,
            color: color.text.primary,
            whiteSpace: 'nowrap',
            display: 'flex',
            gap: 8,
            alignItems: 'baseline',
          }}
        >
          <span className="serif" style={{ fontSize: 15 }}>{BRL(valor)}</span>
          <span style={{ fontSize: 12, color: color.text.muted }}>{pctLabel}</span>
        </div>
      </div>
      <div style={{ height: 3, background: color.border.default }}>
        <div
          style={{
            height: '100%',
            width: `${Math.max(0, Math.min(100, pct || 0))}%`,
            background: accentColor || color.accent.primary,
            opacity: 0.8,
          }}
        />
      </div>
    </div>
  );
}

export default CategoriaRow;
