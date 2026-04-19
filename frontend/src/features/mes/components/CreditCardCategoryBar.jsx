// Stacked proportion bar for a credit card's spend, split by L1 category.
//
// Stateless primitive. One flex row of colored segments; each segment's width
// is `${pct}%` and background comes from the category's resolved palette hue.
// Zero-width segments are skipped so the bar doesn't grow tiny 0px children.

import React from 'react';
import { color } from '../../../theme/tokens';

function CreditCardCategoryBar({ categories, height = 6 }) {
  const segments = (categories || []).filter(
    (c) => Number.isFinite(c.pct) && c.pct > 0,
  );

  return (
    <div
      style={{
        display: 'flex',
        height,
        background: color.border.default,
        borderRadius: 999,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {segments.map((c) => (
        <div
          key={c.raw}
          style={{
            width: `${c.pct}%`,
            background: c.color,
            height: '100%',
          }}
          title={`${c.nome} · ${Math.round(c.pct)}%`}
        />
      ))}
    </div>
  );
}

export default CreditCardCategoryBar;
