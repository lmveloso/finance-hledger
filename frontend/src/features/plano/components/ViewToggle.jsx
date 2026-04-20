import React from 'react';
import { color } from '../../../theme/tokens';
import { t } from '../../../i18n';

// Two-way toggle between Plano tab views: "Próximos meses" (default) and
// "Decaimento de dívida". Mirrors the style used in features/ano/components/
// ViewToggle.jsx — pill buttons inside a subtle container.
const OPTIONS = [
  { id: 'forecast', labelKey: 'plano.toggle.forecast' },
  { id: 'divida', labelKey: 'plano.toggle.divida' },
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
              color: active ? color.accent.primary : color.text.muted,
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
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

export default ViewToggle;
export { OPTIONS };
