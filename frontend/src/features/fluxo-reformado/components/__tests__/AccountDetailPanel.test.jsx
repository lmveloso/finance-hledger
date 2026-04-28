// Component tests for AccountDetailPanel.
//
// Style mirrors features/mes/__tests__/Mes.test.jsx — Vitest conventions.
// We mock the data hooks at the hook boundary so the test does not need a
// fetch shim. Three angles: forecastNote copy is gone, COMPROMISSO FUTURO
// renders for passivos with installments, N/M pill renders on parcelamento
// rows.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import AccountDetailPanel from '../AccountDetailPanel.jsx';

const NUBANK = 'liabilities:cartao:nubank';
const BANCO = 'assets:banco:corrente';

let txReturn = { transactions: [], total: 0, loading: false, error: null };
let installmentsReturn = {
  data: null,
  installments: [],
  totalMonthly: 0,
  totalRemaining: 0,
  byAccount: new Map(),
  totalRemainingByAccount: new Map(),
  loading: false,
  error: null,
};

vi.mock('../../hooks/useAccountTransactions.js', () => ({
  useAccountTransactions: () => txReturn,
}));

vi.mock('../../../../hooks/useInstallments.js', () => ({
  useInstallments: () => installmentsReturn,
}));

function passivoConta() {
  return {
    conta: NUBANK,
    nome: 'Nubank',
    tipo: 'passivo',
    saldo_inicial: -1000,
    saldo_final: -1500,
    entradas_externas: 0,
    saidas_externas: -500,
    transfers_in: 0,
    transfers_out: 0,
  };
}

function ativoConta() {
  return {
    conta: BANCO,
    nome: 'Conta Corrente',
    tipo: 'ativo',
    saldo_inicial: 5000,
    saldo_final: 4500,
    entradas_externas: 1000,
    saidas_externas: -1500,
    transfers_in: 0,
    transfers_out: 0,
  };
}

function renderPanel(conta) {
  return render(
    <AccountDetailPanel conta={conta} month="2026-04" onClose={() => {}} />,
  );
}

beforeEach(() => {
  cleanup();
  txReturn = { transactions: [], total: 0, loading: false, error: null };
  installmentsReturn = {
    data: null,
    installments: [],
    totalMonthly: 0,
    totalRemaining: 0,
    byAccount: new Map(),
    totalRemainingByAccount: new Map(),
    loading: false,
    error: null,
  };
});

describe('AccountDetailPanel — header copy', () => {
  it('does not render the dropped forecastNote copy on a passivo', () => {
    renderPanel(passivoConta());
    expect(screen.queryByText(/inclui parcelas futuras/i)).toBeNull();
    expect(screen.queryByText(/includes future installments/i)).toBeNull();
  });

  it('does not render the dropped forecastNote copy on an ativo either', () => {
    renderPanel(ativoConta());
    expect(screen.queryByText(/inclui parcelas futuras/i)).toBeNull();
    expect(screen.queryByText(/includes future installments/i)).toBeNull();
  });
});

describe('AccountDetailPanel — COMPROMISSO FUTURO section', () => {
  it('renders the section when isPassivo and installments are present', () => {
    installmentsReturn = {
      ...installmentsReturn,
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
      ],
    };
    renderPanel(passivoConta());
    expect(screen.getByText(/Compromisso futuro|Future commitments/i)).toBeTruthy();
    expect(screen.getByText('Orto Life Mateus')).toBeTruthy();
    expect(screen.getByText(/termina 06\/26|ends 06\/26/i)).toBeTruthy();
  });

  it('omits the section entirely when no installments match the account', () => {
    renderPanel(passivoConta());
    expect(screen.queryByText(/Compromisso futuro|Future commitments/i)).toBeNull();
  });

  it('omits the section on ativos even when the hook returned rows', () => {
    // Defensive: even if the hook didn't filter (it should), the component
    // gates on isPassivo so the section never appears for an asset row.
    installmentsReturn = {
      ...installmentsReturn,
      installments: [
        {
          name: 'Should Not Render',
          monthly_value: 100,
          paid: 1,
          total: 2,
          remaining: 1,
          remaining_value: 100,
          end_date: '2026-05-30',
          account: BANCO,
        },
      ],
    };
    renderPanel(ativoConta());
    expect(screen.queryByText(/Compromisso futuro|Future commitments/i)).toBeNull();
    expect(screen.queryByText('Should Not Render')).toBeNull();
  });
});

describe('AccountDetailPanel — N/M pill on TransactionRow', () => {
  it('shows the chip with the literal parcel index from the tag', () => {
    // Transaction rows show the SPECIFIC parcel that posted (the literal
    // `n` from the parcelamento tag), not the next-coming numerator the
    // series rows render.
    txReturn = {
      transactions: [
        {
          data: '2026-04-15',
          descricao: 'Orto Life Mateus',
          conta: NUBANK,
          contra_conta: 'expenses:saude:dentista',
          categoria: 'saude:dentista',
          valor: -350,
          tipo_movimento: 'debito',
          tags: [['parcelamento', 'Orto Life Mateus 1/3']],
        },
      ],
      total: 1,
      loading: false,
      error: null,
    };
    renderPanel(passivoConta());
    expect(screen.getByText('1/3')).toBeTruthy();
  });

  it('does not render a pill when the tx has no parcelamento tag', () => {
    txReturn = {
      transactions: [
        {
          data: '2026-04-15',
          descricao: 'Padaria',
          conta: NUBANK,
          contra_conta: 'expenses:alimentacao:padaria',
          categoria: 'alimentacao',
          valor: -42,
          tipo_movimento: 'debito',
          tags: [],
        },
      ],
      total: 1,
      loading: false,
      error: null,
    };
    renderPanel(passivoConta());
    expect(screen.queryByText(/^\d+\/\d+$/)).toBeNull();
  });
});

describe('AccountDetailPanel — series chip in COMPROMISSO FUTURO', () => {
  it('renders the chip as next_parcel / total (next parcel coming)', () => {
    // Mirrors the Mês CreditCardDetail behavior. Orto Life Mateus has
    // paid=1, total=3 — the next-coming parcel is 2/3, not 1/3. Backend
    // ships `next_parcel` per ADR-011 errata 2026-04-28; we assert via
    // the explicit field path here.
    installmentsReturn = {
      ...installmentsReturn,
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
    };
    renderPanel(passivoConta());
    expect(screen.getByText('2/3')).toBeTruthy();
    expect(screen.queryByText('1/3')).toBeNull();
  });

  it('renders next_parcel from backend, not paid + 1 — covers pre-journal series', () => {
    // Escola Up Goioere scenario: the early parcels of the series were
    // paid before the journal began, so `paid` only counts what hledger
    // can see (1 parcel inside the journal range). The backend computes
    // `next_parcel` as `total − future_count + 1`, which is the honest
    // numerator. Falling back to `paid + 1` here would render "2/10"
    // and lie to the user — assert the chip reads "9/10".
    installmentsReturn = {
      ...installmentsReturn,
      installments: [
        {
          name: 'Escola Up Goioere',
          monthly_value: 500,
          paid: 1,
          total: 10,
          next_parcel: 9,
          remaining: 2,
          remaining_value: 1000,
          end_date: '2026-05-30',
          account: NUBANK,
        },
      ],
    };
    renderPanel(passivoConta());
    expect(screen.getByText('9/10')).toBeTruthy();
    expect(screen.queryByText('2/10')).toBeNull();
  });
});

describe('AccountDetailPanel — section ordering', () => {
  it('renders COMPROMISSO FUTURO before LANÇAMENTOS DO MÊS', () => {
    installmentsReturn = {
      ...installmentsReturn,
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
      ],
    };
    txReturn = {
      transactions: [
        {
          data: '2026-04-15',
          descricao: 'Padaria',
          conta: NUBANK,
          contra_conta: 'expenses:alimentacao:padaria',
          categoria: 'alimentacao',
          valor: -42,
          tipo_movimento: 'debito',
          tags: [],
        },
      ],
      total: 1,
      loading: false,
      error: null,
    };
    const { container } = renderPanel(passivoConta());
    const text = container.textContent || '';
    const futureIdx = text.search(/Compromisso futuro|Future commitments/i);
    const monthIdx = text.search(/Lançamentos do mês|Transactions in month/i);
    expect(futureIdx).toBeGreaterThanOrEqual(0);
    expect(monthIdx).toBeGreaterThanOrEqual(0);
    expect(futureIdx).toBeLessThan(monthIdx);
  });
});

describe('AccountDetailPanel — Comprometido / Dívida Total KPI line', () => {
  it('renders the line when isPassivo and comprometido > 0', () => {
    installmentsReturn = {
      ...installmentsReturn,
      totalRemainingByAccount: new Map([[NUBANK, 760]]),
    };
    renderPanel(passivoConta());
    expect(screen.getByText(/Comprometido|Committed/i)).toBeTruthy();
    expect(screen.getByText(/Dívida Total|Total debt/i)).toBeTruthy();
  });

  it('omits the line when comprometido === 0', () => {
    // Default installmentsReturn has an empty totalRemainingByAccount Map.
    renderPanel(passivoConta());
    expect(screen.queryByText(/Comprometido|Committed/i)).toBeNull();
    expect(screen.queryByText(/Dívida Total|Total debt/i)).toBeNull();
  });

  it('omits the line on ativos even when comprometido is non-zero', () => {
    installmentsReturn = {
      ...installmentsReturn,
      totalRemainingByAccount: new Map([[BANCO, 999]]),
    };
    renderPanel(ativoConta());
    expect(screen.queryByText(/Comprometido|Committed/i)).toBeNull();
    expect(screen.queryByText(/Dívida Total|Total debt/i)).toBeNull();
  });
});
