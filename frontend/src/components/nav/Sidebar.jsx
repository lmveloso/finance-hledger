import React from 'react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import NavList from './NavList.jsx';
import MonthNavigator from './MonthNavigator.jsx';
import ThemeToggle from './ThemeToggle.jsx';

// Sidebar — fixed-width (208px) left rail used on desktop (≥768px).
//
// Composition:
//   [ BrandBlock (inline)          ]
//   [ NavList                       ]   ← flex: 1, scrolls internally
//   [ MonthNavigator variant=sidebar]
//   [ ThemeToggle                   ]
//   [ VersionStamp (inline)         ]
//
// All colors come from `useTheme().tokens` — no literal hex values.

export default function Sidebar() {
  const { tokens } = useTheme();

  return (
    <aside
      style={{
        width: 208,
        minWidth: 208,
        height: '100vh',
        background: tokens.bg.sidebar,
        borderRight: `1px solid ${tokens.border.default}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
      }}
    >
      {/* Brand block */}
      <div
        style={{
          padding: '26px 20px 22px',
          borderBottom: `1px solid ${tokens.border.subtle}`,
        }}
      >
        <div
          className="serif"
          style={{
            fontSize: 20,
            color: tokens.text.primary,
            lineHeight: 1.15,
          }}
        >
          Finanças
        </div>
        <div
          className="serif"
          style={{
            fontStyle: 'italic',
            fontSize: 20,
            color: tokens.accent.primary,
            lineHeight: 1.15,
          }}
        >
          Pessoais
        </div>
        <div
          className="sans"
          style={{
            fontSize: 10,
            color: tokens.text.disabled,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginTop: 8,
          }}
        >
          hledger · família
        </div>
      </div>

      {/* Nav list — fills available vertical space */}
      <NavList />

      {/* Month navigator */}
      <div
        style={{
          padding: '14px 16px',
          borderTop: `1px solid ${tokens.border.subtle}`,
        }}
      >
        <MonthNavigator variant="sidebar" />
      </div>

      {/* Theme toggle */}
      <div
        style={{
          padding: '12px 10px',
          borderTop: `1px solid ${tokens.border.subtle}`,
        }}
      >
        <ThemeToggle />
      </div>

      {/* Version stamp */}
      <div
        className="sans"
        style={{
          padding: '10px 20px 14px',
          fontSize: 10,
          color: tokens.text.disabled,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        hledger · Tailscale
      </div>
    </aside>
  );
}
