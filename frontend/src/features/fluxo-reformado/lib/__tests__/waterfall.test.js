// Unit tests for `buildWaterfall`.
//
// No test runner is wired into the repo yet (see package.json — only vite
// build is configured). This file is written against Vitest conventions so
// it is picked up automatically when the harness lands.

import { describe, it, expect } from 'vitest';
import { buildWaterfall, TOP_N } from '../waterfall.js';

const flowBase = {
  total_entradas: 10000,
  total_saidas: 7000,
  total_economia: 3000,
  contas: [],
};

function cat(nome, valor) {
  return { nome, segmento_raw: nome.toLowerCase(), valor };
}

describe('buildWaterfall', () => {
  it('returns an empty array for falsy flow', () => {
    expect(buildWaterfall(null, null)).toEqual([]);
    expect(buildWaterfall(undefined, { categorias: [] })).toEqual([]);
  });

  it('returns an empty array when there is no activity at all', () => {
    const out = buildWaterfall(
      { total_entradas: 0, total_saidas: 0, total_economia: 0 },
      { categorias: [] },
    );
    expect(out).toEqual([]);
  });

  it('drops zero-valor categorias', () => {
    const out = buildWaterfall(flowBase, {
      categorias: [
        cat('Moradia', 3000),
        cat('Lazer', 0),
        cat('Transporte', 500),
      ],
    });
    const labels = out.filter((b) => b.kind === 'expense').map((b) => b.label);
    expect(labels).toEqual(['Moradia', 'Transporte']);
  });

  it('handles exactly 6 categorias without collapsing into Outros', () => {
    const cats = [
      cat('A', 600),
      cat('B', 500),
      cat('C', 400),
      cat('D', 300),
      cat('E', 200),
      cat('F', 100),
    ];
    const out = buildWaterfall(flowBase, { categorias: cats });
    const expenses = out.filter((b) => b.kind === 'expense');
    expect(expenses).toHaveLength(TOP_N);
    expect(expenses.map((b) => b.label)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
    ]);
  });

  it('collapses categorias beyond the top 6 into Outros', () => {
    const cats = [
      cat('A', 900),
      cat('B', 800),
      cat('C', 700),
      cat('D', 600),
      cat('E', 500),
      cat('F', 400),
      cat('G', 300),
      cat('H', 200),
    ];
    const out = buildWaterfall(flowBase, { categorias: cats });
    const expenses = out.filter((b) => b.kind === 'expense');
    expect(expenses).toHaveLength(7); // 6 top + Outros
    expect(expenses[expenses.length - 1].label).toBe('Outros');
    expect(expenses[expenses.length - 1].delta).toBe(-(300 + 200));
  });

  it('sorts categorias descending by valor regardless of input order', () => {
    const cats = [
      cat('Small', 100),
      cat('Huge', 9000),
      cat('Mid', 500),
    ];
    const out = buildWaterfall(flowBase, { categorias: cats });
    const expenses = out.filter((b) => b.kind === 'expense');
    expect(expenses.map((b) => b.label)).toEqual(['Huge', 'Mid', 'Small']);
  });

  it('first bar is income and last bar is result', () => {
    const out = buildWaterfall(flowBase, {
      categorias: [cat('Moradia', 2000)],
    });
    expect(out[0].kind).toBe('income');
    expect(out[out.length - 1].kind).toBe('result');
  });

  it('income.delta equals total_entradas and result.delta equals total_economia', () => {
    const out = buildWaterfall(flowBase, {
      categorias: [cat('Moradia', 2000)],
    });
    const income = out.find((b) => b.kind === 'income');
    const result = out.find((b) => b.kind === 'result');
    expect(income.delta).toBe(10000);
    expect(result.delta).toBe(3000);
  });

  it('result bar is anchored at zero (start=0, end=total_economia)', () => {
    const out = buildWaterfall(flowBase, {
      categorias: [cat('Moradia', 2000)],
    });
    const result = out[out.length - 1];
    expect(result.start).toBe(0);
    expect(result.end).toBe(3000);
  });

  it('running cumulative is consistent across expense steps', () => {
    const out = buildWaterfall(flowBase, {
      categorias: [cat('Moradia', 2000), cat('Lazer', 1000)],
    });
    const income = out.find((b) => b.kind === 'income');
    const [e1, e2] = out.filter((b) => b.kind === 'expense');
    expect(income.end).toBe(10000);
    expect(e1.start).toBe(10000);
    expect(e1.end).toBe(8000);
    expect(e2.start).toBe(8000);
    expect(e2.end).toBe(7000);
  });

  it('uses warning color for negative total_entradas', () => {
    const out = buildWaterfall(
      { total_entradas: -500, total_saidas: 0, total_economia: -500 },
      { categorias: [] },
    );
    const income = out.find((b) => b.kind === 'income');
    expect(income.colorToken).toBe('feedback.warning');
  });

  it('uses negative color for negative total_economia (spent more than earned)', () => {
    const out = buildWaterfall(
      { total_entradas: 1000, total_saidas: 1500, total_economia: -500 },
      { categorias: [cat('Moradia', 1500)] },
    );
    const result = out[out.length - 1];
    expect(result.kind).toBe('result');
    expect(result.delta).toBe(-500);
    expect(result.colorToken).toBe('feedback.negative');
  });

  it('falls back to total_entradas - total_saidas when total_economia is missing', () => {
    const out = buildWaterfall(
      { total_entradas: 4000, total_saidas: 1000 },
      { categorias: [cat('Moradia', 1000)] },
    );
    const result = out[out.length - 1];
    expect(result.delta).toBe(3000);
  });

  it('respects custom label and token overrides via opts', () => {
    const out = buildWaterfall(flowBase, {
      categorias: [
        cat('A', 100), cat('B', 90), cat('C', 80), cat('D', 70),
        cat('E', 60), cat('F', 50), cat('G', 40),
      ],
    }, {
      incomeLabel: 'Revenue',
      resultLabel: 'Balance',
      outrosLabel: 'Others',
      tokens: { expense: 'custom.expense' },
    });
    expect(out[0].label).toBe('Revenue');
    expect(out[out.length - 1].label).toBe('Balance');
    const lastExpense = out.filter((b) => b.kind === 'expense').slice(-1)[0];
    expect(lastExpense.label).toBe('Others');
    expect(lastExpense.colorToken).toBe('custom.expense');
  });
});
