import React from 'react';
import { color, radius, padding } from '../../../theme/tokens';
import { t } from '../../../i18n/index.js';
import BudgetDonut from './BudgetDonut.jsx';

// Format BRL with no fractional digits (hero figures read cleaner).
// The per-category row intentionally shows 2 decimals (see CategoryRow).
const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

const PCT = (n) => `${Math.round(n)}%`;

/**
 * Total budget hero card for the Orçamento tab.
 *
 * Renders:
 *   [ label + big realizado / of orçado ]  [ 72px donut with % label ]
 *   [ ───── horizontal track ───── ]
 *   ( over-budget subtitle, red, only when totalOver )
 *
 * Over-budget state is visualised three ways:
 *   - 2px red strip across the top of the card
 *   - red border (negative/40%) replacing the default border
 *   - donut + center % + big number + bar all switch to feedback.negative
 *   - red subtitle with "R$X acima do orçamento total"
 *
 * No yellow warning state (PRD §5 PR-U6 explicitly drops it).
 */
function TotalHeroCard({ total }) {
  const orcado = Number(total?.orcado) || 0;
  const realizado = Number(total?.realizado) || 0;
  const pct = orcado > 0 ? (realizado / orcado) * 100 : 0;
  const over = realizado > orcado;

  const ringColor = over ? color.feedback.negative : color.accent.primary;
  const borderColor = over
    ? `${color.feedback.negative}60`
    : color.border.default;

  return (
    <div
      style={{
        background: color.bg.card,
        border: `1px solid ${borderColor}`,
        borderRadius: radius.rounded.md,
        padding: padding.rounded.card,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {over && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: color.feedback.negative,
          }}
        />
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontSize: 10,
              color: color.text.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              marginBottom: 8,
            }}
          >
            {t('orcamento.total.title')}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: 36,
                color: over ? color.feedback.negative : color.text.primary,
                letterSpacing: '-0.02em',
              }}
            >
              {BRL(realizado)}
            </span>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: 14,
                color: color.text.muted,
              }}
            >
              {t('orcamento.total.of', { amount: BRL(orcado) })}
            </span>
          </div>
        </div>

        <div style={{ position: 'relative', width: 72, height: 72 }}>
          <BudgetDonut pct={pct} over={over} size={72} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: ringColor,
            }}
          >
            {PCT(pct)}
          </div>
        </div>
      </div>

      <div
        style={{
          height: 8,
          background: color.border.default,
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(pct, 100)}%`,
            background: ringColor,
            borderRadius: 999,
            transition: 'width 0.7s ease',
          }}
        />
      </div>

      {over && (
        <div
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            fontSize: 11,
            color: color.feedback.negative,
            marginTop: 8,
          }}
        >
          {t('orcamento.total.aboveBudget', {
            amount: BRL(realizado - orcado),
          })}
        </div>
      )}
    </div>
  );
}

export default TotalHeroCard;
