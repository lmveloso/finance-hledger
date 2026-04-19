// Tab: Resumo — sparkline KPIs, category bars, top expenses
function TabResumo() {
  const { t, r, p, f } = window.useTheme();
  const d = window.MOCK;
  const total = d.categories.reduce((s, c) => s + c.valor, 0);
  const colors = t.chart.colors;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <window.KpiCard label="Receitas"    value={d.summary.receitas} color={t.feedback.positive} spark={d.sparklines.receitas} note="↑ 8% vs mês anterior" />
        <window.KpiCard label="Despesas"    value={d.summary.despesas} color={t.feedback.negative} spark={d.sparklines.despesas} note="↑ 2% vs mês anterior" />
        <window.KpiCard label="Saldo"       value={d.summary.saldo}    color={t.accent.primary}    spark={d.sparklines.saldo}    emphasized note="Melhor em 4 meses" />
      </div>

      {/* Categories + Top Expenses */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>

        {/* Category horizontal bars */}
        <window.Card title="Despesas por categoria">
          {d.categories.map((cat, i) => {
            const pct = (cat.valor / total) * 100;
            const col = colors[i % colors.length];
            return (
              <div key={cat.nome} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: col, flexShrink: 0 }} />
                    <span style={{ fontFamily: f.body, fontSize: 13, color: t.text.secondary }}>{cat.nome}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: f.body, fontSize: 11, color: t.text.muted }}>{window.PCT(pct)}</span>
                    <span style={{ fontFamily: f.display, fontSize: 14, color: t.text.primary }}>{window.BRL(cat.valor)}</span>
                  </div>
                </div>
                <div style={{ height: 5, background: t.border.default, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 999, transition: 'width 0.7s ease' }} />
                </div>
              </div>
            );
          })}
          {/* Stacked mini bar at bottom showing proportions */}
          <div style={{ marginTop: 4, height: 8, borderRadius: 999, display: 'flex', overflow: 'hidden', gap: 1 }}>
            {d.categories.map((cat, i) => (
              <div key={cat.nome} style={{ flex: cat.valor, background: colors[i % colors.length], opacity: 0.85 }} title={cat.nome} />
            ))}
          </div>
        </window.Card>

        {/* Top Expenses */}
        <window.Card title="Maiores gastos">
          {d.topExpenses.map((tx, i) => (
            <div key={i} style={{ padding: '13px 0', borderBottom: i < d.topExpenses.length - 1 ? `1px solid ${t.border.subtle}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontFamily: f.body, fontSize: 13, color: t.text.primary, lineHeight: 1.3, flex: 1 }}>{tx.descricao}</span>
                <span style={{ fontFamily: f.display, fontSize: 15, color: t.feedback.negative, whiteSpace: 'nowrap' }}>{window.BRL(tx.valor)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                <span style={{ fontFamily: f.body, fontSize: 10, color: t.text.muted }}>{tx.categoria}</span>
                <span style={{ fontFamily: f.body, fontSize: 10, color: t.text.disabled }}>·</span>
                <span style={{ fontFamily: f.body, fontSize: 10, color: t.text.muted }}>{tx.data}</span>
              </div>
            </div>
          ))}
        </window.Card>
      </div>

      {/* Receitas breakdown */}
      <window.Card title="Receitas">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {window.MOCK.receitas.map((r, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily: f.body, fontSize: 11, color: t.text.muted }}>{r.nome}</span>
              <span style={{ fontFamily: f.display, fontSize: 20, color: t.feedback.positive }}>{window.BRL(r.valor)}</span>
              <span style={{ fontFamily: f.body, fontSize: 10, color: t.text.disabled }}>{r.conta}</span>
            </div>
          ))}
        </div>
      </window.Card>
    </div>
  );
}

window.TabResumo = TabResumo;
