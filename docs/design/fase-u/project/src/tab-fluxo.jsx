// Tab: Fluxo — waterfall chart + account deltas
function TabFluxo() {
  const { t, r, p, f } = window.useTheme();
  const d = window.MOCK.flow;

  // Build waterfall: running cumulative for positioning
  const waterfallItems = d.waterfall;
  const incomeItem = waterfallItems.find(i => i.tipo === 'income');
  const maxVal = incomeItem ? incomeItem.valor : 1;

  // Cumulative tracking for waterfall bars
  let running = 0;
  const bars = waterfallItems.map(item => {
    const isResult = item.tipo === 'result';
    const barWidth  = Math.abs(item.valor) / maxVal * 100;
    const offset    = isResult ? 0 : (item.tipo === 'income' ? 0 : ((running + item.valor) / maxVal) * 100);
    const barColor  = item.tipo === 'income'  ? t.feedback.positive
                    : item.tipo === 'result'  ? t.accent.primary
                    : t.feedback.negative;
    const start = running;
    if (!isResult) running += item.valor;
    return { ...item, barWidth, offset: Math.max(offset, 0), barColor, start };
  });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <window.KpiCard label="Economia contábil" value={d.economia}  color={t.accent.primary}    emphasized />
        <window.KpiCard label="Sobrou em caixa"   value={d.caixaLiq} color={t.feedback.positive}  />
        <window.KpiCard label="Total despesas"    value={window.MOCK.summary.despesas} color={t.feedback.negative} />
      </div>

      {/* Waterfall */}
      <window.Card title="Fluxo mensal · receita → saldo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
          {bars.map((bar, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px', gap: 10, alignItems: 'center' }}>
              <span style={{ fontFamily: f.body, fontSize: 12, color: t.text.secondary, textAlign: 'right' }}>{bar.label}</span>
              {/* Bar track */}
              <div style={{ position: 'relative', height: 24, background: t.bg.cardAlt, borderRadius: r.xs, overflow: 'hidden' }}>
                {/* Spacer for non-income/result bars */}
                {bar.tipo !== 'income' && bar.tipo !== 'result' && (
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${100 - bar.barWidth - (100 - bar.offset - bar.barWidth)}%`, background: 'transparent' }} />
                )}
                <div style={{
                  position: 'absolute',
                  left: bar.tipo === 'income' || bar.tipo === 'result' ? 0 : `${bar.offset}%`,
                  top: 0, height: '100%',
                  width: `${bar.barWidth}%`,
                  background: bar.barColor,
                  opacity: bar.tipo === 'result' ? 1 : 0.8,
                  borderRadius: r.xs,
                  transition: 'width 0.7s ease',
                  display: 'flex', alignItems: 'center', paddingLeft: 6,
                }} />
              </div>
              <span style={{ fontFamily: f.display, fontSize: 13, color: bar.barColor, textAlign: 'right' }}>
                {bar.valor < 0 ? `−${window.BRL(Math.abs(bar.valor))}` : window.BRL(bar.valor)}
              </span>
            </div>
          ))}
        </div>

        {/* Connector line hint */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${t.border.subtle}`, fontFamily: f.body, fontSize: 11, color: t.text.muted, lineHeight: 1.6 }}>
          Receitas <strong style={{ color: t.feedback.positive }}>{window.BRL(d.waterfall[0]?.valor)}</strong> menos despesas resultam em saldo de <strong style={{ color: t.accent.primary }}>{window.BRL(d.economia)}</strong>.
        </div>
      </window.Card>

      {/* Account cards */}
      <div>
        <div style={{ fontFamily: f.body, fontSize: 10, color: t.text.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>Contas</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {d.contas.map((conta, i) => {
            const isPassivo = conta.tipo === 'passivo';
            const deltaColor = conta.delta >= 0 ? t.feedback.positive : t.feedback.negative;
            return (
              <div key={i} style={{ background: t.bg.card, border: `1px solid ${t.border.default}`, borderRadius: r.md, padding: p.card }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: f.body, fontSize: 12, color: t.text.secondary }}>{conta.nome}</div>
                    <div style={{ fontFamily: f.body, fontSize: 10, color: t.text.disabled, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{conta.tipo}</div>
                  </div>
                  <div style={{ fontFamily: f.display, fontSize: 20, color: conta.delta >= 0 ? deltaColor : t.feedback.negative }}>
                    {conta.delta >= 0 ? '+' : ''}{window.BRL(conta.delta)}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: f.body, fontSize: 9, color: t.text.disabled, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Entradas</div>
                    <div style={{ fontFamily: f.body, fontSize: 13, color: t.feedback.positive }}>{window.BRL(conta.entradas)}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: f.body, fontSize: 9, color: t.text.disabled, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Saídas</div>
                    <div style={{ fontFamily: f.body, fontSize: 13, color: t.feedback.negative }}>{window.BRL(conta.saidas)}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${t.border.subtle}`, fontFamily: f.body, fontSize: 11, color: t.text.muted }}>
                  Saldo final <strong style={{ color: t.text.primary }}>{window.BRL(conta.saldo)}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.TabFluxo = TabFluxo;
