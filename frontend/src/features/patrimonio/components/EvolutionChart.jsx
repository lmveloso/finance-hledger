import React, { useMemo, useRef, useState } from 'react';
import { color } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import { t } from '../../../i18n';
import { EvolutionTooltip, LegendChip } from './EvolutionLegend.jsx';

const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
});

// Same short-month convention used across features.
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const idx = parseInt(m, 10) - 1;
  return `${MONTH_LABELS[idx] || ym} ${String(y).slice(-2)}`;
}

// Native SVG area chart for net-worth evolution (PR-U7).
//
// Replaces Recharts with a hand-rolled three-series chart:
//   - Ativos   : filled area (positive feedback), light stroke
//   - Líquido  : filled area (accent primary), main stroke
//   - Passivos : dashed stroke only (negative feedback, absolute value)
//
// Interaction: React tooltip via mouse/touch handlers on the SVG — no
// foreignObject. A vertical indicator line + three markers are drawn at
// the active index; an absolute-positioned card shows the three values.
// See docs/04-PRD-ui-ux.md §PR-U7 and WaterfallView / BudgetDonut for
// established SVG patterns in this codebase.
//
// Props:
//   months: [{ mes: 'YYYY-MM', assets, liabilities, net }]
const W = 800;
const H = 220;
const MARGIN = { top: 8, right: 8, bottom: 24, left: 44 };
const TOOLTIP_W = 200;

function EvolutionChart({ months = [] }) {
  const { mode } = useTheme();
  const [activeIdx, setActiveIdx] = useState(null);
  const [cursorX, setCursorX] = useState(0);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const data = useMemo(
    () => months.map(m => ({ ...m, label: monthLabel(m.mes) })),
    [months],
  );

  const geom = useMemo(() => {
    const n = data.length;
    const innerW = W - MARGIN.left - MARGIN.right;
    const innerH = H - MARGIN.top - MARGIN.bottom;
    const yMax = n > 0
      ? Math.max(...data.map(d => Math.max(d.assets || 0, d.net || 0)), 1) * 1.05
      : 1;

    const xScale = (i) => n <= 1
      ? MARGIN.left + innerW / 2
      : MARGIN.left + (i / (n - 1)) * innerW;
    const yScale = (v) => MARGIN.top + innerH - (Math.max(0, v) / yMax) * innerH;

    const buildLine = (key, abs = false) => data.map((d, i) => {
      const raw = d[key] ?? 0;
      const v = abs ? Math.abs(raw) : raw;
      return `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(v)}`;
    }).join(' ');

    const buildArea = (key) => {
      if (n === 0) return '';
      const top = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d[key] ?? 0)}`).join(' ');
      const baseY = MARGIN.top + innerH;
      return `${top} L${xScale(n - 1)},${baseY} L${xScale(0)},${baseY} Z`;
    };

    return {
      n, innerW, innerH, yMax, xScale, yScale,
      areaAtivos:    buildArea('assets'),
      areaLiquido:   buildArea('net'),
      strokeAtivos:  buildLine('assets'),
      strokeLiquido: buildLine('net'),
      linePassivos:  buildLine('liabilities', true),
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="sans" style={{ color: color.text.muted, fontSize: 13, padding: '8px 0' }}>
        {t('patrimonio.evolution.empty')}
      </div>
    );
  }

  const handleMove = (clientX) => {
    if (!svgRef.current || geom.n === 0) return;
    const bbox = svgRef.current.getBoundingClientRect();
    const pxX = clientX - bbox.left;
    const svgX = (pxX / bbox.width) * W;
    const idx = geom.n <= 1
      ? 0
      : Math.round(((svgX - MARGIN.left) / geom.innerW) * (geom.n - 1));
    const clamped = Math.max(0, Math.min(geom.n - 1, idx));
    setActiveIdx(clamped);
    if (containerRef.current) {
      const cbox = containerRef.current.getBoundingClientRect();
      setCursorX(clientX - cbox.left);
    }
  };

  const handleLeave = () => setActiveIdx(null);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => geom.yMax * p);
  const xStride = Math.max(1, Math.floor(geom.n / 6));

  const active = activeIdx != null ? data[activeIdx] : null;
  const activeX = activeIdx != null ? geom.xScale(activeIdx) : 0;

  // Tooltip placement: prefer right of cursor; flip left if it would overflow.
  const containerWidth = containerRef.current?.getBoundingClientRect().width || 0;
  let tooltipLeft = cursorX + 14;
  if (tooltipLeft + TOOLTIP_W > containerWidth) {
    tooltipLeft = Math.max(0, cursorX - TOOLTIP_W - 14);
  }

  return (
    <div>
      <div
        ref={containerRef}
        style={{ position: 'relative', height: 260 }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          width="100%"
          height="220"
          style={{ display: 'block', overflow: 'visible' }}
          onMouseMove={(e) => handleMove(e.clientX)}
          onMouseLeave={handleLeave}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          onTouchEnd={handleLeave}
        >
          <defs>
            <linearGradient id={`gradAtivos-${mode}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color.feedback.positive} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color.feedback.positive} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`gradLiquido-${mode}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color.accent.primary} stopOpacity="0.30" />
              <stop offset="100%" stopColor={color.accent.primary} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines at 0/25/50/75/100% of innerH */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = MARGIN.top + geom.innerH * p;
            return (
              <line
                key={i}
                x1={MARGIN.left}
                x2={MARGIN.left + geom.innerW}
                y1={y}
                y2={y}
                stroke={color.border.subtle}
                strokeDasharray="3 3"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {/* Y tick labels (right-aligned) */}
          {yTicks.map((v, i) => {
            const p = (yTicks.length - 1 - i) / (yTicks.length - 1);
            const y = MARGIN.top + geom.innerH * p;
            return (
              <text
                key={i}
                x={MARGIN.left - 6}
                y={y + 3}
                textAnchor="end"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
                fontSize="10"
                fill={color.text.disabled}
              >
                {`${(v / 1000).toFixed(0)}k`}
              </text>
            );
          })}

          {/* X tick labels */}
          {data.map((d, i) => {
            if (i % xStride !== 0) return null;
            return (
              <text
                key={i}
                x={geom.xScale(i)}
                y={H - 8}
                textAnchor="middle"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
                fontSize="10"
                fill={color.text.disabled}
              >
                {d.label}
              </text>
            );
          })}

          {/* Ativos area + stroke */}
          <path d={geom.areaAtivos} fill={`url(#gradAtivos-${mode})`} />
          <path
            d={geom.strokeAtivos}
            fill="none"
            stroke={color.feedback.positive}
            strokeWidth="1.5"
            strokeOpacity="0.7"
            vectorEffect="non-scaling-stroke"
          />

          {/* Líquido area + stroke (painted over ativos to read as primary) */}
          <path d={geom.areaLiquido} fill={`url(#gradLiquido-${mode})`} />
          <path
            d={geom.strokeLiquido}
            fill="none"
            stroke={color.accent.primary}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Passivos dashed stroke */}
          <path
            d={geom.linePassivos}
            fill="none"
            stroke={color.feedback.negative}
            strokeWidth="1"
            strokeOpacity="0.5"
            strokeDasharray="4 2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Active indicator: vertical line + three markers */}
          {active && (
            <g>
              <line
                x1={activeX}
                x2={activeX}
                y1={MARGIN.top}
                y2={MARGIN.top + geom.innerH}
                stroke={color.border.default}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={activeX} cy={geom.yScale(active.assets ?? 0)} r="3" fill={color.feedback.positive} />
              <circle cx={activeX} cy={geom.yScale(active.net ?? 0)} r="3" fill={color.accent.primary} />
              <circle cx={activeX} cy={geom.yScale(Math.abs(active.liabilities ?? 0))} r="3" fill={color.feedback.negative} />
            </g>
          )}
        </svg>

        {active && (
          <EvolutionTooltip
            left={tooltipLeft}
            label={active.label}
            rows={[
              { dot: color.accent.primary, label: t('patrimonio.net'), value: BRL(active.net ?? 0) },
              { dot: color.feedback.positive, label: t('patrimonio.assets'), value: BRL(active.assets ?? 0) },
              { dot: color.feedback.negative, label: t('patrimonio.liabilities'), value: BRL(Math.abs(active.liabilities ?? 0)), dashed: true },
            ]}
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
        <LegendChip color={color.accent.primary} label={t('patrimonio.net')} />
        <LegendChip color={color.feedback.positive} label={t('patrimonio.assets')} />
        <LegendChip color={color.feedback.negative} label={t('patrimonio.liabilities')} dashed />
      </div>
    </div>
  );
}

export default EvolutionChart;
