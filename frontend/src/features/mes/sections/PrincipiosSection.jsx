// Section 3 — Targets by principle.
//
// Backend contract (/api/principles/summary, PR-D1):
//   { month, principles: [{ id, target_pct, realized_pct, realized_amount }] }
//
// Layout (PR-U3 restyle): one row per principle. Top line = label + meta/real/amount.
// Bottom line = 6px track with a fill capped at 100% (ratio = realized/target) and a
// small target marker at the 100% position. Over-budget (realized > target) bolds the
// realized % and tints it with feedback.negative — the bar hue stays on the palette.
//
// No header row — the inline layout carries all information.

import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import { usePrincipios } from '../hooks/usePrincipios.js';
import { t } from '../../../i18n/index.js';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

// Ordered list of principle IDs (PRD §4.1). Rendered in this order even when
// the backend omits some principles or returns them in a different order.
const PRINCIPLE_ORDER = [
  'custos-fixos',
  'conforto',
  'metas',
  'prazeres',
  'liberdade-financeira',
  'aumentar-renda',
  'reserva-de-oportunidade',
];

// Apply alpha to a 6-char hex color. Returns the input unchanged if it doesn't
// match the `#RRGGBB` shape (rgba() tokens etc. pass through).
function withAlpha(hex, a) {
  if (typeof hex !== 'string') return hex;
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function PrincipleBar({ id, target, realized, amount, paletteColor, isLast }) {
  const hasTarget = Number.isFinite(target) && target > 0;
  const hasRealized = Number.isFinite(realized);
  const ratio = hasTarget && hasRealized ? realized / target : 0;
  const over = hasTarget && hasRealized && realized > target;
  const barColor = withAlpha(paletteColor, 0.75);

  return (
    <div
      style={{
        paddingBottom: 14,
        marginBottom: 14,
        borderBottom: isLast ? 'none' : `1px solid ${color.border.subtle}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 7,
          gap: 12,
        }}
      >
        <span
          className="sans"
          style={{ fontSize: 13, color: color.text.secondary, minWidth: 0 }}
        >
          {t(`principle.${id}`)}
        </span>
        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'baseline',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            className="sans"
            style={{ fontSize: 11, color: color.text.muted }}
          >
            {hasTarget
              ? t('mes.principles.meta', { pct: `${Math.round(target)}%` })
              : '—'}
          </span>
          <span
            className="sans"
            style={{
              fontSize: 13,
              color: over ? color.feedback.negative : color.text.primary,
              fontWeight: over ? 700 : 600,
            }}
          >
            {hasRealized ? `${Math.round(realized)}%` : '—'}
          </span>
          <span
            className="serif"
            style={{ fontSize: 13, color: color.text.muted }}
          >
            {amount ? BRL(amount) : '—'}
          </span>
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          height: 6,
          background: color.border.default,
          borderRadius: 999,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(Math.max(ratio, 0) * 100, 100)}%`,
            background: barColor,
            borderRadius: 999,
            transition: 'width 0.2s ease',
          }}
        />
        {hasTarget && (
          <div
            style={{
              position: 'absolute',
              top: -3,
              left: '100%',
              transform: 'translateX(-1px)',
              width: 2,
              height: 12,
              background: color.text.disabled,
              borderRadius: 1,
            }}
          />
        )}
      </div>
    </div>
  );
}

function PrincipiosSection() {
  const { data, error, loading } = usePrincipios();

  const principles = data?.principles || [];
  const byId = Object.fromEntries(principles.map((p) => [p.id, p]));
  const palette = color.chart.colors;

  return (
    <div className="card">
      <div
        className="sans"
        style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          color: color.text.muted,
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        {t('mes.principles.title')}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <div
          className="sans"
          style={{ fontSize: 13, color: color.text.muted, padding: '8px 0' }}
        >
          {t('mes.principles.unavailable')}
        </div>
      ) : (
        PRINCIPLE_ORDER.map((id, i) => {
          const p = byId[id] || {};
          return (
            <PrincipleBar
              key={id}
              id={id}
              target={p.target_pct}
              realized={p.realized_pct}
              amount={p.realized_amount}
              paletteColor={palette[i % palette.length]}
              isLast={i === PRINCIPLE_ORDER.length - 1}
            />
          );
        })
      )}
    </div>
  );
}

export default PrincipiosSection;
