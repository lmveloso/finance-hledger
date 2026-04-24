import React from 'react';
import { color } from '../../../theme/tokens';
import { t } from '../../../i18n';

// Localised short month labels. Mirrors the convention already used in
// features/previsao/Previsao.jsx, kept local to avoid premature sharing.
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthLabel(ym) {
  const m = parseInt(ym.split('-')[1], 10);
  return MONTH_LABELS[m - 1] || ym;
}

const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
});
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL',
});

// Generic N × 12 matrix with:
//   - left column: row labels (category or principle name)
//   - 12 data columns: one per month
//   - totals row at the bottom
//
// Props:
//   months:        ['YYYY-MM', ...] (exactly 12 expected, but any length works)
//   rows:          [{ key, label, cells: { [ym]: { value, pct? } } }]
//   totals:        { [ym]: number } — rendered as a "Totais" row
//   showPct:       boolean — if true, cell is "R$ value \n pct%"
//   selectedMonth: 'YYYY-MM' | null — highlights the matching column header
//   onMonthSelect: (ym) => void — when provided, the month headers become
//                  clickable buttons. Omit it (the default) and the table
//                  renders exactly like it did pre-drill-down.
function MatrixTable({
  months,
  rows,
  totals,
  showPct = false,
  selectedMonth = null,
  onMonthSelect = null,
}) {
  const interactive = typeof onMonthSelect === 'function';

  const headCellStyle = (align) => ({
    textAlign: align,
    padding: '8px 10px',
    color: color.text.muted,
    borderBottom: `1px solid ${color.border.default}`,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  });

  const monthHeaderStyle = (month) => {
    const base = headCellStyle('right');
    if (!interactive) return base;
    const isSelected = selectedMonth === month;
    return {
      ...base,
      cursor: 'pointer',
      userSelect: 'none',
      background: isSelected ? color.accent.primaryMuted : 'transparent',
      color: isSelected ? color.accent.primary : color.text.muted,
      borderBottomColor: isSelected ? color.accent.primary : color.border.default,
      transition: 'background-color 0.12s, color 0.12s, border-color 0.12s',
    };
  };

  const rowLabelStyle = {
    padding: '8px 10px',
    borderBottom: `1px solid ${color.border.subtle}`,
    color: color.text.secondary,
    whiteSpace: 'nowrap',
    textAlign: 'left',
  };

  const dataCellStyle = {
    textAlign: 'right',
    padding: '6px 8px',
    borderBottom: `1px solid ${color.border.subtle}`,
    fontFamily: "'Google Sans Flex', 'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: 12,
    color: color.text.primary,
    whiteSpace: 'nowrap',
  };

  const selectedColumnCellStyle = {
    background: color.accent.primaryMuted,
  };

  const totalsCellStyle = {
    borderTop: `1px solid ${color.border.default}`,
    background: color.bg.hover,
    color: color.accent.primary,
    fontWeight: 600,
  };

  const handleKeyDown = (e, month) => {
    if (!interactive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onMonthSelect(month);
    }
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={headCellStyle('left')}>&nbsp;</th>
            {months.map(m => {
              const isSelected = interactive && selectedMonth === m;
              return (
                <th
                  key={m}
                  style={monthHeaderStyle(m)}
                  onClick={interactive ? () => onMonthSelect(m) : undefined}
                  onKeyDown={interactive ? (e) => handleKeyDown(e, m) : undefined}
                  role={interactive ? 'button' : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-pressed={interactive ? isSelected : undefined}
                >
                  {monthLabel(m)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key}>
              <td style={rowLabelStyle} className="sans">{row.label}</td>
              {months.map(m => {
                const cell = row.cells?.[m];
                const isSelectedCol = interactive && selectedMonth === m;
                return (
                  <td
                    key={m}
                    title={cell ? `${row.label} · ${monthLabel(m)}: ${BRLc(cell.value)}` : undefined}
                    style={isSelectedCol ? { ...dataCellStyle, ...selectedColumnCellStyle } : dataCellStyle}
                  >
                    {cell && cell.value > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.25 }}>
                        <span>{BRL(cell.value)}</span>
                        {showPct && cell.pct != null && cell.pct > 0 && (
                          <span style={{ color: color.text.muted, fontSize: 10 }}>
                            {Math.round(cell.pct)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: color.text.faint }}>—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {totals && (
            <tr>
              <td style={{ ...rowLabelStyle, ...totalsCellStyle }} className="sans">{t('ano.totals')}</td>
              {months.map(m => {
                const isSelectedCol = interactive && selectedMonth === m;
                const cellStyle = isSelectedCol
                  ? { ...dataCellStyle, ...totalsCellStyle, ...selectedColumnCellStyle }
                  : { ...dataCellStyle, ...totalsCellStyle };
                return (
                  <td key={m} style={cellStyle}>
                    {(totals[m] || 0) > 0 ? BRL(totals[m]) : <span style={{ color: color.text.faint }}>—</span>}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default MatrixTable;
export { monthLabel };
