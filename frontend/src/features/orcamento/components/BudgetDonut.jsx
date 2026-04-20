import React from 'react';
import { color } from '../../../theme/tokens';

// SVG donut ring for the total-budget hero card (PR-U6).
//
// Geometry matches the design prototype exactly
// (docs/design/fase-u/project/src/tab-orcamento.jsx):
//   viewBox 0 0 72 72, r=28, strokeWidth=8, circumference = 2·π·28 ≈ 175.9.
//
// Rotation: the wrapper SVG is rotated -90deg so 0% starts at 12 o'clock
// and the ring grows clockwise. strokeDashoffset stays at 0.
//
// Progress is clamped at 100% so over-budget does not wrap the ring back to
// the start — the `over` prop is used to paint the stroke red instead.
// The center label (percentage) is rendered by the parent; this component
// only draws the ring so the parent can overlay whatever label it wants.

const CIRCUMFERENCE = 175.9; // literal from the prototype

function BudgetDonut({ pct, over, size = 72 }) {
  const clamped = Math.max(0, Math.min(pct, 100)) / 100;
  const stroke = over ? color.feedback.negative : color.accent.primary;

  return (
    <svg
      viewBox="0 0 72 72"
      width={size}
      height={size}
      style={{ transform: 'rotate(-90deg)', display: 'block' }}
      aria-hidden="true"
    >
      <circle
        cx="36"
        cy="36"
        r="28"
        fill="none"
        stroke={color.border.default}
        strokeWidth="8"
      />
      <circle
        cx="36"
        cy="36"
        r="28"
        fill="none"
        stroke={stroke}
        strokeWidth="8"
        strokeDasharray={`${clamped * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

export default BudgetDonut;
