// English translations — source of truth.
//
// Per the project conventions (CLAUDE.md: "English is the source language"),
// every user-facing string lives here first, then gets translated to other
// dictionaries. Missing keys fall back to the key itself.

const dict = {
  // ── Mes tab ────────────────────────────────────────────────────────────
  'mes.title': 'Month',
  'mes.revenues.title': 'Revenues',
  'mes.revenues.total': 'Total revenues',
  'mes.revenues.empty': 'No revenues recorded this month.',
  'mes.kpi.revenue': 'Revenue',
  'mes.kpi.expense': 'Expense',
  'mes.kpi.result': 'Result',
  'mes.principles.title': 'Targets by principle',
  'mes.principles.unavailable':
    'Principles endpoint unavailable — waiting for PR-D1.',
  'mes.principles.header.principle': 'Principle',
  'mes.principles.header.target': 'Target',
  'mes.principles.header.realized': 'Realized',
  'mes.principles.header.amount': 'Amount',
  'mes.expenses.title': 'Expenses by category',
  'mes.expenses.empty': 'No expenses recorded this month.',
  'mes.topTransactions.title': 'Top 10 transactions',
  'mes.topTransactions.empty': 'No transactions recorded this month.',

  // ── Principles (identifier → label) ────────────────────────────────────
  'principle.custos-fixos': 'Fixed Costs',
  'principle.conforto': 'Comfort',
  'principle.metas': 'Goals',
  'principle.prazeres': 'Pleasures',
  'principle.liberdade-financeira': 'Financial Freedom',
  'principle.aumentar-renda': 'Raise Income',
  'principle.reserva-de-oportunidade': 'Opportunity Reserve',

  // ── Navigation tabs ────────────────────────────────────────────────────
  'nav.mes': 'Month',
};

export default dict;
