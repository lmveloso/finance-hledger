import React from 'react';
import { color } from '../../theme/tokens';

// Local formatters — duplicated from App.jsx so this feature stays
// self-contained. A shared formatters module will likely land with the
// i18n/currency decoupling noted in docs §6.2.
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n) => `${Math.round(n)}%`;

function BudgetBar({ nome, orcado, realizado, percentual, isTotal }) {
  const fillPct = orcado > 0 ? Math.min((realizado / orcado) * 100, 100) : 0;
  const overBudget = percentual > 100;
  const barColor = overBudget ? color.feedback.negative : color.feedback.positive;
  const barBg = color.border.default;

  return (
    <div style={{ marginBottom: isTotal ? 0 : 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span className="sans" style={{
          fontSize: isTotal ? 14 : 13,
          color: isTotal ? color.text.primary : color.text.secondary,
          fontWeight: isTotal ? 600 : 400,
        }}>
          {nome}
        </span>
        <span className="sans" style={{ fontSize: 13, color: color.text.muted, whiteSpace: 'nowrap', marginLeft: 12 }}>
          {BRLc(realizado)} / {BRLc(orcado)}{' '}
          <span style={{ color: barColor, fontWeight: 600 }}>({pct(percentual)})</span>
        </span>
      </div>
      <div style={{
        height: isTotal ? 10 : 6,
        background: barBg,
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${fillPct}%`,
          background: barColor,
          borderRadius: 3,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}

export default BudgetBar;
