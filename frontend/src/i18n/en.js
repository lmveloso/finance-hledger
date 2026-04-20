// English translations — source of truth.
//
// Per the project conventions (CLAUDE.md: "English is the source language"),
// every user-facing string lives here first, then gets translated to other
// dictionaries. Missing keys fall back to the key itself.

const dict = {
  // ── Resumo tab ─────────────────────────────────────────────────────────
  'resumo.title': 'Summary',
  'resumo.kpi.expenses': 'Expenses',
  'resumo.kpi.balance': 'Balance',
  'resumo.categories.title': 'Expenses by category',
  'resumo.principles.title': 'Targets by principle',
  'resumo.topExpenses.title': 'Top expenses',
  'resumo.topExpenses.seeAll': 'See all ({count})',
  'resumo.drilldown.back': 'Back',
  'resumo.drilldown.empty': 'No subcategories recorded this month.',

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
  'mes.principles.meta': 'target {pct}',
  'mes.expenses.title': 'Expenses by category',
  'mes.expenses.empty': 'No expenses recorded this month.',
  'mes.topTransactions.title': 'Top 10 transactions',
  'mes.topTransactions.empty': 'No transactions recorded this month.',
  'mes.creditCards.title': 'Credit card spending',
  'mes.creditCards.empty': 'No card purchases this month.',
  'mes.creditCards.transactions': 'Largest purchases',
  'mes.creditCards.transactionsEmpty': 'No purchases on this card this month.',
  'mes.creditCards.expand': 'View purchases',
  'mes.creditCards.collapse': 'Hide',
  'mes.creditCards.showOnMobile': 'Show cards ({count})',

  // ── Principles (identifier → label) ────────────────────────────────────
  'principle.custos-fixos': 'Fixed Costs',
  'principle.conforto': 'Comfort',
  'principle.metas': 'Goals',
  'principle.prazeres': 'Pleasures',
  'principle.liberdade-financeira': 'Financial Freedom',
  'principle.aumentar-renda': 'Raise Income',
  'principle.reserva-de-oportunidade': 'Opportunity Reserve',
  // Backend canonical id (models.PrincipleId uses `reserva-oportunidade`).
  'principle.reserva-oportunidade': 'Opportunity Reserve',

  // ── Navigation tabs ────────────────────────────────────────────────────
  'nav.resumo': 'Summary',
  'nav.mes': 'Month',
  'nav.ano': 'Year',
  'nav.fluxo': 'Flow',
  'nav.orcamento': 'Budget',
  'nav.transacoes': 'Transactions',

  // ── Theme toggle ───────────────────────────────────────────────────────
  'theme.light': 'Light mode',
  'theme.dark': 'Dark mode',

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

  // ── Fluxo tab ──────────────────────────────────────────────────────────
  'fluxo.header': 'Flow',
  'fluxo.conta_singular': 'account',
  'fluxo.conta_plural': 'accounts',
  'fluxo.sem_movimento': 'No movement this month.',
  'fluxo.receitas': 'Revenue',
  'fluxo.saldo': 'Balance',
  'fluxo.outros': 'Others',
  'fluxo.waterfall.title': 'Monthly flow · revenue → balance',
  'fluxo.waterfall.footnote.prefix': 'Revenue of',
  'fluxo.waterfall.footnote.middle': 'minus expenses leaves a balance of',
  'fluxo.waterfall.footnote.suffix': '.',
  'fluxo.movimentos.title': 'Movements per account',
  'fluxo.contas.title': 'Accounts',
  'fluxo.contas.tipo_ativo': 'Asset',
  'fluxo.contas.tipo_passivo': 'Liability',
  'fluxo.contas.entradas': 'Inflow',
  'fluxo.contas.saidas': 'Outflow',
  'fluxo.contas.saldo_final': 'Closing balance',
  'fluxo.contas.delta': 'Monthly change',

  // ── Orçamento tab ──────────────────────────────────────────────────────
  'orcamento.total.title': 'Total · budget vs actual',
  'orcamento.total.of': 'of {amount}',
  'orcamento.total.aboveBudget': '{amount} above total budget',
  'orcamento.categories.title': 'By category',
  'orcamento.empty':
    'No category has a budget defined. Add periodic transactions (~ monthly) to your .journal.',
  'orcamento.over.chip': '+{amount}',
  'orcamento.surplus.chip': '{amount} remaining',
  'orcamento.category.separator': 'of',

  // ── Patrimonio tab ─────────────────────────────────────────────────────
  'patrimonio.header': 'Net Worth',
  'patrimonio.hero.net': 'Net worth',
  'patrimonio.hero.vsPrevMonth': 'vs. previous month',
  'patrimonio.evolution.title': 'Historical evolution',
  'patrimonio.evolution.empty': 'No net worth data for the selected period.',
  'patrimonio.assets': 'Assets',
  'patrimonio.liabilities': 'Liabilities',
  'patrimonio.net': 'Net worth',
  'patrimonio.empty.assets': 'No asset accounts found.',
  'patrimonio.empty.liabilities': 'No liability accounts found.',
  'patrimonio.total.assets': 'Total assets',
  'patrimonio.total.liabilities': 'Total liabilities',

  // Settings panel
  'patrimonio.period.label': 'Period',
  'patrimonio.period.6': '6m',
  'patrimonio.period.12': '12m',
  'patrimonio.period.24': '24m',
  'patrimonio.period.36': '36m',
  'patrimonio.period.all': 'All',
  'patrimonio.hideZero': 'Hide empty accounts',

  // Account detail
  'patrimonio.detail.back': 'Back to accounts',
  'patrimonio.detail.statement': 'Statement',
  'patrimonio.detail.until': 'to',
  'patrimonio.detail.search': 'Search',
  'patrimonio.detail.clear': 'Clear',
  'patrimonio.detail.statementRange': 'Statement · {start} to {end}',
  'patrimonio.detail.emptyRange': 'No transactions in the selected range.',
  'patrimonio.detail.count': '{count} transactions',
  'patrimonio.detail.final': 'Final balance',
  'patrimonio.detail.recent': 'Recent transactions',
  'patrimonio.detail.emptyRecent': 'No transactions found for this account.',

  // Transactions table columns
  'patrimonio.tx.date': 'Date',
  'patrimonio.tx.description': 'Description',
  'patrimonio.tx.category': 'Category',
  'patrimonio.tx.type': 'Type',
  'patrimonio.tx.amount': 'Amount',
  'patrimonio.tx.balance': 'Balance',

  // Navigation
  'nav.patrimonio': 'Net Worth',

  // ── Pull-to-refresh ────────────────────────────────────────────────────
  'pull.pulling': 'Pull to refresh...',
  'pull.ready': 'Release to refresh...',
  'pull.refreshing': 'Refreshing...',

  // ── Auth ───────────────────────────────────────────────────────────────
  'auth.title': 'Finance Hledger',
  'auth.password.placeholder': 'Password',
  'auth.submit': 'Sign in',
  'auth.submitting': 'Signing in...',
  'auth.error.wrongPassword': 'Wrong password',
  'auth.error.connection': 'Connection error',

  // ── Month stepper (MonthNavigator) ─────────────────────────────────────
  'month.prev': 'Previous month',
  'month.next': 'Next month',
  'month.today': 'Today',
  'month.today.title': 'Back to current month',
  'month.compareYoY': 'vs. previous year',

  // ── ErrorBox ───────────────────────────────────────────────────────────
  'errorBox.title': 'Loading error: {msg}',
  'errorBox.checkBackend':
    'Check that the backend is running and LEDGER_FILE points to the correct journal.',

  // ── Transacoes tab ─────────────────────────────────────────────────────
  'transacoes.title': 'Transactions',
  'transacoes.search.placeholder': 'Search by description...',
  'transacoes.filter.allCategories': 'All categories',
  'transacoes.range.month': 'Month',
  'transacoes.range.date': 'Range',
  'transacoes.range.until': 'to',
  'transacoes.range.toggleTitle.toRange': 'Switch to date range',
  'transacoes.range.toggleTitle.toMonth': 'Back to single month',
  'transacoes.table.date': 'Date',
  'transacoes.table.description': 'Description',
  'transacoes.table.category': 'Category',
  'transacoes.table.amount': 'Amount',
  'transacoes.empty': 'No transactions found for the selected filters.',
  'transacoes.pagination.previous': 'Previous',
  'transacoes.pagination.next': 'Next',
  'transacoes.pagination.summary': '{start}–{end} of {total}',
  'transacoes.pagination.zero': '0 results',
  'transacoes.tags.label': 'Tags',
  'transacoes.tags.clear': 'Clear filters',

  // ── Ano tab ────────────────────────────────────────────────────────────
  'ano.header': 'Year overview',
  'ano.year.label': 'Year',
  'ano.view.principio': 'Principle × Month',
  'ano.view.categoria': 'Category × Month',
  'ano.empty': 'No expenses recorded in {year}.',
  'ano.title.principio': 'Principle × Month · {year}',
  'ano.title.categoria': 'Category × Month · {year}',
  'ano.totals': 'Totals',
  'ano.total.row': 'Total',
  'ano.legend.intensity': 'Intensity per category:',
  'ano.legend.max': 'category max',
  'ano.warning.sumNot100':
    'Warning: the sum of percentages for some month did not reach 100% (check backend).',
  'ano.warning.sumOk':
    'Each column sums to 100% (largest-remainder rounding).',

  // ── Previsao tab (kept for symmetry; hidden from nav in Fase U) ────────
  'previsao.forecast.title': 'Flow forecast · 12 months',
  'previsao.forecast.projectedBalance': 'Projected balance 6 months: {amount}',
  'previsao.legend.revenue': 'Revenue',
  'previsao.legend.expense': 'Expense',
  'previsao.legend.balance': 'Balance',
  'previsao.legend.forecast': 'Forecast',
  'previsao.seasonality.title': 'Seasonality · Expenses by category',
  'previsao.seasonality.header.category': 'Category',
};

export default dict;
