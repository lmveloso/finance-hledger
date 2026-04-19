// Shared components — exported to window
const { createContext, useContext, useState } = React;

const ThemeCtx = createContext(null);
const useTheme = () => useContext(ThemeCtx);

function ThemeProvider({ theme, variation, fontPair, children }) {
  const t = window.THEME[theme];
  const r = window.THEME.radius[variation];
  const p = window.THEME.padding[variation];
  const f = window.THEME.fonts[fontPair];
  return <ThemeCtx.Provider value={{ theme, t, r, p, f, variation, isDark: t.isDark }}>{children}</ThemeCtx.Provider>;
}

// ── Sparkline ──────────────────────────────────────────────────────────
function Sparkline({ data, color, height = 38 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const W = 100, H = height;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - ((v - min) / range) * (H - 6) - 3,
  ]);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const uid = `sg${color.replace(/[^a-z0-9]/gi, '')}${height}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${uid})`} />
      <path d={line} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── KpiCard ────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, spark, emphasized, note }) {
  const { t, r, p, f, variation } = useTheme();
  return (
    <div style={{
      background: emphasized && variation === 'rounded'
        ? `linear-gradient(145deg, ${color}18 0%, ${t.bg.card} 65%)`
        : t.bg.card,
      border: emphasized ? `1px solid ${color}50` : `1px solid ${t.border.default}`,
      borderRadius: r.md, padding: p.card, position: 'relative', overflow: 'hidden',
    }}>
      {emphasized && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, ${color}00)` }} />}
      <div style={{ fontFamily: f.body, fontSize: 10, color: t.text.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: f.display, fontSize: emphasized ? 34 : 26, color: emphasized ? color : t.text.primary, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {window.BRL(value)}
      </div>
      {note && <div style={{ fontFamily: f.body, fontSize: 11, color: t.text.muted, marginTop: 5 }}>{note}</div>}
      {spark && <div style={{ marginTop: 12 }}><Sparkline data={spark} color={emphasized ? color : t.text.disabled} height={36} /></div>}
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────
function Card({ children, title, action, style: sx }) {
  const { t, r, p, f } = useTheme();
  return (
    <div style={{ background: t.bg.card, border: `1px solid ${t.border.default}`, borderRadius: r.md, padding: p.card, ...sx }}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontFamily: f.body, fontSize: 10, color: t.text.muted, textTransform: 'uppercase', letterSpacing: '0.14em' }}>{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'resumo',     label: 'Resumo'     },
  { id: 'mes',        label: 'Mês'        },
  { id: 'ano',        label: 'Ano'        },
  { id: 'fluxo',     label: 'Fluxo'      },
  { id: 'orcamento',  label: 'Orçamento'  },
  { id: 'patrimonio', label: 'Patrimônio' },
];

function Sidebar({ active, onNav, onThemeToggle }) {
  const { t, r, f, isDark } = useTheme();
  return (
    <aside style={{ width: 208, minWidth: 208, height: '100vh', background: t.bg.sidebar, borderRight: `1px solid ${t.border.default}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '26px 20px 22px', borderBottom: `1px solid ${t.border.subtle}` }}>
        <div style={{ fontFamily: f.display, fontSize: 20, color: t.text.primary, lineHeight: 1.15 }}>Finanças</div>
        <div style={{ fontFamily: f.display, fontStyle: 'italic', fontSize: 20, color: t.accent.primary, lineHeight: 1.15 }}>Pessoais</div>
        <div style={{ fontFamily: f.body, fontSize: 10, color: t.text.disabled, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 8 }}>hledger · família</div>
      </div>

      <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: r.sm, border: 'none', marginBottom: 2, transition: 'all 0.12s',
              background: isActive ? t.accent.primaryMuted : 'transparent',
              color: isActive ? t.accent.primary : t.text.secondary,
              fontFamily: f.body, fontSize: 13, fontWeight: isActive ? 600 : 400, textAlign: 'left',
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = t.bg.hover; e.currentTarget.style.color = t.text.primary; } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.text.secondary; } }}
            >
              {isActive && <div style={{ width: 3, height: 16, background: t.accent.primary, borderRadius: 2, flexShrink: 0 }} />}
              {!isActive && <div style={{ width: 3, height: 16, flexShrink: 0 }} />}
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '14px 10px', borderTop: `1px solid ${t.border.subtle}` }}>
        <button onClick={onThemeToggle} style={{
          width: '100%', padding: '8px 12px', borderRadius: r.sm,
          border: `1px solid ${t.border.default}`, background: 'transparent',
          color: t.text.muted, fontFamily: f.body, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {isDark ? '☀ Modo claro' : '◑ Modo escuro'}
        </button>
      </div>
    </aside>
  );
}

// ── TopBar ─────────────────────────────────────────────────────────────
const MONTH_LABELS = ['Jan 2025', 'Fev 2025', 'Mar 2025', 'Abr 2025'];
const TAB_LABELS   = { resumo: 'Resumo', mes: 'Mês', ano: 'Ano', fluxo: 'Fluxo', orcamento: 'Orçamento', patrimonio: 'Patrimônio' };

function TopBar({ active, monthIdx, onMonthChange }) {
  const { t, r, f } = useTheme();
  const btnS = { width: 28, height: 28, borderRadius: r.xs, border: `1px solid ${t.border.default}`, background: 'transparent', color: t.text.secondary, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  return (
    <header style={{ height: 56, borderBottom: `1px solid ${t.border.default}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: t.bg.card, flexShrink: 0 }}>
      <span style={{ fontFamily: f.body, fontSize: 14, fontWeight: 600, color: t.text.primary }}>{TAB_LABELS[active]}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => onMonthChange(Math.max(0, monthIdx - 1))} style={btnS}>‹</button>
        <span style={{ fontFamily: f.body, fontSize: 13, color: t.text.primary, minWidth: 76, textAlign: 'center' }}>{MONTH_LABELS[monthIdx] || 'Abr 2025'}</span>
        <button onClick={() => onMonthChange(Math.min(MONTH_LABELS.length - 1, monthIdx + 1))} style={btnS}>›</button>
      </div>
    </header>
  );
}

// ── Bottom Mobile Nav ──────────────────────────────────────────────────
const MOBILE_TABS = [
  { id: 'resumo', label: 'Resumo' }, { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' }, { id: 'orcamento', label: 'Budget' },
  { id: 'patrimonio', label: 'Net Worth' },
];
function BottomNav({ active, onNav }) {
  const { t, f } = useTheme();
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 58, background: t.bg.sidebar, borderTop: `1px solid ${t.border.default}`, display: 'flex', zIndex: 200 }}>
      {MOBILE_TABS.map(item => {
        const isActive = active === item.id;
        return (
          <button key={item.id} onClick={() => onNav(item.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', background: 'transparent', color: isActive ? t.accent.primary : t.text.muted, fontFamily: f.body, fontSize: 9.5, fontWeight: isActive ? 600 : 400 }}>
            <div style={{ width: 18, height: 2, borderRadius: 1, background: isActive ? t.accent.primary : 'transparent', marginBottom: 2 }} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

// ── Tweaks Panel ───────────────────────────────────────────────────────
function TweaksPanel({ open, theme, variation, fontPair, onTheme, onVariation, onFont }) {
  const { t, r, f } = useTheme();
  if (!open) return null;
  function Chip({ label, active, onClick }) {
    return (
      <button onClick={onClick} style={{ padding: '5px 11px', borderRadius: r.xs, border: `1px solid ${active ? t.accent.primary : t.border.default}`, background: active ? t.accent.primaryMuted : 'transparent', color: active ? t.accent.primary : t.text.secondary, fontFamily: f.body, fontSize: 12 }}>
        {label}
      </button>
    );
  }
  const secLabel = { fontFamily: f.body, fontSize: 10, color: t.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, marginTop: 14, display: 'block' };
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, background: t.bg.card, border: `1px solid ${t.border.default}`, borderRadius: r.md, padding: 20, width: 260, zIndex: 1000, boxShadow: `0 28px 64px ${t.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(10,12,60,0.18)'}` }}>
      <div style={{ fontFamily: f.display, fontSize: 17, color: t.text.primary, marginBottom: 4 }}>Tweaks</div>
      <span style={{ ...secLabel, marginTop: 10 }}>Tema</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <Chip label="Escuro" active={theme === 'dark'} onClick={() => onTheme('dark')} />
        <Chip label="Claro"  active={theme === 'light'} onClick={() => onTheme('light')} />
      </div>
      <span style={secLabel}>Variação</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <Chip label="Rounded" active={variation === 'rounded'} onClick={() => onVariation('rounded')} />
        <Chip label="Sharp"   active={variation === 'sharp'}   onClick={() => onVariation('sharp')} />
        <Chip label="Compact" active={variation === 'compact'} onClick={() => onVariation('compact')} />
      </div>
      <span style={secLabel}>Tipografia</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <Chip label="Jakarta" active={fontPair === 'jakarta'} onClick={() => onFont('jakarta')} />
        <Chip label="Classic" active={fontPair === 'classic'} onClick={() => onFont('classic')} />
        <Chip label="Grotesk" active={fontPair === 'grotesk'} onClick={() => onFont('grotesk')} />
      </div>
    </div>
  );
}

Object.assign(window, { ThemeCtx, useTheme, ThemeProvider, Sparkline, KpiCard, Card, Sidebar, TopBar, BottomNav, TweaksPanel });
