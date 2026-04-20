import React from 'react';
import { color, radius } from '../../../theme/tokens';

// Inline helpers for EvolutionChart (PR-U7): the legend chips below the
// chart and the tooltip card rendered on hover. Split out to keep
// EvolutionChart.jsx under the 300-LOC cap mandated by the frontend-dev
// preamble (docs/01-ESTABILIZACAO.md §4).

export function LegendChip({ color: dotColor, label, dashed = false }) {
  return (
    <span
      className="sans"
      style={{
        fontSize: 11,
        color: color.text.muted,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {dashed ? (
        <span
          style={{
            width: 20,
            borderTop: `2px dashed ${dotColor}`,
            display: 'inline-block',
            opacity: 0.8,
          }}
        />
      ) : (
        <span
          style={{
            width: 20,
            height: 2,
            background: dotColor,
            display: 'inline-block',
          }}
        />
      )}
      {label}
    </span>
  );
}

function TooltipRow({ dot, label, value, dashed }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '3px 0',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {dashed ? (
          <span
            style={{
              width: 10,
              borderTop: `2px dashed ${dot}`,
              display: 'inline-block',
              opacity: 0.8,
            }}
          />
        ) : (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: dot,
              display: 'inline-block',
            }}
          />
        )}
        <span style={{ fontSize: 11, color: color.text.muted }}>{label}</span>
      </span>
      <span
        className="serif"
        style={{ fontSize: 12, color: color.text.primary, fontWeight: 500 }}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Hover tooltip for the evolution chart.
 *
 * Rendered as an absolute-positioned sibling of the SVG (not a foreignObject)
 * so it escapes the SVG's viewBox scaling. The parent is responsible for
 * computing `left` via bbox math and clamping within the container.
 */
export function EvolutionTooltip({ left, label, rows }) {
  return (
    <div
      className="sans"
      style={{
        position: 'absolute',
        top: 8,
        left,
        width: 200,
        background: color.bg.card,
        border: `1px solid ${color.border.default}`,
        borderRadius: radius.rounded.sm,
        padding: 10,
        pointerEvents: 'none',
        zIndex: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: color.text.muted,
          marginBottom: 6,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      {rows.map((r, i) => (
        <TooltipRow
          key={i}
          dot={r.dot}
          label={r.label}
          value={r.value}
          dashed={r.dashed}
        />
      ))}
    </div>
  );
}
