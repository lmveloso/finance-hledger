import React, { useMemo } from 'react';
import { color, radius } from '../../../theme/tokens';
import { t } from '../../../i18n/index.js';
import { buildWaterfall } from '../lib/waterfall.js';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

// Resolve a colorToken like 'feedback.positive' against the live token proxy.
// Unknown tokens fall back to text.primary so a misconfigured entry is still
// visible rather than silently transparent.
function resolveToken(token) {
  if (!token || typeof token !== 'string') return color.text.primary;
  const [group, key] = token.split('.');
  const g = color[group];
  if (g && g[key]) return g[key];
  return color.text.primary;
}

/**
 * Inline waterfall chart for the Fluxo tab.
 *
 * Renders each step as a row with:
 *   [ right-aligned label ] [ bar track ] [ signed amount ]
 *
 * Bar geometry:
 *   - track width = scale = max(total_entradas, |total_economia|).
 *   - expense bars float at the running cumulative (start → end), drawn as
 *     a block offset from the left edge.
 *   - result bar is always anchored at 0, spanning 0 → total_economia.
 *
 * No chart library — pure div boxes with inline styles. Dark/light safe via
 * tokens. Renders an empty-state card when there is no activity in the month.
 */
function WaterfallView({ flow, categories }) {
  const bars = useMemo(
    () =>
      buildWaterfall(flow, categories, {
        incomeLabel: t('fluxo.receitas'),
        resultLabel: t('fluxo.saldo'),
        outrosLabel: t('fluxo.outros'),
      }),
    [flow, categories],
  );

  if (!bars.length) {
    return (
      <div
        className="card sans"
        style={{
          color: color.text.muted,
          fontSize: 13,
          padding: 18,
        }}
      >
        {t('fluxo.sem_movimento')}
      </div>
    );
  }

  const totalEntradas = Math.abs(Number(flow?.total_entradas) || 0);
  const totalEconomia = Math.abs(Number(flow?.total_economia) || 0);
  const scale = Math.max(totalEntradas, totalEconomia, 1);

  const income = bars.find((b) => b.kind === 'income');
  const result = bars[bars.length - 1];

  return (
    <div className="card" style={{ padding: 18 }}>
      <div
        className="sans"
        style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          color: color.text.muted,
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        {t('fluxo.waterfall.title')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {bars.map((bar, i) => (
          <BarRow key={i} bar={bar} scale={scale} />
        ))}
      </div>

      {income && result && (
        <div
          className="sans"
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid ${color.border.subtle}`,
            fontSize: 11,
            color: color.text.muted,
            lineHeight: 1.6,
          }}
        >
          {t('fluxo.waterfall.footnote.prefix')}{' '}
          <strong style={{ color: resolveToken(income.colorToken) }}>
            {BRL(income.delta)}
          </strong>
          {' '}
          {t('fluxo.waterfall.footnote.middle')}{' '}
          <strong style={{ color: resolveToken(result.colorToken) }}>
            {formatSigned(result.delta)}
          </strong>
          {t('fluxo.waterfall.footnote.suffix')}
        </div>
      )}
    </div>
  );
}

function BarRow({ bar, scale }) {
  const barColor = resolveToken(bar.colorToken);
  const widthPct = Math.min(100, (Math.abs(bar.delta) / scale) * 100);

  // Offset from the left edge, expressed as a percentage of the track.
  //   income/result: always anchored at 0.
  //   expense:       anchored at the running END (post-step cumulative).
  //                  end = start - valor, so offset = end/scale.
  let offsetPct = 0;
  if (bar.kind === 'expense') {
    offsetPct = Math.max(0, (bar.end / scale) * 100);
  }

  const isLabelMuted = bar.kind === 'expense';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(80px, 140px) 1fr minmax(80px, 110px)',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <span
        className="sans"
        style={{
          fontSize: 12,
          color: isLabelMuted ? color.text.secondary : color.text.primary,
          textAlign: 'right',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: bar.kind === 'result' ? 600 : 400,
        }}
      >
        {bar.label}
      </span>

      <div
        style={{
          position: 'relative',
          height: 24,
          background: color.bg.cardAlt,
          borderRadius: radius.rounded.xs,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${offsetPct}%`,
            top: 0,
            height: '100%',
            width: `${widthPct}%`,
            background: barColor,
            opacity: bar.kind === 'result' ? 1 : 0.82,
            borderRadius: radius.rounded.xs,
            transition: 'width 0.4s ease, left 0.4s ease',
          }}
        />
      </div>

      <span
        className="serif"
        style={{
          fontSize: 13,
          color: barColor,
          textAlign: 'right',
          whiteSpace: 'nowrap',
          fontWeight: bar.kind === 'result' ? 600 : 500,
        }}
      >
        {formatSigned(bar.delta)}
      </span>
    </div>
  );
}

function formatSigned(v) {
  if (v < 0) return `−${BRL(Math.abs(v))}`;
  if (v > 0) return `+${BRL(v)}`;
  return BRL(0);
}

export default WaterfallView;
