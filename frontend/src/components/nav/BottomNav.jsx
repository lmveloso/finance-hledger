import React from 'react';
import { useNav } from '../../contexts/NavContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { t } from '../../i18n';

// NavContext keeps Portuguese-with-diacritics tab IDs; slug map mirrors
// NavList.jsx for i18n key resolution.
const SLUG = {
  'resumo': 'resumo',
  'mês': 'mes',
  'ano': 'ano',
  'fluxo': 'fluxo',
  'orçamento': 'orcamento',
  'patrimônio': 'patrimonio',
  'transações': 'transacoes',
};

// BottomNav — fixed bottom navigation strip for mobile (<768px).
//
// Layout: all 7 tabs as flex:1 buttons. Active tab renders a 2px top
// indicator bar plus accent text color; inactive tabs use `text.muted`.
// Height 58 + safe-area inset. z-index 200 so it sits under the 1000-tier
// PullIndicator but above normal content.

export default function BottomNav() {
  const { tokens } = useTheme();
  const { tabs, activeTab, setActiveTab } = useNav();

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 58,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: tokens.bg.sidebar,
        borderTop: `1px solid ${tokens.border.default}`,
        display: 'flex',
        zIndex: 200,
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
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              border: 'none',
              background: 'transparent',
              color: isActive ? tokens.accent.primary : tokens.text.muted,
              fontSize: 9.5,
              fontWeight: isActive ? 600 : 400,
              cursor: 'pointer',
              padding: 0,
              minWidth: 0,
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <div
              aria-hidden="true"
              style={{
                width: 18,
                height: 2,
                borderRadius: 1,
                background: isActive ? tokens.accent.primary : 'transparent',
                marginBottom: 2,
              }}
            />
            <span
              style={{
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {t(`nav.${slug}`)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
