import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { radius } from '../../theme/tokens';
import { t } from '../../i18n';

// ThemeToggle — flips dark/light via ThemeContext.
//
// Rendered in the sidebar footer on desktop. Mobile currently has no
// dedicated spot for it; a future PR can surface it from an "Ajustes"
// inline section per the "no modals" rule.

export default function ThemeToggle() {
  const { mode, toggle, tokens } = useTheme();
  const isDark = mode === 'dark';
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? t('theme.light') : t('theme.dark');

  return (
    <button
      type="button"
      onClick={toggle}
      className="sans"
      style={{
        width: '100%',
        padding: '8px 12px',
        borderRadius: radius.rounded.sm,
        border: `1px solid ${tokens.border.default}`,
        background: 'transparent',
        color: tokens.text.muted,
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        transition: 'color 0.12s, border-color 0.12s',
      }}
      title={label}
      aria-label={label}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
