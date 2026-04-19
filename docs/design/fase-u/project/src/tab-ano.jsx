// Tab: Ano — category × month heatmap
const { useState: useAnoState } = React;

function TabAno() {
  const { t, r, p, f, isDark } = window.useTheme();
  const [year, setYear] = useAnoState(2025);
  const [hoveredCell, setHoveredCell] = useAnoState(null);
  const mx = window.MOCK.yearMatrix;

  // Flatten all non-zero values to find global max for color scaling
  const allVals = mx.data.flat().filter(v => v > 0);
  const globalMax = Math.max(...allVals, 1);

  // Per-category max for relative intensity
  const catMax = mx.data.map(row => Math.max(...row, 1));

  function cellColor(val, catIdx) {
    if (val === 0) return 'transparent';
    const intensity = val / catMax[catIdx];
    // Interpolate from faint to vivid accent
    const alpha = 0.1 + intensity * 0.78;
    return isDark
      ? `rgba(99,102,241,${alpha})`
      : `rgba(79,82,221,${alpha})`;
  }

  function cellTextColor(val, catIdx) {
    if (val === 0) return t.text.disabled;
    const intensity = val / catMax[catIdx];
    return intensity > 0.5 ? (isDark ? '#e0e6ff' : '#ffffff') : t.text.secondary;
  }

  // Monthly totals
  const monthTotals = mx.months.map((_, mi) => mx.data.reduce((s, row) => s + row[mi], 0));
  const maxTotal = Math.max(...monthTotals, 1);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Header controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: f.body, fontSize: 10, color: t.text.muted, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          Ano · {year}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[2023,2024,2025].map(y => (
            <button key={y} onClick={() => setYear(y)} style={{
              padding: '5px 10px', borderRadius: r.xs, border: `1px solid ${y === year ? t.accent.primary : t.border.default}`,
              background: y === year ? t.accent.primaryMuted : 'transparent',
              color: y === year ? t.accent.primary : t.text.muted,
              fontFamily: f.body, fontSize: 12,
            }}>{y}</button>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <window.Card style={{ overflowX: 'auto', padding: p.card }}>
        <div style={{ minWidth: 640 }}>
          {/* Month headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '110px repeat(12, 1fr)', gap: 3, marginBottom: 4 }}>
            <div />
            {mx.months.map(m => (
              <div key={m} style={{ fontFamily: f.body, fontSize: 10, color: t.text.muted, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{m}</div>
            ))}
          </div>

          {/* Category rows */}
          {mx.categories.map((cat, ci) => (
            <div key={cat} style={{ display: 'grid', gridTemplateColumns: '110px repeat(12, 1fr)', gap: 3, marginBottom: 3 }}>
              <div style={{ fontFamily: f.body, fontSize: 12, color: t.text.secondary, display: 'flex', alignItems: 'center', paddingRight: 8 }}>{cat}</div>
              {mx.data[ci].map((val, mi) => {
                const isHovered = hoveredCell && hoveredCell[0] === ci && hoveredCell[1] === mi;
                return (
                  <div
                    key={mi}
                    onMouseEnter={() => setHoveredCell([ci, mi])}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={val > 0 ? `${cat} · ${mx.months[mi]}: ${window.BRL(val)}` : '—'}
                    style={{
                      height: 36, borderRadius: r.xs,
                      background: val > 0 ? cellColor(val, ci) : t.bg.cardAlt,
                      border: isHovered ? `1px solid ${t.accent.primary}` : `1px solid ${t.border.subtle}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: val > 0 ? 'pointer' : 'default',
                      transition: 'border-color 0.12s',
                    }}
                  >
                    {val > 0 && (
                      <span style={{ fontFamily: f.body, fontSize: 9.5, color: cellTextColor(val, ci), fontWeight: 500 }}>
                        {(val / 1000).toFixed(1)}k
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Monthly totals row */}
          <div style={{ display: 'grid', gridTemplateColumns: '110px repeat(12, 1fr)', gap: 3, marginTop: 8 }}>
            <div style={{ fontFamily: f.body, fontSize: 10, color: t.text.muted, display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</div>
            {monthTotals.map((tot, mi) => (
              <div key={mi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                {/* Mini bar chart */}
                <div style={{ width: '100%', height: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{ width: '70%', height: tot > 0 ? `${(tot / maxTotal) * 100}%` : '2px', background: t.accent.primary, opacity: 0.6, borderRadius: `${r.xs}px ${r.xs}px 0 0`, minHeight: 2 }} />
                </div>
                {tot > 0 && <span style={{ fontFamily: f.body, fontSize: 9, color: t.text.muted }}>{(tot / 1000).toFixed(1)}k</span>}
              </div>
            ))}
          </div>
        </div>
      </window.Card>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: f.body, fontSize: 10, color: t.text.disabled }}>Intensidade por categoria:</span>
        {[0.1, 0.3, 0.55, 0.8, 1.0].map(v => (
          <div key={v} style={{ width: 20, height: 12, borderRadius: r.xs, background: isDark ? `rgba(99,102,241,${0.1 + v * 0.78})` : `rgba(79,82,221,${0.1 + v * 0.78})` }} />
        ))}
        <span style={{ fontFamily: f.body, fontSize: 10, color: t.text.disabled }}>máx da categoria</span>
      </div>
    </div>
  );
}

window.TabAno = TabAno;
