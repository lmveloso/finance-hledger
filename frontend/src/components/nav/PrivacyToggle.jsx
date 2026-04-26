import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '../../contexts/PrivacyContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { radius } from '../../theme/tokens';
import { t } from '../../i18n';

// PrivacyToggle — masks/unmasks every monetary value across the dashboard.
//
// Two surfaces: full-width row in the sidebar (variant="row") and an
// icon-only button in the mobile top bar (variant="icon"). Both share
// the same context state and the `h` keyboard shortcut.

export default function PrivacyToggle({ variant = 'row' }) {
  const { isPrivate, toggle } = usePrivacy();
  const { tokens } = useTheme();
  const Icon = isPrivate ? EyeOff : Eye;
  const label = isPrivate ? t('privacy.show') : t('privacy.hide');

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggle}
        title={label}
        aria-label={label}
        aria-pressed={isPrivate}
        style={{
          width: 36,
          height: 36,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.rounded.sm,
          border: `1px solid ${tokens.border.default}`,
          background: 'transparent',
          color: isPrivate ? tokens.accent.primary : tokens.text.muted,
          cursor: 'pointer',
        }}
      >
        <Icon size={16} />
      </button>
    );
  }

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
        color: isPrivate ? tokens.accent.primary : tokens.text.muted,
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        transition: 'color 0.12s, border-color 0.12s',
      }}
      title={label}
      aria-label={label}
      aria-pressed={isPrivate}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
