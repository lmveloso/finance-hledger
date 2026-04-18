// Horizontal progress bar used in the Principios table.
//
// `pct` = realized / target. When it exceeds 100%, the bar clamps at the
// container edge and switches to `overColor` (negative feedback) to signal
// that the principle has exceeded its target.

import React from 'react';
import { color } from '../../../theme/tokens';

function ProgressBar({
  pct,
  height = 6,
  fillColor = color.accent.warm,
  overColor = color.feedback.negative,
  bgColor = color.border.default,
}) {
  const safe = Math.max(0, Number.isFinite(pct) ? pct : 0);
  const clamped = Math.min(safe, 100);
  const isOver = safe > 100;

  return (
    <div
      style={{
        height,
        background: bgColor,
        borderRadius: 2,
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${clamped}%`,
          background: isOver ? overColor : fillColor,
          transition: 'width 0.2s ease',
        }}
      />
    </div>
  );
}

export default ProgressBar;
