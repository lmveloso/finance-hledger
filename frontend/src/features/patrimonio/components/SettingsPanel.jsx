import React from 'react';
import { color } from '../../../theme/tokens';
import { t } from '../../../i18n';

// Per-tab settings row (PR-D7). Inline, non-modal — follows the §5 pattern
// from docs/01-ESTABILIZACAO.md (InlineSettings). Exposes the period for
// the evolution chart and the hideZeroAccounts toggle for the card lists.
//
// Props:
//   period: 6 | 12 | 24 | 36 | 'all'
//   onPeriodChange: (value) => void
//   hideZero: boolean
//   onHideZeroChange: (value) => void
const PERIODS = [
  { value: 6, labelKey: 'patrimonio.period.6' },
  { value: 12, labelKey: 'patrimonio.period.12' },
  { value: 24, labelKey: 'patrimonio.period.24' },
  { value: 36, labelKey: 'patrimonio.period.36' },
  { value: 'all', labelKey: 'patrimonio.period.all' },
];

function SettingsPanel({ period, onPeriodChange, hideZero, onHideZeroChange }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span
          className="sans"
          style={{
            fontSize: 10, letterSpacing: '0.1em', color: color.text.muted,
            textTransform: 'uppercase',
          }}
        >
          {t('patrimonio.period.label')}
        </span>
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
          {PERIODS.map(opt => {
            const active = period === opt.value;
            return (
              <button
                key={opt.value}
                role="tab"
                aria-selected={active}
                onClick={() => onPeriodChange(opt.value)}
                className="sans"
                style={{
                  background: active ? color.bg.hover : 'transparent',
                  color: active ? color.accent.warm : color.text.muted,
                  border: 'none',
                  borderRadius: 2,
                  cursor: 'pointer',
                  padding: '4px 10px',
                  fontSize: 11,
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
      </div>

      <label
        className="sans"
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          fontSize: 12, color: color.text.muted,
        }}
      >
        <input
          type="checkbox"
          checked={hideZero}
          onChange={(e) => onHideZeroChange(e.target.checked)}
          style={{ accentColor: color.accent.warm }}
        />
        {t('patrimonio.hideZero')}
      </label>
    </div>
  );
}

export default SettingsPanel;
