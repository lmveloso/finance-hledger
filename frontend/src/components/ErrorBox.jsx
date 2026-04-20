import React from 'react';
import { AlertCircle } from 'lucide-react';
import { color } from '../theme/tokens';
import { t } from '../i18n';

// Inline error banner used by every tab when a useApi call fails.
// Behavior preserved from the previous inline definition in App.jsx (formerly Dashboard.jsx).
const ErrorBox = ({ msg }) => (
  <div className="card" style={{ borderLeft: `3px solid ${color.accent.secondary}` }}>
    <div
      className="sans"
      style={{
        color: color.accent.secondary,
        fontSize: 13,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <AlertCircle size={16} /> {t('errorBox.title', { msg })}
    </div>
    <div
      className="sans"
      style={{ color: color.text.muted, fontSize: 12, marginTop: 8 }}
    >
      {t('errorBox.checkBackend')}
    </div>
  </div>
);

export default ErrorBox;
