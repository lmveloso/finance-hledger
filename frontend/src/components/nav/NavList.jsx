import React from 'react';
import { useNav } from '../../contexts/NavContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { radius } from '../../theme/tokens';
import { t } from '../../i18n';

// Tab ID → i18n slug. NavContext keeps Portuguese-with-diacritics IDs
// (`'mês'`, `'orçamento'`, etc.) for routing compatibility; the slug map
// below translates them to ASCII keys so the i18n dictionaries stay
// portable. See PR-U1 plan §R1.
const SLUG = {
  'resumo': 'resumo',
  'mês': 'mes',
  'ano': 'ano',
  'fluxo': 'fluxo',
  'orçamento': 'orcamento',
  'patrimônio': 'patrimonio',
  'transações': 'transacoes',
};

// NavList — vertical tab list rendered inside the desktop sidebar.
//
// Active item visual treatment:
//   - 3×16 left indicator bar in `accent.primary`
//   - `accent.primaryMuted` background
//   - `accent.primary` text color + bold weight
//
// Hover state for inactive items bumps to `bg.hover` + `text.primary`.

export default function NavList() {
  const { tokens } = useTheme();
  const { tabs, activeTab, setActiveTab } = useNav();

  return (
    <nav
      style={{
        flex: 1,
        padding: '14px 10px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        const slug = SLUG[tab] || tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="sans"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: radius.rounded.sm,
              border: 'none',
              background: isActive ? tokens.accent.primaryMuted : 'transparent',
              color: isActive ? tokens.accent.primary : tokens.text.secondary,
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = tokens.bg.hover;
                e.currentTarget.style.color = tokens.text.primary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = tokens.text.secondary;
              }
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <span
              aria-hidden="true"
              style={{
                width: 3,
                height: 16,
                borderRadius: 2,
                flexShrink: 0,
                background: isActive ? tokens.accent.primary : 'transparent',
              }}
            />
            {t(`nav.${slug}`)}
          </button>
        );
      })}
    </nav>
  );
}
