import React from 'react';
import { AlertCircle } from 'lucide-react';
import { color } from '../theme/tokens';

// Inline error banner used by every tab when a useApi call fails.
// Behavior preserved from the previous inline definition in Dashboard.jsx.
// Note: strings remain hardcoded pt-BR until the i18n pass (post PR-F9).
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
      <AlertCircle size={16} /> Erro ao carregar: {msg}
    </div>
    <div
      className="sans"
      style={{ color: color.text.muted, fontSize: 12, marginTop: 8 }}
    >
      Verifique se o backend está rodando e se LEDGER_FILE aponta pro journal correto.
    </div>
  </div>
);

export default ErrorBox;
