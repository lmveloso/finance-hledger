// Tab: Mês — KPIs, princípios gauges, despesas
const { useState: useMesState } = React;

function PrincipleBar({ label, target, realized, amount }) {
  const { t, r, f } = window.useTheme();
  const ratio = target > 0 ? realized / target : 0;
  const over  = realized > target;
  const close = !over && ratio >= 0.85;
  const barColor = over ? t.feedback.negative : close ? t.feedback.warning : t.feedback.positive;

  return (
    <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${t.border.subtle}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
        <span style={{ fontFamily: f.body, fontSize: 13, color: t.text.secondary }}>{label}</span>
        <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
          <span style={{ fontFamily: f.body, fontSize: 11, color: t.text.muted }}>meta {window.PCT(target)}</span>
          <span style={{ fontFamily: f.body, fontSize: 13, color: over ? t.feedback.negative : t.text.primary, fontWeight: 600 }}>{window.PCT(realized)}</span>
          <span style={{ fontFamily: f.display, fontSize: 13, color: t.text.muted }}>{window.BRL(amount)}</span>
        </div>
      </div>
      {/* Track with target marker */}
      <div style={{ position: 'relative', height: 6, background: t.border.default, borderRadius: 999 }}>
        <div style={{ height: '100%', width: `${Math.min(ratio * 100, 100)}%`, background: barColor, borderRadius: 999, transition: 'width 0.6s ease' }} />
        {/* Target marker */}
        <div style={{ position: 'absolute', top: -3, left: '100%', transform: 'translateX(-1px)', width: 2, height: 12, background: t.text.disabled, borderRadius: 1 }} />
      </div>
    </div>
  );
}

function TabMes() {
  const { t, r, p, f } = window.useTheme();
  const d = window.MOCK;
  const [expanded, setExpanded] = useMesState(false);
  const total = d.categories.reduce((s, c) => s + c.valor, 0);
  const colors = t.chart.colors;
  const savingsRate = Math.round((d.summary.saldo / d.summary.receitas) * 100);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* KPI row — no sparklines (more compact for this tab) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <window.KpiCard label="Receitas" value={d.summary.receitas} color={t.feedback.positive} />
        <window.KpiCard label="Despesas" value={d.summary.despesas} color={t.feedback.negative} />
        <window.KpiCard label="Resultado" value={d.summary.saldo} color={t.accent.primary} emphasized note={`Taxa de poupança ${savingsRate}%`} />
      </div>

      {/* Receitas (collapsible) */}
      <window.Card
        title="Receitas"
        action={
          <button onClick={() => setExpanded(e => !e)} style={{ fontFamily: f.body, fontSize: 11, color: t.accent.primary, background: 'none', border: 'none', cursor: 'pointer' }}>
            {expanded ? 'Ocultar' : 'Detalhes'}
          </button>
        }
      >
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {d.receitas.map((rx, i) => (
            <div key={i}>
              <div style={{ fontFamily: f.body, fontSize: 11, color: t.text.muted, marginBottom: 2 }}>{rx.nome}</div>
              <div style={{ fontFamily: f.display, fontSize: 22, color: t.feedback.positive }}>{window.BRL(rx.valor)}</div>
              {expanded && <div style={{ fontFamily: f.body, fontSize: 10, color: t.text.disabled, marginTop: 2 }}>{rx.conta}</div>}
            </div>
          ))}
        </div>
      </window.Card>

      {/* Princípios */}
      <window.Card title="Princípios · meta vs realizado">
        {d.principles.map((pr, i) => (
          <div key={pr.id} style={{ ...(i === d.principles.length - 1 ? { borderBottom: 'none', marginBottom: 0, paddingBottom: 0 } : {}) }}>
            <PrincipleBar label={pr.label} target={pr.target} realized={pr.realized} amount={pr.amount} />
          </div>
        ))}
      </window.Card>

      {/* Despesas */}
      <window.Card title="Despesas por categoria">
        {d.categories.map((cat, i) => {
          const pct = (cat.valor / total) * 100;
          const col = colors[i % colors.length];
          return (
            <div key={cat.nome} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 80px', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: col, flexShrink: 0 }} />
                <span style={{ fontFamily: f.body, fontSize: 13, color: t.text.secondary }}>{cat.nome}</span>
              </div>
              <div style={{ height: 6, background: t.border.default, borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 999 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: f.body, fontSize: 11, color: t.text.muted }}>{window.PCT(pct)}</span>
                <span style={{ fontFamily: f.display, fontSize: 13, color: t.text.primary }}>{window.BRL(cat.valor)}</span>
              </div>
            </div>
          );
        })}
      </window.Card>

      {/* Top transactions */}
      <window.Card title="Maiores transações">
        {d.topExpenses.map((tx, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < d.topExpenses.length - 1 ? `1px solid ${t.border.subtle}` : 'none' }}>
            <div>
              <div style={{ fontFamily: f.body, fontSize: 13, color: t.text.primary }}>{tx.descricao}</div>
              <div style={{ fontFamily: f.body, fontSize: 10, color: t.text.muted, marginTop: 2 }}>{tx.categoria} · {tx.data}</div>
            </div>
            <span style={{ fontFamily: f.display, fontSize: 16, color: t.feedback.negative }}>{window.BRL(tx.valor)}</span>
          </div>
        ))}
      </window.Card>
    </div>
  );
}

window.TabMes = TabMes;
