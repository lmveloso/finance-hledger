import React from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useMonth } from '../../contexts/MonthContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { radius } from '../../theme/tokens';

// MonthNavigator — month stepper shared by the desktop sidebar and the
// mobile top bar.
//
// Variants:
//   - `sidebar`  → stacked layout: month label on its own row, prev/next row
//                  below, plus "Hoje" shortcut and the "vs ano anterior"
//                  compare checkbox.
//   - `compact`  → inline `[‹] [Abr 2026] [›]` strip for the mobile top bar.
//                  Compare toggle is intentionally hidden in this variant
//                  (desktop-only feature for PR-U1 per the architect's plan).
//
// Consumes MonthContext unchanged; state owned upstream so both variants
// stay in sync when the viewport crosses the 768px breakpoint.

export function formatMonthBR(ym) {
  const [y, m] = ym.split('-');
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  const str = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatMonthShort(ym) {
  const [y, m] = ym.split('-');
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  const str = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  // "abr. de 2026" → "Abr 2026"
  const cleaned = str.replace(/\./g, '').replace(' de ', ' ');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export default function MonthNavigator({ variant = 'sidebar' }) {
  const { tokens } = useTheme();
  const {
    selectedMonth,
    compareMode,
    setCompareMode,
    goPrev,
    goNext,
    goToday,
    isCurrentMonth,
  } = useMonth();

  const stepBtnStyle = {
    width: 28,
    height: 28,
    borderRadius: radius.rounded.xs,
    border: `1px solid ${tokens.border.default}`,
    background: 'transparent',
    color: tokens.text.secondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.12s, color 0.12s',
  };

  if (variant === 'compact') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={goPrev}
          className="sans"
          style={stepBtnStyle}
          title="Mês anterior"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span
          className="sans"
          style={{
            fontSize: 13,
            color: tokens.text.primary,
            minWidth: 88,
            textAlign: 'center',
          }}
        >
          {formatMonthShort(selectedMonth)}
        </span>
        <button
          type="button"
          onClick={goNext}
          className="sans"
          style={stepBtnStyle}
          title="Próximo mês"
          aria-label="Próximo mês"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  // Sidebar variant — stacked.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        className="serif"
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: tokens.text.primary,
          lineHeight: 1.1,
        }}
      >
        {formatMonthBR(selectedMonth)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={goPrev}
          className="sans"
          style={stepBtnStyle}
          title="Mês anterior"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={goNext}
          className="sans"
          style={stepBtnStyle}
          title="Próximo mês"
          aria-label="Próximo mês"
        >
          <ChevronRight size={16} />
        </button>
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={goToday}
            className="sans"
            style={{
              ...stepBtnStyle,
              width: 'auto',
              padding: '0 10px',
              fontSize: 11,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              gap: 4,
              color: tokens.text.muted,
            }}
            title="Voltar ao mês atual"
          >
            <CalendarDays size={12} /> Hoje
          </button>
        )}
      </div>
      <label
        className="sans"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          fontSize: 12,
          color: tokens.text.muted,
        }}
      >
        <input
          type="checkbox"
          checked={compareMode}
          onChange={(e) => setCompareMode(e.target.checked)}
          style={{ accentColor: tokens.accent.primary }}
        />
        vs ano anterior
      </label>
    </div>
  );
}
