// ExpandableCard — the shared wrapper for the four cards on the Mês tab.
//
// The whole card area is a button-like surface: clicking the header (or
// pressing Enter / Space while focused) toggles the panel that lives inside
// the same outer card. The panel sits on bg.cardAlt with no second border —
// it is a deeper compartment of the same card, not a nested one (DESIGN.md
// §4 Tonal-Depth Rule + §5 Cards: nesting forbidden).
//
// Motion: ease-out-quint at 240ms on max-height, 200ms on chevron rotation.
// Both suppressed under prefers-reduced-motion.
//
// Replaces KpiExpander.jsx. API changed from (id, expandedId, onToggle) to
// (open, onToggle) so each card carries its own boolean — necessary because
// Receita / Despesa / Cartões coexist open freely (PRD-08 §5.1).
//
// Keyboard focus uses a real :focus-visible CSS rule (the outline appears
// only for keyboard users, never for mouse). The rule is injected once via
// a single <style> element; the Indigo Anchor focus token (#6366f1) is
// identical in both modes so resolution at module load is safe.

import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { color, padding } from '../../../theme/tokens';

// Card radius matches the global .card class (4px) — DESIGN.md §5 Cards
// names it `rounded.card`, but the token tree mirrors only the t-shirt
// scale (xs/sm/md/lg). The .card CSS in App.jsx is the de-facto source.
const CARD_RADIUS = 4;

const STYLE_ID = 'mes-expandable-card-styles';

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  // Single source for the focus-visible ring + reduced-motion overrides.
  // Using a class so the inline-style approach used elsewhere in the project
  // can stay; CSS is the only practical home for :focus-visible and
  // @media (prefers-reduced-motion).
  el.textContent = `
.mes-expandable-card { outline: none; }
.mes-expandable-card:focus-visible {
  outline: 2px solid ${color.border.focus};
  outline-offset: 2px;
  border-radius: ${CARD_RADIUS}px;
}
@media (prefers-reduced-motion: reduce) {
  .mes-expandable-card-panel { transition: none !important; }
  .mes-expandable-card-chevron { transition: none !important; }
}
`;
  document.head.appendChild(el);
}

function ExpandableCard({
  open,
  onToggle,
  panelId: panelIdProp,
  header,
  children,
  // Optional: when true, the expansion body is rendered with no top
  // separator (the row header becomes the only delimiter). Defaults to
  // false — the structural Tonal-Depth assignment uses a 1px subtle line.
  noSeparator = false,
}) {
  ensureStyles();

  const reactId = useId();
  const panelId = panelIdProp ?? `mes-card-panel-${reactId}`;

  const innerRef = useRef(null);
  const [measured, setMeasured] = useState(0);

  // Re-measure when the panel content might change height: every render
  // while open. ResizeObserver keeps the value live if a child grows
  // (e.g. categoria drill-down replacing the bar list).
  useLayoutEffect(() => {
    const node = innerRef.current;
    if (!node) return undefined;
    const update = () => setMeasured(node.scrollHeight);
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  });

  const handleClick = (e) => {
    // Defensive — let inner buttons / links handle their own clicks
    // without bubbling into the toggle (e.g. CTA "Ver todas" inside Despesa).
    if (e.target.closest('button, a, [role="button"][data-stop]')) return;
    onToggle();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // Don't hijack space if focus is on an inner control.
      if (e.target !== e.currentTarget) return;
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="mes-expandable-card"
      style={{
        position: 'relative',
        cursor: 'pointer',
        background: color.bg.card,
        border: `1px solid ${color.border.default}`,
        borderRadius: CARD_RADIUS,
        // Card-padding only on the header; the expansion body owns its own
        // padding (inner = 20px) and sits flush.
        padding: 0,
      }}
    >
      <div style={{ padding: padding.rounded.card }}>
        {/* Header content (label + value/aux + chevron column). */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>{header}</div>
          <span
            aria-hidden="true"
            className="mes-expandable-card-chevron"
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color.text.muted,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
              marginTop: 2,
            }}
          >
            <ChevronDown size={16} />
          </span>
        </div>
      </div>

      {/* The expansion body. Always mounted so transitions land cleanly;
          its max-height drives reveal/hide. Rendered as a region so
          screen readers announce the content under aria-controls. */}
      <div
        id={panelId}
        role="region"
        className="mes-expandable-card-panel"
        // aria-hidden so screen readers skip the hidden body when closed —
        // max-height: 0 + overflow: hidden hides it visually but keeps it
        // in the a11y tree by default.
        aria-hidden={!open}
        style={{
          maxHeight: open ? measured : 0,
          overflow: 'hidden',
          transition: 'max-height 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          ref={innerRef}
          style={{
            // Inner padding from DESIGN.md `inner` token (20px); the bg
            // shift to cardAlt is what gives the expansion its identity.
            padding: padding.rounded.inner,
            borderTop: noSeparator ? 'none' : `1px solid ${color.border.subtle}`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default ExpandableCard;
