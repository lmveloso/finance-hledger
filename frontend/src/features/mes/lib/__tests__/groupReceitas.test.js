// Unit tests for `groupReceitas` and the internal `deriveType` helper.
//
// Style matches frontend/src/features/fluxo-reformado/lib/__tests__/
// waterfall.test.js — Vitest conventions, no React / DOM rendering.
//
// The test runner isn't wired into the repo yet (see package.json — only
// Vite build is configured); the file is written so it is picked up
// automatically when the harness lands, matching the precedent set by the
// waterfall tests.

import { describe, it, expect } from 'vitest';
import { groupReceitas, deriveType } from '../groupReceitas.js';

function rev(description, amount, date = '2026-04-10') {
  return { date, description, amount };
}

describe('deriveType', () => {
  it('returns an em-dash for empty or missing descriptions', () => {
    expect(deriveType('')).toBe('—');
    expect(deriveType(undefined)).toBe('—');
    expect(deriveType(null)).toBe('—');
  });

  it('strips trailing ISO date suffixes', () => {
    expect(deriveType('Salario Empresa 2026-04-05')).toBe('Salario Empresa');
  });

  it('strips trailing parenthetical notes', () => {
    expect(deriveType('Salario Empresa (corr. 29-30/03)')).toBe('Salario Empresa');
  });

  it('strips trailing "#N" reference markers', () => {
    expect(deriveType('Salario Empresa #12')).toBe('Salario Empresa');
  });

  it('strips trailing split markers like "1/3"', () => {
    expect(deriveType('Salario Empresa 1/3')).toBe('Salario Empresa');
    expect(deriveType('Salario Empresa 02/03')).toBe('Salario Empresa');
  });

  it('combines multiple trailing noise patterns in one pass', () => {
    expect(deriveType('Salario Empresa 2026-04-05 #12')).toBe(
      'Salario Empresa',
    );
  });

  it('drops leading stopwords', () => {
    expect(deriveType('Pagamento Salario Empresa')).toBe('Salario Empresa');
    expect(deriveType('Recebimento de Salario')).toBe('Salario');
    expect(deriveType('Crédito em conta Salario')).toBe('Conta Salario');
  });

  it('is case-insensitive and returns Title Case', () => {
    expect(deriveType('SALARIO empresa')).toBe('Salario Empresa');
    expect(deriveType('salario EMPRESA')).toBe('Salario Empresa');
  });

  it('collapses runs of whitespace', () => {
    expect(deriveType('Salario   Empresa')).toBe('Salario Empresa');
  });

  it('keeps the first two tokens only', () => {
    expect(deriveType('Salario Empresa XYZ Matriz Sul')).toBe('Salario Empresa');
  });
});

describe('groupReceitas', () => {
  it('returns an empty array for empty or falsy input', () => {
    expect(groupReceitas([])).toEqual([]);
    expect(groupReceitas(null)).toEqual([]);
    expect(groupReceitas(undefined)).toEqual([]);
  });

  it('groups a single revenue into one type', () => {
    const out = groupReceitas([rev('Salario Empresa', 5000)]);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('Salario Empresa');
    expect(out[0].total).toBe(5000);
    expect(out[0].count).toBe(1);
    expect(out[0].items).toHaveLength(1);
  });

  it('groups two descriptions that normalize to the same type', () => {
    const out = groupReceitas([
      rev('Salario Empresa 2026-04-05', 5000),
      rev('Pagamento Salario Empresa', 5000),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('Salario Empresa');
    expect(out[0].total).toBe(10000);
    expect(out[0].count).toBe(2);
  });

  it('keeps distinct descriptions as separate groups', () => {
    const out = groupReceitas([
      rev('Salario Empresa', 5000),
      rev('Dividendo Corretora', 200),
    ]);
    expect(out).toHaveLength(2);
    const types = out.map((g) => g.type);
    expect(types).toContain('Salario Empresa');
    expect(types).toContain('Dividendo Corretora');
  });

  it('sorts groups by total descending', () => {
    const out = groupReceitas([
      rev('Pequeno Rendimento', 50),
      rev('Salario Grande', 8000),
      rev('Dividendo Medio', 500),
    ]);
    expect(out.map((g) => g.type)).toEqual([
      'Salario Grande',
      'Dividendo Medio',
      'Pequeno Rendimento',
    ]);
  });

  it('is case-insensitive when grouping', () => {
    const out = groupReceitas([
      rev('SALARIO EMPRESA', 5000),
      rev('salario empresa', 3000),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].total).toBe(8000);
  });

  it('strips trailing dates and reference markers when grouping', () => {
    const out = groupReceitas([
      rev('Salario Empresa 2026-04-05', 5000),
      rev('Salario Empresa #42', 5000),
      rev('Salario Empresa', 5000),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].total).toBe(15000);
    expect(out[0].count).toBe(3);
  });

  it('defaults non-numeric amounts to zero without crashing', () => {
    const out = groupReceitas([
      { date: '2026-04-10', description: 'Salario', amount: null },
      { date: '2026-04-10', description: 'Salario', amount: 1000 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].total).toBe(1000);
    expect(out[0].count).toBe(2);
  });
});
