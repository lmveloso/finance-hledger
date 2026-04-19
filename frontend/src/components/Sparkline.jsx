// Inline SVG sparkline atom. Intentionally raw SVG — no Recharts, no external
// dependency. Ported from docs/design/fase-u/project/src/components.jsx
// (lines 16-39) during PR-U2 (Resumo redesign).
//
// Renders two layered paths:
//   - a filled area under the line, fading from `color` to transparent;
//   - a 1.5px stroke over the top in the same color.
//
// `data` must have at least 2 numeric points; otherwise returns null (no
// guess-rendering for empty series).

import React from 'react';

function Sparkline({ data, color, height = 36 }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 100;
  const H = height;

  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - ((v - min) / range) * (H - 6) - 3,
  ]);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  // Unique gradient id per (color, height) so multiple sparklines on the
  // same page don't collide. The string only has to be stable within this
  // component's lifecycle — a simple normalization is enough.
  const uid = `sg${String(color).replace(/[^a-z0-9]/gi, '')}${height}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height, display: 'block' }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${uid})`} />
      <path
        d={line}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Sparkline;
