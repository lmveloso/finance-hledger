// Component tests for CreditCardDetail.
//
// Style mirrors features/mes/__tests__/Mes.test.jsx — Vitest conventions.
// We mock the NavContext so the CTA hands off without a router; the rest
// is rendered for real to exercise the new tile + section layout from
// PR-mes-fluxo-installments-visibility.
//
// Forward-compat: project does not yet ship the test runner; existing
// tests use the same imports and run when the harness is wired.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreditCardDetail from '../CreditCardDetail.jsx';

vi.mock('../../../../contexts/NavContext.jsx', () => ({
  useNav: () => ({ goToTransactions: vi.fn() }),
}));

const NUBANK = 'liabilities:cartao:nubank';

function makeCard(overrides = {}) {
  return {
    conta: NUBANK,
    nome: 'Nubank',
    monthlySpend: 1500,
    outstandingBalance: 2000,
    hasMonthlyActivity: true,
    categories: [],
    transactions: [],
    installments: [],
    installmentsRemainingValue: 0,
    ...overrides,
  };
}

function renderDetail(card) {
  return render(<CreditCardDetail card={card} onBack={() => {}} />);
}

describe('CreditCardDetail — Dívida Total tile', () => {
  it('shows outstanding + comprometido summed in a single number', () => {
    renderDetail(
      makeCard({ outstandingBalance: 2000, installmentsRemainingValue: 800 }),
    );
    // 2800 formatted as BRL — match the integer prefix to be locale-tolerant.
    const tile = screen.getByText(/Dívida Total|Total debt/i).closest('div');
    expect(tile).toBeTruthy();
    expect(tile.textContent).toMatch(/2\.800|2,800/);
  });

  it('renders the breakdown line when comprometido > 0', () => {
    renderDetail(
      makeCard({ outstandingBalance: 2000, installmentsRemainingValue: 800 }),
    );
    // Either the en or pt-BR template — both contain a separator dot and
    // both currency values.
    expect(screen.getByText(/Fatura|Invoice/i)).toBeTruthy();
    expect(screen.getByText(/Comprometido|Committed/i)).toBeTruthy();
  });

  it('hides the breakdown line when comprometido === 0', () => {
    renderDetail(
      makeCard({ outstandingBalance: 2000, installmentsRemainingValue: 0 }),
    );
    expect(screen.queryByText(/Fatura|Invoice/i)).toBeNull();
    expect(screen.queryByText(/Comprometido|Committed/i)).toBeNull();
  });
});

describe('CreditCardDetail — PARCELAS FUTURAS section', () => {
  it('renders one row per active installment series', () => {
    const card = makeCard({
      installments: [
        {
          name: 'Orto Life Mateus',
          monthly_value: 350,
          paid: 1,
          total: 3,
          remaining: 2,
          remaining_value: 700,
          end_date: '2026-06-30',
          account: NUBANK,
        },
        {
          name: 'Decathlon',
          monthly_value: 237.47,
          paid: 2,
          total: 4,
          remaining: 2,
          remaining_value: 474.94,
          end_date: '2026-06-30',
          account: NUBANK,
        },
      ],
      installmentsRemainingValue: 1174.94,
    });
    renderDetail(card);
    expect(screen.getByText('Orto Life Mateus')).toBeTruthy();
    expect(screen.getByText('Decathlon')).toBeTruthy();
    // Section title.
    expect(screen.getByText(/Parcelas futuras|Future installments/i)).toBeTruthy();
    // End-date format MM/AA — both rows end 06/26.
    const endDates = screen.getAllByText(/termina 06\/26|ends 06\/26/i);
    expect(endDates.length).toBe(2);
  });

  it('renders the series chip as next_parcel / total (next parcel coming)', () => {
    // Orto Life Mateus has paid=1, total=3 — the user is looking at FUTURE
    // parcels in this section, so the chip must say "2/3" (next coming),
    // not "1/3" (which was already paid in the current month). Backend
    // ships `next_parcel` per ADR-011 errata 2026-04-28; we assert via the
    // explicit field path here.
    const card = makeCard({
      installments: [
        {
          name: 'Orto Life Mateus',
          monthly_value: 350,
          paid: 1,
          total: 3,
          next_parcel: 2,
          remaining: 2,
          remaining_value: 700,
          end_date: '2026-06-30',
          account: NUBANK,
        },
      ],
      installmentsRemainingValue: 700,
    });
    renderDetail(card);
    expect(screen.getByText('2/3')).toBeTruthy();
    expect(screen.queryByText('1/3')).toBeNull();
  });

  it('omits the section when no installments touch this card', () => {
    renderDetail(makeCard({ installments: [] }));
    expect(screen.queryByText(/Parcelas futuras|Future installments/i)).toBeNull();
  });
});

describe('CreditCardDetail — N/M pill on PurchaseRow', () => {
  it('shows the N/M chip when a tx has the parcelamento tag', () => {
    const card = makeCard({
      transactions: [
        {
          data: '2026-04-15',
          descricao: 'Orto Life Mateus',
          categoria: 'saude',
          valor: -350,
          tags: [['parcelamento', 'Orto Life Mateus 1/3']],
        },
      ],
    });
    renderDetail(card);
    // Pill shows the literal "1/3".
    expect(screen.getByText('1/3')).toBeTruthy();
  });

  it('does not render a pill when the tx has no parcelamento tag', () => {
    const card = makeCard({
      transactions: [
        {
          data: '2026-04-15',
          descricao: 'Padaria',
          categoria: 'alimentacao',
          valor: -42,
          tags: [],
        },
      ],
    });
    renderDetail(card);
    // No N/M pattern present.
    expect(screen.queryByText(/^\d+\/\d+$/)).toBeNull();
  });
});
