// Unit tests for `aggregateCard` (the pure aggregation helper behind
// `useCreditCards`). Covers the tipo_movimento contract fix from issue #5:
// the backend tags card purchases as 'debito' (liability-side valor is
// negative), and the aggregator must flip the sign so totals read as
// positive spend.
//
// Style matches frontend/src/features/fluxo-reformado/lib/__tests__/
// waterfall.test.js — Vitest conventions, no React / DOM rendering.

import { describe, it, expect } from 'vitest';
import { aggregateCard } from '../useCreditCards.js';

const palette = ['#111', '#222', '#333', '#444'];
const CARD = 'liabilities:cartao:nubank';

function tx(overrides) {
  return {
    data: '2026-04-01',
    descricao: 'test',
    conta: CARD,
    valor: 0,
    contra_conta: '',
    categoria: '',
    tipo_movimento: 'debito',
    ...overrides,
  };
}

function agg(transactions) {
  return aggregateCard(CARD, 'Nubank', { transactions }, palette);
}

describe('aggregateCard', () => {
  it('includes debito purchases and flips sign to positive', () => {
    const out = agg([
      tx({
        tipo_movimento: 'debito',
        valor: -150,
        contra_conta: 'expenses:alimentacao:mercado',
      }),
    ]);
    expect(out.total).toBe(150);
    expect(out.categories).toHaveLength(1);
    expect(out.categories[0].raw).toBe('alimentacao');
    expect(out.categories[0].valor).toBe(150);
  });

  it('still includes credito entries (e.g. refunds) against an expense account', () => {
    const out = agg([
      tx({
        tipo_movimento: 'credito',
        valor: 40,
        contra_conta: 'expenses:lazer:streaming',
      }),
    ]);
    expect(out.total).toBe(40);
    expect(out.categories).toHaveLength(1);
    expect(out.categories[0].raw).toBe('lazer');
    expect(out.categories[0].valor).toBe(40);
  });

  it('excludes transfers whose contra starts with assets: or liabilities:', () => {
    const out = agg([
      tx({
        tipo_movimento: 'credito',
        valor: 500,
        contra_conta: 'assets:banco:corrente',
      }),
      tx({
        tipo_movimento: 'credito',
        valor: 200,
        contra_conta: 'liabilities:cartao:outro',
      }),
    ]);
    expect(out.total).toBe(0);
    expect(out.categories).toEqual([]);
    expect(out.transactions).toEqual([]);
  });

  it('excludes saldo_inicial entries', () => {
    const out = agg([
      tx({
        tipo_movimento: 'saldo_inicial',
        valor: -1200,
        contra_conta: 'equity:saldo-inicial',
      }),
    ]);
    expect(out.total).toBe(0);
    expect(out.categories).toEqual([]);
  });

  it('sums purchases per L1 category segment', () => {
    const out = agg([
      tx({
        tipo_movimento: 'debito',
        valor: -80,
        contra_conta: 'expenses:saude:farmacia',
      }),
      tx({
        tipo_movimento: 'debito',
        valor: -220,
        contra_conta: 'expenses:saude:medico',
      }),
      tx({
        tipo_movimento: 'debito',
        valor: -50,
        contra_conta: 'expenses:lazer:cinema',
      }),
    ]);
    expect(out.total).toBe(350);
    const saude = out.categories.find((c) => c.raw === 'saude');
    const lazer = out.categories.find((c) => c.raw === 'lazer');
    expect(saude.valor).toBe(300);
    expect(lazer.valor).toBe(50);
    // sorted descending by valor
    expect(out.categories[0].raw).toBe('saude');
    expect(out.categories[1].raw).toBe('lazer');
  });

  it('produces total === 0 for a card with zero qualifying purchases', () => {
    const out = agg([]);
    expect(out.total).toBe(0);
    expect(out.categories).toEqual([]);
    expect(out.transactions).toEqual([]);
  });

  it('produces total === 0 when only transfers and saldo_inicial are present', () => {
    const out = agg([
      tx({
        tipo_movimento: 'credito',
        valor: 1000,
        contra_conta: 'assets:banco:corrente',
      }),
      tx({
        tipo_movimento: 'saldo_inicial',
        valor: -500,
        contra_conta: 'equity:saldo-inicial',
      }),
    ]);
    expect(out.total).toBe(0);
  });
});
