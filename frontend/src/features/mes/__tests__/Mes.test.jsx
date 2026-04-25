// Behavior tests for the Mês tab — focus is the (revised) state machine
// that survived the craft round: SobraAncora and Receita are the only
// toggleable peers; Despesa and Cartões are always-open. Mutual-exclusion
// applies only between the anchor and Receita.
//
// Forward-compat note: the project ships no test runner today, but tests
// run when the harness is wired (vitest + jsdom + RTL + global fetch shim).

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonthProvider } from '../../../contexts/MonthContext.jsx';
import { NavProvider } from '../../../contexts/NavContext.jsx';
import Mes from '../Mes.jsx';

// Stub the data hooks so the test does not depend on fetch / endpoints.
vi.mock('../hooks/useResumoMes.js', () => ({
  useResumoMes: () => ({
    summary: {
      month: '2026-04',
      income: 12000,
      expense: 8500,
      expense_via_assets: 5000,
      expense_via_credit_card: 3500,
      credit_card_payment: 2500,
      credit_card_debt_today: 4200,
      debt_start_of_month: 3800,
      debt_end_of_month: 4500,
      leftover: 3500,
      last_updated: '2026-04-25T12:14:00',
    },
    loading: false,
    error: null,
  }),
}));

vi.mock('../hooks/useReceitas.js', () => ({
  useReceitas: () => ({
    data: { revenues: [], total: 0 },
    loading: false,
    error: null,
  }),
}));

// CategoriasSection, MaioresGastosSection, CreditCardSection do their own
// fetches — stub each so this test does not need a network mock.
vi.mock('../sections/CategoriasSection.jsx', () => ({
  default: () => <div data-testid="categorias-section" />,
}));
vi.mock('../sections/MaioresGastosSection.jsx', () => ({
  default: () => <div data-testid="maiores-gastos" />,
}));
vi.mock('../sections/CreditCardSection.jsx', () => ({
  default: () => <div data-testid="credit-cards-section" />,
}));

function renderMes() {
  return render(
    <MonthProvider>
      <NavProvider>
        <Mes />
      </NavProvider>
    </MonthProvider>,
  );
}

function getCardByLabel(label) {
  const heading = screen.getByRole('heading', { level: 2, name: label });
  return heading.closest('[role="button"]');
}

describe('Mes — layout + revised mutual-exclusion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the four sections in order Sobrou → Receita → Despesa → Cartões', () => {
    renderMes();
    const sections = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    // Despesa is rendered as a flat <h2> inside its own <section>; Cartões
    // is now CreditCardSection (mocked); the test asserts the ordered
    // labels of the toggleable peers + Despesa heading.
    expect(sections.slice(0, 3)).toEqual(['Sobrou no mês', 'Receita', 'Despesa']);
  });

  it('opens the anchor and keeps Receita closed by default', () => {
    renderMes();
    expect(getCardByLabel('Sobrou no mês').getAttribute('aria-expanded')).toBe('true');
    expect(getCardByLabel('Receita').getAttribute('aria-expanded')).toBe('false');
  });

  it('opening Receita force-closes the anchor', () => {
    renderMes();
    fireEvent.click(getCardByLabel('Receita'));
    expect(getCardByLabel('Sobrou no mês').getAttribute('aria-expanded')).toBe('false');
    expect(getCardByLabel('Receita').getAttribute('aria-expanded')).toBe('true');
  });

  it('does NOT auto-reopen the anchor when Receita closes', () => {
    renderMes();
    fireEvent.click(getCardByLabel('Receita')); // open Receita (closes anchor)
    fireEvent.click(getCardByLabel('Receita')); // close Receita
    expect(getCardByLabel('Sobrou no mês').getAttribute('aria-expanded')).toBe('false');
    expect(getCardByLabel('Receita').getAttribute('aria-expanded')).toBe('false');
  });

  it('clicking the anchor while closed re-opens it without affecting Receita', () => {
    renderMes();
    fireEvent.click(getCardByLabel('Receita'));     // anchor → closed, Receita → open
    fireEvent.click(getCardByLabel('Sobrou no mês')); // anchor → open, Receita unchanged
    expect(getCardByLabel('Sobrou no mês').getAttribute('aria-expanded')).toBe('true');
    expect(getCardByLabel('Receita').getAttribute('aria-expanded')).toBe('true');
  });

  it('renders Despesa and Cartões always-open (no role=button wrapper)', () => {
    renderMes();
    // Despesa heading exists but is not inside a button wrapper.
    const despesaHeading = screen.getByRole('heading', { level: 2, name: 'Despesa' });
    expect(despesaHeading.closest('[role="button"]')).toBeNull();
    // Cartões section is rendered (mocked).
    expect(screen.getByTestId('credit-cards-section')).toBeTruthy();
  });
});
