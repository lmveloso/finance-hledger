// Portuguese (Brazil) translations.
//
// Keys live in a flat namespace. The English file (`en.js`) is the source of
// truth; this file is a translation. When adding keys, always add them here
// and to `en.js`.
//
// Per PRD §12, principle identifiers are data (stable), and each language
// dictionary maps them to human-readable labels.

const dict = {
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
  'mes.expenses.title': 'Despesas por categoria',
  'mes.expenses.empty': 'Nenhuma despesa registrada neste mês.',
  'mes.topTransactions.title': 'Top 10 transações',
  'mes.topTransactions.empty': 'Nenhuma transação registrada neste mês.',

  // ── Principles (identifier → label) ────────────────────────────────────
  'principle.custos-fixos': 'Custos Fixos',
  'principle.conforto': 'Conforto',
  'principle.metas': 'Metas',
  'principle.prazeres': 'Prazeres',
  'principle.liberdade-financeira': 'Liberdade Financeira',
  'principle.aumentar-renda': 'Aumentar Renda',
  'principle.reserva-de-oportunidade': 'Reserva de Oportunidade',

  // ── Navigation tabs ────────────────────────────────────────────────────
  'nav.mes': 'Mês',
};

export default dict;
