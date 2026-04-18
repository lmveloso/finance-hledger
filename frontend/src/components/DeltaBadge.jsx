import React from 'react';
import { color } from '../theme/tokens';

// Small percentage-delta badge rendered next to KPI values when comparison mode
// is on (e.g. current month vs. same month last year). Returns null when the
// previous value is missing or zero to avoid division-by-zero noise.
// Behavior preserved from the previous inline definition in App.jsx (formerly Dashboard.jsx).
function DeltaBadge({ current, previous }) {
  if (previous == null || previous === 0) return null;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const isUp = delta >= 0;
  const deltaColor = isUp ? color.feedback.positive : color.feedback.negative;
  return (
    <span
      className="sans"
      style={{
        fontSize: 11,
        color: deltaColor,
        marginLeft: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {isUp ? '+' : ''}{Math.round(delta)}%
    </span>
  );
}

export default DeltaBadge;
