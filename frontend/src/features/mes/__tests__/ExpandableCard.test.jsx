// Component tests for ExpandableCard.
//
// Style mirrors frontend/src/features/mes/lib/__tests__/groupReceitas.test.js
// — Vitest conventions, forward-compatible with the harness setup that
// will land alongside PR-F1-3 (the project does not yet ship a runner +
// jsdom; existing test files use the same imports and run when wired).
//
// The new ExpandableCard wrapper (renamed + adapted from KpiExpander.jsx)
// must:
//   - Toggle on full-card click (any spot on the wrapper, not only the
//     chevron).
//   - Toggle on Enter / Space when keyboard-focused.
//   - Reflect open/closed state through aria-expanded.
//   - Bind aria-controls to the panel id.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExpandableCard from '../components/ExpandableCard.jsx';

function setup({ open = false } = {}) {
  const onToggle = vi.fn();
  render(
    <ExpandableCard
      open={open}
      onToggle={onToggle}
      panelId="test-panel"
      header={<span>Header label</span>}
    >
      <span>Panel body</span>
    </ExpandableCard>,
  );
  return { onToggle };
}

describe('ExpandableCard', () => {
  it('exposes the wrapper as a button with the right aria attributes', () => {
    setup({ open: false });
    const card = screen.getByRole('button');
    expect(card.getAttribute('aria-expanded')).toBe('false');
    expect(card.getAttribute('aria-controls')).toBe('test-panel');
  });

  it('reflects open state via aria-expanded', () => {
    setup({ open: true });
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true');
  });

  it('calls onToggle when the card is clicked anywhere', () => {
    const { onToggle } = setup();
    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle on Enter when keyboard-focused', () => {
    const { onToggle } = setup();
    const card = screen.getByRole('button');
    card.focus();
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle on Space when keyboard-focused', () => {
    const { onToggle } = setup();
    const card = screen.getByRole('button');
    card.focus();
    fireEvent.keyDown(card, { key: ' ' });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders the panel under the supplied id', () => {
    setup({ open: true });
    const region = document.getElementById('test-panel');
    expect(region).not.toBeNull();
    expect(region.getAttribute('role')).toBe('region');
  });
});
