import React from 'react';
import { color } from '../../../theme/tokens';

// Year dropdown for the Ano tab. Default range: current year + prior 3.
// Keeps the "sans" class + editorial dark palette consistent with
// MonthPicker in App.jsx.
function YearSelector({ year, onChange, span = 3 }) {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current; y >= current - span; y--) years.push(y);

  return (
    <label
      className="sans"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        color: color.text.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      Ano
      <select
        value={year}
        onChange={e => onChange(parseInt(e.target.value, 10))}
        style={{
          background: color.bg.card,
          color: color.text.primary,
          border: `1px solid ${color.border.default}`,
          borderRadius: 3,
          padding: '6px 10px',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </label>
  );
}

export default YearSelector;
