import React from 'react';
import { useNav } from '../../contexts/NavContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import MonthNavigator from './MonthNavigator.jsx';
import { t } from '../../i18n';

// NavContext keeps Portuguese-with-diacritics tab IDs. Mirror the slug map
// used in NavList/BottomNav so the displayed label flows through i18n.
const SLUG = {
  'resumo': 'resumo',
  'mês': 'mes',
  'ano': 'ano',
  'fluxo': 'fluxo',
  'orçamento': 'orcamento',
  'patrimônio': 'patrimonio',
  'transações': 'transacoes',
};

// MobileTopBar — slim 56px header shown only on mobile (<768px).
//
// Left: active tab label (serves as a "you are here" breadcrumb).
// Right: compact MonthNavigator (prev / label / next). Compare toggle is
// intentionally not rendered here — PR-U1 leaves compareMode as a
// desktop-only control.

export default function MobileTopBar() {
  const { tokens } = useTheme();
  const { activeTab } = useNav();
  const slug = SLUG[activeTab] || activeTab;

  return (
    <header
      style={{
        height: 56,
        flexShrink: 0,
        background: tokens.bg.card,
        borderBottom: `1px solid ${tokens.border.default}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <span
        className="sans"
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: tokens.text.primary,
        }}
      >
        {t(`nav.${slug}`)}
      </span>
      <MonthNavigator variant="compact" />
    </header>
  );
}
