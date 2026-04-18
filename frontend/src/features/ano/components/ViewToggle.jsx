import React from 'react';
import { color } from '../../../theme/tokens';

// Two-way toggle between Ano tab views: "Princípio × Mês" (default) and
// "Categoria × Mês". Matches the .tab styling used in App.jsx but rendered
// as pill buttons so it nests comfortably inside the Ano header.
const OPTIONS = [
  { id: 'principio', label: 'Princípio × Mês' },
  { id: 'categoria', label: 'Categoria × Mês' },
];

function ViewToggle({ value, onChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        gap: 2,
        background: color.bg.card,
        border: `1px solid ${color.border.default}`,
        borderRadius: 3,
        padding: 2,
      }}
    >
      {OPTIONS.map(opt => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className="sans"
            style={{
              background: active ? color.bg.hover : 'transparent',
              color: active ? color.accent.warm : color.text.muted,
              border: 'none',
              borderRadius: 2,
              cursor: 'pointer',
              padding: '6px 12px',
              fontSize: 12,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              transition: 'all 0.12s',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default ViewToggle;
export { OPTIONS };
