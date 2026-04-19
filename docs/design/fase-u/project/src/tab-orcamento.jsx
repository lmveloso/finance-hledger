// Tab: Orçamento — budget vs realizado with over-budget states
function TabOrcamento() {
  const { t, r, p, f } = window.useTheme();
  const d = window.MOCK.budget;
  const totalOrcado    = d.reduce((s, c) => s + c.orcado, 0);
  const totalRealizado = d.reduce((s, c) => s + c.realizado, 0);
  const totalPct       = (totalRealizado / totalOrcado) * 100;
  const totalOver      = totalRealizado > totalOrcado;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Total hero */}
      <div style={{ background: t.bg.card, border: `1px solid ${totalOver ? t.feedback.negative + '60' : t.border.default}`, borderRadius: r.md, padding: p.card, position: 'relative', overflow: 'hidden' }}>
        {totalOver && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: t.feedback.negative }} />}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: f.body, fontSize: 10, color: t.text.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Total · orçamento vs realizado</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontFamily: f.display, fontSize: 36, color: totalOver ? t.feedback.negative : t.text.primary, letterSpacing: '-0.02em' }}>{window.BRL(totalRealizado)}</span>
              <span style={{ fontFamily: f.body, fontSize: 14, color: t.text.muted }}>de {window.BRL(totalOrcado)}</span>
            </div>
          </div>
          {/* Donut-style ring */}
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            <svg viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)', width: 72, height: 72 }}>
              <circle cx="36" cy="36" r="28" fill="none" stroke={t.border.default} strokeWidth="8" />
              <circle cx="36" cy="36" r="28" fill="none"
                stroke={totalOver ? t.feedback.negative : t.accent.primary}
                strokeWidth="8"
                strokeDasharray={`${Math.min(totalPct, 100) / 100 * 175.9} 175.9`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: f.body, fontSize: 13, fontWeight: 600, color: totalOver ? t.feedback.negative : t.accent.primary }}>
              {window.PCT(totalPct)}
            </div>
          </div>
        </div>
        {/* Total bar */}
        <div style={{ height: 8, background: t.border.default, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(totalPct, 100)}%`, background: totalOver ? t.feedback.negative : t.accent.primary, borderRadius: 999, transition: 'width 0.7s ease' }} />
        </div>
        {totalOver && (
          <div style={{ fontFamily: f.body, fontSize: 11, color: t.feedback.negative, marginTop: 8 }}>
            {window.BRL(totalRealizado - totalOrcado)} acima do orçamento total
          </div>
        )}
      </div>

      {/* Per-category bars */}
      <window.Card title="Por categoria">
        {d.map((cat, i) => {
          const pct  = (cat.realizado / cat.orcado) * 100;
          const over = cat.realizado > cat.orcado;
          const barColor = over ? t.feedback.negative : pct >= 90 ? t.feedback.warning : t.accent.primary;
          return (
            <div key={cat.nome} style={{ marginBottom: i < d.length - 1 ? 18 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontFamily: f.body, fontSize: 13, color: t.text.secondary }}>{cat.nome}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  {over && (
                    <span style={{ fontFamily: f.body, fontSize: 10, color: t.feedback.negative, background: t.feedback.negativeMuted, padding: '2px 7px', borderRadius: r.xs }}>
                      +{window.BRL(cat.realizado - cat.orcado)}
                    </span>
                  )}
                  <span style={{ fontFamily: f.display, fontSize: 14, color: over ? t.feedback.negative : t.text.primary }}>
                    {window.BRL(cat.realizado)}
                  </span>
                  <span style={{ fontFamily: f.body, fontSize: 11, color: t.text.disabled }}>/ {window.BRL(cat.orcado)}</span>
                </div>
              </div>
              {/* Track with budget cap line */}
              <div style={{ position: 'relative', height: 8, background: t.border.default, borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.min(pct, 100)}%`,
                  background: barColor, borderRadius: 999, transition: 'width 0.6s ease',
                }} />
                {/* Over-budget overflow indicator */}
                {over && (
                  <div style={{
                    position: 'absolute', right: 0, top: 0, height: '100%',
                    width: `${Math.min(((cat.realizado - cat.orcado) / cat.orcado) * 100, 30)}%`,
                    background: t.feedback.negative, opacity: 0.35,
                  }} />
                )}
              </div>
              <div style={{ fontFamily: f.body, fontSize: 10, color: over ? t.feedback.negative : t.text.disabled, marginTop: 3, textAlign: 'right' }}>
                {window.PCT(pct)} {over ? '⚠ acima' : 'utilizado'}
              </div>
            </div>
          );
        })}
      </window.Card>
    </div>
  );
}

window.TabOrcamento = TabOrcamento;
