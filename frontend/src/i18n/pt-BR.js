// Portuguese (Brazil) translations.
//
// Keys live in a flat namespace. The English file (`en.js`) is the source of
// truth; this file is a translation. When adding keys, always add them here
// and to `en.js`.
//
// Per PRD §12, principle identifiers are data (stable), and each language
// dictionary maps them to human-readable labels.

const dict = {
  // ── Resumo tab ─────────────────────────────────────────────────────────
  'resumo.title': 'Resumo',
  'resumo.kpi.expenses': 'Despesas',
  'resumo.kpi.balance': 'Saldo',
  'resumo.categories.title': 'Despesas por categoria',
  'resumo.principles.title': 'Metas por princípio',
  'resumo.topExpenses.title': 'Maiores gastos',
  'resumo.topExpenses.seeAll': 'Ver todas ({count})',
  'resumo.drilldown.back': 'Voltar',
  'resumo.drilldown.empty': 'Sem subcategorias registradas neste mês.',

  // ── Mes tab ────────────────────────────────────────────────────────────
  'mes.title': 'Mês',
  'mes.revenues.title': 'Receitas',
  'mes.revenues.total': 'Total de receitas',
  'mes.revenues.empty': 'Nenhuma receita registrada neste mês.',
  'mes.kpi.revenue': 'Receitas',
  'mes.kpi.expense': 'Despesas',
  'mes.kpi.result': 'Resultado',
  'mes.principles.title': 'Metas por princípio',
  'mes.principles.unavailable':
    'Endpoint de princípios indisponível — aguarde PR-D1.',
  'mes.principles.header.principle': 'Princípio',
  'mes.principles.header.target': 'Meta',
  'mes.principles.header.realized': 'Realizado',
  'mes.principles.header.amount': 'R$',
  'mes.principles.meta': 'meta {pct}',
  'mes.expenses.title': 'Despesas por categoria',
  'mes.expenses.empty': 'Nenhuma despesa registrada neste mês.',
  'mes.topTransactions.title': 'Top 10 transações',
  'mes.topTransactions.empty': 'Nenhuma transação registrada neste mês.',
  'mes.creditCards.title': 'Despesas por cartão de crédito',
  'mes.creditCards.empty': 'Nenhum cartão com despesas neste mês.',
  'mes.creditCards.transactions': 'Maiores compras',
  'mes.creditCards.transactionsEmpty': 'Nenhuma compra neste cartão no mês.',
  'mes.creditCards.expand': 'Ver compras',
  'mes.creditCards.collapse': 'Ocultar',
  'mes.creditCards.showOnMobile': 'Ver cartões ({count})',

  // ── Principles (identifier → label) ────────────────────────────────────
  'principle.custos-fixos': 'Custos Fixos',
  'principle.conforto': 'Conforto',
  'principle.metas': 'Metas',
  'principle.prazeres': 'Prazeres',
  'principle.liberdade-financeira': 'Liberdade Financeira',
  'principle.aumentar-renda': 'Aumentar Renda',
  'principle.reserva-de-oportunidade': 'Reserva de Oportunidade',
  // Backend canonical id (models.PrincipleId uses `reserva-oportunidade`).
  'principle.reserva-oportunidade': 'Reserva de Oportunidade',

  // ── Navigation tabs ────────────────────────────────────────────────────
  'nav.resumo': 'Resumo',
  'nav.mes': 'Mês',
  'nav.ano': 'Ano',
  'nav.fluxo': 'Fluxo',
  'nav.orcamento': 'Orçamento',
  'nav.transacoes': 'Transações',

  // ── Theme toggle ───────────────────────────────────────────────────────
  'theme.light': 'Modo claro',
  'theme.dark': 'Modo escuro',

  // ── Plano tab ──────────────────────────────────────────────────────────
  'plano.header': 'Planejamento',
  'plano.toggle.forecast': 'Próximos meses',
  'plano.toggle.divida': 'Decaimento de dívida',

  // Vista 1 — Previsão
  'plano.forecast.title': 'Previsão · {count} meses',
  'plano.forecast.empty': 'Sem dados de previsão — verifique se o journal tem transações `~ monthly`.',
  'plano.forecast.footnote': 'Projeção baseada nas transações periódicas `~ monthly` do journal.',
  'plano.row.receitas': 'Receitas',
  'plano.row.despesas': 'Despesas',
  'plano.row.saldo': 'Saldo',
  'plano.row.saldoAcumulado': 'Saldo acumulado',

  // Vista 2 — Decaimento de dívida
  'plano.divida.title': 'Parcelamentos ativos',
  'plano.divida.empty': 'Nenhum parcelamento ativo.',
  'plano.divida.totalMonthly': 'Total mensal',
  'plano.divida.totalRemaining': 'Total restante',
  'plano.parcelamento.parcelas': '{paid}/{total} pagas',
  'plano.parcelamento.progressLabel': 'Progresso do pagamento',
  'plano.parcelamento.monthly': 'Mensal',
  'plano.parcelamento.remaining': 'Restante',
  'plano.parcelamento.endDate': 'Termina em',

  // Navigation
  'nav.plano': 'Plano',

  // ── Fluxo tab ──────────────────────────────────────────────────────────
  'fluxo.header': 'Fluxo',
  'fluxo.conta_singular': 'conta',
  'fluxo.conta_plural': 'contas',
  'fluxo.sem_movimento': 'Sem movimento neste mês.',
  'fluxo.receitas': 'Receitas',
  'fluxo.saldo': 'Saldo',
  'fluxo.outros': 'Outros',
  'fluxo.waterfall.title': 'Fluxo mensal · receita → saldo',
  'fluxo.waterfall.footnote.prefix': 'Receitas de',
  'fluxo.waterfall.footnote.middle': 'menos despesas resultam em saldo de',
  'fluxo.waterfall.footnote.suffix': '.',
  'fluxo.movimentos.title': 'Movimentos por conta',
  'fluxo.contas.title': 'Contas',
  'fluxo.contas.tipo_ativo': 'Ativo',
  'fluxo.contas.tipo_passivo': 'Passivo',
  'fluxo.contas.entradas': 'Entradas',
  'fluxo.contas.saidas': 'Saídas',
  'fluxo.contas.saldo_final': 'Saldo final',
  'fluxo.contas.delta': 'Variação no mês',

  // ── Orçamento tab ──────────────────────────────────────────────────────
  'orcamento.total.title': 'Total · orçamento vs realizado',
  'orcamento.total.of': 'de {amount}',
  'orcamento.total.aboveBudget': '{amount} acima do orçamento total',
  'orcamento.categories.title': 'Por categoria',
  'orcamento.empty':
    'Nenhuma categoria com orçamento definido. Adicione transações periódicas (~ monthly) no seu .journal.',
  'orcamento.over.chip': '+{amount}',
  'orcamento.surplus.chip': '{amount} restante',
  'orcamento.category.separator': 'de',

  // ── Patrimonio tab ─────────────────────────────────────────────────────
  'patrimonio.header': 'Patrimônio',
  'patrimonio.hero.net': 'Patrimônio líquido',
  'patrimonio.hero.vsPrevMonth': 'vs mês anterior',
  'patrimonio.evolution.title': 'Evolução histórica',
  'patrimonio.evolution.empty': 'Sem dados de patrimônio para o período selecionado.',
  'patrimonio.assets': 'Ativos',
  'patrimonio.liabilities': 'Passivos',
  'patrimonio.net': 'Patrimônio líquido',
  'patrimonio.empty.assets': 'Nenhuma conta de ativo encontrada.',
  'patrimonio.empty.liabilities': 'Nenhuma conta de passivo encontrada.',
  'patrimonio.total.assets': 'Total ativos',
  'patrimonio.total.liabilities': 'Total passivos',

  // Settings panel
  'patrimonio.period.label': 'Período',
  'patrimonio.period.6': '6m',
  'patrimonio.period.12': '12m',
  'patrimonio.period.24': '24m',
  'patrimonio.period.36': '36m',
  'patrimonio.period.all': 'Tudo',
  'patrimonio.hideZero': 'Ocultar contas zeradas',

  // Account detail
  'patrimonio.detail.back': 'Voltar para contas',
  'patrimonio.detail.statement': 'Extrato',
  'patrimonio.detail.until': 'até',
  'patrimonio.detail.search': 'Buscar',
  'patrimonio.detail.clear': 'Limpar',
  'patrimonio.detail.statementRange': 'Extrato · {start} a {end}',
  'patrimonio.detail.emptyRange': 'Nenhuma transação no período selecionado.',
  'patrimonio.detail.count': '{count} transações',
  'patrimonio.detail.final': 'Saldo final',
  'patrimonio.detail.recent': 'Últimas transações',
  'patrimonio.detail.emptyRecent': 'Nenhuma transação encontrada para esta conta.',

  // Transactions table columns
  'patrimonio.tx.date': 'Data',
  'patrimonio.tx.description': 'Descrição',
  'patrimonio.tx.category': 'Categoria',
  'patrimonio.tx.type': 'Tipo',
  'patrimonio.tx.amount': 'Valor',
  'patrimonio.tx.balance': 'Saldo',

  // Navigation
  'nav.patrimonio': 'Patrimônio',
};

export default dict;
