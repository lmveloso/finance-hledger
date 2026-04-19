// Mock data — Finance Dashboard prototype
window.MOCK = {
  summary: { receitas: 12840, despesas: 9320, saldo: 3520 },

  sparklines: {
    receitas: [10200, 11500, 9800, 12100, 11800, 12840],
    despesas: [8800, 9200, 8400, 9800, 9100, 9320],
    saldo:    [1400, 2300, 1400, 2300, 2700, 3520],
  },

  categories: [
    { nome: 'Moradia',      valor: 3262 },
    { nome: 'Alimentação',  valor: 1864 },
    { nome: 'Transporte',   valor: 1119 },
    { nome: 'Saúde',        valor:  746 },
    { nome: 'Lazer',        valor:  652 },
    { nome: 'Educação',     valor:  559 },
    { nome: 'Outros',       valor: 1118 },
  ],

  topExpenses: [
    { descricao: 'Aluguel',            valor: 2800, categoria: 'Moradia',     data: '05 abr' },
    { descricao: 'Supermercado Extra', valor:  843, categoria: 'Alimentação', data: '12 abr' },
    { descricao: 'IPTU parcela 4/10',  valor:  462, categoria: 'Moradia',     data: '07 abr' },
    { descricao: 'Plano de Saúde',     valor:  420, categoria: 'Saúde',       data: '01 abr' },
    { descricao: 'Combustível',        valor:  380, categoria: 'Transporte',  data: '18 abr' },
  ],

  receitas: [
    { nome: 'Salário',          valor: 11000, conta: 'Nubank' },
    { nome: 'Freelance',        valor:  1500, conta: 'Nubank' },
    { nome: 'Rendimento CDB',   valor:   340, conta: 'Bradesco' },
  ],

  principles: [
    { id: 'custos-fixos', label: 'Custos Fixos',            target: 50, realized: 44, amount: 5640 },
    { id: 'conforto',     label: 'Conforto',                target: 10, realized: 12, amount: 1537 },
    { id: 'metas',        label: 'Metas',                   target: 10, realized: 15, amount: 1926 },
    { id: 'prazeres',     label: 'Prazeres',                target:  5, realized:  7, amount:  897 },
    { id: 'liberdade',    label: 'Liberdade Financeira',    target: 20, realized: 18, amount: 2311 },
    { id: 'renda',        label: 'Aumentar Renda',          target:  3, realized:  2, amount:  257 },
    { id: 'reserva',      label: 'Reserva de Oportunidade', target:  2, realized:  2, amount:  257 },
  ],

  budget: [
    { nome: 'Moradia',     orcado: 3200, realizado: 3262 },
    { nome: 'Alimentação', orcado: 2000, realizado: 1864 },
    { nome: 'Transporte',  orcado: 1000, realizado: 1119 },
    { nome: 'Saúde',       orcado:  800, realizado:  746 },
    { nome: 'Lazer',       orcado:  700, realizado:  652 },
    { nome: 'Educação',    orcado:  600, realizado:  559 },
    { nome: 'Outros',      orcado: 1000, realizado: 1118 },
  ],

  networth: Array.from({ length: 24 }, (_, i) => {
    const d = new Date(2023, 4 + i, 1);
    const ativos   = 150000 + i * 3200 + Math.sin(i * 0.7) * 4000;
    const passivos =  45000 - i *  700 + Math.sin(i * 1.1) * 1500;
    return {
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      ativos:   Math.round(ativos),
      passivos: Math.round(Math.abs(passivos)),
      liquido:  Math.round(ativos - Math.abs(passivos)),
    };
  }),

  accounts: [
    { nome: 'Nubank CC',          tipo: 'ativo',    saldo:  10400 },
    { nome: 'Bradesco PJ',        tipo: 'ativo',    saldo:  16120 },
    { nome: 'Tesouro Direto',     tipo: 'ativo',    saldo:  82000 },
    { nome: 'CDB Nubank',         tipo: 'ativo',    saldo:  43200 },
    { nome: 'Nubank Cartão',      tipo: 'passivo',  saldo:  -1800 },
    { nome: 'Financiamento Auto', tipo: 'passivo',  saldo: -18400 },
  ],

  flow: {
    economia: 3520,
    caixaLiq: 2060,
    contas: [
      { nome: 'Nubank',      tipo: 'ativo',   entradas: 12840, saidas:  9780, delta:  3060, saldo: 10400 },
      { nome: 'Bradesco',    tipo: 'ativo',   entradas:  2440, saidas:  1320, delta:  1120, saldo: 16120 },
      { nome: 'Nubank CC',   tipo: 'passivo', entradas:  1800, saidas:  2400, delta:  -600, saldo: -1800 },
    ],
    waterfall: [
      { label: 'Receitas',    valor:  12840, tipo: 'income' },
      { label: 'Moradia',     valor: -3262,  tipo: 'expense' },
      { label: 'Alimentação', valor: -1864,  tipo: 'expense' },
      { label: 'Transporte',  valor: -1119,  tipo: 'expense' },
      { label: 'Saúde',       valor:  -746,  tipo: 'expense' },
      { label: 'Lazer',       valor:  -652,  tipo: 'expense' },
      { label: 'Educação',    valor:  -559,  tipo: 'expense' },
      { label: 'Outros',      valor: -1118,  tipo: 'expense' },
      { label: 'Saldo',       valor:  3520,  tipo: 'result' },
    ],
  },

  yearMatrix: {
    months: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
    categories: ['Moradia','Alimentação','Transporte','Saúde','Lazer','Educação','Outros'],
    data: [
      [3200,3200,3200,3262,  0,  0,  0,  0,  0,  0,  0,  0],
      [1700,1820,1950,1864,  0,  0,  0,  0,  0,  0,  0,  0],
      [ 900,1050, 980,1119,  0,  0,  0,  0,  0,  0,  0,  0],
      [ 400, 800, 600, 746,  0,  0,  0,  0,  0,  0,  0,  0],
      [ 500, 450, 700, 652,  0,  0,  0,  0,  0,  0,  0,  0],
      [ 600, 600, 600, 559,  0,  0,  0,  0,  0,  0,  0,  0],
      [ 900, 750,1100,1118,  0,  0,  0,  0,  0,  0,  0,  0],
    ],
  },
};

window.BRL = (n, dec = 0) =>
  (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: dec });
window.PCT = (n) => `${Math.round(n ?? 0)}%`;
