// Tab: Patrimônio — net worth hero + evolution chart + accounts
const {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} = window.Recharts || {};

function TabPatrimonio() {
  const { t, r, p, f, isDark } = window.useTheme();
  const d = window.MOCK;
  const nw = d.networth;
  const latest = nw[nw.length - 1];
  const prev   = nw[nw.length - 2];
  const delta  = latest.liquido - prev.liquido;
  const deltaColor = delta >= 0 ? t.feedback.positive : t.feedback.negative;

  const ativos   = d.accounts.filter(a => a.tipo === 'ativo');
  const passivos = d.accounts.filter(a => a.tipo === 'passivo');
  const totalAtivos   = ativos.reduce((s, a) => s + a.saldo, 0);
  const totalPassivos = Math.abs(passivos.reduce((s, a) => s + a.saldo, 0));

  const tooltipStyle = {
    contentStyle: { background: t.bg.card, border: `1px solid ${t.border.default}`, borderRadius: r.sm, fontFamily: f.body, fontSize: 12, color: t.text.primary },
    labelStyle:   { color: t.text.muted, fontSize: 11 },
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${t.accent.primary}18 0%, ${t.bg.card} 60%)`, border: `1px solid ${t.accent.primary}44`, borderRadius: r.md, padding: p.card, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${t.accent.primary}, ${t.accent.secondary})` }} />
        <div style={{ fontFamily: f.body, fontSize: 10, color: t.text.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>Patrimônio líquido</div>
        <div style={{ fontFamily: f.display, fontSize: 52, color: t.accent.primary, letterSpacing: '-0.03em', lineHeight: 1 }}>
          {window.BRL(latest.liquido)}
        </div>
        <div style={{ fontFamily: f.body, fontSize: 13, color: deltaColor, marginTop: 10 }}>
          {delta >= 0 ? '↑' : '↓'} {window.BRL(Math.abs(delta))} vs mês anterior
        </div>
        <div style={{ display: 'flex', gap: 32, marginTop: 20 }}>
          <div>
            <div style={{ fontFamily: f.body, fontSize: 10, color: t.text.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ativos</div>
            <div style={{ fontFamily: f.display, fontSize: 24, color: t.feedback.positive }}>{window.BRL(totalAtivos)}</div>
          </div>
          <div>
            <div style={{ fontFamily: f.body, fontSize: 10, color: t.text.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Passivos</div>
            <div style={{ fontFamily: f.display, fontSize: 24, color: t.feedback.negative }}>{window.BRL(totalPassivos)}</div>
          </div>
        </div>
      </div>

      {/* Evolution chart */}
      <window.Card title="Evolução patrimonial · 24 meses">
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={nw} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradAtivos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={t.feedback.positive} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={t.feedback.positive} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLiquido" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={t.accent.primary} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={t.accent.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={t.border.subtle} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontFamily: f.body, fontSize: 10, fill: t.text.disabled }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontFamily: f.body, fontSize: 10, fill: t.text.disabled }} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                formatter={(v, name) => [window.BRL(v), name === 'ativos' ? 'Ativos' : name === 'passivos' ? 'Passivos' : 'Líquido']}
                {...tooltipStyle}
              />
              <Area type="monotone" dataKey="ativos"   stroke={t.feedback.positive} strokeWidth={1.5} fill="url(#gradAtivos)"  dot={false} strokeOpacity={0.7} />
              <Area type="monotone" dataKey="passivos" stroke={t.feedback.negative} strokeWidth={1}   fill="none"               dot={false} strokeOpacity={0.5} strokeDasharray="4 2" />
              <Area type="monotone" dataKey="liquido"  stroke={t.accent.primary}    strokeWidth={2}   fill="url(#gradLiquido)"   dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { color: t.accent.primary,    label: 'Patrimônio líquido' },
            { color: t.feedback.positive, label: 'Ativos' },
            { color: t.feedback.negative, label: 'Passivos', dashed: true },
          ].map(({ color, label, dashed }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 2, background: color, opacity: dashed ? 0.5 : 1, borderTop: dashed ? `2px dashed ${color}` : 'none' }} />
              <span style={{ fontFamily: f.body, fontSize: 11, color: t.text.muted }}>{label}</span>
            </div>
          ))}
        </div>
      </window.Card>

      {/* Accounts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Ativos */}
        <window.Card title="Ativos">
          {ativos.map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: i < ativos.length - 1 ? `1px solid ${t.border.subtle}` : 'none' }}>
              <span style={{ fontFamily: f.body, fontSize: 13, color: t.text.secondary }}>{a.nome}</span>
              <span style={{ fontFamily: f.display, fontSize: 14, color: t.feedback.positive }}>{window.BRL(a.saldo)}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${t.border.default}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: f.body, fontSize: 12, color: t.text.muted }}>Total ativos</span>
            <span style={{ fontFamily: f.display, fontSize: 16, color: t.feedback.positive }}>{window.BRL(totalAtivos)}</span>
          </div>
        </window.Card>

        {/* Passivos */}
        <window.Card title="Passivos">
          {passivos.map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: i < passivos.length - 1 ? `1px solid ${t.border.subtle}` : 'none' }}>
              <span style={{ fontFamily: f.body, fontSize: 13, color: t.text.secondary }}>{a.nome}</span>
              <span style={{ fontFamily: f.display, fontSize: 14, color: t.feedback.negative }}>{window.BRL(Math.abs(a.saldo))}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${t.border.default}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: f.body, fontSize: 12, color: t.text.muted }}>Total passivos</span>
            <span style={{ fontFamily: f.display, fontSize: 16, color: t.feedback.negative }}>{window.BRL(totalPassivos)}</span>
          </div>
        </window.Card>
      </div>
    </div>
  );
}

window.TabPatrimonio = TabPatrimonio;
