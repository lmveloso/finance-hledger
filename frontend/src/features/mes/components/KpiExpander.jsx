// KpiExpander — wraps a KPI card so it behaves like a button/disclosure.
//
// Fase UX-Polish #3 merges Resumo and Mês into a single tab. Each of the
// three KPI cards (Receita, Despesa, Saldo) can be clicked to expand an
// inline detail panel below the KPI grid. Only one card can be expanded
// at a time (mutual exclusion is enforced by the parent via `expandedId`).
//
// Behavior:
//   - Clicking the card toggles the panel for its id.
//   - Enter / Space on the card toggles (keyboard a11y).
//   - A chevron indicator in the card corner rotates 90° when expanded.
//   - When active the card gets a subtle accent ring + tinted background
//     so the user can trace which KPI the expanded panel belongs to.
//
// Implementation note: the KPI atom renders itself as a `.card` div. We
// wrap it in an additional div (not a <button>) because KPI already has
// nested layout, and nesting a button inside a button would break a11y.
// The wrapper div carries `role="button"` + tabIndex + keyboard handlers.
// `aria-expanded` and `aria-controls` are surfaced for screen readers.

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { color } from '../../../theme/tokens';

function KpiExpander({ id, expandedId, onToggle, panelId, children }) {
  const isActive = expandedId === id;

  const handleClick = (e) => {
    // Ignore clicks that originated from an interactive child (none today,
    // but defensive — a DeltaBadge could grow link-like affordances later).
    if (e.target.closest('a, button')) return;
    onToggle(id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isActive}
      aria-controls={panelId}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        position: 'relative',
        cursor: 'pointer',
        borderRadius: 4,
        outline: 'none',
        transition: 'box-shadow 0.15s, background 0.15s',
        background: isActive ? color.accent.primaryMuted : 'transparent',
        boxShadow: isActive
          ? `0 0 0 1px ${color.accent.primary}`
          : 'none',
      }}
      onFocus={(e) => {
        if (!isActive) {
          e.currentTarget.style.boxShadow = `0 0 0 1px ${color.border.focus}`;
        }
      }}
      onBlur={(e) => {
        if (!isActive) {
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {children}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 18,
          right: 18,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isActive ? color.accent.primary : color.text.muted,
          transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease, color 0.15s',
        }}
      >
        <ChevronDown size={16} />
      </span>
    </div>
  );
}

export default KpiExpander;
