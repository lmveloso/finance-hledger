import React from 'react';
import { color } from '../theme/tokens';
import { formatBRL } from '../lib/formatBRL';

// KPI card used across tabs: label in small caps, large BRL value, optional
// delta badge (rendered by the caller and forwarded verbatim), placeholder
// '···' while loading.
//
// `destaque` escalates the big number's size (38px instead of 30px) and
// switches its color to `cor`. The previous 3px colored left-stripe was
// retired during the impeccable quieter pass — emphasis is now purely
// typographic, which keeps the card flat and matches DESIGN.md's
// Flat-By-Default rule.
//
// `sparkline` is an optional ReactNode slot rendered below the big number.
function KPI({ label, valor, icon, cor, destaque, loading, delta, sparkline }) {
  return (
    <div className="card">
      <div
        className="sans"
        style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          color: color.text.muted,
          textTransform: 'uppercase',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ color: color.text.muted, display: 'inline-flex' }}>
          {icon}
        </span>{' '}
        {label}
      </div>
      <div
        className="serif"
        style={{
          fontSize: destaque ? 38 : 30,
          fontWeight: 600,
          color: destaque ? cor : color.text.primary,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'baseline',
          flexWrap: 'wrap',
        }}
      >
        {loading ? '···' : formatBRL(valor)}
        {delta}
      </div>
      {sparkline && <div style={{ marginTop: 14 }}>{sparkline}</div>}
    </div>
  );
}

export default KPI;
