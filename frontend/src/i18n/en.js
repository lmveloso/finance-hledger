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

  // ── Plano tab ──────────────────────────────────────────────────────────
  'plano.header': 'Planning',
  'plano.toggle.forecast': 'Next months',
  'plano.toggle.divida': 'Debt decay',

  // Vista 1 — Forecast
  'plano.forecast.title': 'Forecast · {count} months',
  'plano.forecast.empty': 'No forecast data — check if the journal has `~ monthly` periodic transactions.',
  'plano.forecast.footnote': 'Projection comes from `~ monthly` periodic transactions in the journal.',
  'plano.row.receitas': 'Revenues',
  'plano.row.despesas': 'Expenses',
  'plano.row.saldo': 'Balance',
  'plano.row.saldoAcumulado': 'Accumulated balance',

  // Vista 2 — Debt decay
  'plano.divida.title': 'Active installments',
  'plano.divida.empty': 'No active installments.',
  'plano.divida.totalMonthly': 'Total monthly',
  'plano.divida.totalRemaining': 'Total remaining',
  'plano.parcelamento.parcelas': '{paid}/{total} paid',
  'plano.parcelamento.progressLabel': 'Payment progress',
  'plano.parcelamento.monthly': 'Monthly',
  'plano.parcelamento.remaining': 'Remaining',
  'plano.parcelamento.endDate': 'Ends on',

  // Navigation
  'nav.plano': 'Plan',
};

export default dict;
