import React, { useState } from 'react';
import { color, radius, padding } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { useCategoriaMes } from '../hooks/useCategoriaMes.js';
import { monthLabel } from '../components/MatrixTable.jsx';
import { t } from '../../../i18n';

// View 1 (PR-U4) — Categoria × Mês as a CSS-grid heatmap.
//
// Top 7 categories by annual total, with per-row alpha scaling so every
// row reveals its own gradient regardless of magnitude. Inline rgba()
// colours (indigo for dark, violet-indigo for light) come straight from
// the mock at docs/design/fase-u/project/src/tab-ano.jsx and are
// load-bearing scaling values, so they are the only literals in this
// file — everything else flows through the theme tokens.
//
// The monthly totals row summarises the 7 rendered rows only (not all
// categories) so the mini-bars match what the user actually sees above.
const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL',
});

const LEGEND_STOPS = [0.1, 0.3, 0.55, 0.8, 1.0];

function cellBackground(value, rowMax, isDark) {
  if (value <= 0) return color.bg.cardAlt;
  const intensity = value / rowMax;
  const alpha = 0.1 + intensity * 0.78;
  return isDark
    ? `rgba(99,102,241,${alpha})`
    : `rgba(79,82,221,${alpha})`;
}

function cellTextColor(value, rowMax, isDark) {
  if (value <= 0) return color.text.disabled;
  const intensity = value / rowMax;
  if (intensity > 0.5) return isDark ? '#e0e6ff' : '#ffffff';
  return color.text.secondary;
}

function HeatmapView({ year }) {
  const { loading, error, months, categories, matrix } = useCategoriaMes(year);
  const [hoveredCell, setHoveredCell] = useState(null);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  if (!categories.length) {
    return (
      <div className="sans" style={{ color: color.text.muted, fontSize: 13, padding: 24 }}>
        {t('ano.empty', { year })}
      </div>
    );
  }

  const topCats = categories.slice(0, 7);
  const rowData = topCats.map(name => months.map(m => matrix[name]?.[m] || 0));
  const catMax = rowData.map(row => Math.max(...row, 1));
  const monthTotals = months.map((_, mi) => rowData.reduce((s, r) => s + r[mi], 0));
  const maxTotal = Math.max(...monthTotals, 1);

  const isDark = color.isDark;
  const gridCols = '110px repeat(12, 1fr)';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card" style={{ padding: padding.rounded.card, overflowX: 'auto' }}>
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
          {t('ano.title.categoria', { year })}
        </div>

        <div style={{ minWidth: 640 }}>
          {/* Month headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              gap: 3,
              marginBottom: 4,
            }}
          >
            <div />
            {months.map(m => (
              <div
                key={m}
                className="sans"
                style={{
                  fontSize: 10,
                  color: color.text.muted,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {monthLabel(m)}
              </div>
            ))}
          </div>

          {/* Category rows */}
          {topCats.map((cat, ci) => (
            <div
              key={cat}
              style={{
                display: 'grid',
                gridTemplateColumns: gridCols,
                gap: 3,
                marginBottom: 3,
              }}
            >
              <div
                className="sans"
                style={{
                  fontSize: 12,
                  color: color.text.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  paddingRight: 8,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={cat}
              >
                {cat}
              </div>
              {rowData[ci].map((val, mi) => {
                const isHovered = hoveredCell && hoveredCell[0] === ci && hoveredCell[1] === mi;
                return (
                  <div
                    key={mi}
                    onMouseEnter={() => setHoveredCell([ci, mi])}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={val > 0 ? `${cat} · ${monthLabel(months[mi])}: ${BRL(val)}` : '—'}
                    style={{
                      height: 36,
                      borderRadius: radius.rounded.xs,
                      background: cellBackground(val, catMax[ci], isDark),
                      border: `1px solid ${isHovered ? color.accent.primary : color.border.subtle}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: val > 0 ? 'pointer' : 'default',
                      transition: 'border-color 0.12s',
                    }}
                  >
                    {val > 0 && (
                      <span
                        className="sans"
                        style={{
                          fontSize: 9.5,
                          color: cellTextColor(val, catMax[ci], isDark),
                          fontWeight: 500,
                        }}
                      >
                        {(val / 1000).toFixed(1)}k
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Monthly totals row (bars) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              gap: 3,
              marginTop: 8,
            }}
          >
            <div
              className="sans"
              style={{
                fontSize: 10,
                color: color.text.muted,
                display: 'flex',
                alignItems: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {t('ano.total.row')}
            </div>
            {monthTotals.map((tot, mi) => (
              <div
                key={mi}
                title={tot > 0 ? `${monthLabel(months[mi])}: ${BRL(tot)}` : '—'}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: 24,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '70%',
                      height: tot > 0 ? `${(tot / maxTotal) * 100}%` : '2px',
                      background: color.accent.primary,
                      opacity: 0.6,
                      borderRadius: `${radius.rounded.xs}px ${radius.rounded.xs}px 0 0`,
                      minHeight: 2,
                    }}
                  />
                </div>
                {tot > 0 && (
                  <span
                    className="sans"
                    style={{ fontSize: 9, color: color.text.muted }}
                  >
                    {(tot / 1000).toFixed(1)}k
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span
          className="sans"
          style={{ fontSize: 10, color: color.text.disabled }}
        >
          {t('ano.legend.intensity')}
        </span>
        {LEGEND_STOPS.map(v => (
          <div
            key={v}
            style={{
              width: 20,
              height: 12,
              borderRadius: radius.rounded.xs,
              background: isDark
                ? `rgba(99,102,241,${0.1 + v * 0.78})`
                : `rgba(79,82,221,${0.1 + v * 0.78})`,
            }}
          />
        ))}
        <span
          className="sans"
          style={{ fontSize: 10, color: color.text.disabled }}
        >
          {t('ano.legend.max')}
        </span>
      </div>
    </div>
  );
}

export default HeatmapView;
