// Unit tests for `buildCardList` — the pure helper that unifies credit-card
// rows discovered in /api/flow and /api/accounts. Covers the card-visibility
// fix from issue #20 (Fase Audit Stabilization): an outstanding liability
// must stay visible even when the month has no card postings.
//
// Style mirrors useCreditCards.test.js — Vitest conventions, no React / DOM.

import { describe, it, expect } from 'vitest';
import { buildCardList } from '../useCreditCards.js';

// Helpers that produce the field shapes this helper consumes.
function flowRow(conta, nome, extras = {}) {
  return { conta, nome, tipo: 'passivo', ...extras };
}

function accountsRow(caminho, nome, saldo) {
  return { caminho, nome, tipo: 'passivo', saldo };
}

function agg(conta, total = 0, overrides = {}) {
  return {
    conta,
    total,
    categories: [],
    transactions: [],
    ...overrides,
  };
}

describe('buildCardList', () => {
  it('unions a card that appears in both /api/flow and /api/accounts', () => {
    const flowContas = [flowRow('liabilities:cartao:nubank', 'Nubank')];
    const accounts = [
      accountsRow('liabilities:cartao:nubank', 'Nubank', -1200),
    ];
    const aggregates = new Map([
      [
        'liabilities:cartao:nubank',
        agg('liabilities:cartao:nubank', 800, {
          categories: [
            { raw: 'alimentacao', nome: 'Alimentação', valor: 800, pct: 100, color: '#111' },
          ],
        }),
      ],
    ]);

    const rows = buildCardList({ flowContas, accounts, aggregates });

    expect(rows).toHaveLength(1);
    expect(rows[0].conta).toBe('liabilities:cartao:nubank');
    expect(rows[0].nome).toBe('Nubank');
    expect(rows[0].monthlySpend).toBe(800);
    expect(rows[0].outstandingBalance).toBe(1200);
    expect(rows[0].hasMonthlyActivity).toBe(true);
    expect(rows[0].categories).toHaveLength(1);
  });

  it('keeps an outstanding-only card visible with hasMonthlyActivity=false and empty tx/categories', () => {
    // BB Visa scenario from issue #20: card has liability but no postings in
    // the selected month.
    const flowContas = [];
    const accounts = [
      accountsRow('liabilities:cartao:bb-visa', 'BB Visa', -3914.72),
    ];
    const aggregates = new Map();

    const rows = buildCardList({ flowContas, accounts, aggregates });

    expect(rows).toHaveLength(1);
    expect(rows[0].conta).toBe('liabilities:cartao:bb-visa');
    expect(rows[0].nome).toBe('BB Visa');
    expect(rows[0].monthlySpend).toBe(0);
    expect(rows[0].outstandingBalance).toBeCloseTo(3914.72, 2);
    expect(rows[0].hasMonthlyActivity).toBe(false);
    expect(rows[0].categories).toEqual([]);
    expect(rows[0].transactions).toEqual([]);
    // Pure helper: no transaction fetch required to produce this shape. The
    // aggregates Map is untouched.
    expect(aggregates.size).toBe(0);
  });

  it('defaults outstandingBalance to 0 when a flow card is missing from /api/accounts', () => {
    // Edge case: /api/flow surfaces a card that /api/accounts does not. The
    // helper must still emit the row, with outstandingBalance = 0.
    const flowContas = [
      flowRow('liabilities:cartao:phantom', 'Phantom'),
    ];
    const accounts = [];
    const aggregates = new Map([
      ['liabilities:cartao:phantom', agg('liabilities:cartao:phantom', 150)],
    ]);

    const rows = buildCardList({ flowContas, accounts, aggregates });

    expect(rows).toHaveLength(1);
    expect(rows[0].monthlySpend).toBe(150);
    expect(rows[0].outstandingBalance).toBe(0);
    expect(rows[0].hasMonthlyActivity).toBe(true);
  });

  it('sorts active cards before dormant cards, then by monthlySpend / outstanding desc', () => {
    const flowContas = [
      flowRow('liabilities:cartao:nubank', 'Nubank'),
      flowRow('liabilities:cartao:itau', 'Itaú'),
    ];
    const accounts = [
      accountsRow('liabilities:cartao:nubank', 'Nubank', -400),
      accountsRow('liabilities:cartao:itau', 'Itaú', -200),
      // Two dormant cards with different outstanding balances.
      accountsRow('liabilities:cartao:bb-visa', 'BB Visa', -3914.72),
      accountsRow('liabilities:cartao:inter', 'Inter', -100),
    ];
    const aggregates = new Map([
      ['liabilities:cartao:nubank', agg('liabilities:cartao:nubank', 500)],
      ['liabilities:cartao:itau', agg('liabilities:cartao:itau', 900)],
    ]);

    const rows = buildCardList({ flowContas, accounts, aggregates });

    expect(rows.map((r) => r.conta)).toEqual([
      // Active, by monthlySpend desc.
      'liabilities:cartao:itau',
      'liabilities:cartao:nubank',
      // Dormant, by outstandingBalance desc.
      'liabilities:cartao:bb-visa',
      'liabilities:cartao:inter',
    ]);
    // Active block has hasMonthlyActivity true, dormant block false.
    expect(rows.slice(0, 2).every((r) => r.hasMonthlyActivity)).toBe(true);
    expect(rows.slice(2).every((r) => !r.hasMonthlyActivity)).toBe(true);
  });

  it('ignores non-card passivos and non-passivo accounts', () => {
    const flowContas = [
      flowRow('liabilities:cartao:nubank', 'Nubank'),
      // A non-card passivo (e.g. financiamento) must not appear.
      flowRow('liabilities:emprestimo:banco', 'Empréstimo'),
      // A non-passivo row must not appear even if the path matches.
      { conta: 'liabilities:cartao:weird', nome: 'Weird', tipo: 'ativo' },
    ];
    const accounts = [
      accountsRow('liabilities:cartao:nubank', 'Nubank', -100),
      accountsRow('liabilities:emprestimo:banco', 'Empréstimo', -5000),
    ];
    const aggregates = new Map([
      ['liabilities:cartao:nubank', agg('liabilities:cartao:nubank', 50)],
    ]);

    const rows = buildCardList({ flowContas, accounts, aggregates });

    expect(rows).toHaveLength(1);
    expect(rows[0].conta).toBe('liabilities:cartao:nubank');
  });

  it('skips outstanding-only cards whose balance rounds to zero', () => {
    // A fully-settled card with no monthly activity should not clutter the
    // list. Only emitted when it owes something.
    const flowContas = [];
    const accounts = [
      accountsRow('liabilities:cartao:settled', 'Settled', 0),
      accountsRow('liabilities:cartao:tiny', 'Tiny', -0.004),
    ];

    const rows = buildCardList({ flowContas, accounts, aggregates: new Map() });

    expect(rows).toEqual([]);
  });

  // ── installments enrichment (PR-mes-fluxo-installments-visibility) ──────
  describe('installment enrichment (ADR-011)', () => {
    function inst(account, name, remaining_value) {
      return { name, account, remaining_value, monthly_value: 100, paid: 1, total: 3, end_date: '2026-06-30' };
    }

    it('attaches installments and remaining value for a flow card', () => {
      const flowContas = [flowRow('liabilities:cartao:nubank', 'Nubank')];
      const accounts = [accountsRow('liabilities:cartao:nubank', 'Nubank', -500)];
      const aggregates = new Map([
        ['liabilities:cartao:nubank', agg('liabilities:cartao:nubank', 200)],
      ]);
      const installmentsByAccount = new Map([
        [
          'liabilities:cartao:nubank',
          [
            inst('liabilities:cartao:nubank', 'Orto Life', 700),
            inst('liabilities:cartao:nubank', 'Decathlon', 200),
          ],
        ],
      ]);
      const totalRemainingByAccount = new Map([
        ['liabilities:cartao:nubank', 900],
      ]);

      const rows = buildCardList({
        flowContas,
        accounts,
        aggregates,
        installmentsByAccount,
        totalRemainingByAccount,
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].installmentsRemainingValue).toBe(900);
      expect(rows[0].installments).toHaveLength(2);
      expect(rows[0].installments[0].name).toBe('Orto Life');
    });

    it('attaches installments to outstanding-only cards too', () => {
      // BB Visa with an open installment but no monthly postings: the card
      // is dormant on /api/flow but still surfaces from /api/accounts and
      // must show its comprometido.
      const flowContas = [];
      const accounts = [
        accountsRow('liabilities:cartao:bb-visa', 'BB Visa', -3000),
      ];
      const installmentsByAccount = new Map([
        [
          'liabilities:cartao:bb-visa',
          [inst('liabilities:cartao:bb-visa', 'Havan', 712.41)],
        ],
      ]);
      const totalRemainingByAccount = new Map([
        ['liabilities:cartao:bb-visa', 712.41],
      ]);

      const rows = buildCardList({
        flowContas,
        accounts,
        aggregates: new Map(),
        installmentsByAccount,
        totalRemainingByAccount,
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].installments).toHaveLength(1);
      expect(rows[0].installmentsRemainingValue).toBeCloseTo(712.41, 2);
    });

    it('does not bleed installments across cards', () => {
      const flowContas = [
        flowRow('liabilities:cartao:nubank', 'Nubank'),
        flowRow('liabilities:cartao:itau', 'Itaú'),
      ];
      const accounts = [
        accountsRow('liabilities:cartao:nubank', 'Nubank', -100),
        accountsRow('liabilities:cartao:itau', 'Itaú', -100),
      ];
      const aggregates = new Map([
        ['liabilities:cartao:nubank', agg('liabilities:cartao:nubank', 50)],
        ['liabilities:cartao:itau', agg('liabilities:cartao:itau', 50)],
      ]);
      const installmentsByAccount = new Map([
        [
          'liabilities:cartao:nubank',
          [inst('liabilities:cartao:nubank', 'Series A', 300)],
        ],
      ]);
      const totalRemainingByAccount = new Map([
        ['liabilities:cartao:nubank', 300],
      ]);

      const rows = buildCardList({
        flowContas,
        accounts,
        aggregates,
        installmentsByAccount,
        totalRemainingByAccount,
      });

      const nubank = rows.find((r) => r.conta === 'liabilities:cartao:nubank');
      const itau = rows.find((r) => r.conta === 'liabilities:cartao:itau');
      expect(nubank.installmentsRemainingValue).toBe(300);
      expect(nubank.installments).toHaveLength(1);
      expect(itau.installmentsRemainingValue).toBe(0);
      expect(itau.installments).toEqual([]);
    });

    it('defaults to empty installments and 0 remaining when maps are omitted', () => {
      const flowContas = [flowRow('liabilities:cartao:nubank', 'Nubank')];
      const accounts = [accountsRow('liabilities:cartao:nubank', 'Nubank', -100)];
      const aggregates = new Map([
        ['liabilities:cartao:nubank', agg('liabilities:cartao:nubank', 50)],
      ]);

      const rows = buildCardList({ flowContas, accounts, aggregates });

      expect(rows[0].installments).toEqual([]);
      expect(rows[0].installmentsRemainingValue).toBe(0);
    });
  });
});
