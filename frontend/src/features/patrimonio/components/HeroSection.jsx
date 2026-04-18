import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Wallet } from 'lucide-react';
import { color } from '../../../theme/tokens';
import { t } from '../../../i18n';

const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
});

// HeroSection — Patrimonio overview (PR-D7).
// Renders the current net worth as a large serif number, the 12-month delta
// (absolute + percentage), and a sparkline of the last 12 months net values.
//
// Props:
//   months: [{ mes: 'YYYY-MM', assets, liabilities, net }]
//   totalAssets:      number — current assets total (overrides last month if given)
//   totalLiabilities: number — positive value (already absolute) for display
function HeroSection({ months = [], totalAssets, totalLiabilities }) {
  const spark = months.slice(-12);
  const first = spark[0];
  const last = spark[spark.length - 1];

  // Prefer the live accounts totals when available; otherwise fall back to
  // the last networth data point so the hero still renders if /api/accounts
  // is empty (pre-existing endpoint mismatch tracked separately).
  const netFromAccounts = (totalAssets != null && totalLiabilities != null)
    ? totalAssets - totalLiabilities
    : null;
  const currentNet = netFromAccounts != null ? netFromAccounts : (last?.net ?? 0);

  const delta = first && last ? (last.net - first.net) : null;
  const deltaPct = (delta != null && first && first.net !== 0)
    ? (delta / Math.abs(first.net)) * 100
    : null;
  const deltaColor = delta == null
    ? color.text.muted
    : delta >= 0 ? color.feedback.positive : color.feedback.negative;

  const sparkColor = delta == null || delta >= 0
    ? color.feedback.positive
    : color.feedback.negative;

  return (
    <div className="card" style={{ borderLeft: `3px solid ${color.accent.warm}` }}>
      <div
        className="sans"
        style={{
          fontSize: 11, letterSpacing: '0.15em', color: color.text.muted,
          textTransform: 'uppercase', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{ color: color.accent.warm }}><Wallet size={15} /></span>
        {t('patrimonio.hero.title')}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 2fr) minmax(180px, 1fr)',
          gap: 24,
          alignItems: 'center',
        }}
      >
        <div>
          <div
            className="serif"
            style={{
              fontSize: 46, fontWeight: 600, color: color.accent.warm,
              letterSpacing: '-0.02em', lineHeight: 1,
            }}
          >
            {BRL(currentNet)}
          </div>
          {delta != null && (
            <div
              className="sans"
              style={{
                fontSize: 13, color: deltaColor, fontWeight: 500, marginTop: 10,
              }}
            >
              {delta >= 0 ? '+' : '−'}{BRL(Math.abs(delta))}
              {deltaPct != null && (
                <span style={{ opacity: 0.75, marginLeft: 6 }}>
                  ({delta >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%)
                </span>
              )}
              <span className="sans" style={{ color: color.text.muted, marginLeft: 8, fontWeight: 400 }}>
                {t('patrimonio.hero.vs12months')}
              </span>
            </div>
          )}
          {(totalAssets != null || totalLiabilities != null) && (
            <div
              className="sans"
              style={{ fontSize: 11, color: color.text.disabled, marginTop: 8, letterSpacing: '0.02em' }}
            >
              {BRL(totalAssets ?? 0)} <span style={{ color: color.text.faintAlt }}>({t('patrimonio.assets')})</span>
              {' − '}
              {BRL(totalLiabilities ?? 0)} <span style={{ color: color.text.faintAlt }}>({t('patrimonio.liabilities')})</span>
            </div>
          )}
        </div>

        <div style={{ height: 70, minWidth: 0 }}>
          {spark.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke={sparkColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="sans"
              style={{
                fontSize: 11, color: color.text.muted, textAlign: 'right',
              }}
            >
              {t('patrimonio.hero.sparkEmpty')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HeroSection;
