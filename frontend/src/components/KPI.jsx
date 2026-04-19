import React from 'react';
import { color } from '../theme/tokens';

// Local BRL formatter — duplicated from App.jsx (formerly Dashboard.jsx) so this component stays
// self-contained. A shared formatters module is out of scope for PR-F2 and will
// likely land with the i18n/currency decoupling noted in docs §6.2.
const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

// KPI card used across tabs: label in small caps, large BRL value, optional
// colored left border for emphasis, optional delta badge (rendered by the
// caller and forwarded verbatim), placeholder '···' while loading.
// Behavior preserved from the previous inline definition in App.jsx (formerly Dashboard.jsx).
//
// `sparkline` is an optional ReactNode slot rendered below the big number.
// Added in PR-U2 (Resumo redesign) to support inline SVG sparklines; additive
// and defaulted to null so existing call-sites are unaffected.
function KPI({ label, valor, icon, cor, destaque, loading, delta, sparkline }) {
  return (
    <div
      className="card"
      style={{
        borderLeft: destaque
          ? `3px solid ${cor}`
          : `1px solid ${color.border.default}`,
      }}
    >
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
        <span style={{ color: cor }}>{icon}</span> {label}
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
        {loading ? '···' : BRL(valor)}
        {delta}
      </div>
      {sparkline && <div style={{ marginTop: 14 }}>{sparkline}</div>}
    </div>
  );
}

export default KPI;
