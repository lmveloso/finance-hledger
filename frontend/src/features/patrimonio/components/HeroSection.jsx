import React from 'react';
import { color, radius, padding } from '../../../theme/tokens';
import { t } from '../../../i18n';

const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
});

// HeroSection — Patrimonio overview (PR-U7).
//
// Gradient-border hero with large serif net-worth number and an
// ativos/passivos split. The month-over-month delta is derived from the
// last two `months` entries (net[last] - net[last-1]), replacing the
// prior 12-month comparison and the Recharts sparkline.
//
// Layout:
//   ┌─────────────────────────────────────────── ← 2px accent bar
//   │ Eyebrow (uppercase, muted)
//   │ Display number (52px, accent.primary)
//   │ Delta row (↑/↓ + BRL + "vs mês anterior")
//   │
//   │ ┌──────────┐  ┌──────────┐
//   │ │ ATIVOS   │  │ PASSIVOS │
//   │ │ 24px big │  │ 24px big │
//   │ └──────────┘  └──────────┘
//   └───────────────────────────────────────────
//
// Props:
//   months:           [{ mes: 'YYYY-MM', assets, liabilities, net }, ...]
//   totalAssets:      number — from /api/accounts (source of truth for split)
//   totalLiabilities: number — absolute (already positive) for display
function HeroSection({ months = [], totalAssets, totalLiabilities }) {
  const last = months[months.length - 1];
  const prev = months[months.length - 2];

  // Prefer the live accounts totals for the split when available; fall back
  // to the last networth data point so the hero still renders if accounts
  // are empty.
  const netFromAccounts = (totalAssets != null && totalLiabilities != null)
    ? totalAssets - totalLiabilities
    : null;
  const currentNet = netFromAccounts != null ? netFromAccounts : (last?.net ?? 0);

  const delta = (last && prev) ? (last.net - prev.net) : null;
  const deltaColor = delta == null
    ? color.text.muted
    : delta >= 0 ? color.feedback.positive : color.feedback.negative;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${color.accent.primary}18 0%, ${color.bg.card} 60%)`,
        border: `1px solid ${color.accent.primary}44`,
        borderRadius: radius.rounded.md,
        padding: padding.rounded.card,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Gradient accent bar at top */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${color.accent.primary}, ${color.accent.secondary})`,
        }}
      />

      {/* Eyebrow */}
      <div
        className="sans"
        style={{
          fontSize: 10,
          color: color.text.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          marginBottom: 10,
        }}
      >
        {t('patrimonio.hero.net')}
      </div>

      {/* Display-font net number */}
      <div
        className="serif"
        style={{
          fontSize: 52,
          color: color.accent.primary,
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}
      >
        {BRL(currentNet)}
      </div>

      {/* Delta row */}
      {delta != null && (
        <div
          className="sans"
          style={{
            fontSize: 13,
            color: deltaColor,
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          <span>{delta >= 0 ? '↑' : '↓'}</span>
          <span>{BRL(Math.abs(delta))}</span>
          <span style={{ color: color.text.muted }}>{t('patrimonio.hero.vsPrevMonth')}</span>
        </div>
      )}

      {/* Ativos / Passivos split */}
      <div style={{ display: 'flex', gap: 32, marginTop: 20, flexWrap: 'wrap' }}>
        <div>
          <div
            className="sans"
            style={{
              fontSize: 10,
              color: color.text.muted,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {t('patrimonio.assets')}
          </div>
          <div
            className="serif"
            style={{ fontSize: 24, color: color.feedback.positive }}
          >
            {BRL(totalAssets ?? 0)}
          </div>
        </div>
        <div>
          <div
            className="sans"
            style={{
              fontSize: 10,
              color: color.text.muted,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {t('patrimonio.liabilities')}
          </div>
          <div
            className="serif"
            style={{ fontSize: 24, color: color.feedback.negative }}
          >
            {BRL(totalLiabilities ?? 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;
